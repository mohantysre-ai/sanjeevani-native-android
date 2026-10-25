// GET /api/v1/herbs — grouped herb library (low-bandwidth).
// The 10k-row catalog repeats each herb across variant rows (condition-specific
// duplicates with identical names). The list shows ONE entry per distinct name
// with a variant count, like a phone contacts list — page of ~120 groups is
// ~15 KB instead of the 2.6 MB full dump.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseJ, tierMapFor } from '@/lib/server/content'
import { cleanName, pageParams, thumbFor } from '@/lib/server/img'
import { localizedName, resolveContentLang, translationsFor } from '@/lib/server/i18n'

type Row = {
  id: number
  slug: string
  commonNameEn: string
  commonNameHi: string | null
  latinBinomial: string | null
  sanskritName: string | null
  synonyms: string | null
  imageUrl: string | null
}

export async function GET(req: NextRequest) {
  const lang = resolveContentLang(req.nextUrl.searchParams.get('language'))
  const { limit, offset, q } = pageParams(req.nextUrl)

  const where = q
    ? {
        OR: [
          { commonNameEn: { contains: q } },
          { commonNameHi: { contains: q } },
          { latinBinomial: { contains: q } },
          { sanskritName: { contains: q } },
          { synonyms: { contains: q } },
        ],
      }
    : undefined

  const rows = (await db.herb.findMany({
    where,
    orderBy: { commonNameEn: 'asc' },
    select: {
      id: true, slug: true, commonNameEn: true, commonNameHi: true,
      latinBinomial: true, sanskritName: true, synonyms: true, imageUrl: true,
    },
  })) as Row[]

  // group by distinct display name (first occurrence order = alphabetical);
  // representative row prefers one that already has a photo
  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const k = (cleanName(r.commonNameEn) || r.slug).trim().toLowerCase()
    const arr = groups.get(k)
    if (arr) arr.push(r)
    else groups.set(k, [r])
  }
  const keys = [...groups.keys()].slice(offset, offset + limit)
  const page = keys.map((k) => {
    const g = groups.get(k)!
    const rep = g.find((r) => r.imageUrl) || g[0]
    return { g, rep, clean: cleanName(rep.commonNameEn) }
  })
  const tiers = await tierMapFor('herb', page.map((p) => p.rep.id))
  const trs = await translationsFor('herbs', page.map((p) => p.rep.slug), lang)

  return NextResponse.json({
    herbs: page.map(({ g, rep, clean }) => ({
      slug: rep.slug,
      name: localizedName(trs.get(rep.slug), clean, rep.commonNameHi, lang),
      latinBinomial: rep.latinBinomial,
      sanskritName: rep.sanskritName,
      synonyms: parseJ<string[]>(rep.synonyms, []).slice(0, 4),
      image: rep.imageUrl,
      thumb: thumbFor(rep.imageUrl),
      variants: g.length,
      evidenceTier: tiers.get(rep.id) ?? 'T',
    })),
    total: groups.size,
    limit,
    offset,
  })
}
