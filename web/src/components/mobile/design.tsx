'use client'

// Sanjeevani Mobile — shared design primitives ("Botanical Glass" system).
// Tokens live in globals.css; these components encode the interaction rules:
// ≥48 dp primary targets, press feedback, skeletons, empty/error states,
// and reduced-motion-aware entrances.

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Flame, Heart, Sparkles, ChevronRight, AlertTriangle, RefreshCw, Inbox } from 'lucide-react'
import { useEffect, useState } from 'react'
import { navigate } from '@/lib/router'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import type { Section } from '@/lib/app-store'
import { useApp } from '@/lib/app-store'

// ── Evidence tier chip (letter + color + title — never color alone) ───────
const TIER_STYLE: Record<string, string> = {
  A: 'bg-emerald-600 text-white',
  B: 'bg-teal-600/90 text-white',
  C: 'bg-amber-500 text-white',
  T: 'bg-stone-500/90 text-white',
}

export function TierChip({ tier, size = 'sm' }: { tier: string; size?: 'sm' | 'xs' }) {
  const cls = TIER_STYLE[tier] || TIER_STYLE.T
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-bold ${cls} ${
        size === 'sm' ? 'h-5 min-w-5 px-1.5 text-[10px]' : 'h-4 min-w-4 px-1 text-[9px]'
      }`}
      title={`Evidence tier ${tier}`}
    >
      {tier}
    </span>
  )
}

// ── Real photo with graceful shimmer + gradient fallback ──────────────────
export function Photo({
  src,
  alt,
  className = '',
  imgClassName = '',
  fallback,
}: {
  src?: string | null
  alt: string
  className?: string
  imgClassName?: string
  fallback?: React.ReactNode
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <>{fallback ?? null}</>
  // callers may position the photo themselves (e.g. "absolute inset-0" hero
  // fill); only default to relative when no explicit position is requested
  const positionsSelf = /\b(absolute|fixed|sticky)\b/.test(className)
  return (
    <span className={`block overflow-hidden ${positionsSelf ? '' : 'relative'} ${className}`}>
      {!loaded && <span className="shimmer absolute inset-0" aria-hidden />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
      />
    </span>
  )
}

// ── Pressable card (spring micro-interaction on every tappable surface) ───
export function TapCard({
  children,
  className = '',
  onClick,
  whileTap = 0.97,
  ariaLabel,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  whileTap?: number
  ariaLabel?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      whileTap={reduce ? undefined : { scale: whileTap }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className={`text-left tap-none ${className}`}
    >
      {children}
    </motion.button>
  )
}

// ── Button hierarchy ───────────────────────────────────────────────────────
// primary  → filled emerald gradient, glossy, 48 dp min height
// tonal    → sage secondary surface
// outline  → bordered card surface
// ghost    → text only
export function Btn({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled,
  ariaLabel,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'tonal' | 'outline' | 'ghost'
  className?: string
  disabled?: boolean
  ariaLabel?: string
  type?: 'button' | 'submit'
}) {
  const reduce = useReducedMotion()
  const styles: Record<string, string> = {
    primary: 'grad-hero gloss text-white shadow-float',
    tonal: 'bg-secondary text-secondary-foreground',
    outline: 'border border-border bg-card text-foreground shadow-card',
    ghost: 'text-primary',
  }
  return (
    <motion.button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      whileTap={reduce || disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold transition-opacity disabled:opacity-50 tap-none ${styles[variant]} ${className}`}
    >
      {children}
    </motion.button>
  )
}

// ── Solid glass-ish card (opaque — for forms & medical content) ───────────
export function SurfaceCard({
  children,
  className = '',
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  ariaLabel?: string
}) {
  if (onClick) {
    return (
      <TapCard onClick={onClick} ariaLabel={ariaLabel} className={`rounded-3xl border border-border/60 bg-card shadow-card ${className}`}>
        {children}
      </TapCard>
    )
  }
  return <section className={`rounded-3xl border border-border/60 bg-card shadow-card ${className}`}>{children}</section>
}

// ── Section header with optional action ───────────────────────────────────
export function SectionHeader({
  title,
  sub,
  actionLabel,
  onAction,
  className = '',
}: {
  title: string
  sub?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}) {
  return (
    <div className={`flex items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="t-headline font-extrabold tracking-tight">{title}</h2>
        {sub && <p className="t-micro text-muted-foreground">{sub}</p>}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-xs font-bold text-primary active:bg-secondary/60"
        >
          {actionLabel} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// ── Staggered entrance list container / item (reduced-motion aware) ───────
export function Stagger({ children, delay = 0.04 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduce ? 0 : delay } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      variants={{
        hidden: { opacity: reduce ? 1 : 0, y: reduce ? 0 : 14 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24, duration: reduce ? 0.01 : undefined } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────
export function SkCard({ h = 'h-20' }: { h?: string }) {
  return <div className={`shimmer rounded-3xl ${h}`} />
}

export function SkRow({ n = 5, h = 'h-16' }: { n?: number; h?: string }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className={`shimmer rounded-3xl ${h}`} />
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: React.ElementType
  title: string
  body?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-9 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-3xl bg-secondary text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-extrabold">{title}</p>
      {body && <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-muted-foreground">{body}</p>}
      {actionLabel && onAction && (
        <Btn variant="tonal" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Btn>
      )}
    </div>
  )
}

// ── Error state (with retry) ──────────────────────────────────────────────
export function ErrorState({ title, body, onRetry }: { title?: string; body?: string; onRetry?: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col items-center rounded-3xl border border-red-200 bg-red-50/70 px-6 py-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
      <span className="grid h-14 w-14 place-items-center rounded-3xl bg-red-100 text-red-600 dark:bg-red-900/40">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-extrabold text-red-900 dark:text-red-200">{title || t(UI.common.loading)}</p>
      {body && <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-red-800/80 dark:text-red-300/80">{body}</p>}
      {onRetry && (
        <Btn variant="outline" className="mt-4" onClick={onRetry} ariaLabel="Retry">
          <RefreshCw className="h-4 w-4" /> {t({ en: 'Try again', hi: 'फिर कोशिश करें' })}
        </Btn>
      )}
    </div>
  )
}

// ── Labelled form field (48 dp, hint + error support) ─────────────────────
export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-extrabold text-foreground/90">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-600" role="alert">
          <AlertTriangle className="h-3 w-3 shrink-0" /> {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

// ── Onboarding / multi-step progress ──────────────────────────────────────
export function StepProgress({ step, total, label }: { step: number; total: number; label?: string }) {
  return (
    <div className="flex items-center gap-3" aria-label={label}>
      <div className="flex flex-1 gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <motion.span
            key={i}
            layout
            className={`h-1.5 flex-1 rounded-full ${i < step ? 'grad-hero' : 'bg-border'}`}
          />
        ))}
      </div>
      {label && <span className="tabular text-[11px] font-bold text-muted-foreground">{label}</span>}
    </div>
  )
}

// ── Segmented control (theme etc.) ────────────────────────────────────────
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: T; label: string; icon?: React.ElementType }[]
  value: T
  onChange: (v: T) => void
  ariaLabel?: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-muted p-1.5">
      {options.map(({ id, label, icon: Icon }) => {
        const active = value === id
        return (
          <button
            key={id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={`relative flex min-h-11 flex-col sm:flex-row items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-extrabold transition-colors sm:flex-row ${
              active ? 'bg-card text-primary shadow-card' : 'text-muted-foreground'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span className="whitespace-nowrap">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Save (heart) button with burst animation ──────────────────────────────
export function SaveButton({
  section,
  slug,
  name,
  tier,
  onLimit,
  light = false,
}: {
  section: Section
  slug: string
  name: string
  tier?: string
  onLimit?: () => void
  light?: boolean
}) {
  const { t } = useLanguage()
  const saved = useApp((s) => s.saved.some((x) => x.section === section && x.slug === slug))
  const toggleSave = useApp((s) => s.toggleSave)
  const [burst, setBurst] = useState(0)
  const reduce = useReducedMotion()

  return (
    <motion.button
      type="button"
      aria-label={saved ? t(UI.app.saved) : t(UI.app.save)}
      whileTap={reduce ? undefined : { scale: 0.8 }}
      onClick={(e) => {
        e.stopPropagation()
        const r = toggleSave({ section, slug, name, tier })
        if (r === 'limit') onLimit?.()
        if (r === 'added') setBurst((b) => b + 1)
      }}
      className={`relative grid h-11 w-11 place-items-center rounded-full ${
        light ? 'glass-chip backdrop-blur-md text-white' : 'bg-secondary text-foreground'
      }`}
    >
      <Heart className={`h-[18px] w-[18px] transition-colors ${saved ? 'fill-red-500 text-red-500' : ''}`} />
      <AnimatePresence>
        {burst > 0 && !reduce && (
          <motion.span
            key={burst}
            initial={{ opacity: 0.9, scale: 0.4 }}
            animate={{ opacity: 0, scale: 1.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-red-400"
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ── Animated count-up number (reduced-motion aware) ──────────────────────
export function CountUp({ value, className = '', locale = 'en-IN' }: { value: number | null; className?: string; locale?: string }) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(0)
  const target = value ?? 0
  useEffect(() => {
    if (value === null) return
    let raf = 0
    const t0 = performance.now()
    const dur = reduce ? 1 : 900
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, reduce, value])
  return (
    <span className={`tabular ${className}`} aria-label={value === null ? undefined : value.toLocaleString(locale)}>
      {value === null ? '—' : display.toLocaleString(locale)}
    </span>
  )
}

// ── Section identity (icon + gradient + label) ────────────────────────────
export const SECTION_META: Record<Section, { grad: string; icon: React.ElementType; key: { en: string; hi: string }; path: string }> = {
  herbs: { grad: 'grad-herbs', icon: Sparkles, key: UI.nav.herbs, path: '/herbs' },
  yoga: { grad: 'grad-yoga', icon: Flame, key: UI.nav.yoga, path: '/yoga' },
  nutrition: { grad: 'grad-foods', icon: ChevronRight, key: UI.nav.nutrition, path: '/nutrition' },
  homeopathy: { grad: 'grad-remedy', icon: Sparkles, key: UI.nav.homeopathy, path: '/homeopathy' },
}

// ── Evidence tier legend row (educational, used before the quiz) ──────────
export function TierLegendChipRow() {
  const { t } = useLanguage()
  const items: [string, { en: string; hi: string }][] = [
    ['A', { en: 'Strong evidence', hi: 'मज़बूत प्रमाण' }],
    ['B', { en: 'Limited trials', hi: 'सीमित परीक्षण' }],
    ['C', { en: 'Lab / animal', hi: 'प्रयोगशाला' }],
    ['T', { en: 'Traditional', hi: 'पारंपरिक' }],
  ]
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {items.map(([tier, label]) => (
        <span key={tier} className="flex items-center gap-1 rounded-full bg-white/15 py-1 pl-1 pr-2 text-[10px] font-bold">
          <TierChip tier={tier} size="xs" />
          {t(label)}
        </span>
      ))}
    </div>
  )
}

// ── Native ad slot (clearly labelled; AdMob native slot in production) ─────
export function SponsoredCard({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage()
  if (compact) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-lg">🌿</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">
              {t(UI.app.sponsored)} · <span className="text-muted-foreground">{t(UI.app.adLabel)}</span>
            </p>
            <p className="truncate text-[11px] text-muted-foreground">Genuine Ayurveda partner slot — AdMob native</p>
          </div>
          <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Learn more</span>
        </div>
      </div>
    )
  }
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-muted/40 p-4">
      <span className="absolute right-3 top-3 rounded-full bg-background/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
        {t(UI.app.adLabel)}
      </span>
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-2xl">🌿</div>
        <div>
          <p className="text-sm font-bold">{t(UI.app.sponsored)}</p>
          <p className="text-xs text-muted-foreground">Partner placement — AdMob native slot (production)</p>
        </div>
      </div>
      <div className="mt-3 h-16 rounded-xl bg-secondary/50" />
    </div>
  )
}

// ── Install banner (PWA → store-ready shell) ──────────────────────────────
export function InstallBanner() {
  const { t } = useLanguage()
  const [show, setShow] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      const standalone =
        typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as { standalone?: boolean }).standalone === true)
      const dismissed = window.localStorage.getItem('sanjeevani_install_dismissed') === '1'
      setShow(!standalone && !dismissed)
    })
  }, [])

  if (!show) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-card shadow-card ring-1 ring-border"
    >
      <button
        aria-label="Dismiss install banner"
        onClick={() => {
          window.localStorage.setItem('sanjeevani_install_dismissed', '1')
          setShow(false)
        }}
        className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-secondary text-xs text-muted-foreground"
      >
        ✕
      </button>
      <div className="flex items-center gap-3 p-4 pr-12">
        <div className="grad-hero gloss grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl text-white shadow-float">🌱</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{t(UI.app.installCta)}</p>
          <p className="text-[11px] leading-tight text-muted-foreground">{t(UI.app.installSub)}</p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="grad-hero gloss min-h-11 rounded-full px-3.5 text-xs font-bold text-white shadow-float"
        >
          {t(UI.app.installApp)}
        </button>
      </div>
    </motion.div>
  )
}
