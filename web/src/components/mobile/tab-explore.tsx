'use client'

// Explore tab — M3 EXPRESSIVE SEARCH: floating search view that compacts on
// scroll, intent-hint chips, spring-morphing section pills, and a
// typography-first result list (tonal surfaces, no card noise).
// SectionListScreen backs the /herbs /yoga /nutrition /homeopathy routes with
// windowed rendering (10k-scale lists) + save hearts + labelled ad slots.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, X, ChevronRight, Sparkles, Moon, ShieldPlus, Flame, Zap } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiGet, HerbListItem, AsanaListItem, FoodItem, RemedyListItem, SearchResults } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useApp, type Section } from '@/lib/app-store'
import { TierChip, SaveButton, SponsoredCard, Stagger, StaggerItem, Photo, EmptyState, ErrorState, SkRow } from '@/components/mobile/design'
import { usePaywall } from '@/components/mobile/paywall'

type AnyRow = {
  slug: string
  name: string
  sub: string
  tier: string
  section: Section
  filterText: string
  image?: string | null
  variants?: number
}

// Low-bandwidth paging: one page ≈ 120 rows ≈ 30-40 KB JSON (was 1.8-3.9 MB).
const PAGE_SIZE = 120

// Fetch one page of a section list, mapped into uniform UI rows. `q` is the
// optional server-side filter so users can reach the full 10k catalog while
// the client only ever holds the pages they actually browsed.
async function fetchSectionPage(
  section: Section,
  lang: string,
  limit: number,
  offset: number,
  q = '',
  category = '',
): Promise<{ rows: AnyRow[]; total: number }> {
  const qs = `language=${lang}&limit=${limit}&offset=${offset}${q ? `&q=${encodeURIComponent(q)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}`
  if (section === 'herbs') {
    const d = await apiGet<{ herbs: HerbListItem[]; total: number }>(`/api/v1/herbs?${qs}`)
    return {
      total: d.total ?? d.herbs.length,
      rows: d.herbs.map((h) => ({
        slug: h.slug,
        name: h.name,
        sub: h.latinBinomial || h.sanskritName || '',
        tier: h.evidenceTier,
        section: 'herbs' as const,
        filterText: [h.name, h.latinBinomial, h.sanskritName, ...h.synonyms].join(' ').toLowerCase(),
        image: h.thumb || h.image,
        variants: h.variants,
      })),
    }
  }
  if (section === 'yoga') {
    const d = await apiGet<{ asanas: AsanaListItem[]; total: number }>(`/api/v1/asanas?${qs}`)
    return {
      total: d.total ?? d.asanas.length,
      rows: d.asanas.map((a) => ({
        slug: a.slug,
        name: a.name,
        sub: a.sanskrit || a.category,
        tier: a.evidenceTier,
        section: 'yoga' as const,
        filterText: [a.name, a.sanskrit, a.category, a.difficulty].join(' ').toLowerCase(),
        image: a.thumb || a.image,
        variants: a.variants,
      })),
    }
  }
  if (section === 'nutrition') {
    const d = await apiGet<{ foods: FoodItem[]; total: number }>(`/api/v1/foods?${qs}`)
    return {
      total: d.total ?? d.foods.length,
      rows: d.foods.map((f) => ({
        slug: f.slug,
        name: f.name,
        sub: f.calories != null ? `${Math.round(f.calories)} kcal · ${f.category}` : f.category,
        tier: 'B',
        section: 'nutrition' as const,
        filterText: [f.name, f.category].join(' ').toLowerCase(),
        image: f.thumb || f.image,
        variants: f.variants,
      })),
    }
  }
  const d = await apiGet<{ remedies: RemedyListItem[]; total: number }>(`/api/v1/homeopathy?${qs}`)
  return {
    total: d.total ?? d.remedies.length,
    rows: d.remedies.map((r) => ({
      slug: r.slug,
      name: r.name,
      sub: r.translit || r.latinSource || r.category,
      tier: r.evidenceTier,
      section: 'homeopathy' as const,
      filterText: [r.name, r.translit || '', r.latinSource || '', ...(r.synonyms || [])].join(' ').toLowerCase(),
      image: r.thumb || r.image,
      variants: r.variants,
    })),
  }
}

function useSectionRows(section: Section | 'all', lang: string, category = '') {
  // keyed-state fetch pattern — no synchronous setState inside the effect.
  // Low-bandwidth: pages of 120 rows (~30 KB) instead of the whole 10k table.
  const [state, setState] = useState<{
    key: string
    rows: AnyRow[]
    total: number
    loadingMore: boolean
  } | null>(null)
  const key = `${section}/${lang}/${category}`

  useEffect(() => {
    if (section === 'all') return
    let dead = false
    fetchSectionPage(section, lang, PAGE_SIZE, 0, '', category)
      .then((p) => !dead && setState({ key, rows: p.rows, total: p.total, loadingMore: false }))
      .catch(() => !dead && setState({ key, rows: [], total: 0, loadingMore: false }))
    return () => {
      dead = true
    }
  }, [key, section, lang, category])

  const loadMore = useCallback(async () => {
    const st = state
    if (!st || st.key !== key || st.loadingMore || st.rows.length >= st.total) return
    setState({ ...st, loadingMore: true })
    try {
      const p = await fetchSectionPage(section as Section, lang, PAGE_SIZE, st.rows.length, '', category)
      setState((cur) =>
        cur && cur.key === key
          ? { ...cur, rows: [...cur.rows, ...p.rows], total: Math.max(cur.total, p.total), loadingMore: false }
          : cur,
      )
    } catch {
      setState((cur) => (cur && cur.key === key ? { ...cur, loadingMore: false } : cur))
    }
  }, [state, key, section, lang, category])

  if (!state || state.key !== key) return null
  return { rows: state.rows, total: state.total, loadingMore: state.loadingMore, loadMore }
}

export type SectionSearchPage = { rows: AnyRow[]; total: number }

// M3E intent hints — honest shortcuts to real, popular queries
const INTENTS: { icon: React.ElementType; label: { en: string; hi: string }; q: string }[] = [
  { icon: Moon, label: { en: 'Better sleep', hi: 'बेहतर नींद' }, q: 'ashwagandha' },
  { icon: ShieldPlus, label: { en: 'Immunity', hi: 'इम्यूनिटी' }, q: 'tulsi' },
  { icon: Flame, label: { en: 'Digestion', hi: 'पाचन' }, q: 'trikatu' },
  { icon: Zap, label: { en: 'Morning energy', hi: 'सुबह की ऊर्जा' }, q: 'surya namaskar' },
]
const INTENT_TITLE = { en: 'What do you need today?', hi: 'आज क्या चाहिए?' }

// Server-side name search across the FULL table — a filter box can reach every
// one of the 10k rows without the client ever downloading the whole list.
export async function searchSection(
  section: Section,
  lang: string,
  q: string,
  offset = 0,
  category = '',
): Promise<SectionSearchPage> {
  return fetchSectionPage(section, lang, 240, offset, q, category)
}

export function RowList({
  rows,
  total,
  loadingMore,
  onLoadMore,
  onServerSearch,
  onLimit,
  onClearFilter,
}: {
  rows: AnyRow[]
  total: number
  loadingMore?: boolean
  onLoadMore?: () => void
  onServerSearch?: (q: string, offset: number) => Promise<SectionSearchPage>
  onLimit: () => void
  onClearFilter?: () => void
}) {
  const { lang, t } = useLanguage()
  const [filter, setFilter] = useState('')
  // server-backed filter results (full-table reach without full-table download)
  const [srv, setSrv] = useState<{ q: string; rows: AnyRow[]; total: number } | null>(null)
  const [srvLoading, setSrvLoading] = useState(false)

  useEffect(() => {
    if (!onServerSearch) return
    const f = filter.trim()
    // all setState calls live inside the timer callback (async), keeping the
    // effect body free of synchronous cascading renders
    const timer = setTimeout(() => {
      if (!f) {
        setSrv(null)
        setSrvLoading(false)
        return
      }
      setSrvLoading(true)
      onServerSearch(f, 0)
        .then((p) => setSrv({ q: f, rows: p.rows, total: p.total }))
        .catch(() => setSrv(null))
        .finally(() => setSrvLoading(false))
    }, f ? 350 : 0)
    return () => clearTimeout(timer)
  }, [filter, onServerSearch])

  const serverActive = !!srv && srv.q === filter.trim()
  const filtered = useMemo(() => {
    if (serverActive) return srv.rows
    const f = filter.trim().toLowerCase()
    if (!f) return rows
    return rows.filter((r) => r.filterText.includes(f))
  }, [rows, filter, serverActive, srv])

  const shown = filtered
  const filterCount = serverActive ? srv.total : filtered.length
  const moreAvailable = serverActive
    ? srv.rows.length < srv.total
    : rows.length < total

  const loadMoreFiltered = () => {
    if (serverActive && onServerSearch) {
      onServerSearch(srv.q, srv.rows.length)
        .then((p) => setSrv((cur) => (cur ? { ...cur, rows: [...cur.rows, ...p.rows], total: Math.max(cur.total, p.total) } : cur)))
        .catch(() => undefined)
    } else {
      onLoadMore?.()
    }
  }

  return (
    <div className="px-4">
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 pb-2 pt-1 backdrop-blur">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t(UI.app.filterList)}
            aria-label="Filter list"
            className="h-11 w-full rounded-full border border-input bg-card pl-10 pr-9 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {(filter || srvLoading) && (
            <button
              aria-label="Clear filter"
              onClick={() => setFilter('')}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-secondary text-muted-foreground"
            >
              {srvLoading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" /> : <X className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
        <p className="tabular mt-1.5 text-[11px] text-muted-foreground">
          {serverActive
            ? `${filterCount.toLocaleString('en-IN')} ${t(UI.app.results)}`
            : total > rows.length
              ? `${rows.length} / ${total.toLocaleString('en-IN')} ${t(UI.app.showing)}`
              : `${filterCount.toLocaleString('en-IN')} ${t(UI.app.results)}`}
        </p>
      </div>

      {/* typography-first list — tonal surfaces instead of card chrome:
          the content is the interface, whitespace does the separating */}
      <div className="mt-1">
        {shown.map((r, i) => (
          <div key={r.section + r.slug}>
            <motion.div
              role="button"
              tabIndex={0}
              aria-label={r.name}
              onClick={() => navigate(`/${r.section}/${r.slug}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/${r.section}/${r.slug}`)
                }
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-3xl px-2 py-2.5 outline-none transition-colors hover:bg-secondary/40 focus-visible:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring active:bg-secondary/60"
            >
              <Photo
                src={r.image}
                alt={r.name}
                className="shape-m3 h-12 w-12 shrink-0"
                fallback={
                  <span className="shape-m3 grid h-12 w-12 shrink-0 place-items-center bg-secondary text-base font-extrabold text-primary">
                    {r.name.charAt(0).toUpperCase()}
                  </span>
                }
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-extrabold tracking-tight">{r.name}</span>
                  <TierChip tier={r.tier} size="xs" />
                  {!!r.variants && r.variants > 1 && (
                    <span
                      className="tabular shrink-0 rounded-full bg-secondary px-1.5 text-[10px] font-bold text-secondary-foreground"
                      title={`${r.variants} catalog variants`}
                    >
                      ×{r.variants}
                    </span>
                  )}
                </span>
                <span className="block truncate text-[12px] text-muted-foreground">{r.sub}</span>
              </span>
              <SaveButton section={r.section} slug={r.slug} name={r.name} tier={r.tier} onLimit={onLimit} />
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </motion.div>
            {i === 29 && (
              <div className="py-2">
                <SponsoredCard compact />
              </div>
            )}
          </div>
        ))}
        {shown.length === 0 && !srvLoading && (
          <div className="pt-4">
            <EmptyState
              title={t(UI.common.noResults)}
              body={
                filter
                  ? t({ en: 'Try a different filter — search by name, Sanskrit or Latin binomial.', hi: 'फ़िल्टर बदलकर फिर देखें — नाम, संस्कृत या लैटिन नाम से खोजें।' })
                  : undefined
              }
              actionLabel={filter ? t(UI.app.clearFilter) : undefined}
              onAction={filter ? onClearFilter : undefined}
            />
          </div>
        )}
        {moreAvailable && (
          <button
            onClick={loadMoreFiltered}
            disabled={loadingMore}
            className="tabular surface-tonal min-h-12 w-full rounded-full text-xs font-bold text-primary active:bg-secondary/40 disabled:opacity-60"
          >
            {loadingMore
              ? t(UI.common.loading)
              : `${t(UI.app.loadMore)} · ${shown.length}/${(serverActive ? srv.total : total).toLocaleString('en-IN')}`}
          </button>
        )}
      </div>
    </div>
  )
}

// Route-backed section list screen (#/herbs etc.)
export function SectionListScreen({ section }: { section: Section }) {
  const { lang, t } = useLanguage()
  // homeopathy: classical materia medica kingdom filter (Plant/Mineral/Nosode)
  const [kingdom, setKingdom] = useState('')
  const active = section === 'homeopathy' ? kingdom : ''
  const data = useSectionRows(section, lang, active)
  const openPaywall = usePaywall((s) => s.show)
  const onServerSearch = useCallback(
    (q: string, offset: number) => searchSection(section, lang, q, offset, active),
    [section, lang, active],
  )

  const kingdoms: { id: string; label: string }[] = [
    { id: '', label: t(UI.app.allCategories) },
    { id: 'Plant', label: t(UI.app.kingdomPlant) },
    { id: 'Mineral', label: t(UI.app.kingdomMineral) },
    { id: 'Nosode', label: t(UI.app.kingdomNosode) },
  ]

  return (
    <div className="pt-2">
      {section === 'homeopathy' && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {kingdoms.map((k) => (
            <button
              key={k.id}
              onClick={() => setKingdom(k.id)}
              aria-pressed={kingdom === k.id}
              className={`flex min-h-11 shrink-0 items-center rounded-full px-4 text-xs font-bold transition-colors ${
                kingdom === k.id ? 'bg-primary text-primary-foreground shadow-card' : 'border border-border bg-card text-muted-foreground'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}
      {data === null ? (
        <div className="px-4">
          <SkRow n={8} />
        </div>
      ) : (
        <RowList
          rows={data.rows}
          total={data.total}
          loadingMore={data.loadingMore}
          onLoadMore={data.loadMore}
          onServerSearch={onServerSearch}
          onLimit={() => openPaywall('saves')}
        />
      )}
      <p className="px-4 pt-4 pb-2 text-center text-[10px] text-muted-foreground">{t(UI.app.disclaimerShort)}</p>
    </div>
  )
}

// Explore tab — search-first hub
const TRENDING: { q: string; hi: string }[] = [
  { q: 'haldi', hi: 'हल्दी' },
  { q: 'ashwagandha', hi: 'अश्वगंधा' },
  { q: 'arnica', hi: 'आर्निका' },
  { q: 'surya namaskar', hi: 'सूर्य नमस्कार' },
  { q: 'ragi', hi: 'रागी' },
  { q: 'tulsi', hi: 'तुलसी' },
]

export function ExploreTab({ initialSection = 'all', initialQuery = '' }: { initialSection?: string; initialQuery?: string }) {
  const { lang, t } = useLanguage()
  const [q, setQ] = useState(initialQuery)
  const [chip, setChip] = useState<'all' | Section>(initialSection as 'all' | Section)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [recentQs, setRecentQs] = useState<string[]>([])
  // M3 floating search view: compacts as the user scrolls, springs on focus
  const [compact, setCompact] = useState(false)
  const [focused, setFocused] = useState(false)
  const openPaywall = usePaywall((s) => s.show)
  const data = useSectionRows(chip, lang)
  const onServerSearch = useCallback(
    (q: string, offset: number) => searchSection(chip as Section, lang, q, offset),
    [chip, lang],
  )

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 48)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('sanjeevani_recent_q')
      if (raw) setRecentQs(JSON.parse(raw) as string[])
    } catch {}
  }, [])

  const runSearch = async (query: string) => {
    const query1 = query.trim()
    if (!query1) {
      setResults(null)
      setSearchError(false)
      return
    }
    setSearching(true)
    setSearchError(false)
    setQ(query1)
    const next = [query1, ...recentQs.filter((x) => x !== query1)].slice(0, 5)
    setRecentQs(next)
    window.localStorage.setItem('sanjeevani_recent_q', JSON.stringify(next))
    try {
      const d = await apiGet<SearchResults>(`/api/v1/search?q=${encodeURIComponent(query1)}&language=${lang}`)
      setResults(d)
    } catch {
      setResults(null)
      setSearchError(true)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (initialQuery) void runSearch(initialQuery)
  }, [])

  const chips: { id: 'all' | Section; label: string }[] = [
    { id: 'all', label: t(UI.app.allSections) },
    { id: 'herbs', label: t(UI.nav.herbs) },
    { id: 'yoga', label: t(UI.nav.yoga) },
    { id: 'nutrition', label: t(UI.nav.nutrition) },
    { id: 'homeopathy', label: t(UI.nav.homeopathy) },
  ]

  const resultRows: AnyRow[] = results
    ? [
        ...(chip === 'all' || chip === 'herbs'
          ? results.herbs.map((h) => ({ slug: h.slug, name: h.name, sub: h.sub, tier: h.tier || 'T', section: 'herbs' as const, filterText: '', image: h.image }))
          : []),
        ...(chip === 'all' || chip === 'yoga'
          ? results.yoga.map((h) => ({ slug: h.slug, name: h.name, sub: h.sub, tier: h.tier || 'T', section: 'yoga' as const, filterText: '', image: h.image }))
          : []),
        ...(chip === 'all' || chip === 'nutrition'
          ? results.foods.map((h) => ({ slug: h.slug, name: h.name, sub: h.sub, tier: h.tier || 'B', section: 'nutrition' as const, filterText: '', image: h.image }))
          : []),
        ...(chip === 'all' || chip === 'homeopathy'
          ? (results.homeopathy || []).map((h) => ({
              slug: h.slug,
              name: h.name,
              sub: h.sub,
              tier: h.tier || 'T',
              section: 'homeopathy' as const,
              filterText: '',
              image: h.image,
            }))
          : []),
      ]
    : []

  return (
    <div className="px-4 pt-2">
      {/* M3 floating search view — pill-shaped, compacts on scroll */}
      <div
        className={`sticky top-0 z-20 -mx-4 px-4 pb-2 pt-1 backdrop-blur-xl transition-colors duration-300 ${
          compact ? 'glass border-b border-border/50' : 'bg-transparent'
        }`}
      >
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            void runSearch(q)
          }}
          className="relative"
        >
          <motion.div
            animate={{ scale: focused ? 0.98 : 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="relative"
          >
            <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={t(UI.app.searchAll)}
              aria-label={t(UI.common.search)}
              className={`w-full rounded-full border border-input bg-card pl-11 pr-10 text-sm shadow-card transition-[height,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                compact ? 'h-11' : 'h-12'
              }`}
            />
            {q && (
              <button
                type="button"
                aria-label="Clear"
                onClick={() => {
                  setQ('')
                  setResults(null)
                }}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-secondary text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        </form>
      </div>

      {/* section pills — active pill morphs between them with spring physics */}
      <div className="no-scrollbar -mx-4 mt-1 flex gap-2 overflow-x-auto px-4">
        {chips.map((c) => {
          const active = chip === c.id
          return (
            <button
              key={c.id}
              onClick={() => setChip(c.id)}
              aria-pressed={active}
              className={`spring-press relative flex min-h-11 shrink-0 items-center overflow-hidden rounded-full border px-4 text-xs font-bold ${
                active ? 'border-transparent' : 'border-border'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="explore-chip"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  className="absolute inset-0 rounded-full bg-primary shadow-card"
                />
              )}
              <span className={`relative whitespace-nowrap ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                {c.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* body */}
      {searchError && q ? (
        <div className="mt-4">
          <ErrorState
            title={t(UI.app.searchFailed)}
            body={t(UI.app.checkConnection)}
            onRetry={() => void runSearch(q)}
          />
        </div>
      ) : q && (results || searching) ? (
        <div className="mt-4">
          {results && (
            <p className="tabular mb-2 text-[11px] text-muted-foreground">
              {results.expandedTerms?.length > 0 && (
                <span>
                  {t(UI.app.expanded)} {results.expandedTerms.slice(0, 3).join(', ')} ·{' '}
                </span>
              )}
              {resultRows.length} {t(UI.app.results)}
            </p>
          )}
          {searching && !results ? (
            <div className="px-0">
              <SkRow n={5} />
            </div>
          ) : (
            <RowList
              rows={resultRows}
              total={resultRows.length}
              onLimit={() => openPaywall('saves')}
              onClearFilter={() => { setQ(''); setResults(null) }}
            />
          )}
        </div>
      ) : chip !== 'all' ? (
        <div className="mt-4">
          {data === null ? (
            <SkRow n={6} />
          ) : (
            <RowList
              rows={data.rows}
              total={data.total}
              loadingMore={data.loadingMore}
              onLoadMore={data.loadMore}
              onServerSearch={onServerSearch}
              onLimit={() => openPaywall('saves')}
            />
          )}
        </div>
      ) : (
        <div className="mt-4">
          <Stagger>
          {/* intent hints — zero-config guidance to real queries */}
          <StaggerItem>
            <h2 className="text-sm font-extrabold">{t(INTENT_TITLE)}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTENTS.map((it) => (
                <button
                  key={it.q}
                  onClick={() => void runSearch(it.q)}
                  className="spring-press surface-tonal flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold"
                >
                  <it.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {t(it.label)}
                </button>
              ))}
            </div>
          </StaggerItem>

          {/* trending searches */}
          <StaggerItem className="mt-4">
            <h2 className="text-sm font-extrabold">{t(UI.app.trendingSearches)}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {TRENDING.map((tr) => (
                <button
                  key={tr.q}
                  onClick={() => void runSearch(lang === 'hi' ? tr.hi : tr.q)}
                  className="spring-press flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold shadow-card"
                >
                  <Sparkles className="h-3 w-3 text-accent" />
                  {lang === 'hi' ? tr.hi : tr.q}
                </button>
              ))}
            </div>
          </StaggerItem>

          {/* recent searches */}
          {recentQs.length > 0 && (
            <StaggerItem className="mt-4">
              <h2 className="text-sm font-extrabold">{t(UI.app.recentSearches)}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {recentQs.map((rq) => (
                  <button
                    key={rq}
                    onClick={() => void runSearch(rq)}
                    className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
                  >
                    {rq}
                  </button>
                ))}
              </div>
            </StaggerItem>
          )}

          <StaggerItem className="mt-4">
            <SponsoredCard compact />
          </StaggerItem>
        </Stagger>
        </div>
      )}
    </div>
  )
}
