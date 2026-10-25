'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { navigate } from '@/lib/router'

const CLIENT_KEY = 'sanjeevani_client_id'

export function getClientId(): string {
  if (typeof window === 'undefined') return ''
  let id = window.localStorage.getItem(CLIENT_KEY)
  if (!id) {
    id = crypto.randomUUID()
    window.localStorage.setItem(CLIENT_KEY, id)
  }
  return id
}

export function ConsentBanner() {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const decided = window.localStorage.getItem('sanjeevani_consent_decided')
    if (!decided) {
      const id = setTimeout(() => setVisible(true), 0)
      return () => clearTimeout(id)
    }
  }, [])

  const record = async (granted: boolean) => {
    const clientId = getClientId()
    window.localStorage.setItem('sanjeevani_consent_decided', granted ? 'granted' : 'essential-only')
    setVisible(false)
    try {
      await fetch('/api/v1/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, purpose: 'pseudonymous_preferences', granted }),
      })
    } catch {
      // consent is still recorded locally; network failure tolerated
    }
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Consent"
      className="fixed bottom-0 inset-x-0 z-50 border-t bg-card/95 backdrop-blur shadow-lg"
    >
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-xs leading-relaxed text-muted-foreground flex-1">
          <strong className="text-foreground">{t(UI.compliance.dpdpTitle)} · </strong>
          {t(UI.compliance.consentNotice)}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate('/privacy')}>
            {t(UI.compliance.manage)}
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => record(false)}>
            Essential only
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => record(true)}>
            {t(UI.compliance.accept)}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Dismiss" onClick={() => setVisible(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
