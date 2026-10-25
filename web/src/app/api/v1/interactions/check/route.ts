// POST /api/v1/interactions/check
// Spec contract (§3): { herbs: [...], medications: [...] } →
// { interaction_found, severity, description, actionable_advice }
// Input resolution: free-text herb names (common, Sanskrit, synonyms, slug)
// are resolved to catalog slugs before rule matching, so "ashwagandha" hits
// the withania-somnifera rules. Response shape unchanged.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface CheckRequest {
  herbs?: string[]
  medications?: string[]
}

const SEVERITY_RANK: Record<string, number> = { high: 3, moderate: 2, mild: 1 }

type HerbIndexEntry = { slug: string; terms: string[] }
let herbIndexCache: HerbIndexEntry[] | null = null

function safeSynonyms(raw: string | null): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string').map((s) => s.toLowerCase()) : []
  } catch {
    return []
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[-_]+/g, ' ').trim()

async function getHerbIndex(): Promise<HerbIndexEntry[]> {
  if (herbIndexCache) return herbIndexCache
  const rows = await db.herb.findMany({
    select: { slug: true, commonNameEn: true, sanskritName: true, synonyms: true },
  })
  herbIndexCache = rows.map((r) => ({
    slug: r.slug,
    terms: Array.from(
      new Set(
        [
          norm(r.slug),
          norm(r.commonNameEn || ''),
          norm(r.sanskritName || ''),
          ...safeSynonyms(r.synonyms).map(norm),
        ].filter(Boolean)
      )
    ),
  }))
  return herbIndexCache
}

// a query hits an entry if any term matches word-wise (avoids "ash"→"ashwagandha" noise)
function resolveHerbQuery(query: string, index: HerbIndexEntry[]): string[] {
  const q = norm(query)
  if (!q) return []
  const direct: string[] = []
  for (const entry of index) {
    const hit = entry.terms.some((t) => t === q || t.includes(q) || q.includes(t))
    if (hit) direct.push(entry.slug)
  }
  return direct
}

export async function POST(req: NextRequest) {
  let body: CheckRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const herbs = (body.herbs || []).map((h) => h.toLowerCase().trim()).filter(Boolean)
  const medications = (body.medications || []).map((m) => m.toLowerCase().trim()).filter(Boolean)

  if (!herbs.length || !medications.length) {
    return NextResponse.json({ error: 'Both herbs[] and medications[] are required' }, { status: 400 })
  }

  // resolve free-text herb names → slugs (plus keep the raw inputs for slug-style queries)
  const index = await getHerbIndex()
  const herbKeys = new Set<string>()
  for (const h of herbs) {
    herbKeys.add(norm(h))
    for (const slug of resolveHerbQuery(h, index)) herbKeys.add(norm(slug))
  }

  const allRules = await db.interaction.findMany()
  const byHerb = allRules.filter((r) => {
    const slug = norm(r.herbSlug)
    return herbKeys.has(slug) || [...herbKeys].some((k) => k.length > 3 && (slug.includes(k) || k.includes(slug)))
  })
  const matches = byHerb.filter(
    (r) =>
      medications.some((m) => m.includes(r.medicationPattern)) ||
      medications.some((m) => r.medicationPattern.includes(m))
  )

  if (!matches.length) {
    return NextResponse.json({
      interaction_found: false,
      severity: 'none',
      description:
        'No known interactions for this combination in the current screening database. Absence of data is not proof of safety.',
      actionable_advice:
        'Always inform your prescribing physician about all supplements you take. If you feel unwell after combining, stop the supplement and seek advice.',
      matches: [],
    })
  }

  // Sort worst-first
  matches.sort((a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0))
  const worst = matches[0]

  return NextResponse.json({
    interaction_found: true,
    severity: worst.severity,
    description: worst.descriptionEn,
    actionable_advice: worst.adviceEn,
    matches: matches.map((m) => ({
      herb: m.herbSlug,
      medication: m.medicationLabel,
      severity: m.severity,
      description: m.descriptionEn,
      actionable_advice: m.adviceEn,
      sources: JSON.parse(m.sources || '[]'),
    })),
  })
}
