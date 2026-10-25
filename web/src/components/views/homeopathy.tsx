'use client'

// Homeopathy library — DMR Act 1954 compliance surface.
// Every list and detail render carries the mandatory scientific-consensus disclaimer.
import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiGet, RemedyListItem, RemedyDetail } from '@/lib/api'
import { EvidenceBadge } from '@/components/evidence-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { navigate } from '@/lib/router'
import { ArrowLeft, AlertTriangle, Info, Siren, Ban, FlaskConical, BookOpen } from 'lucide-react'

function DmrBanner({ compact }: { compact?: boolean }) {
  const { t } = useLanguage()
  return (
    <Alert className={compact ? 'border-amber-400/60 bg-amber-50/60 py-2.5' : 'border-amber-400/60 bg-amber-50/60'}>
      <Ban className="h-4 w-4 text-amber-700 shrink-0" />
      <AlertTitle className="text-xs font-semibold text-amber-900">{t(UI.common.dmrHomeopathy)}</AlertTitle>
      {!compact && <AlertDescription className="text-xs text-amber-900/90">{t(UI.common.selfDiagnosis)}</AlertDescription>}
    </Alert>
  )
}

export function HomeopathyListView() {
  const { lang, t } = useLanguage()
  const [remedies, setRemedies] = useState<RemedyListItem[] | null>(null)
  const [filter, setFilter] = useState('')
  const [pager, setPager] = useState({ filter: '', visible: 60 })

  useEffect(() => {
    apiGet<{ remedies: RemedyListItem[] }>('/api/v1/homeopathy?language=' + lang)
      .then((d) => setRemedies(d.remedies))
      .catch(() => setRemedies([]))
  }, [lang])

  const filtered = (remedies || []).filter((r) => {
    if (!filter) return true
    const f = filter.toLowerCase()
    return (
      r.name.toLowerCase().includes(f) ||
      (r.latinSource || '').toLowerCase().includes(f) ||
      (r.translit || '').toLowerCase().includes(f) ||
      r.category.toLowerCase().includes(f) ||
      r.synonyms.some((s) => s.toLowerCase().includes(f))
    )
  })

  // windowed rendering — catalog now ships ~10k entries per section
  const visible = pager.filter === filter ? pager.visible : 60
  const shown = filtered.slice(0, visible)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">{t(UI.nav.homeopathy)}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {remedies?.length ?? '…'} · {t({ en: 'classical materia medica — educational reference only', hi: 'शास्त्रीय मैटेरिया मेडिका — केवल शैक्षिक संदर्भ' })}
          </p>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="sm:ml-auto h-9 w-full sm:w-64 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t(UI.common.searchPlaceholder)}
          aria-label="Filter remedies"
        />
      </div>

      <DmrBanner />

      {remedies === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{t(UI.common.noResults)}</p>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
          {shown.map((r) => (
            <button
              key={r.slug}
              onClick={() => navigate(`/homeopathy/${r.slug}`)}
              className="text-left rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold">{r.name}</span>
                  <p className="text-xs italic text-muted-foreground mt-0.5 truncate">{r.latinSource || r.translit || ''}</p>
                  <p className="text-xs text-primary/80 truncate">{r.category}</p>
                </div>
                <EvidenceBadge tier={r.evidenceTier} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.emergencyWarning && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 text-red-900 px-2 py-0.5 text-[11px]">
                    <Siren className="h-3 w-3" /> {t(UI.common.emergencyWarning)}
                  </span>
                )}
                {r.safetyLevel === 'restricted' && (
                  <span className="rounded-full border border-red-300 bg-red-50 text-red-900 px-2 py-0.5 text-[11px]">
                    {t(UI.common.restrictionNotice)}
                  </span>
                )}
              </div>
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

export function HomeopathyDetailView({ slug }: { slug: string }) {
  const { lang, t } = useLanguage()
  const [state, setState] = useState<{ slug: string; remedy?: RemedyDetail } | null>(null)

  useEffect(() => {
    let cancelled = false
    apiGet<{ remedy: RemedyDetail }>(`/api/v1/homeopathy/${slug}?language=${lang}`)
      .then((d) => {
        if (!cancelled) setState({ slug, remedy: d.remedy })
      })
      .catch(() => {
        if (!cancelled) setState({ slug })
      })
    return () => {
      cancelled = true
    }
  }, [slug, lang])

  const remedy = state && state.slug === slug ? state.remedy : undefined
  const error = state && state.slug === slug && !state.remedy

  if (error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-muted-foreground">
        {t(UI.common.noResults)}
      </div>
    )
  if (!remedy)
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    )

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-5">
      <Button variant="ghost" size="sm" className="h-8 -ml-2" onClick={() => navigate('/homeopathy')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> {t(UI.common.backToList)}
      </Button>

      {/* Title */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{remedy.name}</h1>
          <EvidenceBadge tier={remedy.evidenceTier} size="md" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {remedy.latinSource && <span className="italic">{remedy.latinSource} · </span>}
          {remedy.category}
          {remedy.nameAlt && <> · {remedy.nameAlt}</>}
        </p>
        {remedy.synonyms.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t(UI.common.alsoKnownAs)}: {remedy.synonyms.join(' · ')}
          </p>
        )}
      </div>

      {/* DMR Act 1954 mandatory disclaimer — rendered above all content */}
      <Alert className="border-amber-400/60 bg-amber-50/60">
        <Ban className="h-4 w-4 text-amber-700" />
        <AlertTitle className="text-xs font-semibold text-amber-900">{t(UI.common.dmrHomeopathy)}</AlertTitle>
        <AlertDescription className="text-xs leading-relaxed text-amber-900/90">{remedy.dmr.disclaimer}</AlertDescription>
      </Alert>

      {remedy.emergencyWarning && (
        <Alert className="border-red-300 bg-red-50">
          <Siren className="h-4 w-4 text-red-700" />
          <AlertTitle className="text-xs font-semibold text-red-900">{t(UI.common.emergencyWarning)}</AlertTitle>
          <AlertDescription className="text-xs text-red-900/90">
            {remedy.precautions || t(UI.common.selfDiagnosis)}
          </AlertDescription>
        </Alert>
      )}

      {remedy.description && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> {t(UI.common.description)}
            </h2>
            <p className="text-sm leading-relaxed">{remedy.description}</p>
          </CardContent>
        </Card>
      )}

      {remedy.indications && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> {t(UI.common.indications)}
            </h2>
            <p className="text-sm leading-relaxed">{remedy.indications}</p>
          </CardContent>
        </Card>
      )}

      {remedy.potencyDosage && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" /> {t(UI.common.potencyTitle)}
            </h2>
            <p className="text-sm leading-relaxed">{remedy.potencyDosage}</p>
          </CardContent>
        </Card>
      )}

      {remedy.precautions && !remedy.emergencyWarning && (
        <Alert className="border-accent/40 bg-accent/5">
          <AlertTriangle className="h-4 w-4 text-accent" />
          <AlertTitle className="text-xs font-semibold">{t(UI.common.precautions)}</AlertTitle>
          <AlertDescription className="text-xs">{remedy.precautions}</AlertDescription>
        </Alert>
      )}

      {/* Claims */}
      <section>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" /> {t(UI.common.evidenceClaims)}
        </h2>
        <div className="space-y-3">
          {remedy.claims.map((c) => (
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
