// GET /api/v1/foods/[slug] — mobile food detail (macros + catalog enrichment + claims)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseJ } from '@/lib/server/content'
import { localizedField, localizedName, resolveContentLang, translationsFor } from '@/lib/server/i18n'

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const lang = resolveContentLang(req.nextUrl.searchParams.get('language'))

  const f = await db.food.findUnique({ where: { slug } })
  if (!f) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const claims = await db.claim.findMany({
    where: { entityType: 'nutrition', entityId: f.id, workflowStatus: 'published' },
    orderBy: { evidenceTier: 'asc' },
    take: 12,
  })

  const tr = (await translationsFor('foods', [slug], lang)).get(slug)

  return NextResponse.json({
    loc: tr ? lang : 'en',
    food: {
      slug: f.slug,
      name: localizedName(tr, f.nameEn, f.nameHi, lang),
      nameAlt: lang === 'en' ? f.nameHi : f.nameEn,
      category: f.category,
      scientificClass: f.scientificClass,
      servingSizeG: f.servingSizeG,
      calories: f.calories,
      proteinG: f.proteinG,
      carbsG: f.carbsG,
      fatG: f.fatG,
      fiberG: f.fiberG,
      micronutrients: parseJ<Record<string, number>>(f.micronutrients, {}),
      description: localizedField(tr, 'description', f.description),
      usesBenefits: localizedField(tr, 'usesBenefits', f.usesBenefits),
      servingGuidance: localizedField(tr, 'servingGuidance', f.servingGuidance),
      precautions: localizedField(tr, 'precautions', f.precautions),
      evidenceGrade: f.evidenceGrade,
      safetyLevel: f.safetyLevel,
      sourceUrl: f.sourceUrl,
      image: f.imageUrl,
      sourceNote: f.source,
    },
    claims: claims.map((c) => ({
      id: c.id,
      statement: lang === 'hi' && c.statementHi ? c.statementHi : c.statement,
      tier: c.evidenceTier,
      sources: parseJ<{ title: string; publisher: string; year: number }[]>(c.sources, []).map((s) => ({
        title: s.title,
        publisher: s.publisher,
        year: s.year,
      })),
      reviewer: { name: c.reviewerName, credentials: c.reviewerCredentials },
      lastReviewed: c.lastReviewedDate.toISOString(),
      nextReview: c.nextReviewDate.toISOString(),
    })),
  })
}
