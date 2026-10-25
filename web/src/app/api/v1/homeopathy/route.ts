// GET /api/v1/homeopathy — grouped remedy list (low-bandwidth)
// DMR Act 1954: every remedy listing carries the mandatory consensus disclaimer key.
// One entry per distinct remedy name across the 10k variant rows.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseJ } from '@/lib/server/content'
import { cleanName, pageParams, thumbFor } from '@/lib/server/img'
import { localizedName, resolveContentLang, translationsFor } from '@/lib/server/i18n'

type Row = {
  id: number
  slug: string
  nameEn: string
  nameHi: string | null
  nameTranslit: string | null
  latinSource: string | null
  category: string | null
  evidenceTier: string | null
  safetyLevel: string | null
  emergencyWarning: boolean | null
  dmrCompliance: string | null
  synonyms: string | null
  imageUrl: string | null
}

export async function GET(req: NextRequest) {
  const lang = resolveContentLang(req.nextUrl.searchParams.get('language'))
  const { limit, offset, q } = pageParams(req.nextUrl)
  // kingdom filter — classical materia medica taxonomy (Plant / Mineral / Nosode)
  const kingdom = req.nextUrl.searchParams.get('category')

  const where = {
    ...(kingdom ? { category: { startsWith: kingdom } } : {}),
    ...(q
      ? {
          OR: [
            { nameEn: { contains: q } },
            { nameHi: { contains: q } },
            { nameTranslit: { contains: q } },
            { latinSource: { contains: q } },
            { synonyms: { contains: q } },
          ],
        }
      : {}),
  }

  const rows = (await db.homeopathyRemedy.findMany({
    where,
    orderBy: { nameEn: 'asc' },
    select: {
      id: true, slug: true, nameEn: true, nameHi: true, nameTranslit: true,
      latinSource: true, category: true, evidenceTier: true, safetyLevel: true,
      emergencyWarning: true, dmrCompliance: true, synonyms: true, imageUrl: true,
    },
  })) as Row[]

  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const k = (cleanName(r.nameEn, true) || r.slug).trim().toLowerCase()
    const arr = groups.get(k)
    if (arr) arr.push(r)
    else groups.set(k, [r])
  }
  const keys = [...groups.keys()].slice(offset, offset + limit)
  const page = keys.map((k) => {
    const g = groups.get(k)!
    const rep = g.find((r) => r.imageUrl) || g[0]
    return { g, rep, clean: cleanName(rep.nameEn, true) }
  })

  const trs = await translationsFor('homeopathy', page.map((p) => p.rep.slug), lang)

  return NextResponse.json({
    remedies: page.map(({ g, rep, clean }) => ({
      slug: rep.slug,
      name: localizedName(trs.get(rep.slug), clean, rep.nameHi, lang),
      translit: rep.nameTranslit,
      latinSource: rep.latinSource,
      category: rep.category,
      evidenceTier: rep.evidenceTier,
      safetyLevel: rep.safetyLevel,
      emergencyWarning: rep.emergencyWarning,
      disclaimerRequired: parseJ<{ disclaimer_required: boolean }>(rep.dmrCompliance, { disclaimer_required: true }).disclaimer_required,
      synonyms: parseJ<string[]>(rep.synonyms, []).slice(0, 4),
      image: rep.imageUrl,
      thumb: thumbFor(rep.imageUrl),
      variants: g.length,
    })),
    total: groups.size,
    limit,
    offset,
  })
}
