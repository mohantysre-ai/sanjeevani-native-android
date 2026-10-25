'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiGet, AsanaListItem, AsanaDetail } from '@/lib/api'
import { EvidenceBadge } from '@/components/evidence-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { navigate } from '@/lib/router'
import { ArrowLeft, AlertTriangle, Sparkles } from 'lucide-react'

const CATEGORY_I18N: Record<string, { en: string; hi: string }> = {
  standing: { en: 'Standing', hi: 'खड़े आसन' },
  seated: { en: 'Seated / kneeling', hi: 'बैठे आसन' },
  supine: { en: 'Supine', hi: 'पीठ के बल' },
  prone: { en: 'Prone', hi: 'पेट के बल' },
  meditation: { en: 'Meditation', hi: 'ध्यान' },
  pranayama: { en: 'Pranayama', hi: 'प्राणायाम' },
  backbend: { en: 'Backbend', hi: 'पश्चिम वक्र' },
  inversion: { en: 'Inversion', hi: 'उल्टे आसन' },
  'arm-balance': { en: 'Arm balance', hi: 'भुजा संतुलन' },
  core: { en: 'Core', hi: 'मध्य शरीर' },
  twist: { en: 'Twist', hi: 'मोड़' },
  restorative: { en: 'Restorative', hi: 'पुनर्स्थापक' },
  'warm-up': { en: 'Warm-up', hi: 'ऊपजाई' },
}

export function YogaListView() {
  const { lang, t } = useLanguage()
  const [asanas, setAsanas] = useState<AsanaListItem[] | null>(null)
  const [cat, setCat] = useState<string>('all')
  const [pager, setPager] = useState({ cat: 'all', visible: 60 })

  useEffect(() => {
    apiGet<{ asanas: AsanaListItem[] }>('/api/v1/asanas?language=' + lang)
      .then((d) => setAsanas(d.asanas))
      .catch(() => setAsanas([]))
  }, [lang])

  const cats = ['all', ...Array.from(new Set((asanas || []).map((a) => a.category)))]
  const filtered = (asanas || []).filter((a) => cat === 'all' || a.category === cat)

  // windowed rendering — catalog now ships ~10k entries per section
  const visible = pager.cat === cat ? pager.visible : 60
  const shown = filtered.slice(0, visible)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">{t(UI.nav.yoga)}</h1>
        <p className="text-sm text-muted-foreground mt-1">{yogaSub(t)}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              cat === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:border-primary/40'
            }`}
          >
            {c === 'all' ? (lang === 'hi' ? 'सभी' : 'All') : lang === 'hi' ? CATEGORY_I18N[c]?.hi || c : CATEGORY_I18N[c]?.en || c}
          </button>
        ))}
      </div>

      {asanas === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map((a) => (
            <button
              key={a.slug}
              onClick={() => navigate(`/yoga/${a.slug}`)}
              className="text-left rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold">{a.sanskrit}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.name}</p>
                </div>
                <EvidenceBadge tier={a.evidenceTier} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                  {lang === 'hi' ? CATEGORY_I18N[a.category]?.hi || a.category : CATEGORY_I18N[a.category]?.en || a.category}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] capitalize">{a.difficulty}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      {asanas !== null && filtered.length > shown.length && (
        <div className="mt-5 text-center">
          <Button variant="outline" size="sm" onClick={() => setPager({ cat, visible: visible + 120 })}>
            {lang === 'hi' ? `और दिखाएँ (${shown.length} / ${filtered.length})` : `Show more (${shown.length} / ${filtered.length})`}
          </Button>
        </div>
      )}
    </div>
  )
}

function yogaSub(t: (e: { en: string; hi: string } | string) => string): string {
  return t({
    en: 'Contraindications are shown first — safety before spectacle. Each asana carries the evidence tier of its claims.',
    hi: 'पहले निषेधावस्थाएँ — सुरक्षा सबसे पहले। प्रत्येक आसन में उसके दावों की प्रमाण श्रेणी दिखाई जाती है।',
  })
}

export function YogaDetailView({ slug }: { slug: string }) {
  const { lang, t } = useLanguage()
  const [state, setState] = useState<{ slug: string; asana?: AsanaDetail } | null>(null)

  useEffect(() => {
    let cancelled = false
    apiGet<{ asana: AsanaDetail }>(`/api/v1/asanas/${slug}?language=${lang}`)
      .then((d) => {
        if (!cancelled) setState({ slug, asana: d.asana })
      })
      .catch(() => {
        if (!cancelled) setState({ slug })
      })
    return () => {
      cancelled = true
    }
  }, [slug, lang])

  const asana = state && state.slug === slug ? state.asana : undefined

  if (!asana)
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    )

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-5">
      <Button variant="ghost" size="sm" className="h-8 -ml-2" onClick={() => navigate('/yoga')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> {t(UI.common.backToList)}
      </Button>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{asana.sanskrit}</h1>
          <EvidenceBadge tier={asana.evidenceTier} size="md" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {asana.name} · {lang === 'hi' ? CATEGORY_I18N[asana.category]?.hi || asana.category : CATEGORY_I18N[asana.category]?.en || asana.category} · <span className="capitalize">{asana.difficulty}</span>
        </p>
      </div>

      <Card className="border-amber-300/60">
        <CardContent className="p-5">
          <h2 className="font-semibold flex items-center gap-2 text-amber-900 mb-3">
            <AlertTriangle className="h-4 w-4" /> {t(UI.common.contraindications)}
          </h2>
          <ul className="space-y-1.5 text-sm">
            {asana.contraindications.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-600 mt-0.5">▸</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" /> {t(UI.common.benefits)}
          </h2>
          <ul className="space-y-1.5 text-sm">
            {asana.benefits.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary mt-0.5">▸</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {asana.instructions && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-2">{t(UI.common.instructions)}</h2>
            <p className="text-sm leading-relaxed">{asana.instructions}</p>
          </CardContent>
        </Card>
      )}
      {asana.precautions && (
        <p className="text-xs leading-relaxed text-muted-foreground">{asana.precautions}</p>
      )}

      <section>
        <h2 className="font-semibold mb-3">{t(UI.common.evidenceClaims)}</h2>
        <div className="space-y-3">
          {asana.claims.map((c) => (
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
