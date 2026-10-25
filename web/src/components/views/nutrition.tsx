'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiGet, FoodFullItem } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const CAT_I18N: Record<string, { en: string; hi: string }> = {
  millets: { en: 'Millets', hi: 'मिलेट्स (मोटे अनाज)' },
  dal: { en: 'Dals & legumes', hi: 'दालें' },
  grain: { en: 'Grains & staples', hi: 'अनाज एवं मुख्य भोजन' },
  spice: { en: 'Spices', hi: 'मसाले' },
  produce: { en: 'Fruits & vegetables', hi: 'फल एवं सब्जियाँ' },
  dairy: { en: 'Dairy', hi: 'डेयरी' },
  'nuts-oilseeds': { en: 'Nuts & oilseeds', hi: 'मेवे एवं तिलहन' },
  sweetener: { en: 'Sweeteners', hi: 'मीठा' },
  fat: { en: 'Fats', hi: 'वसा' },
}

export function NutritionView() {
  const { lang, t } = useLanguage()
  const [foods, setFoods] = useState<FoodFullItem[] | null>(null)
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  // incremental rendering — 2,000+ rows would choke the DOM.
  // filter values ride along in the same state so changing them resets the page
  // (no setState-in-effect needed).
  const [pagination, setPagination] = useState({ cat: 'all', q: '', visible: 60 })
  const atPage = pagination.cat === cat && pagination.q === q
  const visible = atPage ? pagination.visible : 60

  useEffect(() => {
    apiGet<{ foods: FoodFullItem[] }>('/api/v1/foods?language=' + lang)
      .then((d) => setFoods(d.foods))
      .catch(() => setFoods([]))
  }, [lang])

  const cats = useMemo(() => Array.from(new Set((foods || []).map((f) => f.category))), [foods])
  const filtered = (foods || []).filter((f) => (cat === 'all' || f.category === cat) && (!q || f.name.toLowerCase().includes(q.toLowerCase())))
  const shown = filtered.slice(0, visible)

  const microLabel = (k: string) =>
    ({
      calcium_mg: 'Ca (mg)',
      iron_mg: 'Fe (mg)',
      vitc_mg: 'Vit C (mg)',
      folate_ug: 'Folate (µg)',
      zinc_mg: 'Zn (mg)',
      potassium_mg: 'K (mg)',
      vita_re_ug: 'Vit A (RE µg)',
      vitamin_e_mg: 'Vit E (mg)',
      niacin_mg: 'Niacin (mg)',
    })[k] || k

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{t(UI.nav.nutrition)}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(UI.common.per100g)} · ICMR-NIN 2024 / IFCT aligned approximations · {foods?.length ?? '…'} items
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9 w-full sm:w-56 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t(UI.common.searchPlaceholder)}
          aria-label="Filter foods"
        />
        <div className="flex gap-1.5 overflow-x-auto pb-1 scroll-slim">
          {['all', ...cats].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                cat === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:border-primary/40'
              }`}
            >
              {c === 'all' ? (lang === 'hi' ? 'सभी' : 'All') : lang === 'hi' ? CAT_I18N[c]?.hi || c : CAT_I18N[c]?.en || c}
            </button>
          ))}
        </div>
      </div>

      {foods === null ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto scroll-slim max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-secondary/90 backdrop-blur text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">{t(UI.common.category) === 'Category' ? 'Food' : 'आहार'}</th>
                    <th className="text-right px-3 py-2.5">{t(UI.common.kCal)}</th>
                    <th className="text-right px-3 py-2.5">{t(UI.common.protein)} (g)</th>
                    <th className="text-right px-3 py-2.5">{t(UI.common.carbs)} (g)</th>
                    <th className="text-right px-3 py-2.5">{t(UI.common.fat)} (g)</th>
                    <th className="text-right px-3 py-2.5">{t(UI.common.fiber)} (g)</th>
                    <th className="text-left px-4 py-2.5">{t(UI.common.highlights)}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((f) => {
                    const micros = Object.entries(f.micronutrients || {})
                    const num = (v: number | null | undefined) => (v == null ? '—' : v)
                    return (
                      <tr key={f.slug} className="border-t hover:bg-secondary/30">
                        <td className="px-4 py-2.5">
                          <span className="font-medium">{f.name}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {lang === 'hi' ? CAT_I18N[f.category]?.hi || f.category : CAT_I18N[f.category]?.en || f.category}
                          </span>
                        </td>
                        <td className="text-right px-3 py-2.5 tabular-nums">{num(f.calories)}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums">{num(f.proteinG)}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums">{num(f.carbsG)}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums">{num(f.fatG)}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums">{num(f.fiberG)}</td>
                        <td className="px-4 py-2.5">
                          {micros.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {micros.map(([k, v]) => (
                                <span key={k} className="rounded bg-emerald-50 border border-emerald-200 text-emerald-900 px-1.5 py-0.5 text-[10px] whitespace-nowrap">
                                  {microLabel(k)}: {v}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {foods !== null && filtered.length > visible && (
        <div className="mt-3 flex flex-col items-center gap-1">
          <button
            onClick={() => setPagination({ cat, q, visible: visible + 100 })}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
          >
            {lang === 'hi' ? `और दिखाएँ (${Math.min(100, filtered.length - visible)})` : `Show more (${Math.min(100, filtered.length - visible)} of ${filtered.length})`}
          </button>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {t(UI.tools.noAffiliate)}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {t({
          en: '“—” = quantitative composition pending IFCT alignment; qualitative guidance from the Wellness Catalog (NIN/NIH sourced) is included per item.',
          hi: '"—" = IFCT से गुणात्मक संरचना प्रतीक्षित; गुणात्मक मार्गदर्शन वेलनेस कैटलॉग (NIN/NIH स्रोत) से प्रति आइटम शामिल है।',
        })}
      </p>
    </div>
  )
}
