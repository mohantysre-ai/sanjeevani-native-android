// GET /api/v1/asanas/[slug] — full asana profile
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseJ, pickItem, tierMapFor, type BilingualItem } from '@/lib/server/content'
import { localizedField, localizedName, resolveContentLang, translationsFor } from '@/lib/server/i18n'

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const lang = resolveContentLang(req.nextUrl.searchParams.get('language'))

  const asana = await db.asana.findUnique({ where: { slug } })
  if (!asana) return NextResponse.json({ error: 'Asana not found' }, { status: 404 })

  const claims = await db.claim.findMany({
    where: { entityType: 'yoga', entityId: asana.id, workflowStatus: 'published' },
  })
  const tiers = await tierMapFor('yoga', [asana.id])
  const tr = (await translationsFor('yoga', [slug], lang)).get(slug)

  return NextResponse.json({
    loc: tr ? lang : 'en',
    asana: {
      slug: asana.slug,
      name: localizedName(tr, asana.nameEn, asana.nameHi, lang),
      sanskrit: asana.nameSanskrit,
      category: asana.category,
      difficulty: asana.difficultyLevel,
      description: localizedField(tr, 'description', asana.description),
      instructions: localizedField(tr, 'instructions', asana.instructions),
      precautions: localizedField(tr, 'precautions', asana.precautions),
      evidenceGrade: asana.evidenceGrade,
      sourceUrl: asana.sourceUrl,
      image: asana.imageUrl,
      contraindications: parseJ<BilingualItem[]>(asana.contraindications, []).map((c) => pickItem(lang, c)),
      benefits: parseJ<BilingualItem[]>(asana.benefits, []).map((b) => pickItem(lang, b)),
      evidenceTier: tiers.get(asana.id) ?? 'T',
      claims: claims.map((c) => ({
        id: c.id,
        statement: lang === 'hi' && c.statementHi ? c.statementHi : c.statement,
        tier: c.evidenceTier,
        sources: parseJ<{ title: string; publisher: string; year: number }[]>(c.sources, []),
        reviewer: { name: c.reviewerName, credentials: c.reviewerCredentials },
        lastReviewed: c.lastReviewedDate,
        nextReview: c.nextReviewDate,
      })),
    },
  })
}
