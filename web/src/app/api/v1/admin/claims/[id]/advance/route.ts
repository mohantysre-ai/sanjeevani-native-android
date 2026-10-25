// POST /api/v1/admin/claims/[id]/advance — move a claim to the next workflow gate
// [Draft] → Source Check → Expert Review → Compliance Check → Published
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WORKFLOW_STAGES, WorkflowStage } from '@/lib/evidence'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const claimId = parseInt(id, 10)
  if (isNaN(claimId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const claim = await db.claim.findUnique({ where: { id: claimId } })
  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

  // Optional next-stage override (also allows roll-back for demos)
  const body = await req.json().catch(() => ({}))
  let next: WorkflowStage | undefined
  if (body?.next && WORKFLOW_STAGES.includes(body.next)) {
    next = body.next
  } else {
    const idx = WORKFLOW_STAGES.indexOf(claim.workflowStatus as WorkflowStage)
    if (idx < 0 || idx >= WORKFLOW_STAGES.length - 1) {
      return NextResponse.json({ error: 'Already published' }, { status: 400 })
    }
    next = WORKFLOW_STAGES[idx + 1]
  }

  const updated = await db.claim.update({
    where: { id: claimId },
    data: { workflowStatus: next },
  })
  return NextResponse.json({ claim: { id: updated.id, status: updated.workflowStatus } })
}
