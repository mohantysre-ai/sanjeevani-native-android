// Consent ledger — DPDP Act 2023 alignment
// POST { clientId, purpose, granted } — record/withdraw consent
// GET  ?clientId= — list entries
// DELETE ?clientId= — full erasure (right to erasure)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { clientId, purpose, granted } = await req.json().catch(() => ({}))
  if (!clientId || !purpose || typeof granted !== 'boolean') {
    return NextResponse.json({ error: 'clientId, purpose and granted(boolean) required' }, { status: 400 })
  }
  const existing = await db.consentLedger.findFirst({ where: { clientId, purpose } })
  let entry
  if (existing) {
    entry = await db.consentLedger.update({
      where: { id: existing.id },
      data: { status: granted ? 'granted' : 'revoked', revokedAt: granted ? null : new Date() },
    })
  } else {
    entry = await db.consentLedger.create({
      data: { clientId, purpose, status: granted ? 'granted' : 'revoked', revokedAt: granted ? null : new Date() },
    })
  }
  return NextResponse.json({ entry })
}

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  const entries = await db.consentLedger.findMany({
    where: { clientId },
    orderBy: { grantedAt: 'desc' },
  })
  return NextResponse.json({ entries })
}

export async function DELETE(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  const deleted = await db.consentLedger.deleteMany({ where: { clientId } })
  return NextResponse.json({ erased: deleted.count })
}
