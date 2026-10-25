'use client'

// Premium language picker — searchable, region-grouped, native-script names.
// Used by the mobile Profile sheet, onboarding and the desktop header.
// All 60+ languages render their native name in their own script so every
// speaker can find theirs without reading another language.

import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check, ChevronRight, Globe, Search, X } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { UI, LANGUAGES, REGION_ORDER, type Lang, type LangRegion, type LanguageInfo } from '@/lib/i18n'

// Shown as quick chips before the user searches or scrolls
export const POPULAR_IDS: Lang[] = ['en', 'hi', 'es', 'fr', 'de', 'pt-BR', 'zh', 'ja', 'ar', 'ta']

function makeRegionLabel(t: (e: { en: string; hi: string } | string) => string): Record<LangRegion, string> {
  return {
    india: t(UI.langs.regionIndia),
    europe: t(UI.langs.regionEurope),
    americas: t(UI.langs.regionAmericas),
    asia: t(UI.langs.regionAsia),
    mideast: t(UI.langs.regionMideast),
  }
}

function matches(l: LanguageInfo, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return (
    l.native.toLowerCase().includes(s) ||
    l.english.toLowerCase().includes(s) ||
    l.id.toLowerCase().includes(s)
  )
}

function LangRow({ l, active, onPick }: { l: LanguageInfo; active: boolean; onPick: (l: Lang) => void }) {
  return (
    <button
      onClick={() => onPick(l.id)}
      aria-pressed={active}
      className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-2 text-left transition-colors ${
        active ? 'border-primary bg-primary/10' : 'border-transparent active:bg-secondary/50'
      }`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-extrabold ${active ? 'grad-hero text-white' : 'bg-secondary text-muted-foreground'}`}>
        {l.short}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[14.5px] font-bold leading-tight ${active ? 'text-primary' : ''}`} dir="auto">
          {l.native}
        </span>
        <span className="block truncate text-[10.5px] text-muted-foreground" dir="auto">
          {l.english}
        </span>
      </span>
      {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  )
}

// ── Full scrollable picker (used inside the sheet and the desktop popover) ──
export function LanguageList({ onPick }: { onPick: (l: Lang) => void }) {
  const { lang, t } = useLanguage()
  const [q, setQ] = useState('')
  const labels = makeRegionLabel(t)

  const { popular, groups } = useMemo(() => {
    const filtered = LANGUAGES.filter((l) => matches(l, q))
    const pop = q.trim()
      ? []
      : POPULAR_IDS.map((id) => LANGUAGES.find((l) => l.id === id)).filter((x): x is LanguageInfo => !!x)
    const gs: { region: LangRegion; items: LanguageInfo[] }[] = []
    for (const region of REGION_ORDER) {
      const items = filtered.filter((l) => l.region === region)
      if (items.length) gs.push({ region, items })
    }
    return { popular: pop, groups: gs }
  }, [q])

  const empty = popular.length === 0 && groups.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative mb-2 shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t(UI.langs.searchPlaceholder)}
          aria-label={t(UI.app.language)}
          className="h-11 w-full rounded-2xl border border-border bg-secondary/50 pl-9 pr-3 text-[13.5px] font-semibold outline-none placeholder:font-medium placeholder:text-muted-foreground focus:border-primary/50"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 scroll-slim" dir="auto">
        {empty && (
          <p className="px-1 py-8 text-center text-[12.5px] text-muted-foreground">{t(UI.langs.noMatch)}</p>
        )}

        {popular.length > 0 && (
          <section className="mb-2">
            <h3 className="px-1 pb-1.5 pt-1 text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {t(UI.langs.popular)}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {popular.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onPick(l.id)}
                  aria-pressed={lang === l.id}
                  className={`flex min-h-[40px] items-center gap-1.5 rounded-full border-2 px-3.5 text-[13px] font-extrabold ${
                    lang === l.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground/80'
                  }`}
                >
                  <span dir="auto">{l.native}</span>
                  {lang === l.id && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </section>
        )}

        {groups.map(({ region, items }) => (
          <section key={region} className="mb-2">
            <h3 className="px-1 pb-1 pt-2.5 text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {labels[region]}
            </h3>
            <div className="space-y-0.5">
              {items.map((l) => (
                <LangRow key={l.id} l={l} active={lang === l.id} onPick={onPick} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

// ── Mobile bottom sheet ────────────────────────────────────────────────────
export function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setLang, t } = useLanguage()
  const reduceMotion = useReducedMotion()

  const pick = (l: Lang) => {
    setLang(l)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black/40"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={t(UI.app.language)}
            initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85vh] max-w-[520px] flex-col rounded-t-[28px] bg-background p-4 pb-7 shadow-float"
          >
            <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-border" />
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <h2 className="text-base font-extrabold">{t(UI.app.language)}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <LanguageList onPick={pick} />
            <p className="mt-2.5 shrink-0 text-center text-[10.5px] leading-relaxed text-muted-foreground">
              {t(UI.langs.contentNote)}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Desktop header dropdown ────────────────────────────────────────────────
export function LanguageDropdown({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setLang, t } = useLanguage()

  const pick = (l: Lang) => {
    setLang(l)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[80]" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-label={t(UI.app.language)}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-[85] mt-2 flex h-[420px] w-[340px] flex-col rounded-3xl border border-border/70 bg-background p-3.5 shadow-float"
          >
            <LanguageList onPick={pick} />
            <p className="mt-2 shrink-0 text-center text-[10px] leading-relaxed text-muted-foreground">
              {t(UI.langs.contentNote)}
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Onboarding trigger row (popular chips + "all languages" opener) ────────
export function OnboardingLanguagePicker({ onOpenAll }: { onOpenAll: () => void }) {
  const { lang, setLang, t } = useLanguage()
  const popular = POPULAR_IDS.map((id) => LANGUAGES.find((l) => l.id === id)).filter((x): x is LanguageInfo => !!x)

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {popular.map((l) => (
          <button
            key={l.id}
            onClick={() => setLang(l.id)}
            aria-pressed={lang === l.id}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-full border-2 px-3.5 text-[13px] font-extrabold ${
              lang === l.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground/80'
            }`}
          >
            <span dir="auto">{l.native}</span>
            {lang === l.id && <Check className="h-3.5 w-3.5" />}
          </button>
        ))}
      </div>
      <button
        onClick={onOpenAll}
        className="mt-2.5 flex min-h-[48px] w-full items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-4 text-left active:bg-secondary/40"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          <Globe className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold">{t(UI.langs.allLanguages)}</span>
          <span className="block truncate text-[10.5px] text-muted-foreground">{t(UI.onboarding.languagesAll)}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl-flip" />
      </button>
    </div>
  )
}
