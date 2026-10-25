'use client'

import { useMemo, useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Lock, Droplets, Beef, Flame, Scale, ShieldAlert } from 'lucide-react'

// Mifflin–St Jeor
function bmr(sex: 'm' | 'f', weight: number, height: number, age: number): number {
  return sex === 'm' ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161
}

const ACTIVITY: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }

type Guard = 'none' | 'under18' | 'pregnant' | 'lowBmi'

export function ToolsView() {
  const { lang, t } = useLanguage()

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{t(UI.nav.tools)}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t(UI.tools.disclaimer)}</p>
      </div>

      <Alert className="mb-5 border-primary/30 bg-primary/5">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <AlertTitle className="text-xs font-semibold">{t(UI.tools.noAffiliate)}</AlertTitle>
        <AlertDescription className="text-xs">{t(UI.tools.proteinRdaNote)}</AlertDescription>
      </Alert>

      <Tabs defaultValue="bmi" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="bmi" className="gap-1"><Scale className="h-3.5 w-3.5" /> BMI</TabsTrigger>
          <TabsTrigger value="calories" className="gap-1"><Flame className="h-3.5 w-3.5" /> {lang === 'hi' ? 'कैलोरी' : 'Calories'}</TabsTrigger>
          <TabsTrigger value="protein" className="gap-1"><Beef className="h-3.5 w-3.5" /> {lang === 'hi' ? 'प्रोटीन' : 'Protein'}</TabsTrigger>
          <TabsTrigger value="hydration" className="gap-1"><Droplets className="h-3.5 w-3.5" /> {lang === 'hi' ? 'जल' : 'Water'}</TabsTrigger>
        </TabsList>

        <TabsContent value="bmi" className="mt-4"><BmiTool t={t} lang={lang} /></TabsContent>
        <TabsContent value="calories" className="mt-4"><SharedForm t={t} mode="calories" /></TabsContent>
        <TabsContent value="protein" className="mt-4"><SharedForm t={t} mode="protein" /></TabsContent>
        <TabsContent value="hydration" className="mt-4"><SharedForm t={t} mode="hydration" /></TabsContent>
      </Tabs>
    </div>
  )
}

type TFn = (entry: { en: string; hi: string } | string) => string

interface FormState {
  age: string
  weight: string
  height: string
  sex: 'm' | 'f'
  pregnant: boolean
  activity: keyof typeof ACTIVITY
}

function useGuardedForm(t: TFn, mode: 'calories' | 'protein' | 'hydration') {
  const [form, setForm] = useState<FormState>({ age: '', weight: '', height: '', sex: 'm', pregnant: false, activity: 'moderate' })
  const [submitted, setSubmitted] = useState(false)

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const guard: Guard = useMemo(() => {
    const age = parseInt(form.age, 10)
    const weight = parseFloat(form.weight)
    const height = parseFloat(form.height)
    if (!isNaN(age) && age < 18) return 'under18'
    if (form.pregnant) return 'pregnant'
    if (!isNaN(weight) && !isNaN(height) && height > 0) {
      const bmi = weight / Math.pow(height / 100, 2)
      if (bmi < 16 && mode === 'calories') return 'lowBmi'
    }
    return 'none'
  }, [form, mode])

  const valid = !isNaN(parseFloat(form.weight)) && parseFloat(form.weight) > 0

  return { form, set, guard, valid, submitted, setSubmitted }
}

function GuardBanner({ guard, t }: { guard: Guard; t: TFn }) {
  if (guard === 'none') return null
  const message =
    guard === 'under18' ? t(UI.tools.lockUnder18) : guard === 'pregnant' ? t(UI.tools.lockPregnancy) : t(UI.tools.lowBmiWarn)
  return (
    <Alert className="border-red-300 bg-red-50 mt-4" role="alert">
      <Lock className="h-4 w-4 text-red-700" />
      <AlertTitle className="text-sm font-semibold text-red-900">
        {guard === 'under18' ? 'Safety lockout' : guard === 'pregnant' ? 'Individual plan required' : 'Medical referral recommended'}
      </AlertTitle>
      <AlertDescription className="text-xs text-red-900">{message}</AlertDescription>
    </Alert>
  )
}

function BmiTool({ t, lang }: { t: TFn; lang: string }) {
  const [w, setW] = useState('')
  const [h, setH] = useState('')
  const bmi = useMemo(() => {
    const weight = parseFloat(w)
    const height = parseFloat(h)
    if (isNaN(weight) || isNaN(height) || height <= 0) return null
    return weight / Math.pow(height / 100, 2)
  }, [w, h])

  let cat = { label: '', cls: '' }
  if (bmi !== null) {
    if (bmi < 18.5) cat = { label: t(UI.tools.underweight), cls: 'text-amber-700' }
    else if (bmi < 23) cat = { label: t(UI.tools.normal), cls: 'text-emerald-700' }
    else if (bmi < 25) cat = { label: t(UI.tools.overweight), cls: 'text-amber-700' }
    else cat = { label: t(UI.tools.obese), cls: 'text-red-700' }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="font-semibold mb-1">{t(UI.tools.bmiTitle)}</h2>
        <p className="text-xs text-muted-foreground mb-4">
          {lang === 'hi'
            ? 'भारतीय-एशियाई कटऑफ (WHO/ICMR): अधिक वज़न ≥ 23, मोटापा ≥ 25 — वैश्विक 25/30 से कम।'
            : 'Asian-Indian cutoffs (WHO/ICMR): overweight ≥ 23, obesity ≥ 25 — lower than the global 25/30.'}
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div>
            <Label htmlFor="bmi-w">{t(UI.tools.weight)}</Label>
            <Input id="bmi-w" type="number" min="1" value={w} onChange={(e) => setW(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="bmi-h">{t(UI.tools.height)}</Label>
            <Input id="bmi-h" type="number" min="1" value={h} onChange={(e) => setH(e.target.value)} className="mt-1" />
          </div>
        </div>
        {bmi !== null && (
          <div className="mt-4 rounded-xl border bg-secondary/40 p-4">
            <p className="text-xs text-muted-foreground">{t(UI.tools.bmiResult)}</p>
            <p className="text-3xl font-bold">{bmi.toFixed(1)}</p>
            <p className={`text-sm font-medium ${cat.cls}`}>{cat.label}</p>
            {bmi < 16 && (
              <p className="mt-2 text-xs leading-relaxed text-red-900 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {t(UI.tools.lowBmiWarn)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SharedForm({ t, mode }: { t: TFn; mode: 'calories' | 'protein' | 'hydration' }) {
  const { form, set, guard, valid, submitted, setSubmitted } = useGuardedForm(t, mode)

  const results = useMemo(() => {
    if (!valid || guard !== 'none') return null
    const weight = parseFloat(form.weight)
    const height = parseFloat(form.height)
    const age = parseInt(form.age, 10) || 30
    if (mode === 'protein') {
      const rda = 0.83 * weight
      return { main: `${Math.round(rda)} g/day`, note: t(UI.tools.proteinRdaNote) }
    }
    if (mode === 'hydration') {
      const ml = Math.min(Math.max(weight * 33, 1500), 3500)
      return { main: `${(ml / 1000).toFixed(1)} L/day`, note: t(UI.tools.disclaimer) }
    }
    // calories
    if (!height) return null
    const base = bmr(form.sex, weight, height, age) * ACTIVITY[form.activity]
    return { main: `${Math.round(base)} kcal/day`, note: t(UI.tools.disclaimer) }
  }, [mode, form, guard, valid, t])

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="font-semibold mb-4">
          {mode === 'calories' ? t(UI.tools.caloriesTitle) : mode === 'protein' ? t(UI.tools.proteinTitle) : t(UI.tools.hydrationTitle)}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label htmlFor={`age-${mode}`}>{t(UI.tools.age)}</Label>
            <Input id={`age-${mode}`} type="number" min="1" value={form.age} onChange={(e) => set({ age: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label htmlFor={`w-${mode}`}>{t(UI.tools.weight)}</Label>
            <Input id={`w-${mode}`} type="number" min="1" value={form.weight} onChange={(e) => set({ weight: e.target.value })} className="mt-1" />
          </div>
          {mode === 'calories' && (
            <div>
              <Label htmlFor={`h-${mode}`}>{t(UI.tools.height)}</Label>
              <Input id={`h-${mode}`} type="number" min="1" value={form.height} onChange={(e) => set({ height: e.target.value })} className="mt-1" />
            </div>
          )}
          <div>
            <Label>{t(UI.tools.sex)}</Label>
            <div className="flex gap-2 mt-1.5">
              {(['m', 'f'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ sex: s })}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                    form.sex === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'
                  }`}
                >
                  {s === 'm' ? t(UI.tools.male) : t(UI.tools.female)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Checkbox
            id={`preg-${mode}`}
            checked={form.pregnant}
            onCheckedChange={(v) => set({ pregnant: v === true })}
          />
          <Label htmlFor={`preg-${mode}`} className="text-xs font-normal">
            {t(UI.tools.pregnant)}
          </Label>
        </div>

        {mode === 'calories' && (
          <div className="mt-4 max-w-sm">
            <Label>{t(UI.tools.activity)}</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {(Object.keys(ACTIVITY) as (keyof typeof ACTIVITY)[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set({ activity: k })}
                  className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                    form.activity === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'
                  }`}
                >
                  {t(UI.tools[k as keyof typeof UI.tools] as { en: string; hi: string })}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button className="mt-4" onClick={() => setSubmitted(true)} disabled={!valid}>
          {t(UI.tools.calculate)}
        </Button>

        {submitted && <GuardBanner guard={guard} t={t} />}

        {submitted && guard === 'none' && results && (
          <div className="mt-4 rounded-xl border bg-secondary/40 p-4" aria-live="polite">
            <p className="text-xs text-muted-foreground">
              {mode === 'calories' ? t(UI.tools.caloriesTitle) : mode === 'protein' ? t(UI.tools.proteinTitle) : t(UI.tools.hydrationTitle)}
            </p>
            <p className="text-3xl font-bold">{results.main}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{results.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
