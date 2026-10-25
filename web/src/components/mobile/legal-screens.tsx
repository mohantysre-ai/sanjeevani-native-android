'use client'

// Legal / editorial sub-screens — reuse the proven views inside the mobile shell.

import { EditorialView } from '@/components/views/editorial'
import { PrivacyView } from '@/components/views/privacy'
import { AdminView } from '@/components/views/admin'

export function LegalScreen({ kind }: { kind: 'editorial' | 'privacy' }) {
  return (
    <div className="mx-auto max-w-[520px] px-4 py-4">
      {kind === 'editorial' ? <EditorialView /> : <PrivacyView />}
    </div>
  )
}

export function AdminScreen() {
  return (
    <div className="mx-auto max-w-[520px] px-2 py-4">
      <AdminView />
    </div>
  )
}
