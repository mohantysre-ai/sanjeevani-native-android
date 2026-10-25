'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiGet, apiPost, HerbListItem, InteractionCheckResponse } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SEVERITY_META } from '@/lib/evidence'
import { Pill, ShieldCheck, SearchCheck } from 'lucide-react'

export function CheckerView() {
  const { lang, t } = useLanguage()
  const [herbs, setHerbs] = useState<HerbListItem[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [meds, setMeds] = useState('')
  const [result, setResult] = useState<InteractionCheckResponse | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    apiGet<{ herbs: HerbListItem[] }>('/api/v1/herbs?language=' + lang)
      .then((d) => setHerbs(d.herbs))
      .catch(() => setHerbs([]))
  }, [lang])

  const toggle = (slug: string) => {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(slug)) n.delete(slug)
      else n.add(slug)
      return n
    })
  }

  const check = async () => {
    if (!selected.size || !meds.trim()) return
    setBusy(true)
    setResult(null)
    try {
      const res = await apiPost<InteractionCheckResponse>('/api/v1/interactions/check', {
        herbs: Array.from(selected),
        medications: meds.split(',').map((m) => m.trim()).filter(Boolean),
      })
      setResult(res)
    } catch {
      setResult({
        interaction_found: false,
        severity: 'none',
        description: 'Service unavailable — please retry.',
        actionable_advice: '',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{t(UI.checker.title)}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t(UI.checker.sub)}</p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-5">
          {/* herbs multi-select */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Pill className="h-4 w-4 text-primary" /> {t(UI.checker.selectHerbs)}
            </p>
            {herbs === null ? (
              <Skeleton className="h-24" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto scroll-slim p-1">
                {herbs.map((h) => (
                  <label
                    key={h.slug}
                    className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs cursor-pointer hover:bg-secondary/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10"
                  >
                    <Checkbox
                      checked={selected.has(h.slug)}
                      onCheckedChange={() => toggle(h.slug)}
                      aria-label={h.name}
                    />
                    <span className="truncate">{h.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* meds free input */}
          <div>
            <Label htmlFor="meds" className="text-sm font-medium">
              {t(UI.checker.selectMeds)}
            </Label>
            <textarea
              id="meds"
              value={meds}
              onChange={(e) => setMeds(e.target.value)}
              placeholder={t(UI.checker.medPlaceholder)}
              rows={2}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Known drug targets: warfarin · aspirin · clopidogrel · metformin · insulin · levothyroxine · alprazolam / sedatives · amlodipine / antihypertensives · furosemide / diuretics · immunosuppressants / steroids
            </p>
          </div>

          <Button onClick={check} disabled={busy || !selected.size || !meds.trim()} className="gap-2">
            <SearchCheck className="h-4 w-4" />
            {busy ? t(UI.common.loading) : t(UI.checker.check)}
          </Button>

          {/* result */}
          {result && (
            <div aria-live="polite">
              {result.interaction_found ? (
                <Alert className="border-amber-300 bg-amber-50">
                  <Pill className="h-4 w-4 text-amber-700" />
                  <AlertTitle className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    {t(UI.checker.found)}
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_META[result.severity]?.classes || ''}`}>
                      {t(UI.severity[result.severity as keyof typeof UI.severity] as { en: string; hi: string }) || result.severity}
                    </span>
                  </AlertTitle>
                  <AlertDescription className="text-xs text-amber-900 space-y-2">
                    <p>{lang === 'hi' && result.matches?.[0] ? result.matches[0].description : result.description}</p>
                    {result.matches && result.matches.length > 1 && (
                      <ul className="list-disc pl-4 space-y-1">
                        {result.matches.slice(1).map((m, i) => (
                          <li key={i}>
                            <strong>{m.medication}</strong> ({m.severity}): {m.description}
                          </li>
                        ))}
                      </ul>
                    )}
                    {result.actionable_advice && (
                      <p className="font-medium">
                        {t(UI.checker.advice)}: {result.actionable_advice}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-emerald-300 bg-emerald-50">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  <AlertTitle className="text-sm font-semibold text-emerald-900">
                    {t(UI.severity.mild as { en: string; hi: string }) ? t(UI.checker.noneFound) : UI.checker.noneFound.en}
                  </AlertTitle>
                  <AlertDescription className="text-xs text-emerald-900">{result.description}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-muted-foreground border-t pt-3">{t(UI.checker.dbNote)}</p>
        </CardContent>
      </Card>
    </div>
  )
}
