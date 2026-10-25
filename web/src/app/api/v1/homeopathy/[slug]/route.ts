// GET /api/v1/homeopathy/[slug] — full remedy profile
// DMR Act 1954: the response embeds the mandatory scientific-consensus disclaimer
// which the UI MUST render on every homeopathy page.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseJ, HOMEOPATHY_DISCLAIMER } from '@/lib/server/content'
import { cleanName, thumbFor } from '@/lib/server/img'
import { localizedField, localizedName, resolveContentLang, translationsFor } from '@/lib/server/i18n'

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const lang = resolveContentLang(req.nextUrl.searchParams.get('language'))

  const remedy = await db.homeopathyRemedy.findUnique({ where: { slug } })
  if (!remedy) return NextResponse.json({ error: 'Remedy not found' }, { status: 404 })

  const claims = await db.claim.findMany({
    where: { entityType: 'homeopathy', entityId: remedy.id, workflowStatus: 'published' },
    orderBy: { evidenceTier: 'asc' },
  })
  const dmr = parseJ<{ disclaimer_required: boolean; disclaimer_key: string; self_diagnosis_warning: boolean }>(
    remedy.dmrCompliance,
    { disclaimer_required: true, disclaimer_key: 'homeopathy_efficacy_consensus', self_diagnosis_warning: true },
  )
  const topClaim = claims[0]
  const tr = (await translationsFor('homeopathy', [slug], lang)).get(slug)

  // related remedies — same remedy family (first word of the category,
  // e.g. "Polychrest"), prefer ones with photos, exclude self. Tiny payload.
  const family = (remedy.category || '').split(/[/,]/)[0].trim()
  const relatedRows = family
    ? await db.homeopathyRemedy.findMany({
        where: { category: { contains: family }, slug: { not: remedy.slug } },
        select: { slug: true, nameEn: true, nameHi: true, imageUrl: true },
        take: 24,
        orderBy: { nameEn: 'asc' },
      })
    : []
  const seen = new Set<string>()
  const related: { slug: string; name: string; image: string | null; thumb: string | null }[] = []
  for (const r of relatedRows) {
    const cn = cleanName(r.nameEn, true)
    if (!cn || seen.has(cn.toLowerCase())) continue
    seen.add(cn.toLowerCase())
    related.push({ slug: r.slug, name: r.nameEn, image: r.imageUrl, thumb: thumbFor(r.imageUrl) })
    if (related.length >= 8) break
  }
  const relatedTrs = await translationsFor('homeopathy', related.map((r) => r.slug), lang)

  return NextResponse.json({
    loc: tr ? lang : 'en',
    remedy: {
      slug: remedy.slug,
      name: localizedName(tr, remedy.nameEn, remedy.nameHi, lang),
      nameAlt: lang === 'en' ? remedy.nameHi : remedy.nameEn,
      translit: remedy.nameTranslit,
      latinSource: remedy.latinSource,
      category: localizedField(tr, 'category', remedy.category),
      description: localizedField(tr, 'description', remedy.description),
      indications: localizedField(tr, 'indications', remedy.indications),
      potencyDosage: localizedField(tr, 'potencyDosage', remedy.potencyDosage),
      precautions: localizedField(tr, 'precautions', remedy.precautions),
      safetyFlags: parseJ<string[]>(remedy.safetyFlags, []),
      safetyLevel: remedy.safetyLevel,
      emergencyWarning: remedy.emergencyWarning,
      evidenceTier: remedy.evidenceTier,
      evidenceBasis: remedy.evidenceBasis,
      synonyms: parseJ<string[]>(remedy.synonyms, []),
      sourceUrl: remedy.sourceUrl,
      image: remedy.imageUrl,
      workflowStatus: remedy.workflowStatus,
      dmr: {
        ...dmr,
        disclaimer: HOMEOPATHY_DISCLAIMER[lang === 'hi' ? 'hi' : 'en'],
      },
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
    related: related.map((r) => ({
      ...r,
      name: localizedName(relatedTrs.get(r.slug), r.name, null, lang),
    })),
    meta: topClaim ? { lastReviewed: topClaim.lastReviewedDate, nextReview: topClaim.nextReviewDate } : null,
  })
}
