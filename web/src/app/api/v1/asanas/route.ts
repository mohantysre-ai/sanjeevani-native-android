// GET /api/v1/asanas — grouped yoga library (low-bandwidth).
// One entry per distinct pose name across the 10k variant rows.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tierMapFor } from '@/lib/server/content'
import { cleanName, pageParams, thumbFor } from '@/lib/server/img'
import { localizedName, resolveContentLang, translationsFor } from '@/lib/server/i18n'

type Row = {
  id: number
  slug: string
  nameEn: string
  nameHi: string | null
  nameSanskrit: string | null
  category: string | null
  difficultyLevel: string | null
  imageUrl: string | null
}

export async function GET(req: NextRequest) {
  const lang = resolveContentLang(req.nextUrl.searchParams.get('language'))
  const { limit, offset, q } = pageParams(req.nextUrl)

  const where = q
    ? {
        OR: [
          { nameEn: { contains: q } },
          { nameHi: { contains: q } },
          { nameSanskrit: { contains: q } },
          { category: { contains: q } },
        ],
      }
    : undefined

  const rows = (await db.asana.findMany({
    where,
    orderBy: { nameEn: 'asc' },
    select: {
      id: true, slug: true, nameEn: true, nameHi: true, nameSanskrit: true,
      category: true, difficultyLevel: true, imageUrl: true,
    },
  })) as Row[]

  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const k = (cleanName(r.nameEn) || r.slug).trim().toLowerCase()
    const arr = groups.get(k)
    if (arr) arr.push(r)
    else groups.set(k, [r])
  }
  const keys = [...groups.keys()].slice(offset, offset + limit)
  const page = keys.map((k) => {
    const g = groups.get(k)!
    const rep = g.find((r) => r.imageUrl) || g[0]
    return { g, rep, clean: cleanName(rep.nameEn) }
  })
  const tiers = await tierMapFor('yoga', page.map((p) => p.rep.id))
  const trs = await translationsFor('yoga', page.map((p) => p.rep.slug), lang)

  return NextResponse.json({
    asanas: page.map(({ g, rep, clean }) => ({
      slug: rep.slug,
      name: localizedName(trs.get(rep.slug), clean, rep.nameHi, lang),
      sanskrit: rep.nameSanskrit,
      category: rep.category,
      difficulty: rep.difficultyLevel,
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
