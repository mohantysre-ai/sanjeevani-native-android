'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useHashRoute, navigate } from '@/lib/router'
import { useLanguage } from '@/lib/language-context'
import { UI, LANGUAGES } from '@/lib/i18n'
import { LanguageDropdown } from '@/components/mobile/language-picker'
import { Leaf, Languages, Search, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SiteHeader() {
  const { lang, t } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)
  const route = useHashRoute()
  const section = route.segments[0] || 'home'
  const langNative = LANGUAGES.find((l) => l.id === lang)?.native || 'English'

  const nav = [
    { key: 'herbs', label: t(UI.nav.herbs) },
    { key: 'yoga', label: t(UI.nav.yoga) },
    { key: 'nutrition', label: t(UI.nav.nutrition) },
    { key: 'homeopathy', label: t(UI.nav.homeopathy) },
    { key: 'tools', label: t(UI.nav.tools) },
    { key: 'checker', label: t(UI.nav.checker) },
    { key: 'editorial', label: t(UI.nav.editorial) },
    { key: 'admin', label: t(UI.nav.admin) },
  ]

  const submitSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const q = String(fd.get('q') || '').trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary shrink-0" aria-label="Sanjeevani home">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Leaf className="h-4.5 w-4.5" />
            </span>
            <span className="text-lg tracking-tight">{t(UI.brand)}</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 ml-4" aria-label="Primary">
            {nav.slice(0, 7).map((n) => (
              <Button
                key={n.key}
                variant={section === n.key ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => navigate(`/${n.key}`)}
              >
                {n.label}
              </Button>
            ))}
          </nav>

          <form onSubmit={submitSearch} className="ml-auto flex items-center gap-2 max-w-xs flex-1" role="search">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                placeholder={t(UI.common.searchPlaceholder)}
                className="pl-8 h-9"
                aria-label={t(UI.common.search)}
              />
            </div>
          </form>

          <div className="relative shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setLangOpen((v) => !v)}
              aria-expanded={langOpen}
              aria-haspopup="dialog"
              aria-label="Choose language"
            >
              <Languages className="h-4 w-4 mr-1" />
              {langNative}
            </Button>
            <LanguageDropdown open={langOpen} onClose={() => setLangOpen(false)} />
          </div>
        </div>

        {/* mobile nav */}
        <nav className="lg:hidden flex gap-1 overflow-x-auto pb-2 -mt-1 scroll-slim" aria-label="Primary mobile">
          {nav.map((n) => (
            <Button
              key={n.key}
              variant={section === n.key ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 shrink-0 text-xs"
              onClick={() => navigate(`/${n.key}`)}
            >
              {n.label}
            </Button>
          ))}
        </nav>
      </div>
      <div className="border-t bg-secondary/60">
        <div className="mx-auto max-w-6xl px-4 py-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 shrink-0 text-primary" />
          <span className="truncate">{t(UI.compliance.dmrBanner)}</span>
        </div>
      </div>
    </header>
  )
}
