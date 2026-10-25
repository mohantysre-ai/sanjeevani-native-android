'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { Leaf } from 'lucide-react'
import { navigate } from '@/lib/router'

export function SiteFooter() {
  const { t } = useLanguage()
  return (
    <footer className="mt-auto border-t bg-secondary/40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-6xl px-4 py-8 grid gap-6 md:grid-cols-3 text-sm">
        <div>
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Leaf className="h-4 w-4" /> {t(UI.brand)}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(UI.compliance.medicalDisclaimer)}</p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">{t(UI.nav.editorial)}</h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>
              <button className="hover:text-primary" onClick={() => navigate('/editorial')}>
                {t(UI.tiers.title)}
              </button>
            </li>
            <li>
              <button className="hover:text-primary" onClick={() => navigate('/admin')}>
                {t(UI.nav.admin)}
              </button>
            </li>
            <li>
              <button className="hover:text-primary" onClick={() => navigate('/tools')}>
                {t(UI.home.exploreTools)}
              </button>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2">{t(UI.privacy.title)}</h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>
              <button className="hover:text-primary" onClick={() => navigate('/privacy')}>
                {t(UI.privacy.consentLedger)}
              </button>
            </li>
            <li>
              <button className="hover:text-primary" onClick={() => navigate('/checker')}>
                {t(UI.nav.checker)}
              </button>
            </li>
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            {t(UI.tools.noAffiliate)}
          </p>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-3 text-[11px] text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>© 2026 {t(UI.brand)} · {t(UI.tagline)}</span>
          <span>DMR Act 1954 · DPDP Act 2023 · ICMR-NIN 2024</span>
        </div>
      </div>
    </footer>
  )
}
