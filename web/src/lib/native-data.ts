'use client'

// Native offline data layer — Capacitor fetch shim.
//
// When the app runs inside the Android WebView (window.Capacitor injected by
// the native bridge) there is no Next.js server: /api/v1/* would 404. This
// module overrides window.fetch and serves every API route from static JSON
// bundles (exported by scripts/export-native-data.mjs into public/data/),
// replicating the server route logic 1:1:
//   - grouped lists with paging (limit/offset/q/category)
//   - detail payloads resolved through the slug→group map (variant slugs)
//   - multi-section search with synonym expansion (40k dictionary)
//   - deterministic daily picks + evidence quiz (same fnv1a seeding)
//   - herb–medication interaction checker (same resolution + rules)
//   - consent ledger becomes device-local no-ops
//   - on-demand translation 404s → UI falls back to English (by design)
//
// Browser sessions are untouched: the shim only installs when the Capacitor
// bridge is present, or when localStorage.sanjeevani_native_test = '1'
// (used to verify the exact native payload from a plain browser).

type Json = Record<string, unknown>

const cache = new Map<string, Promise<unknown>>()

function load<T>(file: string): Promise<T> {
  let p = cache.get(file) as Promise<T> | undefined
  if (!p) {
    const url = new URL('data/' + file, document.baseURI).href
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`native-data: ${file} → ${r.status}`)
      return r.json() as Promise<T>
    })
    cache.set(file, p as Promise<unknown>)
  }
  return p
}

// ── server helpers (mirrors src/lib/server/*) ───────────────────────────────
const DEFAULT_LIMIT = 60
const MAX_LIMIT = 240
function pageParams(u: URL) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(u.searchParams.get('limit') || '', 10) || DEFAULT_LIMIT))
  const offset = Math.max(0, parseInt(u.searchParams.get('offset') || '', 10) || 0)
  const q = (u.searchParams.get('q') || '').trim().slice(0, 80)
  return { limit, offset, q }
}
const CONTENT_LANGS = new Set(['en', 'hi'])
function resolveLang(v: string | null | undefined): string {
  return v && CONTENT_LANGS.has(v) ? v : 'en'
}
const pickName = (lang: string, en: string, hi: string | null | undefined) =>
  lang === 'hi' && hi ? hi : en
function cleanName(name: string | null | undefined, isRemedy = false): string {
  let n = (name || '').replace(/\s+for\s+.*$/i, '').replace(/\s+[-–—]\s+.*$/, '').replace(/\s*\)+\s*$/, '')
  if (isRemedy) n = n.replace(/\s+\d+\s*[CXMK]\s*(?:\(.*?\))?$/i, '')
  n = n.replace(/\s*\(([^)]*)\)\s*$/, '').replace(/\s+(Beginner|Intermediate|Advanced)\s+Variations?$/i, '').replace(/\s+(Modern|Traditional)$/i, '')
  return n.trim()
}
function isCleanName(name: string): boolean {
  if (!name) return false
  if (name !== name.trim()) return false
  if (name.includes(' - ')) return false
  if (name.includes('  ')) return false
  if (/[)\]:;,]$/.test(name)) return false
  if (/^(var\.?|misc|other|unknown|general|ayurvedic formula|constitutional)/i.test(name)) return false
  if (name.length > 40) return false
  return true
}
function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// ── localized section list (q/category filtering + paging, mirrors routes) ──
type ListRow = Json & { slug: string; name: string; nameHi?: string | null; synonyms?: string[] }
async function sectionPage(
  file: string,
  key: string,
  u: URL,
  opts: { matchFields: (r: ListRow) => string; category?: (r: ListRow, cat: string) => boolean; localize: (r: ListRow, lang: string) => Json }
) {
  const lang = resolveLang(u.searchParams.get('language'))
  const { limit, offset, q } = pageParams(u)
  const category = u.searchParams.get('category') || ''
  const doc = await load<{ [k: string]: ListRow[] }>(file)
  let rows = doc[key] as ListRow[]
  if (category && opts.category) rows = rows.filter((r) => opts.category!(r, category))
  if (q) {
    const f = q.toLowerCase()
    rows = rows.filter((r) => opts.matchFields(r).includes(f))
  }
  const total = rows.length
  const page = rows.slice(offset, offset + limit).map((r) => opts.localize(r, lang))
  return { [key]: page, total, limit, offset }
}

const synJoin = (r: ListRow) => ((r.synonyms as string[]) || []).join(' ').toLowerCase()

// ── detail resolution through the slug map (variant slugs → group) ──────────
async function detailFor(section: 'h' | 'y' | 'f' | 'r', slug: string, lang: string) {
  const [map, details] = await Promise.all([
    load<Record<string, [string, string]>>('slugmap.json'),
    load<Record<string, Json>>(`details/${section === 'h' ? 'herbs' : section === 'y' ? 'yoga' : section === 'f' ? 'nutrition' : 'homeopathy'}.json`),
  ])
  const entry = map[`${section}:${slug}`]
  if (!entry) return null
  const [repSlug, variantName] = entry
  const doc = details[repSlug]
  if (!doc) return null
  // clone: patch the entity slug to the requested one and localize the name
  const entKey = section === 'h' ? 'herb' : section === 'y' ? 'asana' : section === 'f' ? 'food' : 'remedy'
  const out = JSON.parse(JSON.stringify(doc)) as Json
  const ent = out[entKey] as Json
  ent.slug = slug
  // server: name/nameAlt swap with language — name=localized, nameAlt=the other
  const repNameEn = slug !== repSlug && variantName ? variantName : (ent.name as string)
  const repNameHi = (ent.nameAlt as string) || ''
  if (lang === 'hi') {
    if (repNameHi) ent.name = repNameHi
    ent.nameAlt = repNameEn
    out.loc = 'hi'
  } else {
    ent.name = repNameEn
  }
  return out
}

// ── daily picks (deterministic fnv1a seeding — mirrors /api/v1/daily) ───────
function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
type DailyCands = { herbs: [string, string, string][]; asanas: [string, string, string][]; foods: [string, string, string][]; remedies: [string, string, string][]; quiz: { id: number; et: string; st: string; stHi?: string; t: string; pub?: string }[] }
function pickRow<T>(cands: T[], nameOf: (r: T) => string, seed: number): T | null {
  const count = cands.length
  if (count === 0) return null
  const idx = seed % count
  for (let w = 0; w < 5; w++) {
    const skip = (idx + w * 200) % count
    for (let i = skip; i < Math.min(skip + 200, count); i++) {
      if (isCleanName(nameOf(cands[i]))) return cands[i]
    }
  }
  return cands[idx] ?? null
}

// ── search (synonym expansion — mirrors /api/v1/search) ─────────────────────
type SearchDoc = { herbs: ISRow[]; yoga: ISRow[]; foods: ISRow[]; conditions: ISCRow[]; homeopathy: ISRow[] }
interface ISRow { s: string; n: string; i?: string | null; m: string; t?: string }
interface ISCRow extends ISRow { nh?: string | null; icd?: string | null }
const CAP = 30
function matches(text: string | null | undefined, terms: string[], raw: string): boolean {
  if (!text) return false
  const t = text.toLowerCase()
  if (t.includes(raw)) return true
  return terms.some((term) => t.includes(term))
}

// ── response helper ──────────────────────────────────────────────────────────
const jsonRes = (obj: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } }))

// ── install ──────────────────────────────────────────────────────────────────
export function installNativeFetch() {
  if (typeof window === 'undefined') return false
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean }; __nativeFetchInstalled?: boolean }
  const native = !!w.Capacitor?.isNativePlatform?.()
  let test = false
  try { test = window.localStorage.getItem('sanjeevani_native_test') === '1' } catch {}
  if (!native && !test) return false
  if (w.__nativeFetchInstalled) return true
  w.__nativeFetchInstalled = true

  const orig = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    let u: URL
    try { u = new URL(url, document.baseURI) } catch { return orig(input as RequestInfo, init) }
    const p = u.pathname
    const method = (init?.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase()

    if (!p.startsWith('/api/v1/')) return orig(input as RequestInfo, init)

    try {
      // ── section lists ────────────────────────────────────────────────────
      if (p === '/api/v1/herbs')
        return jsonRes(await sectionPage('sections/herbs.json', 'herbs', u, {
          matchFields: (r) => [r.name, r.nameHi, r.latinBinomial, r.sanskritName, synJoin(r)].join(' ').toLowerCase(),
          localize: (r, lang) => ({ ...r, name: pickName(lang, r.name as string, r.nameHi as string) }),
        }))
      if (p === '/api/v1/asanas')
        return jsonRes(await sectionPage('sections/yoga.json', 'asanas', u, {
          matchFields: (r) => [r.name, r.nameHi, r.sanskrit, r.category].join(' ').toLowerCase(),
          localize: (r, lang) => ({ ...r, name: pickName(lang, r.name as string, r.nameHi as string) }),
        }))
      if (p === '/api/v1/foods')
        return jsonRes(await sectionPage('sections/nutrition.json', 'foods', u, {
          matchFields: (r) => [r.name, r.nameHi, r.category].join(' ').toLowerCase(),
          category: (r, cat) => r.category === cat,
          localize: (r, lang) => ({ ...r, name: pickName(lang, r.name as string, r.nameHi as string) }),
        }))
      if (p === '/api/v1/homeopathy')
        return jsonRes(await sectionPage('sections/homeopathy.json', 'remedies', u, {
          matchFields: (r) => [r.name, r.nameHi, r.translit, r.latinSource, synJoin(r)].join(' ').toLowerCase(),
          category: (r, cat) => (r.category as string || '').startsWith(cat),
          localize: (r, lang) => ({ ...r, name: pickName(lang, r.name as string, r.nameHi as string) }),
        }))

      // ── details ──────────────────────────────────────────────────────────
      const detailMatch = p.match(/^\/api\/v1\/(herbs|asanas|foods|homeopathy)\/([^/]+)$/)
      if (detailMatch && method === 'GET') {
        const lang = resolveLang(u.searchParams.get('language'))
        const sec = { herbs: 'h', asanas: 'y', foods: 'f', homeopathy: 'r' }[detailMatch[1] as 'herbs']!
        const doc = await detailFor(sec, decodeURIComponent(detailMatch[2]), lang)
        if (!doc) return jsonRes({ error: 'Not found' }, 404)
        return jsonRes(doc)
      }

      // ── search ───────────────────────────────────────────────────────────
      if (p === '/api/v1/search') {
        const q = u.searchParams.get('q') || ''
        const lang = resolveLang(u.searchParams.get('language'))
        const raw = q.toLowerCase().trim()
        if (!raw) return jsonRes({ query: q, expandedTerms: [], herbs: [], yoga: [], foods: [], conditions: [], homeopathy: [] })
        const [doc, synRows] = await Promise.all([load<SearchDoc>('search.json'), load<{ c: string; s: string[] }[]>('synonyms.json')])
        const terms = new Set<string>([raw])
        for (const row of synRows) {
          if (row.c.toLowerCase() === raw || row.s.some((s) => s.toLowerCase() === raw)) {
            terms.add(row.c.toLowerCase())
            row.s.forEach((s) => terms.add(s.toLowerCase()))
          }
        }
        const tl = Array.from(terms)
        const herbHits = doc.herbs.filter((h) => matches(h.m, tl, raw))
        const yogaHits = doc.yoga.filter((a) => matches(a.m, tl, raw))
        const foodHits = doc.foods.filter((f) => matches(f.m, tl, raw))
        const condHits = doc.conditions.filter((c) => matches(c.m, tl, raw))
        const remHits = doc.homeopathy.filter((r) => matches(r.m, tl, raw))
        const expandSyn = async (rows: ISRow[]) => {
          if (!rows.length) return new Map<string, string>()
          const map = await load<Record<string, [string, string]>>('slugmap.json')
          const lists = {
            herbs: (await load<{ herbs: ListRow[] }>('sections/herbs.json')).herbs,
            yoga: (await load<{ asanas: ListRow[] }>('sections/yoga.json')).asanas,
            foods: (await load<{ foods: ListRow[] }>('sections/nutrition.json')).foods,
            homeopathy: (await load<{ remedies: ListRow[] }>('sections/homeopathy.json')).remedies,
          }
          const byRep = new Map<string, ListRow>()
          for (const r of rows) {
            const e = map[`h:${r.s}`] || map[`y:${r.s}`] || map[`f:${r.s}`] || map[`r:${r.s}`]
            if (!e) continue
            const list = e ? (map[`h:${r.s}`] ? lists.herbs : map[`y:${r.s}`] ? lists.yoga : map[`f:${r.s}`] ? lists.foods : lists.homeopathy) : []
            const found = (list as ListRow[]).find((x) => x.slug === e[0])
            if (found && !byRep.has(e[0])) byRep.set(e[0], found)
          }
          return byRep
        }
        const repH = await expandSyn(doc.herbs.filter((h) => matches(h.m, tl, raw)).slice(0, CAP))
        const repY = await expandSyn(doc.yoga.filter((a) => matches(a.m, tl, raw)).slice(0, CAP))
        const repF = await expandSyn(doc.foods.filter((f) => matches(f.m, tl, raw)).slice(0, CAP))
        const repR = await expandSyn(doc.homeopathy.filter((r) => matches(r.m, tl, raw)).slice(0, CAP))
        return jsonRes({
          query: q,
          expandedTerms: tl.filter((t) => t !== raw).slice(0, 8),
          herbs: doc.herbs.filter((h) => matches(h.m, tl, raw)).slice(0, CAP).map((h) => ({ slug: h.s, name: pickName(lang, h.n, repH.get(h.s)?.nameHi as string), sub: repH.get(h.s)?.latinBinomial || '', tier: repH.get(h.s)?.evidenceTier || 'T', image: h.i ?? null })),
          yoga: doc.yoga.filter((a) => matches(a.m, tl, raw)).slice(0, CAP).map((a) => ({ slug: a.s, name: pickName(lang, a.n, repY.get(a.s)?.nameHi as string), sub: (repY.get(a.s)?.sanskrit as string) || '', tier: repY.get(a.s)?.evidenceTier || 'T', image: a.i ?? null })),
          foods: doc.foods.filter((f) => matches(f.m, tl, raw)).slice(0, CAP).map((f) => ({ slug: f.s, name: pickName(lang, f.n, repF.get(f.s)?.nameHi as string), sub: (repF.get(f.s)?.category as string)?.replace(/-/g, ' ') || '', tier: null, image: f.i ?? null })),
          conditions: doc.conditions.filter((c) => matches(c.m, tl, raw)).slice(0, CAP).map((c) => ({ slug: c.s, name: lang === 'hi' ? c.nh || c.n : c.n, sub: c.icd ? `ICD ${c.icd}` : '', tier: c.t || 'T' })),
          homeopathy: doc.homeopathy.filter((r) => matches(r.m, tl, raw)).slice(0, CAP).map((r) => ({ slug: r.s, name: pickName(lang, r.n, repR.get(r.s)?.nameHi as string), sub: repR.get(r.s)?.latinSource || repR.get(r.s)?.category || '', tier: r.t || 'T', image: r.i ?? null })),
        })
      }

      // ── daily ────────────────────────────────────────────────────────────
      if (p === '/api/v1/daily') {
        const lang = resolveLang(u.searchParams.get('language'))
        const date = todayKey()
        const d = await load<DailyCands>('daily.json')
        const h = pickRow(d.herbs, (r) => r[1], fnv1a(date + ':herb'))
        const a = pickRow(d.asanas, (r) => r[1], fnv1a(date + ':asana'))
        const f = pickRow(d.foods, (r) => r[1], fnv1a(date + ':food'))
        const r = pickRow(d.remedies, (r) => r[1], fnv1a(date + ':remedy'))
        // quiz — deterministic per date, mirrors server loop
        const quiz: Json[] = []
        {
          const qc = d.quiz
          const quizCount = qc.length
          const used = new Set<number>()
          let guard = 0
          while (quiz.length < 3 && guard < 12 && used.size < quizCount) {
            guard++
            const skip = fnv1a(`${date}:quiz:${guard}`) % quizCount
            if (used.has(skip)) continue
            used.add(skip)
            const c = qc[skip]
            if (!c) continue
            const labels: Record<string, [string, string]> = { herb: ['Herb', 'जड़ी-बूटी'], yoga: ['Yoga', 'योग'], nutrition: ['Nutrition', 'पोषण'], homeopathy: ['Homeopathy', 'होम्योपैथी'], condition: ['Condition', 'स्थिति'] }
            const [en, hi] = labels[c.et] || ['Entry', 'प्रविष्टि']
            quiz.push({ id: c.id, entity: lang === 'hi' ? hi : en, statement: lang === 'hi' && c.stHi ? c.stHi : c.st, answer: c.t, source: c.pub })
          }
        }
        // display shapes resolved through lists + details (lazy)
        const listFiles = ['sections/herbs.json', 'sections/yoga.json', 'sections/nutrition.json', 'sections/homeopathy.json'] as const
        const [LH, LY, LF, LR] = await Promise.all(listFiles.map((f) => load<Json>(f)))
        const pick = async (section: string, row: [string, string, string] | null) => {
          if (!row) return null
          const [slug, nameEn, nameHi] = row
          const map = await load<Record<string, [string, string]>>('slugmap.json')
          const prefix = ({ herbs: 'h', yoga: 'y', nutrition: 'f', homeopathy: 'r' } as Record<string, string>)[section]!
          const e = map[prefix + ':' + slug]
          const rep = e ? e[0] : slug
          const listKey = ({ herbs: 'herbs', yoga: 'asanas', nutrition: 'foods', homeopathy: 'remedies' } as Record<string, string>)[section]!
          const listDoc = ({ herbs: LH, yoga: LY, nutrition: LF, homeopathy: LR } as Record<string, Json>)[section]!
          let item = (listDoc[listKey] as ListRow[]).find((x) => x.slug === rep)
          // details blurb lookup (export files are keyed by rep slug)
          const detFile = ({ herbs: 'details/herbs.json', yoga: 'details/yoga.json', nutrition: 'details/nutrition.json', homeopathy: 'details/homeopathy.json' } as Record<string, string>)[section]!
          const det = (await load<Json>(detFile))[rep] as Json | undefined
          let blurb: string | null = null
          if (det) {
            const ent = (det[section === 'herbs' ? 'herb' : section === 'yoga' ? 'asana' : section === 'nutrition' ? 'food' : 'remedy'] as Json) || {}
            blurb = (ent.description as string) || (ent.usesBenefits as string) || null
            if (section === 'nutrition') blurb = (ent.usesBenefits as string) || (ent.description as string) || null
          }
          if (!item) {
            // representative missing from list (rare) — build a minimal row
            item = { slug, name: nameEn, nameHi, category: '', evidenceTier: 'T' }
          }
          return {
            section,
            slug,
            name: pickName(lang, nameEn, nameHi) || (item.name as string),
            sub: section === 'herbs' ? (item.sanskritName as string) || (item.latinBinomial as string) || '' : section === 'yoga' ? (item.sanskrit as string) || '' : section === 'nutrition' ? (item.category as string) || '' : (item.translit as string) || (item.latinSource as string) || (item.category as string) || '',
            tier: (item.evidenceTier as string) || 'T',
            category: (item.category as string) || '',
            image: (item.image as string) ?? null,
            blurb,
          }
        }
        const [pH, pA, pF, pR] = await Promise.all([pick('herbs', h), pick('yoga', a), pick('nutrition', f), pick('homeopathy', r)])
        return jsonRes({ date, picks: { herb: pH, asana: pA, food: pF, remedy: pR }, quiz })
      }

      // ── stats / conditions ───────────────────────────────────────────────
      if (p === '/api/v1/stats') return jsonRes(await load<Json>('stats.json'))
      if (p === '/api/v1/conditions') {
        const lang = resolveLang(u.searchParams.get('language'))
        const doc = await load<{ conditions: Json[] }>('conditions.json')
        return jsonRes({ conditions: doc.conditions.map((c) => ({ ...c, name: lang === 'hi' ? (c.nameHi as string) || (c.name as string) : c.name })) })
      }

      // ── interactions checker ─────────────────────────────────────────────
      if (p === '/api/v1/interactions/check' && method === 'POST') {
        let body: { herbs?: string[]; medications?: string[] } = {}
        try { body = JSON.parse(String(init?.body || '{}')) } catch {}
        const herbs = (body.herbs || []).map((x) => x.toLowerCase().trim()).filter(Boolean)
        const medications = (body.medications || []).map((x) => x.toLowerCase().trim()).filter(Boolean)
        if (!herbs.length || !medications.length)
          return jsonRes({ error: 'Both herbs[] and medications[] are required' }, 400)
        const norm = (s: string) => s.toLowerCase().replace(/[-_]+/g, ' ').trim()
        const { index, rules } = await load<{ index: { slug: string; terms: string[] }[]; rules: Json[] }>('interactions.json')
        const herbKeys = new Set<string>()
        for (const h of herbs) {
          herbKeys.add(norm(h))
          for (const entry of index) {
            const hit = entry.terms.some((t) => t === norm(h) || t.includes(norm(h)) || norm(h).includes(t))
            if (hit) herbKeys.add(norm(entry.slug))
          }
        }
        const byHerb = rules.filter((r) => {
          const slug = norm(r.herbSlug as string)
          return herbKeys.has(slug) || Array.from(herbKeys).some((k) => k.length > 3 && (slug.includes(k) || k.includes(slug)))
        })
        const matchesR = byHerb.filter(
          (r) => medications.some((m) => m.includes(r.medicationPattern as string)) || medications.some((m) => (r.medicationPattern as string).includes(m))
        )
        if (!matchesR.length)
          return jsonRes({
            interaction_found: false, severity: 'none',
            description: 'No known interactions for this combination in the current screening database. Absence of data is not proof of safety.',
            actionable_advice: 'Always inform your prescribing physician about all supplements you take. If you feel unwell after combining, stop the supplement and seek advice.',
            matches: [],
          })
        const RANK: Record<string, number> = { high: 3, moderate: 2, mild: 1 }
        matchesR.sort((a, b) => (RANK[b.severity as string] ?? 0) - (RANK[a.severity as string] ?? 0))
        const worst = matchesR[0]
        return jsonRes({
          interaction_found: true, severity: worst.severity,
          description: worst.descriptionEn, actionable_advice: worst.adviceEn,
          matches: matchesR.map((m) => ({ herb: m.herbSlug, medication: m.medicationLabel, severity: m.severity, description: m.descriptionEn, actionable_advice: m.adviceEn, sources: m.sources || [] })),
        })
      }

      // ── consent ledger (device-local no-op) ──────────────────────────────
      if (p === '/api/v1/consent') {
        if (method === 'POST') {
          let body: Json = {}
          try { body = JSON.parse(String(init?.body || '{}')) } catch {}
          return jsonRes({ entry: { clientId: body.clientId || '', purpose: body.purpose || '', status: body.granted ? 'granted' : 'revoked', grantedAt: new Date().toISOString(), revokedAt: null } })
        }
        if (method === 'DELETE') return jsonRes({ erased: 0 })
        return jsonRes({ entries: [] })
      }

      // ── everything else: translate / admin → 404 (graceful fallbacks) ────
      return jsonRes({ error: 'Not available offline' }, 404)
    } catch (e) {
      console.error('[native-data]', p, e)
      return jsonRes({ error: 'native data error' }, 500)
    }
  }
  return true
}

// Auto-install at import time (module side effect) so the shim is active
// before any component effect issues an API call.
installNativeFetch()
