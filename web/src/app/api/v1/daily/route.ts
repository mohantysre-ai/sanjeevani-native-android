// GET /api/v1/daily — deterministic daily picks + evidence quiz (seeded by date).
// Same date → same content for every user; new content at local midnight.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseJ, pick } from '@/lib/server/content'
import { localizedField, localizedName, resolveContentLang, translationsFor } from '@/lib/server/i18n'

function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// clean display-name filter: v4 catalog has per-row variant pages whose names
// carry qualifiers ("Nettle - Modern", "Melatonin )") — the Daily Dose hero
// should only feature primary-looking entries.
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

async function pickRow(
  table: 'herb' | 'asana' | 'food' | 'homeopathyRemedy',
  where: Record<string, unknown>,
  seed: number
): Promise<unknown | null> {
  const table2 = db[table] as typeof db.herb
  const count = await table2.count({ where })
  if (count === 0) return null
  const idx = seed % count
  // scan up to 5 windows of 200 candidates from the seed offset for a clean
  // primary name (v4 is variant-heavy; primary rows are the minority)
  for (let w = 0; w < 5; w++) {
    const skip = (idx + w * 200) % count
    const rows = await table2.findMany({ where, take: 200, skip })
    for (const r of rows) {
      const name = (table === 'herb' ? (r as unknown as { commonNameEn: string }).commonNameEn : (r as unknown as { nameEn: string }).nameEn) || ''
      if (isCleanName(name)) return r
    }
  }
  const rows = await table2.findMany({ where, take: 1, skip: idx })
  return rows[0] ?? null
}

export async function GET(req: NextRequest) {
  const lang = resolveContentLang(req.nextUrl.searchParams.get('language'))
  const date = todayKey()

  const [herb, asana, food, remedy] = await Promise.all([
    pickRow('herb', { safetyLevel: { not: 'restricted' } }, fnv1a(date + ':herb')),
    pickRow('asana', {}, fnv1a(date + ':asana')),
    pickRow('food', {}, fnv1a(date + ':food')),
    pickRow('homeopathyRemedy', { emergencyWarning: false }, fnv1a(date + ':remedy')),
  ])

  const h = herb as Awaited<ReturnType<typeof db.herb.findFirst>> | null
  const a = asana as Awaited<ReturnType<typeof db.asana.findFirst>> | null
  const f = food as Awaited<ReturnType<typeof db.food.findFirst>> | null
  const r = remedy as Awaited<ReturnType<typeof db.homeopathyRemedy.findFirst>> | null

  // ── Evidence quiz: 3 published claims, deterministic per date ──────────
  // Prefer herb/yoga/nutrition claims (teach evidence literacy) over the
  // symptom-list style homeopathy indication texts.
  const quizBase = {
    workflowStatus: 'published',
  } as const
  const quizWhere = {
    ...quizBase,
    entityType: { in: ['herb', 'nutrition', 'yoga'] },
  }
  let quizCount = await db.claim.count({ where: quizWhere })
  let where: Record<string, unknown> = quizWhere
  if (quizCount < 3) {
    where = { ...quizBase, evidenceTier: { in: ['A', 'B', 'C', 'T'] } }
    quizCount = await db.claim.count({ where })
  }
  const quiz: unknown[] = []
  if (quizCount > 0) {
    const used = new Set<number>()
    let guard = 0
    while (quiz.length < 3 && guard < 12 && used.size < quizCount) {
      guard++
      const skip = fnv1a(`${date}:quiz:${guard}`) % quizCount
      if (used.has(skip)) continue
      used.add(skip)
      const rows = await db.claim.findMany({ where, take: 1, skip })
      const c = rows[0]
      if (!c) continue
      if (c.statement.length < 40 || c.statement.length > 260) continue
      const src = parseJ<{ title: string; publisher: string; year: number }[]>(c.sources, [])[0]
      quiz.push({
        id: c.id,
        entity:
          pick(lang, { herb: 'Herb', yoga: 'Yoga', nutrition: 'Nutrition', homeopathy: 'Homeopathy', condition: 'Condition' }[c.entityType] || 'Entry', {
            herb: 'जड़ी-बूटी',
            yoga: 'योग',
            nutrition: 'पोषण',
            homeopathy: 'होम्योपैथी',
            condition: 'स्थिति',
          }[c.entityType] || 'प्रविष्टि'),
        statement: pick(lang, c.statement, c.statementHi || c.statement),
        answer: c.evidenceTier,
        source: src ? src.publisher : undefined,
      })
    }
  }

  // per-section translation merge for the four picks
  const trH = h ? (await translationsFor('herbs', [h.slug], lang)).get(h.slug) : undefined
  const trA = a ? (await translationsFor('yoga', [a.slug], lang)).get(a.slug) : undefined
  const trF = f ? (await translationsFor('foods', [f.slug], lang)).get(f.slug) : undefined
  const trR = r ? (await translationsFor('homeopathy', [r.slug], lang)).get(r.slug) : undefined

  return NextResponse.json({
    date,
    picks: {
      herb: h
        ? {
            section: 'herbs',
            slug: h.slug,
            name: localizedName(trH, h.commonNameEn, h.commonNameHi, lang),
            sub: h.sanskritName || h.latinBinomial,
            tier: h.evidenceGrade || 'T',
            category: h.category,
            image: h.imageUrl,
            blurb: localizedField(trH, 'description', h.description) || null,
          }
        : null,
      asana: a
        ? {
            section: 'yoga',
            slug: a.slug,
            name: localizedName(trA, a.nameEn, a.nameHi, lang),
            sub: a.nameSanskrit,
            tier: a.evidenceGrade || 'T',
            category: a.category,
            image: a.imageUrl,
            blurb: localizedField(trA, 'description', a.description) || null,
          }
        : null,
      food: f
        ? {
            section: 'nutrition',
            slug: f.slug,
            name: localizedName(trF, f.nameEn, f.nameHi, lang),
            sub: f.scientificClass || f.category,
            tier: f.evidenceGrade || 'T',
            category: f.category,
            image: f.imageUrl,
            blurb: localizedField(trF, 'usesBenefits', f.usesBenefits) || f.description || null,
            calories: f.calories,
          }
        : null,
      remedy: r
        ? {
            section: 'homeopathy',
            slug: r.slug,
            name: localizedName(trR, r.nameEn, r.nameHi || r.nameEn, lang),
            sub: r.nameTranslit || r.latinSource || r.category,
            tier: r.evidenceTier,
            category: r.category,
            image: r.imageUrl,
            blurb: localizedField(trR, 'description', r.description) || null,
          }
        : null,
    },
    quiz,
  })
}
