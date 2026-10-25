'use client'

// Sanjeevani Pro — paywall bottom sheet (monetization).
// Production billing: Play Billing / StoreKit via TWA/PWABuilder wrappers;
// this sheet carries the pricing UI + entitlement state (demo unlock).

import { useState } from 'react'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { create } from 'zustand'
import { motion } from 'framer-motion'
import { Check, Crown, X } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { useApp } from '@/lib/app-store'
import { useToast } from '@/hooks/use-toast'

interface PaywallState {
  isOpen: boolean
  reason: string | null
  show: (reason?: string) => void
  close: () => void
}

export const usePaywall = create<PaywallState>((set) => ({
  isOpen: false,
  reason: null,
  show: (reason) => set({ isOpen: true, reason: reason ?? null }),
  close: () => set({ isOpen: false }),
}))

const REASONS: Record<string, { en: string; hi: string }> = {
  saves: { en: 'Free saves are limited to 5', hi: 'फ्री सेव सीमा 5 है' },
}

export function PaywallSheet() {
  const { t } = useLanguage()
  const { isOpen, reason, close } = usePaywall()
  const setPro = useApp((s) => s.setPro)
  const { toast } = useToast()
  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly')

  return (
    <Drawer open={isOpen} onOpenChange={(v) => (!v ? close() : null)}>
      <DrawerContent aria-describedby={undefined} className="mx-auto max-w-[520px] rounded-t-3xl">
        <DrawerTitle className="sr-only">{t(UI.app.proTitle)}</DrawerTitle>
        <div className="safe-bottom mx-auto max-w-[480px] px-5 pb-6 pt-2">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
          <button
            aria-label="Close"
            onClick={close}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="grad-pro gloss mx-auto mt-1 grid h-16 w-16 place-items-center rounded-3xl text-white shadow-float">
            <Crown className="h-8 w-8" />
          </div>
          <h2 className="mt-3 text-center text-xl font-extrabold tracking-tight">{t(UI.app.proTitle)}</h2>
          <p className="mt-0.5 text-center text-sm text-muted-foreground">{t(UI.app.proSub)}</p>

          {reason && REASONS[reason] && (
            <p className="mt-2 rounded-xl bg-amber-500/10 px-3 py-2 text-center text-xs font-semibold text-amber-700">
              {t(REASONS[reason])} — {t(UI.app.goPro)} 👑
            </p>
          )}

          <ul className="mt-4 space-y-2.5">
            {[UI.app.proFeature1, UI.app.proFeature2, UI.app.proFeature3, UI.app.proFeature4, UI.app.proFeature5].map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex items-center gap-3 text-sm"
              >
                <span className="grad-hero grid h-6 w-6 shrink-0 place-items-center rounded-full text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {t(f)}
              </motion.li>
            ))}
          </ul>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setPlan('monthly')}
              className={`min-h-14 rounded-2xl border-2 p-3 text-left transition-colors ${
                plan === 'monthly' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <p className="text-xs font-semibold text-muted-foreground">{t(UI.app.proMonthly)}</p>
              <p className="text-lg font-extrabold">
                ₹199<span className="text-xs font-medium text-muted-foreground">{t(UI.app.proPerMonth)}</span>
              </p>
            </button>
            <button
              onClick={() => setPlan('yearly')}
              className={`min-h-14 rounded-2xl border-2 p-3 text-left transition-colors ${
                plan === 'yearly' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <span className="grad-flame absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white">
                {t(UI.app.proSave37)}
              </span>
              <p className="text-xs font-semibold text-muted-foreground">{t(UI.app.proYearly)}</p>
              <p className="text-lg font-extrabold">
                ₹1,499<span className="text-xs font-medium text-muted-foreground">{t(UI.app.proPerYear)}</span>
              </p>
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setPro(true)
              close()
              toast({ title: t(UI.app.proActive), description: t(UI.app.proThanks) })
            }}
            className="grad-hero gloss mt-4 min-h-12 w-full rounded-2xl text-center text-sm font-extrabold text-white shadow-float"
          >
            {t(UI.app.proTrial)}
          </motion.button>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{t(UI.app.proCancel)}</span>
            <button className="font-semibold text-primary" onClick={close}>
              {t(UI.app.restore)}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
