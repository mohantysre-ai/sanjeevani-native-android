'use client'

// Mobile detail screens — M3 EXPRESSIVE: immersive gradient hero with
// mixed-radius footer + tonal metadata grid, sticky spring "save" CTA,
// stacked content cards. Homeopathy keeps the DMR Act 1954 disclaimer
// ABOVE all content (compliance).

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Share2, ShieldAlert, TriangleAlert, ScrollText, PersonStanding,
  Leaf, Pill, UtensilsCrossed, BookOpen, Info, ExternalLink, Scale, Heart, BookmarkPlus,
} from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiGet, HerbDetail, AsanaDetail, RemedyDetail, ClaimShape } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useApp, type Section } from '@/lib/app-store'
import { TierChip, SkCard, SaveButton, SECTION_META, Photo } from '@/components/mobile/design'
import { usePaywall } from '@/components/mobile/paywall'

interface FoodDetailShape {
  slug: string
  name: string
  nameAlt: string
  category: string
  scientificClass?: string | null
  servingSizeG: number | null
  calories: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  fiberG: number | null
  micronutrients: Record<string, number>
  description?: string | null
  usesBenefits?: string | null
  servingGuidance?: string | null
  precautions?: string | null
  evidenceGrade?: string | null
  safetyLevel?: string | null
  sourceNote?: string
  image?: string | null
  claims: ClaimShape[]
}

// ── shared pieces ─────────────────────────────────────────────────────────

function ClaimsCard({ claims }: { claims: ClaimShape[] }) {
  const { t, lang } = useLanguage()
  if (!claims?.length) return null
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-card">
      <h2 className="mb-2.5 flex items-center gap-2 text-sm font-extrabold">
        <ScrollText className="h-4 w-4 text-primary" /> {t(UI.common.evidenceClaims)}
        <span className="tabular ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">
          {claims.length}
        </span>
      </h2>
      <ul className="space-y-3">
        {claims.slice(0, 12).map((c) => (
          <li key={c.id} className="rounded-2xl bg-secondary/40 p-3">
            <div className="flex items-start gap-2">
              <TierChip tier={c.tier} />
              <p className="flex-1 text-[13px] leading-snug">{c.statement}</p>
            </div>
            {c.sources?.length > 0 && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {t(UI.common.sources)}: {c.sources.map((s) => s.publisher || s.title).slice(0, 2).join(' · ')}
              </p>
            )}
            {c.reviewer && c.reviewer.name && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {t(UI.common.reviewedBy)}: {c.reviewer.name}
                {lang === 'en' && c.reviewer.credentials ? `, ${c.reviewer.credentials}` : ''}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-border/60 bg-card p-4 shadow-card">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      <div className="text-[13px] leading-relaxed text-foreground/90">{children}</div>
    </section>
  )
}

// Related remedies rail — same remedy family, tiny thumbs, zero medical claims.
function RelatedRail({ items }: { items: { slug: string; name: string; thumb?: string | null; image?: string | null }[] }) {
  const { t } = useLanguage()
  if (!items?.length) return null
  return (
    <section className="rounded-[28px] border border-border/60 bg-card p-4 shadow-card">
      <h2 className="mb-2.5 flex items-center gap-2 text-sm font-extrabold">
        <Scale className="h-4 w-4 text-primary" /> {t(UI.app.relatedRemedies)}
      </h2>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {items.map((r) => (
          <button
            key={r.slug}
            onClick={() => navigate(`/homeopathy/${r.slug}`)}
            className="flex min-h-12 w-[168px] shrink-0 items-center gap-2.5 rounded-2xl border border-border/60 bg-background p-2 text-left active:scale-[0.97] transition-transform"
          >
            <Photo
              src={r.thumb || r.image}
              alt={r.name}
              className="h-9 w-9 shrink-0 rounded-xl"
              fallback={
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-extrabold text-primary">
                  {r.name.charAt(0)}
                </span>
              }
            />
            <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{r.name}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </section>
  )
}

// Educational potency reference — definitional only (X/C/M dilution notation).
function PotencyGuide() {
  const { t } = useLanguage()
  return (
    <div className="rounded-[28px] border border-teal-300/60 bg-teal-50/70 p-4 dark:border-teal-800/60 dark:bg-teal-950/20">
      <p className="flex items-center gap-2 text-xs font-extrabold text-teal-800 dark:text-teal-300">
        <BookOpen className="h-4 w-4 shrink-0" /> {t(UI.app.potencyGuide)}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-teal-900/80 dark:text-teal-200/80">{t(UI.app.potencyGuideBody)}</p>
    </div>
  )
}

function DmrBanner() {
  const { t } = useLanguage()
  return (
    <div className="rounded-3xl border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/30">
      <p className="flex items-center gap-2 text-xs font-extrabold text-amber-800">
        <TriangleAlert className="h-4 w-4 shrink-0" /> DMR Act 1954
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-amber-800/90">{t(UI.common.dmrHomeopathy)}</p>
      <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-amber-900">{t(UI.common.selfDiagnosis)}</p>
    </div>
  )
}

function RestrictedAlert() {
  const { t } = useLanguage()
  return (
    <div className="rounded-3xl border border-red-300 bg-red-50 p-4 dark:bg-red-950/30">
      <p className="flex items-center gap-2 text-xs font-extrabold text-red-800">
        <ShieldAlert className="h-4 w-4 shrink-0" /> {t(UI.common.restrictionNotice)}
      </p>
    </div>
  )
}

// ── screen wrapper ────────────────────────────────────────────────────────

function Hero({
  section,
  name,
  sub,
  tier,
  chips,
  image,
  meta,
  children,
}: {
  section: Section
  name: string
  sub: string
  tier: string
  chips?: string[]
  image?: string | null
  meta?: { label: string; value: string }[]
  children?: React.ReactNode
}) {
  const { t } = useLanguage()
  const share = () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) void navigator.share({ title: name, url }).catch(() => {})
    else void navigator.clipboard?.writeText(url).catch(() => {})
  }

  return (
    <div className={`${SECTION_META[section].grad} shape-hero-m3 relative overflow-hidden px-4 pb-6 pt-3 text-white`}>
      {/* real photo hero (per base-entity) with legibility scrim; gradient stays as fallback */}
      {image && (
        <div className="absolute inset-0">
          <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/30" />
        </div>
      )}
      <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/5" />
      <div className="relative flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.88 }}
          aria-label={t(UI.common.backToList)}
          onClick={() => navigate(`/${SECTION_META[section].path.slice(1)}`)}
          className="glass-chip backdrop-blur-md grid h-12 w-12 place-items-center rounded-full text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.88 }} aria-label={t(UI.app.shareApp)} onClick={share} className="glass-chip backdrop-blur-md grid h-12 w-12 place-items-center rounded-full text-white">
            <Share2 className="h-[18px] w-[18px]" />
          </motion.button>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative mt-4">
        <div className="flex items-center gap-2">
          <TierChip tier={tier} />
          {(chips || []).slice(0, 2).map((c) => (
            <span key={c} className="glass-chip backdrop-blur-md rounded-full px-2.5 py-1 text-[10px] font-bold capitalize text-white">
              {c}
            </span>
          ))}
        </div>
        <h1 className="mt-1.5 text-[28px] font-extrabold leading-tight tracking-tight">{name}</h1>
        <p className="text-[12px] italic opacity-85">{sub}</p>
        {/* M3E tonal metadata grid — the key facts, glanceable, no scrolling */}
        {meta && meta.length > 0 && (
          <div className="mt-4 flex gap-2">
            {meta.map((m) => (
              <div key={m.label} className="min-w-0 flex-1 rounded-2xl bg-white/12 px-2.5 py-2 backdrop-blur-sm">
                <p className="truncate text-[9px] font-bold uppercase tracking-wide text-white/70">{m.label}</p>
                <p className="tabular truncate text-[13.5px] font-extrabold leading-tight">{m.value}</p>
              </div>
            ))}
          </div>
        )}
        {children}
      </motion.div>
    </div>
  )
}

// fix Hero save button usage: wrapper that resolves slug via prop
function HeroSave({ section, slug, name, tier }: { section: Section; slug: string; name: string; tier: string }) {
  const openPaywall = usePaywall((s) => s.show)
  return <SaveButton section={section} slug={slug} name={name} tier={tier} onLimit={openPaywall} light />
}

export { Hero, HeroSave }

// ── M3E sticky primary action — "save to library" travels with the scroll
// (the detail-screen analog of a 1-tap apply), spring press feedback.
function StickySave({ section, slug, name, tier }: { section: Section; slug: string; name: string; tier: string }) {
  const { t } = useLanguage()
  const reduce = useReducedMotion()
  const saved = useApp((s) => s.saved.some((x) => x.section === section && x.slug === slug))
  const toggleSave = useApp((s) => s.toggleSave)
  const openPaywall = usePaywall((s) => s.show)
  return (
    <div className="pointer-events-none sticky bottom-[104px] z-30 px-4 pt-2">
      <motion.button
        type="button"
        aria-pressed={saved}
        whileTap={reduce ? undefined : { scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        onClick={() => {
          const r = toggleSave({ section, slug, name, tier })
          if (r === 'limit') openPaywall('saves')
        }}
        className="grad-hero gloss pointer-events-auto mx-auto flex min-h-[52px] items-center gap-2 rounded-full px-7 text-sm font-extrabold text-white shadow-float"
      >
        {saved ? <Heart className="h-[18px] w-[18px] fill-current" aria-hidden /> : <BookmarkPlus className="h-[18px] w-[18px]" aria-hidden />}
        {saved ? t(UI.app.saved) : t(UI.app.save)}
      </motion.button>
    </div>
  )
}

// ── main router ───────────────────────────────────────────────────────────

export function DetailScreen({ section, slug }: { section: Section; slug: string }) {
  const { lang, t } = useLanguage()
  const pushRecent = useApp((s) => s.pushRecent)
  // keyed-state fetch pattern: state carries its own key so a stale entry
  // reads as loading without a synchronous setState inside the effect
  const [state, setState] = useState<{ key: string; data: unknown } | null>(null)
  const key = `${section}/${slug}/${lang}`

  useEffect(() => {
    let dead = false
    const url =
      section === 'herbs'
        ? `/api/v1/herbs/${slug}?language=${lang}`
        : section === 'yoga'
          ? `/api/v1/asanas/${slug}?language=${lang}`
          : section === 'nutrition'
            ? `/api/v1/foods/${slug}?language=${lang}`
            : `/api/v1/homeopathy/${slug}?language=${lang}`
    apiGet<{ herb?: HerbDetail; asana?: AsanaDetail; food?: FoodDetailShape; remedy?: RemedyDetail; related?: { slug: string; name: string; thumb?: string | null; image?: string | null }[] }>(url)
      .then((d) => {
        if (dead) return
        const any = d as { herb?: { name: string; evidenceTier: string }; asana?: { name: string; evidenceTier: string }; food?: { name: string; evidenceGrade?: string | null }; remedy?: { name: string; evidenceTier: string } }
        const name = any.herb?.name || any.asana?.name || any.food?.name || any.remedy?.name || slug
        const tier = any.herb?.evidenceTier || any.asana?.evidenceTier || any.food?.evidenceGrade || any.remedy?.evidenceTier || 'T'
        pushRecent({ section, slug, name, tier: tier || 'T' })
        setState({ key, data: d })

        // ── On-demand content translation ──────────────────────────────
        // If the API answered in English (no seeded translation yet for this
        // language), request one in the background; when it lands, swap the
        // localized name + text fields in place. Result is cached server-side
        // forever, so this costs one LLM call per entry per language, once.
        const loc = (d as { loc?: string }).loc
        if (lang !== 'en' && loc !== lang) {
          const apiSection = section === 'nutrition' ? 'foods' : section
          apiGet<{ name?: string; fields?: Record<string, string> }>(
            `/api/v1/translate?language=${lang}&section=${apiSection}&slug=${encodeURIComponent(slug)}`
          )
            .then((tr) => {
              if (dead || !tr || (!tr.name && !tr.fields)) return
              setState((prev) => {
                if (!prev || prev.key !== key) return prev
                const data = prev.data as Record<string, unknown>
                const entKey = data.herb ? 'herb' : data.asana ? 'asana' : data.food ? 'food' : data.remedy ? 'remedy' : null
                if (!entKey) return prev
                const ent = data[entKey] as Record<string, unknown> | undefined
                if (!ent) return prev
                const merged: Record<string, unknown> = { ...ent }
                if (tr.name) merged.name = tr.name
                for (const [f, v] of Object.entries(tr.fields || {})) {
                  if (typeof ent[f] === 'string' && v) merged[f] = v
                }
                return { key, data: { ...data, [entKey]: merged } }
              })
            })
            .catch(() => {
              /* English fallback stays — never block the page on translation */
            })
        }
      })
      .catch(() => {
        if (!dead) setState({ key, data: {} })
      })
    return () => {
      dead = true
    }
  }, [section, slug, lang, pushRecent, key])

  if (state === null || state.key !== key) {
    return (
      <div className="space-y-3 p-4">
        <div className="shimmer h-44 rounded-3xl" />
        <SkCard h="h-24" />
        <SkCard h="h-36" />
      </div>
    )
  }

  const d = state.data as { herb?: HerbDetail; asana?: AsanaDetail; food?: FoodDetailShape; remedy?: RemedyDetail; related?: { slug: string; name: string; thumb?: string | null; image?: string | null }[] }
  if (d.herb) return <HerbScreen herb={d.herb} />
  if (d.asana) return <AsanaScreen asana={d.asana} />
  if (d.food) return <FoodScreen food={d.food} />
  if (d.remedy) return <RemedyScreen remedy={d.remedy} related={d.related || []} />
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      {t(UI.app.entryNotFound)}
    </div>
  )
}

// ── Herb ──────────────────────────────────────────────────────────────────
function HerbScreen({ herb }: { herb: HerbDetail }) {
  const { t, lang } = useLanguage()
  const props = herb.ayurvedicProperties
  // M3E metadata grid: the Ayurvedic profile at a glance
  const herbMeta = [
    props?.rasa ? { label: t(UI.common.rasa), value: props.rasa } : null,
    props?.guna ? { label: t(UI.common.guna), value: props.guna } : null,
    props?.virya ? { label: t(UI.common.virya), value: props.virya } : null,
  ].filter((m): m is { label: string; value: string } => m !== null)
  return (
    <div>
      <Hero section="herbs" name={herb.name} sub={herb.latinBinomial || ''} tier={herb.evidenceTier} chips={[herb.category || ''].filter(Boolean)} image={herb.image} meta={herbMeta}>
        {herb.sanskritName && <p className="mt-1 text-[12px] font-semibold opacity-90">Sanskrit · {herb.sanskritName}</p>}
        <div className="mt-3">
          <HeroSave section="herbs" slug={herb.slug} name={herb.name} tier={herb.evidenceTier} />
        </div>
      </Hero>
      <div className="space-y-3 p-4">
        {herb.safetyLevel === 'restricted' && <RestrictedAlert />}
        {herb.description && <SectionCard icon={Info} title={t(UI.common.description)}>{herb.description}</SectionCard>}
        {herb.usesBenefits && <SectionCard icon={Leaf} title={t(UI.common.usesBenefits)}>{herb.usesBenefits}</SectionCard>}
        {props && (props.rasa || props.guna) && (
          <SectionCard icon={BookOpen} title={t(UI.common.ayurvedicProperties)}>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              {(
                [
                  [t(UI.common.rasa), props.rasa],
                  [t(UI.common.guna), props.guna],
                  [t(UI.common.virya), props.virya],
                  [t(UI.common.vipaka), props.vipaka],
                ] as [string, string][]
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-secondary/50 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{k}</p>
                    <p className="font-semibold">{v}</p>
                  </div>
                ))}
            </div>
          </SectionCard>
        )}
        {herb.usageAndDose && <SectionCard icon={Pill} title={t(UI.common.usageDose)}>{herb.usageAndDose}</SectionCard>}
        {herb.precautions && <SectionCard icon={ShieldAlert} title={t(UI.common.precautions)}>{herb.precautions}</SectionCard>}
        {herb.linkedYoga?.length > 0 && (
          <SectionCard icon={PersonStanding} title={t(UI.common.linkedYoga)}>
            <div className="flex flex-wrap gap-2">
              {herb.linkedYoga.map((y) => (
                <button
                  key={y.slug}
                  onClick={() => navigate(`/yoga/${y.slug}`)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold"
                >
                  {y.name}
                </button>
              ))}
            </div>
          </SectionCard>
        )}
        <ClaimsCard claims={herb.claims} />
        {herb.sourceUrl && (
          <a href={herb.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-semibold text-primary">
            <ExternalLink className="h-3 w-3" /> {t(UI.app.viewPrimarySource)}
          </a>
        )}
        <StickySave section="herbs" slug={herb.slug} name={herb.name} tier={herb.evidenceTier} />
      </div>
    </div>
  )
}

// ── Asana ─────────────────────────────────────────────────────────────────
function AsanaScreen({ asana }: { asana: AsanaDetail }) {
  const { t } = useLanguage()
  // M3E metadata grid: practice profile at a glance (chips deduplicated)
  const asanaMeta = [
    asana.category ? { label: t({ en: 'Category', hi: 'श्रेणी' }), value: asana.category } : null,
    asana.difficulty ? { label: t({ en: 'Level', hi: 'स्तर' }), value: asana.difficulty } : null,
    asana.claims?.length ? { label: t({ en: 'Claims', hi: 'दावे' }), value: String(asana.claims.length) } : null,
  ].filter((m): m is { label: string; value: string } => m !== null)
  return (
    <div>
      <Hero section="yoga" name={asana.name} sub={asana.sanskrit || ''} tier={asana.evidenceTier} chips={[]} image={asana.image} meta={asanaMeta}>
        <div className="mt-3">
          <HeroSave section="yoga" slug={asana.slug} name={asana.name} tier={asana.evidenceTier} />
        </div>
      </Hero>
      <div className="space-y-3 p-4">
        {asana.description && <SectionCard icon={Info} title={t(UI.common.description)}>{asana.description}</SectionCard>}
        {asana.benefits?.length > 0 && (
          <SectionCard icon={Leaf} title={t(UI.common.benefits)}>
            <ul className="ml-4 list-disc space-y-1">
              {asana.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </SectionCard>
        )}
        {asana.instructions && <SectionCard icon={PersonStanding} title={t(UI.common.instructions)}>{asana.instructions}</SectionCard>}
        {(asana.contraindications?.length > 0 || asana.precautions) && (
          <SectionCard icon={ShieldAlert} title={t(UI.common.contraindications)}>
            {asana.contraindications?.length > 0 && (
              <ul className="ml-4 list-disc space-y-1">
                {asana.contraindications.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
            {asana.precautions && <p className="mt-2">{asana.precautions}</p>}
          </SectionCard>
        )}
        <ClaimsCard claims={asana.claims} />
        <StickySave section="yoga" slug={asana.slug} name={asana.name} tier={asana.evidenceTier} />
      </div>
    </div>
  )
}

// ── Food ──────────────────────────────────────────────────────────────────
function FoodScreen({ food }: { food: FoodDetailShape }) {
  const { t } = useLanguage()
  const macros: [string, number | null, string][] = [
    [t(UI.common.protein), food.proteinG, 'text-emerald-700'],
    [t(UI.common.carbs), food.carbsG, 'text-amber-700'],
    [t(UI.common.fat), food.fatG, 'text-rose-700'],
    [t(UI.common.fiber), food.fiberG, 'text-teal-700'],
  ]
  const micro = Object.entries(food.micronutrients || {}).slice(0, 8)
  // M3E metadata grid: the numbers that matter first (editorial numerals)
  const foodMeta = [
    food.calories != null ? { label: t(UI.common.kCal), value: String(Math.round(food.calories)) } : null,
    food.proteinG != null ? { label: t(UI.common.protein), value: `${food.proteinG}g` } : null,
    food.fiberG != null ? { label: t(UI.common.fiber), value: `${food.fiberG}g` } : null,
  ].filter((m): m is { label: string; value: string } => m !== null)
  return (
    <div>
      <Hero section="nutrition" name={food.name} sub={food.scientificClass || food.category} tier={food.evidenceGrade || 'B'} chips={[food.category]} image={food.image} meta={foodMeta}>
        <div className="mt-3">
          <HeroSave section="nutrition" slug={food.slug} name={food.name} tier={food.evidenceGrade || 'B'} />
        </div>
      </Hero>
      <div className="space-y-3 p-4">
        <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-card">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold">
            <UtensilsCrossed className="h-4 w-4 text-primary" /> {t(UI.app.macros)} · {t(UI.common.per100g)}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {macros
              .filter(([, v]) => v != null)
              .map(([k, v, cls]) => (
                <div key={k} className="rounded-2xl bg-secondary/50 p-3">
                  <p className={`tabular text-lg font-extrabold ${cls}`}>{v}g</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{k}</p>
                </div>
              ))}
          </div>
          {micro.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{t(UI.common.highlights)}</p>
              <div className="flex flex-wrap gap-1.5">
                {micro.map(([k, v]) => (
                  <span key={k} className="tabular rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold">
                    {k.replace(/_/g, ' ')} · {v}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="mt-3 text-[10px] text-muted-foreground">{food.sourceNote || 'ICMR-NIN 2024 / IFCT aligned'}</p>
        </section>
        {food.description && <SectionCard icon={Info} title={t(UI.common.description)}>{food.description}</SectionCard>}
        {food.usesBenefits && <SectionCard icon={Leaf} title={t(UI.common.usesBenefits)}>{food.usesBenefits}</SectionCard>}
        {food.servingGuidance && <SectionCard icon={UtensilsCrossed} title={lang_serving(t)}>{food.servingGuidance}</SectionCard>}
        {food.precautions && <SectionCard icon={ShieldAlert} title={t(UI.common.precautions)}>{food.precautions}</SectionCard>}
        <ClaimsCard claims={food.claims} />
        <StickySave section="nutrition" slug={food.slug} name={food.name} tier={food.evidenceGrade || 'B'} />
      </div>
    </div>
  )
}

function lang_serving(t: (e: { en: string; hi: string }) => string): string {
  return t(UI.app.servingGuidance)
}

// ── Homeopathy (DMR first!) ───────────────────────────────────────────────
function RemedyScreen({ remedy, related }: { remedy: RemedyDetail; related: { slug: string; name: string; thumb?: string | null; image?: string | null }[] }) {
  const { t } = useLanguage()
  return (
    <div>
      <Hero section="homeopathy" name={remedy.name} sub={remedy.translit || remedy.latinSource || ''} tier={remedy.evidenceTier} chips={[remedy.category]} image={remedy.image}>
        <div className="mt-3">
          <HeroSave section="homeopathy" slug={remedy.slug} name={remedy.name} tier={remedy.evidenceTier} />
        </div>
      </Hero>
      <div className="space-y-3 p-4">
        <DmrBanner />
        {remedy.emergencyWarning && (
          <div className="rounded-[28px] border border-red-300 bg-red-50 p-4 dark:bg-red-950/30">
            <p className="flex items-center gap-2 text-xs font-extrabold text-red-800">
              <TriangleAlert className="h-4 w-4 shrink-0" /> {t(UI.common.emergencyWarning)}
            </p>
          </div>
        )}
        {remedy.safetyLevel !== 'general' && <RestrictedAlert />}
        {remedy.description && <SectionCard icon={Info} title={t(UI.common.description)}>{remedy.description}</SectionCard>}
        {remedy.indications && <SectionCard icon={BookOpen} title={t(UI.common.indications)}>{remedy.indications}</SectionCard>}
        {remedy.potencyDosage && (
          <>
            <SectionCard icon={Pill} title={t(UI.common.potencyDosage)}>{remedy.potencyDosage}</SectionCard>
            <PotencyGuide />
          </>
        )}
        {remedy.precautions && <SectionCard icon={ShieldAlert} title={t(UI.common.precautions)}>{remedy.precautions}</SectionCard>}
        <ClaimsCard claims={remedy.claims} />
        <RelatedRail items={related} />
        {remedy.evidenceBasis && (
          <p className="px-1 text-[10.5px] leading-relaxed text-muted-foreground">{remedy.evidenceBasis}</p>
        )}
        <StickySave section="homeopathy" slug={remedy.slug} name={remedy.name} tier={remedy.evidenceTier} />
      </div>
    </div>
  )
}

