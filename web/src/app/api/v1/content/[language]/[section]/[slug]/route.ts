// GET /api/v1/content/{language}/{section}/{slug}
// Spec contract (§3): language-resolved content with evidence_summary,
// safety_flags, linked_yoga, reviewer and review dates.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseJ, pickItem, tierMapFor, HOMEOPATHY_DISCLAIMER, type Lang, type BilingualItem } from '@/lib/server/content'

const SECTIONS = ['herbs', 'yoga', 'nutrition', 'conditions', 'homeopathy'] as const

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ language: string; section: string; slug: string }> }
) {
  const { language, section, slug } = await ctx.params
  if (!SECTIONS.includes(section as (typeof SECTIONS)[number])) {
    return NextResponse.json({ error: `Unknown section '${section}'` }, { status: 404 })
  }
  if (language !== 'en' && language !== 'hi') {
    return NextResponse.json({ error: `Unsupported language '${language}'` }, { status: 404 })
  }
  const lang = language as Lang

  if (section === 'herbs') {
    const herb = await db.herb.findUnique({ where: { slug } })
    if (!herb) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const claims = await db.claim.findMany({
      where: { entityType: 'herb', entityId: herb.id, workflowStatus: 'published' },
      orderBy: { evidenceTier: 'asc' },
    })
    const tiers = await tierMapFor('herb', [herb.id])
    const safety = parseJ<BilingualFlagShaped | null>(herb.safetyFlags, null)
    const topClaim = claims[0]
    const yogaSlugs = parseJ<string[]>(herb.linkedYogaSlugs, [])
    const linkedYoga = yogaSlugs.length
      ? await db.asana.findMany({ where: { slug: { in: yogaSlugs } }, select: { slug: true, nameEn: true, nameSanskrit: true } })
      : []

    return NextResponse.json({
      slug: herb.slug,
      language: lang,
      title: lang === 'hi' ? `${herb.commonNameHi} (${herb.commonNameEn} — ${herb.latinBinomial})` : `${herb.commonNameEn} (${herb.latinBinomial})`,
      evidence_summary: {
        tier: tiers.get(herb.id) ?? 'T',
        description: topClaim
          ? lang === 'hi' && topClaim.statementHi
            ? topClaim.statementHi
            : topClaim.statement
          : '',
      },
      safety_flags: safety
        ? {
            pregnancy: pickItem(lang, safety.pregnancy),
            dose_limit: pickItem(lang, safety.doseLimit),
            interactions: safety.interactions,
          }
        : {},
      linked_yoga: linkedYoga.map((y) => ({ name: y.nameSanskrit || y.nameEn, slug: y.slug })),
      reviewer: topClaim ? { name: topClaim.reviewerName, credentials: topClaim.reviewerCredentials } : null,
      last_reviewed: topClaim ? topClaim.lastReviewedDate.toISOString().slice(0, 10) : null,
    })
  }

  if (section === 'yoga') {
    const asana = await db.asana.findUnique({ where: { slug } })
    if (!asana) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const claims = await db.claim.findMany({
      where: { entityType: 'yoga', entityId: asana.id, workflowStatus: 'published' },
      orderBy: { evidenceTier: 'asc' },
    })
    const tiers = await tierMapFor('yoga', [asana.id])
    const topClaim = claims[0]
    return NextResponse.json({
      slug: asana.slug,
      language: lang,
      title: lang === 'hi' ? `${asana.nameHi || asana.nameEn} (${asana.nameSanskrit})` : `${asana.nameEn} (${asana.nameSanskrit})`,
      evidence_summary: {
        tier: tiers.get(asana.id) ?? 'T',
        description: topClaim ? (lang === 'hi' && topClaim.statementHi ? topClaim.statementHi : topClaim.statement) : '',
      },
      safety_flags: {
        contraindications: parseJ<BilingualItem[]>(asana.contraindications, []).map((c) => pickItem(lang, c)),
      },
      linked_yoga: [],
      reviewer: topClaim ? { name: topClaim.reviewerName, credentials: topClaim.reviewerCredentials } : null,
      last_reviewed: topClaim ? topClaim.lastReviewedDate.toISOString().slice(0, 10) : null,
    })
  }

  if (section === 'homeopathy') {
    const remedy = await db.homeopathyRemedy.findUnique({ where: { slug } })
    if (!remedy) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const claims = await db.claim.findMany({
      where: { entityType: 'homeopathy', entityId: remedy.id, workflowStatus: 'published' },
      orderBy: { evidenceTier: 'asc' },
    })
    const topClaim = claims[0]
    return NextResponse.json({
      slug: remedy.slug,
      language: lang,
      title: lang === 'hi' ? `${remedy.nameHi} (${remedy.nameEn})` : `${remedy.nameEn} (${remedy.latinSource || remedy.category})`,
      evidence_summary: {
        tier: remedy.evidenceTier,
        // DMR Act 1954: the consensus statement, not the materia medica claim, is the lead text.
        description: HOMEOPATHY_DISCLAIMER[lang],
        indications: remedy.indications,
      },
      safety_flags: {
        dmr_disclaimer_required: true,
        safety_level: remedy.safetyLevel,
        emergency_warning: remedy.emergencyWarning,
      },
      linked_yoga: [],
      potency_dosage: remedy.potencyDosage,
      reviewer: topClaim ? { name: topClaim.reviewerName, credentials: topClaim.reviewerCredentials } : null,
      last_reviewed: topClaim ? topClaim.lastReviewedDate.toISOString().slice(0, 10) : null,
    })
  }

  if (section === 'conditions') {
    const condition = await db.condition.findUnique({ where: { slug } })
    if (!condition) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const claims = await db.claim.findMany({
      where: { entityType: 'condition', entityId: condition.id, workflowStatus: 'published' },
    })
    const tiers = await tierMapFor('condition', [condition.id])
    const topClaim = claims[0]
    return NextResponse.json({
      slug: condition.slug,
      language: lang,
      title: lang === 'hi' ? condition.nameHi : condition.nameEn,
      evidence_summary: {
        tier: tiers.get(condition.id) ?? 'T',
        description: topClaim ? topClaim.statement : condition.description || '',
      },
      safety_flags: {},
      linked_yoga: [],
      codes: { namaste: condition.namasteCode, icd: condition.icdCode, tm2: condition.tm2Category },
      reviewer: topClaim ? { name: topClaim.reviewerName, credentials: topClaim.reviewerCredentials } : null,
      last_reviewed: topClaim ? topClaim.lastReviewedDate.toISOString().slice(0, 10) : null,
    })
  }

  // nutrition — slug is a food slug
  const food = await db.food.findUnique({ where: { slug } })
  if (!food) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    slug: food.slug,
    language: lang,
    title: lang === 'hi' ? food.nameHi : food.nameEn,
    composition_per_100g: {
      serving_size_g: food.servingSizeG,
      calories: food.calories,
      protein_g: food.proteinG,
      carbs_g: food.carbsG,
      fat_g: food.fatG,
      fiber_g: food.fiberG,
      micronutrients: parseJ<Record<string, number>>(food.micronutrients, {}),
    },
    // catalog enrichment (excel_v1_2026-10-03)
    scientific_class: food.scientificClass,
    description: food.description,
    uses_benefits: food.usesBenefits,
    serving_guidance: food.servingGuidance,
    precautions: food.precautions,
    evidence_grade: food.evidenceGrade,
    safety_level: food.safetyLevel,
    source: food.source,
  })
}

type BilingualFlagShaped = {
  pregnancy: BilingualItem
  children: BilingualItem
  doseLimit: BilingualItem
  interactions: string[]
  warnings: BilingualItem[]
}
