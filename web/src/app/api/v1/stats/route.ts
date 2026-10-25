// GET /api/v1/stats — lightweight library counts + featured real photos for
// the mobile dashboard (one representative image per section tile).
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function featuredFor(table: 'herb' | 'asana' | 'food' | 'homeopathyRemedy'): Promise<string | null> {
  const db2 = db[table] as typeof db.herb
  const rows = await db2.findMany({
    where: { imageUrl: { not: null } },
    select: { imageUrl: true },
    orderBy: { id: 'asc' },
    take: 1,
  })
  return rows[0]?.imageUrl ?? null
}

export async function GET() {
  const [herbs, asanas, foods, remedies, claims, fHerbs, fYoga, fFoods, fRemedies] = await Promise.all([
    db.herb.count(),
    db.asana.count(),
    db.food.count(),
    db.homeopathyRemedy.count(),
    db.claim.count(),
    featuredFor('herb'),
    featuredFor('asana'),
    featuredFor('food'),
    featuredFor('homeopathyRemedy'),
  ])
  return NextResponse.json({
    herbs,
    asanas,
    foods,
    remedies,
    claims,
    featured: { herbs: fHerbs, yoga: fYoga, nutrition: fFoods, homeopathy: fRemedies },
  })
}
