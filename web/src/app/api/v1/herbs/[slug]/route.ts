// GET /api/v1/herbs/[slug] — full herb profile (published claims only)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseJ, pickItem, tierMapFor } from '@/lib/server/content'
import { localizedField, localizedName, resolveContentLang, translationsFor } from '@/lib/server/i18n'

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const lang = resolveContentLang(req.nextUrl.searchParams.get('language'))

  const herb = await db.herb.findUnique({ where: { slug } })
  if (!herb) return NextResponse.json({ error: 'Herb not found' }, { status: 404 })

  const claims = await db.claim.findMany({
    where: { entityType: 'herb', entityId: herb.id, workflowStatus: 'published' },
    orderBy: { evidenceTier: 'asc' },
  })
  const tiers = await tierMapFor('herb', [herb.id])
  const tr = (await translationsFor('herbs', [slug], lang)).get(slug)

  const yogaSlugs = parseJ<string[]>(herb.linkedYogaSlugs, [])
  const linkedYoga = yogaSlugs.length
    ? await db.asana.findMany({
        where: { slug: { in: yogaSlugs } },
        select: { slug: true, nameEn: true, nameSanskrit: true, nameHi: true },
      })
    : []

  return NextResponse.json({
    loc: tr ? lang : 'en',
    herb: {
      slug: herb.slug,
      name: localizedName(tr, herb.commonNameEn, herb.commonNameHi, lang),
      nameAlt: lang === 'en' ? herb.commonNameHi : herb.commonNameEn,
      latinBinomial: herb.latinBinomial,
      sanskritName: herb.sanskritName,
      synonyms: parseJ<string[]>(herb.synonyms, []),
      ayurvedicProperties: parseJ(herb.ayurvedicProperties, null),
      safetyFlags: parseJ(herb.safetyFlags, null),
      usageAndDose: localizedField(tr, 'usageAndDose', herb.usageAndDose),
      // catalog enrichment (excel_v1_2026-10-03)
      category: herb.category,
      description: localizedField(tr, 'description', herb.description),
      usesBenefits: localizedField(tr, 'usesBenefits', herb.usesBenefits),
      precautions: localizedField(tr, 'precautions', herb.precautions),
      evidenceGrade: herb.evidenceGrade,
      safetyLevel: herb.safetyLevel,
      sourceUrl: herb.sourceUrl,
      image: herb.imageUrl,
      evidenceTier: tiers.get(herb.id) ?? 'T',
      linkedYoga: linkedYoga.map((y) => ({
        slug: y.slug,
        name: lang === 'hi' ? y.nameHi || y.nameEn : y.nameEn,
        sanskrit: y.nameSanskrit,
      })),
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
