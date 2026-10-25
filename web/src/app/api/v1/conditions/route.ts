// GET /api/v1/conditions — clinical conditions with NAMASTE / ICD codes
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tierMapFor, type Lang } from '@/lib/server/content'

export async function GET(req: NextRequest) {
  const lang: Lang = req.nextUrl.searchParams.get('language') === 'hi' ? 'hi' : 'en'
  const conditions = await db.condition.findMany({ orderBy: { nameEn: 'asc' } })
  const tiers = await tierMapFor('condition', conditions.map((c) => c.id))
  return NextResponse.json({
    conditions: conditions.map((c) => ({
      slug: c.slug,
      name: lang === 'hi' ? c.nameHi : c.nameEn,
      namasteCode: c.namasteCode,
      icdCode: c.icdCode,
      tm2Category: c.tm2Category,
      description: c.description,
      evidenceTier: tiers.get(c.id) ?? 'T',
    })),
  })
}
