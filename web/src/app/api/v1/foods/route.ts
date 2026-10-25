// GET /api/v1/foods — NIN/IFCT-aligned grouped food list (low-bandwidth).
// One entry per distinct food name; full composition stays in the detail
// endpoint so browsing never downloads the whole database.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cleanName, pageParams, thumbFor } from '@/lib/server/img'
import { localizedName, resolveContentLang, translationsFor } from '@/lib/server/i18n'

type Row = {
  id: number
  slug: string
  nameEn: string
  nameHi: string | null
  category: string | null
  calories: number | null
  imageUrl: string | null
}

export async function GET(req: NextRequest) {
  const lang = resolveContentLang(req.nextUrl.searchParams.get('language'))
  const { limit, offset, q } = pageParams(req.nextUrl)
  const category = req.nextUrl.searchParams.get('category')

  const where = {
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { nameEn: { contains: q } },
            { nameHi: { contains: q } },
            { category: { contains: q } },
          ],
        }
      : {}),
  }

  const rows = (await db.food.findMany({
    where,
    orderBy: { nameEn: 'asc' },
    select: { id: true, slug: true, nameEn: true, nameHi: true, category: true, calories: true, imageUrl: true },
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

  const trs = await translationsFor('foods', page.map((p) => p.rep.slug), lang)

  return NextResponse.json({
    foods: page.map(({ g, rep, clean }) => ({
      slug: rep.slug,
      name: localizedName(trs.get(rep.slug), clean, rep.nameHi, lang),
      category: rep.category,
      calories: rep.calories,
      image: rep.imageUrl,
      thumb: thumbFor(rep.imageUrl),
      variants: g.length,
    })),
    total: groups.size,
    limit,
    offset,
    sourceNote: 'ICMR-NIN 2024 / IFCT aligned approximations, per 100 g',
  })
}
