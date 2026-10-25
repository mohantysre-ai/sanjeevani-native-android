'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiGet, SearchResults } from '@/lib/api'
import { EvidenceBadge } from '@/components/evidence-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { navigate, useHashRoute } from '@/lib/router'
import { Search } from 'lucide-react'

export function SearchView() {
  const { lang, t } = useLanguage()
  const route = useHashRoute()
  const q = route.query.get('q') || ''
  const [state, setState] = useState<{ q: string; lang: string; results?: SearchResults } | null>(null)

  useEffect(() => {
    if (!q) return
    let cancelled = false
    apiGet<SearchResults>(`/api/v1/search?q=${encodeURIComponent(q)}&language=${lang}`)
      .then((d) => {
        if (!cancelled) setState({ q, lang, results: d })
      })
      .catch(() => {
        if (!cancelled)
          setState({ q, lang, results: { query: q, expandedTerms: [], herbs: [], yoga: [], foods: [], conditions: [], homeopathy: [] } })
      })
    return () => {
      cancelled = true
    }
  }, [q, lang])

  const results = state && state.q === q && state.lang === lang ? state.results : undefined

  if (!q)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">
        {t(UI.common.searchPlaceholder)}
      </div>
    )

  const group = (title: string, items: SearchResults['herbs'], target: string) =>
    items.length > 0 && (
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((r) => (
            <button
              key={r.slug}
              onClick={() => navigate(`${target}/${r.slug}`)}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div>
                <span className="font-medium text-sm">{r.name}</span>
                {r.sub && <span className="block text-[11px] text-muted-foreground">{r.sub}</span>}
              </div>
              <EvidenceBadge tier={r.tier} />
            </button>
          ))}
        </div>
      </section>
    )

  const empty =
    results &&
    results.herbs.length === 0 &&
    results.yoga.length === 0 &&
    results.foods.length === 0 &&
    results.conditions.length === 0 &&
    (results.homeopathy || []).length === 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" /> “{q}”
        </h1>
        {results && results.expandedTerms.length > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Synonym expansion: {results.expandedTerms.join(' · ')}
          </p>
        )}
      </div>

      {results === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : empty ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">{t(UI.common.noResults)}</CardContent>
        </Card>
      ) : (
        <>
          {group(lang === 'hi' ? 'जड़ी-बूटियाँ' : 'Herbs', results.herbs, '/herbs')}
          {group(lang === 'hi' ? 'योग' : 'Yoga', results.yoga, '/yoga')}
          {group(lang === 'hi' ? 'स्थितियाँ' : 'Conditions', results.conditions, '/herbs')}
          {group(lang === 'hi' ? 'आहार' : 'Foods', results.foods, '/nutrition')}
          {group(lang === 'hi' ? 'होम्योपैथी' : 'Homeopathy', results.homeopathy || [], '/homeopathy')}
        </>
      )}
    </div>
  )
}
