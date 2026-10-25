'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiGet, HerbListItem, AsanaListItem, FoodFullItem, RemedyListItem } from '@/lib/api'
import { EvidenceBadge, TierLegend } from '@/components/evidence-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, FlaskConical, HeartPulse, Calculator, ShieldAlert, ArrowRight } from 'lucide-react'
import { navigate } from '@/lib/router'
import { useHashRoute } from '@/lib/router'

export function HomeView() {
  const { lang, t } = useLanguage()
  const [herbs, setHerbs] = useState<HerbListItem[] | null>(null)
  const [yoga, setYoga] = useState<AsanaListItem[] | null>(null)
  const [foods, setFoods] = useState<FoodFullItem[] | null>(null)
  const [remedies, setRemedies] = useState<RemedyListItem[] | null>(null)
  const [claimCount, setClaimCount] = useState<number | null>(null)

  useEffect(() => {
    apiGet<{ herbs: HerbListItem[] }>('/api/v1/herbs?language=' + lang)
      .then((d) => setHerbs(d.herbs))
      .catch(() => setHerbs([]))
    apiGet<{ asanas: AsanaListItem[] }>('/api/v1/asanas?language=' + lang)
      .then((d) => setYoga(d.asanas))
      .catch(() => setYoga([]))
    apiGet<{ foods: FoodFullItem[] }>('/api/v1/foods?language=' + lang)
      .then((d) => setFoods(d.foods))
      .catch(() => setFoods([]))
    apiGet<{ remedies: RemedyListItem[] }>('/api/v1/homeopathy?language=' + lang)
      .then((d) => setRemedies(d.remedies))
      .catch(() => setRemedies([]))
    apiGet<{ claims: unknown[] }>('/api/v1/admin/claims')
      .then((d) => setClaimCount(d.claims.length))
      .catch(() => setClaimCount(0))
  }, [lang])

  const submitSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const q = String(fd.get('q') || '').trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const tierLabels: Record<string, string> = {
    A: t(UI.tiers.A),
    B: t(UI.tiers.B),
    C: t(UI.tiers.C),
    T: t(UI.tiers.T),
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-secondary via-card to-card p-6 sm:p-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-primary">
            <HeartPulse className="h-3.5 w-3.5" /> AYUSH · Yoga · Fitness · Nutrition
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-balance">{t(UI.home.heroTitle)}</h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground">{t(UI.home.heroSub)}</p>
          <form onSubmit={submitSearch} className="mt-5 flex gap-2 max-w-md" role="search">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                className="w-full h-10 rounded-md border border-input bg-background px-3 pl-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={t(UI.common.searchPlaceholder)}
                aria-label={t(UI.common.search)}
              />
            </div>
            <Button type="submit" className="h-10">{t(UI.common.search)}</Button>
          </form>
        </div>
        {/* stats */}
        <dl className="mt-8 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { v: herbs?.length ?? '—', l: t(UI.home.statHerbs) },
            { v: yoga?.length ?? '—', l: t(UI.home.statAsanas) },
            { v: foods?.length ?? '—', l: t(UI.home.statFoods) },
            { v: remedies?.length ?? '—', l: t(UI.nav.homeopathy) },
            { v: claimCount ?? '—', l: t(UI.home.statClaims) },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border bg-background/70 p-3 text-center">
              <dt className="sr-only">{s.l}</dt>
              <dd className="text-2xl font-bold text-primary">{s.v}</dd>
              <dd className="text-[11px] leading-tight text-muted-foreground mt-0.5">{s.l}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Tier legend + compliance */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" /> {t(UI.tiers.title)}
            </h2>
            <TierLegend labels={tierLabels} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-accent" /> Compliance
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">{t(UI.compliance.bhasmaBanner)}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{t(UI.compliance.homeopathyNote)}</p>
          </CardContent>
        </Card>
      </section>

      {/* Featured herbs */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{t(UI.home.featuredHerbs)}</h2>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate('/herbs')}>
            {t(UI.common.viewAll)} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {herbs === null
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            : herbs.slice(0, 8).map((h) => (
                <button
                  key={h.slug}
                  onClick={() => navigate(`/herbs/${h.slug}`)}
                  className="text-left rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm leading-snug">{h.name}</span>
                    <EvidenceBadge tier={h.evidenceTier} />
                  </div>
                  <p className="mt-1 text-[11px] italic text-muted-foreground">{h.latinBinomial}</p>
                </button>
              ))}
        </div>
      </section>

      {/* Yoga + tools row */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-3">{t(UI.home.featuredYoga)}</h2>
            <div className="flex flex-wrap gap-2">
              {yoga === null
                ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-32 rounded-full" />)
                : yoga.slice(0, 8).map((a) => (
                    <button
                      key={a.slug}
                      onClick={() => navigate(`/yoga/${a.slug}`)}
                      className="rounded-full border bg-background px-3 py-1.5 text-xs hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      {a.name} · <span className="text-muted-foreground">{a.sanskrit}</span>
                    </button>
                  ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" /> {t(UI.home.exploreTools)}
            </h2>
            <ul className="space-y-2 text-sm">
              {[UI.tools.bmiTitle, UI.tools.caloriesTitle, UI.tools.proteinTitle, UI.checker.title].map((k, i) => (
                <li key={i}>
                  <button
                    className="w-full text-left rounded-lg border px-3 py-2 hover:border-primary/40 hover:bg-secondary/50 transition-colors flex items-center justify-between"
                    onClick={() => navigate(i === 3 ? '/checker' : '/tools')}
                  >
                    <span>{t(k)}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
