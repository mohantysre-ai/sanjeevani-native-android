'use client'

// Interaction Checker — herb × medication safety check (mobile).
// POST /api/v1/interactions/check; severity-aggregated result with sources.
// Form is grouped with labelled fields, explains why inputs are needed, and
// covers loading / error / empty / result states. Results combine icon +
// color + text so severity is never communicated by color alone.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, Search, TriangleAlert, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiPost, InteractionCheckResponse } from '@/lib/api'
import { Field, ErrorState } from '@/components/mobile/design'

const FIELD =
  'min-h-12 w-full rounded-2xl border border-input bg-card px-3.5 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const SEV_STYLE: Record<string, string> = {
  high: 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950/30',
  moderate: 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/30',
  mild: 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/30',
}

export function CheckerScreen() {
  const { lang, t } = useLanguage()
  const [herb, setHerb] = useState('')
  const [med, setMed] = useState('')
  const [result, setResult] = useState<InteractionCheckResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempted, setAttempted] = useState(false)

  const check = async () => {
    if (!herb.trim() || !med.trim()) return
    setBusy(true)
    setFailed(false)
    setAttempted(true)
    setResult(null)
    try {
      const r = await apiPost<InteractionCheckResponse>('/api/v1/interactions/check', { herbs: [herb.trim()], medications: [med.trim()] })
      setResult(r)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const sevKey = result?.severity as 'high' | 'moderate' | 'mild' | undefined
  const canSubmit = herb.trim() && med.trim()

  return (
    <div className="px-4 pt-3">
      <div className="grad-remedy gloss rounded-3xl p-4 text-white shadow-float">
        <h1 className="flex items-center gap-2 text-base font-extrabold">
          <ShieldAlert className="h-5 w-5" /> {t(UI.checker.title)}
        </h1>
        <p className="mt-1 text-[11px] opacity-85">{t(UI.checker.rulesCount)}</p>
      </div>

      {/* why we ask — sensitive-input transparency */}
      <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-secondary/50 p-3 text-[11px] leading-relaxed text-secondary-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t(UI.checker.privacyNote)}
      </p>

      <form
        className="mt-3 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void check()
        }}
      >
        <Field label={t(UI.app.herbSupplement)} htmlFor="ck-herb">
          <input
            id="ck-herb"
            value={herb}
            onChange={(e) => setHerb(e.target.value)}
            placeholder={t(UI.app.egHerb)}
            className={FIELD}
            aria-label={t(UI.app.herbSupplement)}
            autoComplete="off"
          />
        </Field>
        <Field label={t(UI.app.medication)} htmlFor="ck-med">
          <input
            id="ck-med"
            value={med}
            onChange={(e) => setMed(e.target.value)}
            placeholder={t(UI.app.egMed)}
            className={FIELD}
            aria-label={t(UI.app.medication)}
            autoComplete="off"
          />
        </Field>
        <button
          type="submit"
          disabled={busy || !canSubmit}
          className="grad-hero gloss flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-extrabold text-white shadow-float disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {busy ? t(UI.common.loading) : t(UI.checker.check)}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {failed && (
          <motion.div key="err" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4">
            <ErrorState
              title={t(UI.app.checkFailed)}
              body={t(UI.app.checkConnection)}
              onRetry={() => void check()}
            />
          </motion.div>
        )}

        {result && (
          <motion.div
            key={result.interaction_found + result.severity}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 rounded-3xl border p-4 ${SEV_STYLE[sevKey || 'mild']}`}
          >
            {result.interaction_found ? (
              <>
                <p className="flex items-center gap-2 text-sm font-extrabold">
                  <TriangleAlert className="h-4 w-4 shrink-0" />
                  {t(UI.checker.found)} — {t(UI.severity[result.severity as 'high' | 'moderate' | 'mild'] || UI.severity.mild)}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed">{result.description}</p>
                {result.actionable_advice && (
                  <p className="mt-2 rounded-2xl bg-white/60 p-3 text-[12px] font-semibold leading-relaxed dark:bg-white/10">
                    💡 {result.actionable_advice}
                  </p>
                )}
                {result.matches?.map((m, i) => (
                  <p key={i} className="mt-2 text-[11px] opacity-80">
                    {m.herb} × {m.medication} · {t(UI.severity[m.severity as 'high'] || UI.severity.mild)}
                  </p>
                ))}
              </>
            ) : (
              <>
                <p className="flex items-center gap-2 text-sm font-extrabold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> {t(UI.checker.noneFound)}
                </p>
              </>
            )}
            <p className="mt-3 text-[10px] leading-relaxed opacity-70">{t(UI.app.disclaimerShort)}</p>
          </motion.div>
        )}

        {attempted && !busy && !failed && !result && (
          <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 text-center text-xs text-muted-foreground">
            {t(UI.common.noResults)}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="mt-4 rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-[10.5px] leading-relaxed text-muted-foreground">
        {t(UI.checker.dbNote)}
      </p>
    </div>
  )
}
