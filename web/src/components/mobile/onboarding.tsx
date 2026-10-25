'use client'

// Onboarding — the app's "registration" flow. Sanjeevani is intentionally
// account-free (DPDP-friendly): this 3-step flow registers your *preferences*
// (language, health focus areas) and records informed consent locally.
// Progress indicator, 48 dp controls, skip for returning users.

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Leaf, ShieldCheck, Languages, HeartHandshake } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { navigate } from '@/lib/router'
import { useApp, type Section } from '@/lib/app-store'
import { Btn, StepProgress } from '@/components/mobile/design'
import { OnboardingLanguagePicker, LanguageSheet } from '@/components/mobile/language-picker'

const FOCUS_OPTIONS: { id: Section; icon: React.ElementType; key: { en: string; hi: string } }[] = [
  { id: 'herbs', icon: Leaf, key: UI.nav.herbs },
  { id: 'yoga', icon: HeartHandshake, key: UI.nav.yoga },
  { id: 'nutrition', icon: HeartHandshake, key: UI.nav.nutrition },
  { id: 'homeopathy', icon: Leaf, key: UI.nav.homeopathy },
]

const STEP_COUNT = 3

export function Onboarding() {
  const { t } = useLanguage()
  const setOnboarded = useApp((s) => s.setOnboarded)
  const setFocusAreas = useApp((s) => s.setFocusAreas)
  const [step, setStep] = useState(0)
  const [areas, setAreas] = useState<Section[]>([])
  const [acked, setAcked] = useState(false)
  const [langSheet, setLangSheet] = useState(false)
  const reduce = useReducedMotion()

  const done = () => {
    setFocusAreas(areas)
    setOnboarded()
    navigate('/home')
  }

  const toggleArea = (id: Section) =>
    setAreas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 4)))

  const steps = [
    // 1 · Welcome
    <div key="welcome" className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={reduce ? undefined : { scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="grad-hero gloss grid h-24 w-24 place-items-center rounded-[28px] text-white shadow-float"
      >
        <Leaf className="h-11 w-11" />
      </motion.div>
      <h1 className="t-title mt-5">{t(UI.onboarding.welcomeTitle)}</h1>
      <p className="t-body mt-2 max-w-[320px] text-muted-foreground">{t(UI.onboarding.welcomeBody)}</p>
      <ul className="mt-5 space-y-2 text-left">
        {[
          { icon: ShieldCheck, label: t({ en: 'Evidence tiers A–T on every claim', hi: 'हर दावे पर प्रमाण श्रेणी A–T' }) },
          { icon: Languages, label: t(UI.onboarding.languagesAll) },
          { icon: HeartHandshake, label: t({ en: 'Safety-first: interactions & lockouts', hi: 'सुरक्षा-प्रथम: इंटरैक्शन और लॉकआउट' }) },
        ].map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-card px-3.5 py-2.5 shadow-card">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </span>
            <span className="text-[13px] font-semibold">{label}</span>
          </li>
        ))}
      </ul>
    </div>,

    // 2 · Personalize
    <div key="personalize" className="flex flex-1 flex-col px-5 pt-2">
      <h1 className="t-title">{t(UI.onboarding.personalizeTitle)}</h1>
      <p className="t-body mt-1 text-muted-foreground">{t(UI.onboarding.personalizeBody)}</p>

      <h2 className="mt-5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{t(UI.onboarding.languageTitle)}</h2>
      <div className="mt-2">
        <OnboardingLanguagePicker onOpenAll={() => setLangSheet(true)} />
      </div>

      <h2 className="mt-5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{t(UI.onboarding.focusTitle)}</h2>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{t(UI.onboarding.focusHint)}</p>
      <div className="mt-2 grid grid-cols-2 gap-2.5">
        {FOCUS_OPTIONS.map(({ id, icon: Icon, key }) => {
          const on = areas.includes(id)
          return (
            <button
              key={id}
              onClick={() => toggleArea(id)}
              aria-pressed={on}
              className={`flex min-h-14 items-center gap-2 rounded-2xl border-2 px-3 text-[13px] font-extrabold transition-colors ${
                on ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
              }`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${on ? 'grad-hero text-white' : 'bg-secondary'}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 truncate">{t(key)}</span>
            </button>
          )
        })}
      </div>
    </div>,

    // 3 · Data & consent
    <div key="data" className="flex flex-1 flex-col px-5 pt-2">
      <h1 className="t-title">{t(UI.onboarding.dataTitle)}</h1>
      <p className="t-body mt-2 leading-relaxed text-muted-foreground">{t(UI.onboarding.dataBody)}</p>

      <div className="mt-5 space-y-2.5">
        <div className="flex items-start gap-2.5 rounded-2xl border border-border/60 bg-card p-3.5 shadow-card">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-[12px] leading-relaxed">
            <b>{t({ en: 'No account, no phone number.', hi: 'कोई खाता नहीं, कोई फ़ोन नंबर नहीं।' })}</b>{' '}
            {t({
              en: 'Streaks and saves are stored only on this device.',
              hi: 'लय और सेव केवल इसी डिवाइस पर सहेजे जाते हैं।',
            })}
          </p>
        </div>
        <button
          onClick={() => navigate('/privacy')}
          className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-border/60 bg-card px-3.5 text-left text-[13px] font-bold shadow-card active:bg-secondary/40"
        >
          {t(UI.privacy.title)}
          <span className="text-xs text-primary">{t(UI.common.viewAll)}</span>
        </button>
      </div>

      <label className="mt-5 flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl bg-secondary/50 p-3.5">
        <input
          type="checkbox"
          checked={acked}
          onChange={(e) => setAcked(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded accent-[var(--primary)]"
        />
        <span className="text-[12px] font-semibold leading-relaxed">{t(UI.onboarding.disclaimerAck)}</span>
      </label>
    </div>,
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="safe-top" />
      <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col pb-6">
        {/* top bar: skip + progress */}
        <div className="flex items-center gap-3 px-5 pt-3">
          <button
            onClick={done}
            className="rounded-full px-3 py-2 text-xs font-bold text-muted-foreground active:bg-secondary/60"
          >
            {t(UI.onboarding.skip)}
          </button>
          <div className="flex-1">
            <StepProgress
              step={step + 1}
              total={STEP_COUNT}
              label={`${t(UI.onboarding.stepOf)} ${step + 1}/${STEP_COUNT}`}
            />
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduce ? { opacity: 1 } : { opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0, x: -28 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col"
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>

        {/* actions */}
        <div className="safe-bottom mt-4 px-5">
          {step < STEP_COUNT - 1 ? (
            <div className="flex gap-2.5">
              {step > 0 && (
                <Btn variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
                  {t({ en: 'Back', hi: 'पीछे' })}
                </Btn>
              )}
              <Btn onClick={() => setStep((s) => s + 1)} className="flex-[2]">
                {t(UI.onboarding.continue)}
              </Btn>
            </div>
          ) : (
            <Btn onClick={done} disabled={!acked} className="w-full">
              {t(UI.onboarding.finish)}
            </Btn>
          )}
        </div>

        {/* full 60+ language picker */}
        <LanguageSheet open={langSheet} onClose={() => setLangSheet(false)} />
      </div>
    </div>
  )
}
