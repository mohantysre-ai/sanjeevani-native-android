'use client'

import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { TierLegend } from '@/components/evidence-badge'
import { Card, CardContent } from '@/components/ui/card'
import { WORKFLOW_STAGES } from '@/lib/evidence'
import { ArrowRight, FlaskConical, ShieldAlert, Scale, UserCheck, FileCheck, FileText, RefreshCw } from 'lucide-react'

const STAGE_ICONS = [FileText, FlaskConical, UserCheck, Scale, FileCheck]

export function EditorialView() {
  const { t } = useLanguage()

  const tierLabels: Record<string, string> = {
    A: t(UI.tiers.A),
    B: t(UI.tiers.B),
    C: t(UI.tiers.C),
    T: t(UI.tiers.T),
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t(UI.nav.editorial)}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t(UI.admin.sub)}</p>
      </div>

      {/* Workflow state machine */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold mb-4">{t(UI.admin.title)}</h2>
          <ol className="flex flex-wrap items-center gap-2">
            {WORKFLOW_STAGES.map((s, i) => {
              const Icon = STAGE_ICONS[i]
              return (
                <li key={s} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                      s === 'published' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'bg-secondary/50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t(UI.workflowStage[s])}
                  </div>
                  {i < WORKFLOW_STAGES.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </li>
              )
            })}
          </ol>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3" /> Scheduled re-review every 6–12 months after publishing.
          </p>
        </CardContent>
      </Card>

      {/* Tiers */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold mb-3">{t(UI.tiers.title)}</h2>
          <TierLegend labels={tierLabels} />
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold">Safety & compliance</h2>
          <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            <p><strong className="text-foreground">DMR Act 1954.</strong> {t(UI.compliance.dmrBanner)}</p>
            <p><strong className="text-foreground">Bhasma safety.</strong> {t(UI.compliance.bhasmaBanner)}</p>
            <p><strong className="text-foreground">Homeopathy disclosure.</strong> {t(UI.compliance.homeopathyNote)}</p>
            <p><strong className="text-foreground">Dietary standards.</strong> ICMR-NIN 2024 aligned. {t(UI.tools.proteinRdaNote)}</p>
            <p><strong className="text-foreground">Affiliates.</strong> {t(UI.tools.noAffiliate)}</p>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <ShieldAlert className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed">{t(UI.compliance.medicalDisclaimer)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
