'use client'

// Tools tab — BMI (Asian-Indian cutoffs), Mifflin–St Jeor calories, NIN protein
// RDA, hydration. Grouped labelled fields, inline validation, safety lockouts
// preserved (DPDP / ICMR-NIN guidance). Results on solid, readable surfaces.

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Scale, Flame, Beef, Droplets, Lock, ShieldAlert } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { navigate } from '@/lib/router'
import { TapCard, Stagger, StaggerItem, SponsoredCard, Field } from '@/components/mobile/design'
import { useApp } from '@/lib/app-store'

type ToolId = 'bmi' | 'calories' | 'protein' | 'water'

function bmrOf(sex: 'm' | 'f', weight: number, height: number, age: number): number {
  return sex === 'm' ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161
}
const ACTIVITY: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }

const FIELD =
  'min-h-12 w-full rounded-2xl border border-input bg-card px-3.5 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ToolsTab() {
  const { lang, t } = useLanguage()
  const pro = useApp((s) => s.pro)
  const [tool, setTool] = useState<ToolId>('bmi')

  const tools: { id: ToolId; icon: React.ElementType; label: string }[] = [
    { id: 'bmi', icon: Scale, label: 'BMI' },
    { id: 'calories', icon: Flame, label: t(UI.app.tabCalories) },
    { id: 'protein', icon: Beef, label: t(UI.app.tabProtein) },
    { id: 'water', icon: Droplets, label: t(UI.app.tabWater) },
  ]

  return (
    <div className="px-4 pt-3">
      {/* interaction checker promo */}
      <Stagger>
        <StaggerItem>
          <TapCard
            onClick={() => navigate('/checker')}
            className="grad-remedy gloss flex min-h-16 w-full items-center gap-3 overflow-hidden rounded-3xl p-4 text-white shadow-float"
          >
            <ShieldAlert className="h-7 w-7 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">{t(UI.app.interactionChecker)}</span>
              <span className="block text-[11px] opacity-85">{t(UI.app.interactionCheckerSub)}</span>
            </span>
            <span className="min-h-11 rounded-full bg-white/20 px-3.5 py-2 text-[11px] font-extrabold">{t(UI.app.checkNow)}</span>
          </TapCard>
        </StaggerItem>

        <StaggerItem className="mt-4">
          {/* tool switcher */}
          <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-muted p-1.5" role="tablist" aria-label={t(UI.nav.tools)}>
            {tools.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tool === id}
                onClick={() => setTool(id)}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-extrabold transition-colors ${
                  tool === id ? 'bg-card text-primary shadow-card' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </StaggerItem>

        <StaggerItem className="mt-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={tool}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="rounded-3xl border border-border/60 bg-card p-4 shadow-card"
            >
              {tool === 'bmi' && <BmiTool lang={lang} t={t} />}
              {tool === 'calories' && <BodyTool lang={lang} t={t} mode="calories" />}
              {tool === 'protein' && <BodyTool lang={lang} t={t} mode="protein" />}
              {tool === 'water' && <BodyTool lang={lang} t={t} mode="water" />}
            </motion.div>
          </AnimatePresence>
        </StaggerItem>

        {!pro && (
          <StaggerItem className="mt-4">
            <SponsoredCard compact />
          </StaggerItem>
        )}

        <StaggerItem className="mt-4">
          <p className="pb-2 text-center text-[10px] leading-relaxed text-muted-foreground">{t(UI.app.disclaimerShort)}</p>
        </StaggerItem>
      </Stagger>
    </div>
  )
}

function Guard({ msg }: { msg: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-red-300 bg-red-50 p-3 dark:bg-red-950/30" role="alert">
      <p className="flex items-center gap-1.5 text-xs font-extrabold text-red-800">
        <Lock className="h-3.5 w-3.5 shrink-0" /> {t_guard()}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-red-900">{msg}</p>
    </div>
  )
}

function t_guard() {
  // fixed label — safety lockout (kept out of i18n to avoid prop drilling)
  return 'Safety lockout'
}

function BmiTool({ lang, t }: { lang: string; t: (e: { en: string; hi: string } | string) => string }) {
  const [w, setW] = useState('')
  const [h, setH] = useState('')
  const bmi = useMemo(() => {
    const weight = parseFloat(w)
    const height = parseFloat(h)
    if (isNaN(weight) || isNaN(height) || height <= 0) return null
    return weight / Math.pow(height / 100, 2)
  }, [w, h])

  const hInvalid = h.trim() !== '' && (isNaN(parseFloat(h)) || parseFloat(h) <= 0)
  const wInvalid = w.trim() !== '' && (isNaN(parseFloat(w)) || parseFloat(w) <= 0)

  const cat = bmi === null ? null : bmi < 18.5 ? { l: t(UI.tools.underweight), c: 'text-amber-600' } : bmi < 23 ? { l: t(UI.tools.normal), c: 'text-emerald-600' } : bmi < 25 ? { l: t(UI.tools.overweight), c: 'text-amber-600' } : { l: t(UI.tools.obese), c: 'text-red-600' }

  return (
    <>
      <p className="text-xs text-muted-foreground">
        {t(UI.app.indianCutoffs)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Field label={t(UI.tools.weight)} htmlFor="bmi-w" error={wInvalid ? t(UI.app.enterValidWeight) : undefined}>
          <input
            id="bmi-w"
            type="number"
            inputMode="decimal"
            placeholder="kg"
            value={w}
            onChange={(e) => setW(e.target.value)}
            className={FIELD}
            aria-label={t(UI.tools.weight)}
          />
        </Field>
        <Field label={t(UI.tools.height)} htmlFor="bmi-h" error={hInvalid ? t(UI.app.enterValidHeight) : undefined}>
          <input
            id="bmi-h"
            type="number"
            inputMode="decimal"
            placeholder="cm"
            value={h}
            onChange={(e) => setH(e.target.value)}
            className={FIELD}
            aria-label={t(UI.tools.height)}
          />
        </Field>
      </div>
      {bmi !== null && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl bg-secondary/50 p-4 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{t(UI.tools.bmiResult)}</p>
          <p className="tabular text-4xl font-extrabold">{bmi.toFixed(1)}</p>
          <p className={`text-sm font-bold ${cat?.c}`}>
            {cat?.l} {cat && <span className="sr-only"> ({bmi.toFixed(1)})</span>}
          </p>
        </motion.div>
      )}
      {bmi !== null && bmi < 16 && <Guard msg={t(UI.tools.lowBmiWarn)} />}
    </>
  )
}

function BodyTool({ lang, t, mode }: { lang: string; t: (e: { en: string; hi: string } | string) => string; mode: 'calories' | 'protein' | 'water' }) {
  const [age, setAge] = useState('')
  const [w, setW] = useState('')
  const [h, setH] = useState('')
  const [sex, setSex] = useState<'m' | 'f'>('m')
  const [pregnant, setPregnant] = useState(false)
  const [activity, setActivity] = useState<keyof typeof ACTIVITY>('moderate')

  const ageN = parseInt(age, 10)
  const wN = parseFloat(w)
  const hN = parseFloat(h)

  const guard = useMemo(() => {
    if (!isNaN(ageN) && ageN < 18) return 'under18'
    if (pregnant && mode !== 'water') return 'pregnant'
    if (!isNaN(wN) && !isNaN(hN) && hN > 0 && mode === 'calories' && wN / Math.pow(hN / 100, 2) < 16) return 'lowBmi'
    return null
  }, [ageN, wN, hN, pregnant, mode])

  const result = useMemo(() => {
    if (guard || isNaN(wN) || wN <= 0) return null
    if (mode === 'water') return Math.round(wN * 35) // ml/day (35 ml/kg, NIN hydration guidance)
    if (isNaN(ageN) || isNaN(hN) || ageN <= 0 || hN <= 0) return null
    if (mode === 'calories') return Math.round(bmrOf(sex, wN, hN, ageN) * ACTIVITY[activity])
    // protein: NIN 2024 RDA ~0.83 g/kg (adults), rounded
    return Math.round(wN * 0.83)
  }, [guard, mode, wN, hN, ageN, sex, activity])

  const ageInvalid = age.trim() !== '' && (isNaN(ageN) || ageN <= 0)
  const wInvalid = w.trim() !== '' && (isNaN(wN) || wN <= 0)

  const labels = {
    calories: { unit: t(UI.app.kcalDay), title: t(UI.tools.caloriesTitle) },
    protein: { unit: t(UI.app.gDay), title: t(UI.tools.proteinTitle) },
    water: { unit: 'ml/day', title: t(UI.app.hydration) },
  }[mode]

  return (
    <>
      <p className="text-xs text-muted-foreground">
        {mode === 'calories' && t(UI.app.mifflin)}
        {mode === 'protein' && t(UI.app.rdaNote)}
        {mode === 'water' && t(UI.app.waterNote)}
      </p>

      {/* grouped: about you */}
      <p className="mt-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
        {t(UI.app.aboutYou)}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2.5">
        {mode !== 'water' && (
          <Field label={t(UI.tools.age)} htmlFor="bt-age" error={ageInvalid ? t(UI.app.enterValidAge) : undefined}>
            <input id="bt-age" type="number" inputMode="numeric" placeholder={t(UI.app.yearsUnit)} value={age} onChange={(e) => setAge(e.target.value)} className={FIELD} aria-label={t(UI.tools.age)} />
          </Field>
        )}
        <Field label={t(UI.tools.weight)} htmlFor="bt-w" error={wInvalid ? t(UI.app.enterValidWeight) : undefined}>
          <input id="bt-w" type="number" inputMode="decimal" placeholder="kg" value={w} onChange={(e) => setW(e.target.value)} className={FIELD} aria-label={t(UI.tools.weight)} />
        </Field>
        {mode !== 'water' && (
          <Field label={t(UI.tools.height)} htmlFor="bt-h">
            <input id="bt-h" type="number" inputMode="decimal" placeholder="cm" value={h} onChange={(e) => setH(e.target.value)} className={FIELD} aria-label={t(UI.tools.height)} />
          </Field>
        )}
        <Field label={t(UI.tools.sex)}>
          <div className="grid grid-cols-2 gap-2">
            {(['m', 'f'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSex(s)}
                aria-pressed={sex === s}
                className={`min-h-12 rounded-2xl border text-xs font-extrabold ${sex === s ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-card text-muted-foreground'}`}
              >
                {s === 'm' ? t(UI.tools.male) : t(UI.tools.female)}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {mode === 'calories' && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{t(UI.tools.activity)}</p>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {(Object.keys(ACTIVITY) as (keyof typeof ACTIVITY)[]).map((k) => (
              <button
                key={k}
                onClick={() => setActivity(k)}
                aria-pressed={activity === k}
                className={`min-h-11 shrink-0 rounded-full px-3.5 text-[10px] font-extrabold capitalize ${activity === k ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground'}`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}
      {mode !== 'water' && (
        <label className="mt-3 flex min-h-11 items-center gap-2 text-xs font-semibold">
          <input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} className="h-4 w-4 rounded" />
          {t(UI.app.pregLact)}
        </label>
      )}
      {guard ? (
        <Guard msg={guard === 'under18' ? t(UI.tools.lockUnder18) : guard === 'pregnant' ? t(UI.tools.lockPregnancy) : t(UI.tools.lowBmiWarn)} />
      ) : (
        result !== null && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl bg-secondary/50 p-4 text-center">
            <p className="tabular text-4xl font-extrabold">
              {result}
              <span className="ml-1 text-sm font-bold text-muted-foreground">{labels.unit}</span>
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{labels.title}</p>
          </motion.div>
        )
      )}
      {mode === 'protein' && result !== null && !guard && (
        <p className="mt-2.5 rounded-2xl bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">{t(UI.tools.proteinRdaNote)}</p>
      )}
    </>
  )
}
