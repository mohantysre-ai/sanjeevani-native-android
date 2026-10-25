// GET /api/v1/admin/claims — editorial pipeline view
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ENTITY_TABLES = {
  herb: 'herb',
  yoga: 'yoga',
  condition: 'condition',
  nutrition: 'food',
  homeopathy: 'homeopathy_remedy',
} as const

export async function GET() {
  const claims = await db.claim.findMany({ orderBy: [{ workflowStatus: 'asc' }, { lastReviewedDate: 'desc' }] })
  const [herbs, asanas, conditions, foods, remedies] = await Promise.all([
    db.herb.findMany({ select: { id: true, slug: true, commonNameEn: true } }),
    db.asana.findMany({ select: { id: true, slug: true, nameEn: true } }),
    db.condition.findMany({ select: { id: true, slug: true, nameEn: true } }),
    db.food.findMany({ select: { id: true, slug: true, nameEn: true } }),
    db.homeopathyRemedy.findMany({ select: { id: true, slug: true, nameEn: true } }),
  ])

  const nameOf = (entityType: string, entityId: number): string => {
    switch (entityType) {
      case 'herb': return herbs.find((h) => h.id === entityId)?.commonNameEn || `herb#${entityId}`
      case 'yoga': return asanas.find((a) => a.id === entityId)?.nameEn || `asana#${entityId}`
      case 'condition': return conditions.find((c) => c.id === entityId)?.nameEn || `condition#${entityId}`
      case 'nutrition': return foods.find((f) => f.id === entityId)?.nameEn || `food#${entityId}`
      case 'homeopathy': return remedies.find((r) => r.id === entityId)?.nameEn || `remedy#${entityId}`
      default: return `${entityType}#${entityId}`
    }
  }
  const slugOf = (entityType: string, entityId: number): string => {
    switch (entityType) {
      case 'herb': return herbs.find((h) => h.id === entityId)?.slug || ''
      case 'yoga': return asanas.find((a) => a.id === entityId)?.slug || ''
      case 'condition': return conditions.find((c) => c.id === entityId)?.slug || ''
      case 'nutrition': return foods.find((f) => f.id === entityId)?.slug || ''
      case 'homeopathy': return remedies.find((r) => r.id === entityId)?.slug || ''
      default: return ''
    }
  }

  const counts = { draft: 0, source_checked: 0, expert_reviewed: 0, compliance_checked: 0, published: 0 }
  for (const c of claims) {
    if (c.workflowStatus in counts) counts[c.workflowStatus as keyof typeof counts]++
  }

  return NextResponse.json({
    counts,
    claims: claims.map((c) => ({
      id: c.id,
      entityType: c.entityType,
      entityTable: ENTITY_TABLES[c.entityType as keyof typeof ENTITY_TABLES] || c.entityType,
      entityName: nameOf(c.entityType, c.entityId),
      entitySlug: slugOf(c.entityType, c.entityId),
      statement: c.statement,
      tier: c.evidenceTier,
      reviewer: `${c.reviewerName}, ${c.reviewerCredentials}`,
      lastReviewed: c.lastReviewedDate,
      nextReview: c.nextReviewDate,
      status: c.workflowStatus,
    })),
  })
}
