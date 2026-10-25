'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiDelete, apiGet, apiPost } from '@/lib/api'
import { getClientId } from '@/components/site/consent-banner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Database, ShieldCheck } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ConsentEntry {
  id: string
  purpose: string
  status: string
  grantedAt: string
  revokedAt: string | null
}

export function PrivacyView() {
  const { t } = useLanguage()
  const [entries, setEntries] = useState<ConsentEntry[] | null>(null)
  const [eraseOpen, setEraseOpen] = useState(false)

  const load = useCallback(() => {
    const clientId = getClientId()
    apiGet<{ entries: ConsentEntry[] }>(`/api/v1/consent?clientId=${encodeURIComponent(clientId)}`)
      .then((d) => setEntries(d.entries))
      .catch(() => setEntries([]))
  }, [])

  useEffect(load, [load])

  const setConsent = async (purpose: string, granted: boolean) => {
    const clientId = getClientId()
    await apiPost('/api/v1/consent', { clientId, purpose, granted })
    load()
    toast({ title: granted ? 'Consent recorded' : 'Consent withdrawn' })
  }

  const eraseAll = async () => {
    const clientId = getClientId()
    const res = await apiDelete<{ erased: number }>(`/api/v1/consent?clientId=${encodeURIComponent(clientId)}`)
    setEraseOpen(false)
    load()
    toast({ title: `Erased ${res.erased} record(s) (DPDP right to erasure)` })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t(UI.privacy.title)}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t(UI.compliance.consentNotice)}</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" /> {t(UI.privacy.consentLedger)}
          </h2>
          {entries === null ? (
            <Skeleton className="h-24" />
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t(UI.privacy.noData)}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground uppercase tracking-wide">
                    <th className="text-left py-2 pr-3 font-semibold">{t(UI.privacy.purpose)}</th>
                    <th className="text-left py-2 pr-3 font-semibold">{t(UI.privacy.status)}</th>
                    <th className="text-left py-2 pr-3 font-semibold">{t(UI.privacy.grantedAt)}</th>
                    <th className="text-right py-2 font-semibold">{t(UI.privacy.actions)}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="py-2.5 pr-3 font-medium">{e.purpose}</td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            e.status === 'granted' ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{new Date(e.grantedAt).toLocaleString()}</td>
                      <td className="py-2.5 text-right">
                        {e.status === 'granted' ? (
                          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setConsent(e.purpose, false)}>
                            {t(UI.privacy.withdraw)}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setConsent(e.purpose, true)}>
                            {t(UI.privacy.grant)}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Data rights
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Under the Digital Personal Data Protection Act 2023 you may request withdrawal of consent and erasure of your
            personal data. This platform stores only pseudonymous identifiers (a random device ID) and preference records —
            there are no accounts, contact details or health records stored on this demonstration deployment. Erasure below
            is immediate and permanent.
          </p>
          <Button variant="destructive" size="sm" onClick={() => setEraseOpen(true)}>
            {t(UI.privacy.eraseAll)}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={eraseOpen} onOpenChange={setEraseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t(UI.privacy.eraseAll)}</DialogTitle>
            <DialogDescription>{t(UI.privacy.eraseConfirm)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEraseOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={eraseAll}>
              {t(UI.privacy.eraseAll)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
