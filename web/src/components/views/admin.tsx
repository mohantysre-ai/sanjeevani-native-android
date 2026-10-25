'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiGet, apiPost, AdminResponse, AdminClaim } from '@/lib/api'
import { EvidenceBadge } from '@/components/evidence-badge'
import { WORKFLOW_STAGES, WorkflowStage } from '@/lib/evidence'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { Workflow } from 'lucide-react'

const STAGE_CLASS: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-800 border-stone-300',
  source_checked: 'bg-sky-100 text-sky-900 border-sky-300',
  expert_reviewed: 'bg-teal-100 text-teal-900 border-teal-300',
  compliance_checked: 'bg-amber-100 text-amber-900 border-amber-300',
  published: 'bg-emerald-100 text-emerald-900 border-emerald-300',
}

export function AdminView() {
  const { t } = useLanguage()
  const [data, setData] = useState<AdminResponse | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(() => {
    apiGet<AdminResponse>('/api/v1/admin/claims')
      .then(setData)
      .catch(() => setData({ counts: {}, claims: [] }))
  }, [])

  useEffect(load, [load])

  const advance = async (claim: AdminClaim) => {
    setBusyId(claim.id)
    try {
      const res = await apiPost<{ claim: { id: number; status: string } }>(
        `/api/v1/admin/claims/${claim.id}/advance`,
        {}
      )
      toast({ title: `Claim #${res.claim.id} → ${res.claim.status.replace('_', ' ')}` })
      load()
    } catch {
      toast({ title: 'Already published / error', variant: 'destructive' })
    } finally {
      setBusyId(null)
    }
  }

  if (!data) return <div className="mx-auto max-w-6xl px-4 py-8"><Skeleton className="h-96" /></div>

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" /> {t(UI.admin.title)}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t(UI.admin.sub)}</p>
      </div>

      {/* stage counts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {WORKFLOW_STAGES.map((s: WorkflowStage) => (
          <Card key={s}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{data.counts[s] ?? 0}</p>
              <p className="text-[11px] mt-0.5 text-muted-foreground">{t(UI.workflowStage[s])}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* claims table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto scroll-slim">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-secondary/95 backdrop-blur text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">#</th>
                  <th className="text-left px-3 py-2.5 font-semibold">{t(UI.admin.entity)}</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Claim</th>
                  <th className="text-left px-3 py-2.5 font-semibold">{t(UI.admin.tierCol)}</th>
                  <th className="text-left px-3 py-2.5 font-semibold">{t(UI.admin.reviewerCol)}</th>
                  <th className="text-left px-3 py-2.5 font-semibold">{t(UI.admin.statusCol)}</th>
                  <th className="text-right px-4 py-2.5 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {data.claims.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-secondary/30">
                    <td className="px-4 py-2.5 text-muted-foreground">{c.id}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{c.entityName}</span>
                      <span className="block text-[10px] text-muted-foreground capitalize">{c.entityTable}</span>
                    </td>
                    <td className="px-3 py-2.5 max-w-72">
                      <span className="line-clamp-2 leading-snug">{c.statement}</span>
                    </td>
                    <td className="px-3 py-2.5"><EvidenceBadge tier={c.tier} /></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.reviewer}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STAGE_CLASS[c.status] || ''}`}>
                        {t(UI.workflowStage[c.status as WorkflowStage]) || c.status}
                      </span>
                      {c.nextReview && (
                        <span className="block mt-0.5 text-[10px] text-muted-foreground">
                          re-review: {new Date(c.nextReview).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {c.status !== 'published' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          disabled={busyId === c.id}
                          onClick={() => advance(c)}
                        >
                          {t(UI.admin.advance)}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
