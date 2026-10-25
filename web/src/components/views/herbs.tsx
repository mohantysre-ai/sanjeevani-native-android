'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiGet, HerbListItem, HerbDetail } from '@/lib/api'
import { EvidenceBadge } from '@/components/evidence-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { navigate } from '@/lib/router'
import { ArrowLeft, AlertTriangle, Baby, FlaskConical, Pill, BookOpen, ScrollText } from 'lucide-react'

export function HerbListView() {
  const { lang, t } = useLanguage()
  const [herbs, setHerbs] = useState<HerbListItem[] | null>(null)
  const [filter, setFilter] = useState('')
  const [pager, setPager] = useState({ filter: '', visible: 60 })

  useEffect(() => {
    apiGet<{ herbs: HerbListItem[] }>('/api/v1/herbs?language=' + lang)
      .then((d) => setHerbs(d.herbs))
      .catch(() => setHerbs([]))
  }, [lang])

  const filtered = (herbs || []).filter((h) => {
    if (!filter) return true
    const f = filter.toLowerCase()
    return (
      h.name.toLowerCase().includes(f) ||
      h.latinBinomial.toLowerCase().includes(f) ||
      (h.sanskritName || '').toLowerCase().includes(f) ||
      h.synonyms.some((s) => s.toLowerCase().includes(f))
    )
  })

  // windowed rendering — catalog now ships ~10k entries per section
  const visible = pager.filter === filter ? pager.visible : 60
  const shown = filtered.slice(0, visible)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t(UI.nav.herbs)}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {herbs?.length ?? '…'} {t(UI.home.statHerbs)}
          </p>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="sm:ml-auto h-9 w-full sm:w-64 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t(UI.common.searchPlaceholder)}
          aria-label="Filter herbs"
        />
      </div>

      {herbs === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{t(UI.common.noResults)}</p>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map((h) => (
            <button
              key={h.slug}
              onClick={() => navigate(`/herbs/${h.slug}`)}
              className="text-left rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold">{h.name}</span>
                  <p className="text-xs italic text-muted-foreground mt-0.5">{h.latinBinomial}</p>
                  <p className="text-xs text-primary/80">{h.sanskritName}</p>
                </div>
                <EvidenceBadge tier={h.evidenceTier} />
              </div>
              {h.synonyms.length > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground truncate">
                  {t(UI.common.alsoKnownAs)}: {h.synonyms.slice(0, 3).join(', ')}
                </p>
              )}
            </button>
          ))}
        </div>
        {filtered.length > shown.length && (
          <div className="mt-5 text-center">
            <Button variant="outline" size="sm" onClick={() => setPager({ filter, visible: visible + 120 })}>
              {lang === 'hi' ? `और दिखाएँ (${shown.length} / ${filtered.length})` : `Show more (${shown.length} / ${filtered.length})`}
            </Button>
          </div>
        )}
        </>
      )}
    </div>
  )
}

export function HerbDetailView({ slug }: { slug: string }) {
  const { lang, t } = useLanguage()
  const [state, setState] = useState<{ slug: string; herb?: HerbDetail } | null>(null)

  useEffect(() => {
    let cancelled = false
    apiGet<{ herb: HerbDetail }>(`/api/v1/herbs/${slug}?language=${lang}`)
      .then((d) => {
        if (!cancelled) setState({ slug, herb: d.herb })
      })
      .catch(() => {
        if (!cancelled) setState({ slug })
      })
    return () => {
      cancelled = true
    }
  }, [slug, lang])

  const herb = state && state.slug === slug ? state.herb : undefined
  const error = state && state.slug === slug && !state.herb

  if (error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-muted-foreground">
        {t(UI.common.noResults)}
      </div>
    )
  if (!herb)
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    )

  const ayu = herb.ayurvedicProperties
  const safety = herb.safetyFlags

  const propsRow: [string, string][] = ayu
    ? [
        [t(UI.common.rasa), ayu.rasa],
        [t(UI.common.guna), ayu.guna],
        [t(UI.common.virya), ayu.virya],
        [t(UI.common.vipaka), ayu.vipaka],
        [t(UI.common.doshaAction), ayu.doshaAction],
      ]
    : []

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-5">
      <Button variant="ghost" size="sm" className="h-8 -ml-2" onClick={() => navigate('/herbs')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> {t(UI.common.backToList)}
      </Button>

      {/* Title */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{herb.name}</h1>
          <EvidenceBadge tier={herb.evidenceTier} size="md" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="italic">{herb.latinBinomial}</span>
          {herb.sanskritName && <> · {t(UI.common.sanskrit)}: <span className="text-primary font-medium">{herb.sanskritName}</span></>}
          {herb.nameAlt && <> · {herb.nameAlt}</>}
        </p>
        {herb.synonyms.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t(UI.common.alsoKnownAs)}: {herb.synonyms.join(' · ')}
          </p>
        )}
      </div>

      {/* Description / uses / precautions (catalog enrichment) */}
      {herb.description && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-2">{t(UI.common.description)}</h2>
            <p className="text-sm leading-relaxed">{herb.description}</p>
          </CardContent>
        </Card>
      )}
      {herb.usesBenefits && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-2">{t(UI.common.usesBenefits)}</h2>
            <p className="text-sm leading-relaxed">{herb.usesBenefits}</p>
          </CardContent>
        </Card>
      )}

      {/* DMR banner */}
      <Alert className="border-accent/40 bg-accent/5">
        <BookOpen className="h-4 w-4 text-accent" />
        <AlertTitle className="text-xs font-semibold">{t(UI.compliance.dmrBanner)}</AlertTitle>
        <AlertDescription className="text-xs">{herb.usageAndDose}</AlertDescription>
      </Alert>

      {herb.safetyLevel === 'restricted' && (
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-700" />
          <AlertTitle className="text-xs font-semibold text-red-900">{t(UI.common.restrictionNotice)}</AlertTitle>
          <AlertDescription className="text-xs text-red-900/90">{herb.precautions}</AlertDescription>
        </Alert>
      )}

      {/* Safety flags */}
      {safety && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent" /> {t(UI.common.safetyFlags)}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: <Baby className="h-3.5 w-3.5" />, label: t(UI.common.pregnancy), text: lang === 'hi' ? safety.pregnancy.hi : safety.pregnancy.en },
                { icon: <Baby className="h-3.5 w-3.5" />, label: t(UI.common.children), text: lang === 'hi' ? safety.children.hi : safety.children.en },
                { icon: <Pill className="h-3.5 w-3.5" />, label: t(UI.common.doseLimit), text: lang === 'hi' ? safety.doseLimit.hi : safety.doseLimit.en },
              ].map((row, i) => (
                <div key={i} className="rounded-lg border bg-secondary/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    {row.icon} {row.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed">{row.text}</p>
                </div>
              ))}
            </div>
            {safety.interactions.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Pill className="h-3.5 w-3.5" /> {t(UI.common.interactions)}
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {safety.interactions.map((x, i) => (
                    <li key={i} className="rounded-full border border-amber-300 bg-amber-50 text-amber-900 px-2.5 py-0.5 text-[11px]">
                      {x}
                    </li>
                  ))}
                </ul>
                <button className="mt-2 text-xs text-primary underline underline-offset-2" onClick={() => navigate('/checker')}>
                  {t(UI.checker.title)} →
                </button>
              </div>
            )}
            {safety.warnings.length > 0 && (
              <div className="space-y-1.5">
                {safety.warnings.map((w, i) => (
                  <p key={i} className="text-xs leading-relaxed text-red-900 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    ⚠ {lang === 'hi' ? w.hi : w.en}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ayurvedic properties */}
      {herb.precautions && herb.safetyLevel !== 'restricted' && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-2">{t(UI.common.precautions)}</h2>
            <p className="text-sm leading-relaxed">{herb.precautions}</p>
          </CardContent>
        </Card>
      )}
      {ayu && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" /> {t(UI.common.ayurvedicProperties)}
            </h2>
            <dl className="grid gap-2 sm:grid-cols-2 text-sm">
              {propsRow.map(([k, v], i) => (
                <div key={i} className="flex gap-2 rounded-lg bg-secondary/40 px-3 py-2">
                  <dt className="text-xs font-medium text-muted-foreground min-w-24">{k}</dt>
                  <dd className="text-xs flex-1">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Linked yoga */}
      {herb.linkedYoga.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-3">{t(UI.common.linkedYoga)}</h2>
            <div className="flex flex-wrap gap-2">
              {herb.linkedYoga.map((y) => (
                <button
                  key={y.slug}
                  onClick={() => navigate(`/yoga/${y.slug}`)}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {y.sanskrit} · <span className="text-muted-foreground">{y.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Claims */}
      <section>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" /> {t(UI.common.evidenceClaims)}
        </h2>
        <div className="space-y-3">
          {herb.claims.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed">{c.statement}</p>
                  <EvidenceBadge tier={c.tier} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span>
                    {t(UI.common.reviewedBy)}: <strong className="text-foreground">{c.reviewer.name}</strong>, {c.reviewer.credentials}
                  </span>
                  <span>
                    {t(UI.common.lastReviewed)}: {new Date(c.lastReviewed).toLocaleDateString()}
                  </span>
                  <span>
                    {t(UI.common.nextReview)}: {new Date(c.nextReview).toLocaleDateString()}
                  </span>
                </div>
                {c.sources.length > 0 && (
                  <details className="text-[11px] text-muted-foreground">
                    <summary className="cursor-pointer hover:text-primary">{t(UI.common.sources)} ({c.sources.length})</summary>
                    <ul className="mt-1.5 space-y-1 pl-4 list-disc">
                      {c.sources.map((s, i) => (
                        <li key={i}>
                          {s.title}
                          {s.publisher && <> — <em>{s.publisher}</em></>}
                          {s.year > 0 && <> ({s.year})</>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
