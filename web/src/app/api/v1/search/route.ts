// GET /api/v1/search?q=&language=
// Multi-lingual search with synonym expansion (Meilisearch substitute in sandbox).
// Spec (§5): "haldi", "मल्टीविटामिन", "Curcuma longa" all resolve via synonym dictionary.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseJ, tierMapFor } from '@/lib/server/content'
import { localizedName, resolveContentLang, translationsFor } from '@/lib/server/i18n'

async function expandQuery(q: string): Promise<string[]> {
  const lower = q.toLowerCase().trim()
  const terms = new Set<string>([lower])
  const synRows = await db.synonym.findMany()
  for (const row of synRows) {
    const syns = parseJ<string[]>(row.synonyms, [])
    if (row.canonical.toLowerCase() === lower || syns.some((s) => s.toLowerCase() === lower)) {
      terms.add(row.canonical.toLowerCase())
      syns.forEach((s) => terms.add(s.toLowerCase()))
    }
  }
  // also partial word seeds (e.g. "hald" still finds haldi via prefix matching below)
  return Array.from(terms)
}

function matches(text: string | null | undefined, terms: string[], raw: string): boolean {
  if (!text) return false
  const t = text.toLowerCase()
  if (t.includes(raw)) return true
  return terms.some((term) => t.includes(term))
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || ''
  const lang = resolveContentLang(req.nextUrl.searchParams.get('language'))
  const raw = q.toLowerCase().trim()
  if (!raw) return NextResponse.json({ herbs: [], yoga: [], foods: [], conditions: [], homeopathy: [] })

  const terms = await expandQuery(q)
  // mobile search cap: 30 hits per section keeps every response well under
  // ~80 KB even for one-letter queries (low-bandwidth guard)
  const CAP = 30

  const [herbs, asanas, foods, conditions, remedies] = await Promise.all([
    db.herb.findMany(),
    db.asana.findMany(),
    db.food.findMany(),
    db.condition.findMany(),
    db.homeopathyRemedy.findMany(),
  ])

  const herbHits = herbs.filter((h) => {
    const syns = parseJ<string[]>(h.synonyms, []).join(' ').toLowerCase()
    return (
      matches(h.commonNameEn, terms, raw) ||
      matches(h.commonNameHi, terms, raw) ||
      matches(h.latinBinomial, terms, raw) ||
      matches(h.sanskritName, terms, raw) ||
      matches(syns, terms, raw)
    )
  })
  const yogaHits = asanas.filter((a) =>
    matches(a.nameEn, terms, raw) || matches(a.nameSanskrit, terms, raw) || matches(a.nameHi, terms, raw) || matches(a.category, terms, raw)
  )
  const foodHits = foods.filter((f) => matches(f.nameEn, terms, raw) || matches(f.nameHi, terms, raw))
  const conditionHits = conditions.filter((c) =>
    matches(c.nameEn, terms, raw) || matches(c.nameHi, terms, raw) || matches(c.description, terms, raw)
  )
  const remedyHits = remedies.filter((r) => {
    const syns = parseJ<string[]>(r.synonyms, []).join(' ').toLowerCase()
    return (
      matches(r.nameEn, terms, raw) ||
      matches(r.nameHi, terms, raw) ||
      matches(r.latinSource, terms, raw) ||
      matches(r.category, terms, raw) ||
      matches(syns, terms, raw)
    )
  })

  const herbTiers = await tierMapFor('herb', herbHits.map((h) => h.id))
  const yogaTiers = await tierMapFor('yoga', yogaHits.map((a) => a.id))
  const condTiers = await tierMapFor('condition', conditionHits.map((c) => c.id))

  const herbTop = herbHits.slice(0, CAP)
  const yogaTop = yogaHits.slice(0, CAP)
  const foodTop = foodHits.slice(0, CAP)
  const condTop = conditionHits.slice(0, CAP)
  const remedyTop = remedyHits.slice(0, CAP)

  const [trH, trY, trF, trC, trR] = await Promise.all([
    translationsFor('herbs', herbTop.map((h) => h.slug), lang),
    translationsFor('yoga', yogaTop.map((a) => a.slug), lang),
    translationsFor('foods', foodTop.map((f) => f.slug), lang),
    Promise.resolve(new Map()),
    translationsFor('homeopathy', remedyTop.map((r) => r.slug), lang),
  ])

  return NextResponse.json({
    query: q,
    expandedTerms: terms.filter((t) => t !== raw).slice(0, 8),
    herbs: herbTop.map((h) => ({
      slug: h.slug,
      name: localizedName(trH.get(h.slug), h.commonNameEn, h.commonNameHi, lang),
      sub: h.latinBinomial,
      tier: herbTiers.get(h.id) ?? 'T',
      image: h.imageUrl,
    })),
    yoga: yogaTop.map((a) => ({
      slug: a.slug,
      name: localizedName(trY.get(a.slug), a.nameEn, a.nameHi, lang),
      sub: a.nameSanskrit,
      tier: yogaTiers.get(a.id) ?? 'T',
      image: a.imageUrl,
    })),
    foods: foodTop.map((f) => ({
      slug: f.slug,
      name: localizedName(trF.get(f.slug), f.nameEn, f.nameHi, lang),
      sub: f.calories != null ? `${f.calories} kcal / 100 g` : (f.category || '').replace(/-/g, ' '),
      tier: null,
      image: f.imageUrl,
    })),
    conditions: condTop.map((c) => ({
      slug: c.slug,
      name: lang === 'hi' ? c.nameHi || c.nameEn : c.nameEn,
      sub: c.icdCode ? `ICD ${c.icdCode}` : '',
      tier: condTiers.get(c.id) ?? 'T',
    })),
    homeopathy: remedyTop.map((r) => ({
      slug: r.slug,
      name: localizedName(trR.get(r.slug), r.nameEn, r.nameHi, lang),
      sub: r.latinSource || r.category,
      tier: r.evidenceTier,
      image: r.imageUrl,
    })),
  })
}
