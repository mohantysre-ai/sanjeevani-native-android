'use client'

// Home tab — LIVING DASHBOARD (Material 3 Expressive):
// daypart-driven dynamic hero (palette follows the clock) → adaptive
// "For you" quick-filter pills → personalized snap-carousel (usage +
// time-of-day ranking) → date-seeded fact → shortcuts → count-up stats →
// recent activity → mixed-radius library grid. Zero-config personalization:
// onboarding focus areas + browse recency + time affinity, nothing to set up.

import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  Search, ShieldAlert, Scale, Sparkles, ChevronRight, Leaf, PersonStanding,
  UtensilsCrossed, Pill, Flame, ArrowRight, ScrollText, Lightbulb, Info,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { UI, type Lang } from '@/lib/i18n'
import { apiGet } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useApp, todayKey, type Section } from '@/lib/app-store'
import { useDaypart, DAYPART_AFFINITY, DAYPART_ICON, DAYPART_LABEL } from '@/lib/use-daypart'
import {
  TierChip, TapCard, Stagger, StaggerItem, SponsoredCard, InstallBanner,
  SECTION_META, Photo, SectionHeader, SkCard, CountUp,
} from '@/components/mobile/design'

interface DailyPick {
  section: Section
  slug: string
  name: string
  sub: string
  tier: string
  category: string | null
  blurb: string | null
  calories?: number | null
  image?: string | null
}
interface DailyResponse {
  date: string
  picks: { herb: DailyPick | null; asana: DailyPick | null; food: DailyPick | null; remedy: DailyPick | null }
}
interface StatsResponse {
  herbs: number
  asanas: number
  foods: number
  remedies: number
  claims: number
  featured?: Partial<Record<Section, string | null>>
}

// Clock/date as an external store: useSyncExternalStore gives React a stable
// server snapshot (null) and swaps to the real client values after hydration,
// so SSR HTML always matches the first client render (no hydration error).
const subscribeClock = () => () => {}
const getClockHour = () => new Date().getHours()
const getServerHour = () => null

const PICK_ICON: Record<string, React.ElementType> = {
  herbs: Leaf,
  yoga: PersonStanding,
  nutrition: UtensilsCrossed,
  homeopathy: Pill,
}

const DEFAULT_ORDER: Section[] = ['herbs', 'yoga', 'nutrition', 'homeopathy']

// M3E inline strings (en/hi pair — t() falls back gracefully per language)
const FOR_YOU = { en: 'For you', hi: 'आपके लिए' }
const NIGHT_GREETING = { en: 'Good night', hi: 'शुभ रात्रि' }

const LOCALE_OF: Partial<Record<Lang, string>> = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN',
}

function todayLine(locale: string): string {
  return new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

// date-seeded fact pick (same fnv1a-style rotation the Daily tab uses)
const FACT_KEYS = ['fact1', 'fact2', 'fact3', 'fact4', 'fact5', 'fact6'] as const
function factKeyForToday(): (typeof FACT_KEYS)[number] {
  const d = new Date()
  const seed = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate()
  return FACT_KEYS[seed % FACT_KEYS.length]
}

export function HomeTab() {
  const { lang, t } = useLanguage()
  const reduce = useReducedMotion()
  const [daily, setDaily] = useState<DailyResponse | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [todayStr, setTodayStr] = useState<string | null>(null)

  const focusAreas = useApp((s) => s.focusAreas)
  const recent = useApp((s) => s.recent)
  const streak = useApp((s) => s.streak)
  const pro = useApp((s) => s.pro)
  const hour = useSyncExternalStore(subscribeClock, getClockHour, getServerHour)
  const daypart = useDaypart()
  const [filter, setFilter] = useState<'for-you' | Section>('for-you')

  useEffect(() => {
    apiGet<DailyResponse>(`/api/v1/daily?language=${lang}`)
      .then(setDaily)
      .catch(() => setDaily({ date: todayKey(), picks: { herb: null, asana: null, food: null, remedy: null } }))
    apiGet<StatsResponse>('/api/v1/stats')
      .then(setStats)
      .catch(() => setStats({ herbs: 0, asanas: 0, foods: 0, remedies: 0, claims: 0 }))
  }, [lang])

  useEffect(() => {
    // date string is locale-volatile — set it post-hydration, not during render
    const id = window.setTimeout(() => setTodayStr(todayLine(LOCALE_OF[lang] || 'en-IN')), 0)
    return () => window.clearTimeout(id)
  }, [lang])

  const greeting =
    hour === null
      ? 'Namaste'
      : hour >= 21 || hour < 5
        ? t(NIGHT_GREETING)
        : hour < 12
          ? t(UI.app.goodMorning)
          : hour < 17
            ? t(UI.app.goodAfternoon)
            : t(UI.app.goodEvening)

  const picks = daily
    ? ([daily.picks.herb, daily.picks.asana, daily.picks.food, daily.picks.remedy].filter(Boolean) as DailyPick[])
    : []
  const fact = t(UI.app[factKeyForToday()])

  // ── M3E zero-config personalization ────────────────────────────────
  // blends onboarding focus areas + browse recency + time-of-day
  // affinity. Nothing to configure — the dashboard adapts itself.
  const score = (p: DailyPick) => {
    let s = 0
    if (focusAreas.includes(p.section)) s += 2
    if (recent.some((r) => r.section === p.section)) s += 3
    if (DAYPART_AFFINITY[daypart ?? 'morn']?.includes(p.section)) s += 1
    return s
  }
  const rankedPicks = [...picks].sort((a, b) => score(b) - score(a))
  // honest tag: only claim "For you" when the top pick actually earned it
  const personalized = picks.length > 0 && score(rankedPicks[0]) > 0
  const visiblePicks = filter === 'for-you' ? rankedPicks : picks.filter((p) => p.section === filter)
  const weight = (s: Section) => (recent.some((r) => r.section === s) ? 2 : 0) + (focusAreas.includes(s) ? 1 : 0)
  const filterOrder = [...DEFAULT_ORDER].sort((a, b) => weight(b) - weight(a))

  // personalized shortcut + library order (onboarding focus areas)
  const order: Section[] = [...focusAreas.filter((f) => DEFAULT_ORDER.includes(f)), ...DEFAULT_ORDER.filter((s) => !focusAreas.includes(s))]

  const sectionCounts: { section: Section; count: number | null }[] = order.map((s) => ({
    section: s,
    count: stats ? (s === 'herbs' ? stats.herbs : s === 'yoga' ? stats.asanas : s === 'nutrition' ? stats.foods : stats.remedies) : null,
  }))

  const totalEntries = stats ? stats.herbs + stats.asanas + stats.foods + stats.remedies : 0

  return (
    <div className="pb-2">
      {/* ── living greeting hero — M3E dynamic color follows the clock ── */}
      <div className="grad-hero relative overflow-hidden px-4 pb-9 pt-3 text-white">
        <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-white/5" aria-hidden />
        <Stagger>
          <StaggerItem>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {daypart && (
                  <span
                    role="status"
                    className="glass-chip backdrop-blur-md inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide"
                  >
                    <span aria-hidden>{DAYPART_ICON[daypart]}</span>
                    {t(DAYPART_LABEL[daypart])}
                  </span>
                )}
                <h1 className="t-mega mt-2">{greeting}</h1>
                <p className="mt-1 text-[12px] font-medium opacity-85">
                  {pro ? '👑 ' : ''}{t(UI.brand)} · {t(UI.app.yourWellness)}
                  {todayStr ? <span aria-hidden> · {todayStr}</span> : null}
                </p>
              </div>
              {/* compact streak affordance → Daily */}
              <button
                onClick={() => navigate('/daily')}
                className="glass-chip backdrop-blur-md flex min-h-12 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-white"
                aria-label={t(UI.app.tabDaily)}
              >
                <Flame className="h-4 w-4" />
                <span className="tabular text-sm font-extrabold">{streak}</span>
              </button>
            </div>

            {/* prominent primary action — search across the graded library */}
            <TapCard
              onClick={() => navigate('/explore')}
              ariaLabel={t(UI.common.search)}
              className="glass-nav backdrop-blur-2xl backdrop-saturate-150 mt-4 flex min-h-14 w-full items-center gap-3 rounded-full px-4 shadow-card"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/20">
                <Search className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/90">
                {t(UI.app.searchPrimary)}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </TapCard>
          </StaggerItem>
        </Stagger>
      </div>

      <div className="-mt-5 px-4">
        <Stagger>
          {/* ── Daily Dose — adaptive "For you" pills + snap-carousel ──── */}
          <StaggerItem>
            <SectionHeader
              title={t(UI.app.dailyDose)}
              sub={t(UI.app.dailyDoseSub)}
              actionLabel={t(UI.app.exploreAll)}
              onAction={() => navigate('/explore')}
            />
            {/* adaptive quick-filter pills — order follows your usage, pill morphs with spring */}
            <div
              className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4"
              role="tablist"
              aria-label="Personalized sections"
            >
              {([
                { id: 'for-you' as const, label: t(FOR_YOU) },
                ...filterOrder.map((s) => ({ id: s as 'for-you' | Section, label: t(SECTION_META[s].key) })),
              ]).map((f) => {
                const active = filter === f.id
                return (
                  <button
                    key={f.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(f.id)}
                    className={`spring-press relative flex min-h-11 shrink-0 items-center overflow-hidden rounded-full border px-4 text-[11.5px] font-extrabold ${
                      active ? 'border-transparent' : 'border-border'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="foryou-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                        className="absolute inset-0 rounded-full bg-primary shadow-card"
                      />
                    )}
                    <span className={`relative whitespace-nowrap ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                      {f.label}
                    </span>
                  </button>
                )
              })}
            </div>
            {!daily ? (
              <SkCard h="h-52" />
            ) : visiblePicks.length > 0 ? (
              <div
                className="no-scrollbar -mx-4 mt-2.5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2"
                aria-label={t(UI.app.dailyDose)}
              >
                {visiblePicks.map((p, i) => {
                  const Icon = PICK_ICON[p.section] ?? Leaf
                  return (
                    <TapCard
                      key={p.section + p.slug}
                      onClick={() => navigate(`/${p.section}/${p.slug}`)}
                      className={`relative h-52 w-[240px] shrink-0 snap-center overflow-hidden text-white shadow-float ${
                        p.image ? 'bg-stone-900' : `${SECTION_META[p.section].grad} gloss`
                      } ${i % 2 === 0 ? 'shape-m3' : 'shape-m3-flip'}`}
                      ariaLabel={p.name}
                    >
                      <Photo src={p.image} alt={p.name} className="absolute inset-0" />
                      {p.image && <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" aria-hidden />}
                      <span className="glass-chip backdrop-blur-md absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold">
                        <Icon className="h-3 w-3" />
                        {t(SECTION_META[p.section].key)}
                      </span>
                      <span className="absolute right-3 top-3">
                        <TierChip tier={p.tier} size="xs" />
                      </span>
                      {i === 0 && filter === 'for-you' && personalized && (
                        <span className="glass-chip backdrop-blur-md absolute bottom-2.5 right-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide">
                          <Sparkles className="h-2.5 w-2.5" /> {t(FOR_YOU)}
                        </span>
                      )}
                      <motion.span
                        initial={reduce ? undefined : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.06 }}
                        className="absolute inset-x-0 bottom-0 block bg-gradient-to-t from-black/70 to-transparent p-3.5 pt-8"
                      >
                        <span className="block truncate text-[15px] font-extrabold leading-tight">{p.name}</span>
                        <span className="block truncate text-[11px] italic opacity-85">{p.sub}</span>
                      </motion.span>
                    </TapCard>
                  )
                })}
              </div>
            ) : (
              <EmptyDaily />
            )}
          </StaggerItem>

          {/* ── Did you know? (date-seeded, evidence-safe) ─────────────── */}
          <StaggerItem className="mt-4">
            <div className="shape-m3-flip relative overflow-hidden border border-gold/40 bg-gradient-to-br from-gold/10 via-card to-card p-4 shadow-card">
              <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-gold/15" aria-hidden />
              <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-gold-foreground">
                <Lightbulb className="h-3.5 w-3.5" /> {t(UI.app.quickFact)}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">{fact}</p>
            </div>
          </StaggerItem>

          {/* ── shortcuts (personalized) ──────────────────────────────── */}
          <StaggerItem className="mt-5">
            <h2 className="t-headline font-extrabold tracking-tight">{t(UI.app.quickActions)}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {[
                { icon: ShieldAlert, label: t(UI.app.interactionChecker), sub: t(UI.app.interactionCheckerSub), path: '/checker', grad: 'grad-remedy' },
                { icon: Flame, label: t(UI.app.tabDaily), sub: t(UI.app.dailyQuizSub), path: '/daily', grad: 'grad-flame' },
                { icon: Scale, label: 'BMI', sub: t({ en: 'Asian-Indian cutoffs', hi: 'भारतीय-एशियाई कटऑफ' }), path: '/tools', grad: 'grad-foods' },
                { icon: Search, label: t(UI.common.search), sub: t(UI.app.searchAll).split('…')[0] + '…', path: '/explore', grad: 'grad-herbs' },
              ].map((a) => (
                <TapCard
                  key={a.path + a.label}
                  onClick={() => navigate(a.path)}
                  className="flex min-h-[84px] items-center gap-3 rounded-[28px] border border-border/60 bg-card p-3.5 shadow-card"
                >
                  <span className={`${a.grad} gloss grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-card`}>
                    <a.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-extrabold leading-tight">{a.label}</span>
                    <span className="block truncate text-[10.5px] leading-tight text-muted-foreground">{a.sub}</span>
                  </span>
                </TapCard>
              ))}
            </div>
          </StaggerItem>

          {/* ── health updates & guidance ─────────────────────────────── */}
          <StaggerItem className="mt-5">
            <SectionHeader
              title={t(UI.app.updatesTitle)}
              sub={t(UI.app.updatesSub)}
              actionLabel={t(UI.nav.editorial)}
              onAction={() => navigate('/editorial')}
            />
            <div className="mt-2.5 rounded-[28px] border border-border/60 bg-card p-4 shadow-card">
              <div className="flex items-center gap-2.5">
                <span className="grad-hero gloss grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <p className="min-w-0 flex-1 text-[12.5px] leading-snug">
                  <CountUp value={stats?.claims ?? null} className="text-base font-extrabold" />{' '}
                  {t(UI.app.gradedNote)}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {sectionCounts.slice(0, 3).map(({ section: s, count }) => (
                  <div key={s} className="rounded-2xl bg-secondary/50 px-1 py-2">
                    <CountUp value={count} className="text-base font-extrabold leading-none" />
                    <p className="mt-1 truncate text-[9.5px] font-bold text-muted-foreground">{t(SECTION_META[s].key)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                <ScrollText className="mt-0.5 h-3 w-3 shrink-0" />
                {t(UI.notif.reviewNote)} · {t(UI.notif.reviewNoteBody)}
              </p>
            </div>
          </StaggerItem>

          {/* ── recent activity ───────────────────────────────────────── */}
          {recent.length > 0 && (
            <StaggerItem className="mt-5">
              <h2 className="t-headline font-extrabold tracking-tight">{t(UI.app.seeAgain)}</h2>
              <div className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1">
                {recent.map((r) => (
                  <button
                    key={r.section + r.slug}
                    onClick={() => navigate(`/${r.section}/${r.slug}`)}
                    className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-3 shadow-card active:scale-[0.97] transition-transform"
                  >
                    <span className={`${SECTION_META[r.section].grad} grid h-7 w-7 place-items-center rounded-full text-white`}>
                      <Sparkles className="h-3 w-3" />
                    </span>
                    <span className="max-w-[130px] truncate text-xs font-semibold">{r.name}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </StaggerItem>
          )}

          {/* ── library grid ──────────────────────────────────────────── */}
          <StaggerItem className="mt-5">
            <h2 className="t-headline font-extrabold tracking-tight">{t(UI.app.browseSections)}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {sectionCounts.map(({ section: s, count }, gi) => {
                const meta = SECTION_META[s]
                const Icon = PICK_ICON[s] ?? Leaf
                const featuredImg = stats?.featured?.[s]
                return (
                  <TapCard
                    key={s}
                    onClick={() => navigate(meta.path)}
                    className={`relative min-h-[132px] overflow-hidden p-4 text-white shadow-card ${
                      featuredImg ? 'bg-stone-900' : `${meta.grad} gloss`
                    } ${gi % 2 === 0 ? 'shape-m3' : 'shape-m3-flip'}`}
                  >
                    <Photo src={featuredImg} alt={String(t(meta.key))} className="absolute inset-0" />
                    {featuredImg && <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/30" aria-hidden />}
                    <span className="relative block h-full">
                      <span className="glass-chip backdrop-blur-md grid h-9 w-9 place-items-center rounded-2xl">
                        <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                      </span>
                      <span className="mt-3 block">
                        <CountUp value={count} className="text-[30px] font-extrabold leading-none" />
                      </span>
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-bold opacity-90">
                        {t(meta.key)} <ArrowRight className="h-3 w-3" />
                      </p>
                    </span>
                  </TapCard>
                )
              })}
            </div>
            <p className="tabular mt-2 text-center text-[10px] text-muted-foreground">
              {totalEntries.toLocaleString('en-IN')} {t(UI.app.entriesAcross)}
            </p>
          </StaggerItem>

          {/* educational note */}
          <StaggerItem className="mt-4">
            <p className="flex items-start gap-1.5 rounded-2xl bg-secondary/40 px-3.5 py-2.5 text-[10.5px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              {t(UI.compliance.medicalDisclaimer)}
            </p>
          </StaggerItem>

          {/* monetization: native sponsored slot */}
          {!pro && (
            <StaggerItem className="mt-4">
              <SponsoredCard compact />
            </StaggerItem>
          )}

          {/* install banner */}
          <StaggerItem className="mt-4">
            <InstallBanner />
          </StaggerItem>

          <StaggerItem className="mt-4">
            <p className="pb-2 text-center text-[10px] leading-relaxed text-muted-foreground">{t(UI.app.disclaimerShort)}</p>
          </StaggerItem>
        </Stagger>
      </div>
    </div>
  )
}

function EmptyDaily() {
  const { t } = useLanguage()
  return (
    <div className="mt-2.5 rounded-[28px] border border-dashed border-border bg-card/60 px-4 py-6 text-center">
      <p className="text-sm font-bold">{t(UI.app.dailyDose)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t(UI.app.dailyDoseSub)}</p>
      <button onClick={() => navigate('/explore')} className="mt-3 min-h-11 rounded-full bg-secondary px-4 text-xs font-extrabold text-secondary-foreground">
        {t(UI.app.exploreAll)}
      </button>
    </div>
  )
}
