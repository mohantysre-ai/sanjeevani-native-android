'use client'

// Profile tab — identity, appearance (light/dark/system), notifications,
// saved items (free limit 5), language, replay intro, legal + editorial tools.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Crown, Heart, Globe, Download, ScrollText, ShieldCheck, LayoutDashboard,
  ChevronRight, Flame, Trophy, Zap, Bell, Sun, Moon, Monitor, RotateCcw,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLanguage } from '@/lib/language-context'
import { UI, LANGUAGES } from '@/lib/i18n'
import { navigate } from '@/lib/router'
import { useApp, levelFromXp, xpIntoLevel, FREE_SAVE_LIMIT, type SavedItem } from '@/lib/app-store'
import { TierChip, TapCard, Stagger, StaggerItem, Segmented } from '@/components/mobile/design'
import { LanguageSheet } from '@/components/mobile/language-picker'
import { usePaywall } from '@/components/mobile/paywall'

const SECTION_PATH: Record<SavedItem['section'], string> = {
  herbs: '/herbs',
  yoga: '/yoga',
  nutrition: '/nutrition',
  homeopathy: '/homeopathy',
}

type ThemePref = 'light' | 'dark' | 'system'

export function ProfileTab() {
  const { lang, setLang, t } = useLanguage()
  const { streak, best, xp, pro, saved, setPro } = {
    streak: useApp((s) => s.streak),
    best: useApp((s) => s.best),
    xp: useApp((s) => s.xp),
    pro: useApp((s) => s.pro),
    saved: useApp((s) => s.saved),
    setPro: useApp((s) => s.setPro),
  }
  const openPaywall = usePaywall((s) => s.show)
  const [installed, setInstalled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [langSheet, setLangSheet] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true)
      setInstalled(typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches)
    })
  }, [])

  const level = levelFromXp(xp)

  const replayIntro = () => {
    // re-run onboarding (preference registration); keeps streak/saves intact
    navigate('/home')
    // flip via store: set onboarded back to false
    useApp.setState({ onboarded: false })
  }

  return (
    <div className="px-4 pt-3">
      <Stagger>
        {/* identity card */}
        <StaggerItem>
          <div className="grad-hero gloss relative overflow-hidden rounded-3xl p-4 text-white shadow-float">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
            <div className="flex items-center gap-3.5">
              <span className="grid h-16 w-16 place-items-center rounded-3xl bg-white/15 text-3xl backdrop-blur">
                {pro ? '👑' : '🌿'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-lg font-extrabold leading-tight">
                  {pro && <Crown className="h-4 w-4 text-amber-300" />}
                  {pro ? t(UI.app.proTitle) : t(UI.brand)}
                </p>
                <p className="text-[11px] opacity-80">
                  {t(UI.app.xpLevel)} {level} · {xpIntoLevel(xp)}/100 XP
                </p>
                <div className="mt-1.5 h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-white/20">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${xpIntoLevel(xp)}%` }} className="h-full rounded-full bg-white" />
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: Flame, v: streak, l: t(UI.app.dayStreak) },
                { icon: Trophy, v: best, l: t(UI.app.bestStreak) },
                { icon: Zap, v: xp, l: 'XP' },
              ].map(({ icon: Icon, v, l }) => (
                <div key={l} className="rounded-2xl bg-white/10 px-2 py-2">
                  <Icon className="mx-auto h-3.5 w-3.5 opacity-80" />
                  <p className="tabular text-lg font-extrabold leading-tight">{v}</p>
                  <p className="truncate text-[9px] font-bold opacity-75">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </StaggerItem>

        {/* Pro card */}
        <StaggerItem className="mt-4">
          {pro ? (
            <div className="grad-pro gloss flex items-center gap-3 rounded-3xl p-4 text-white shadow-float">
              <Crown className="h-6 w-6" />
              <div className="flex-1">
                <p className="text-sm font-extrabold">{t(UI.app.proActive)}</p>
                <p className="text-[11px] opacity-85">{t(UI.app.proThanks)}</p>
              </div>
            </div>
          ) : (
            <TapCard onClick={() => openPaywall()} className="grad-pro gloss relative w-full overflow-hidden rounded-3xl p-4 text-white shadow-float">
              <div className="pointer-events-none absolute -right-6 -bottom-8 h-28 w-28 rounded-full bg-white/10" />
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                  <Crown className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-extrabold">{t(UI.app.goPro)} — ₹199{t(UI.app.proPerMonth)}</p>
                  <p className="text-[11px] opacity-85">{t(UI.app.proSub)}</p>
                </div>
                <ChevronRight className="h-5 w-5" />
              </div>
            </TapCard>
          )}
        </StaggerItem>

        {/* appearance */}
        <StaggerItem className="mt-4">
          <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-card">
            <h2 className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              <Sun className="h-3.5 w-3.5" /> {t(UI.settings2.appearance)}
            </h2>
            {mounted ? (
              <Segmented<ThemePref>
                ariaLabel={t(UI.settings2.appearance)}
                value={(theme as ThemePref) || 'system'}
                onChange={(v) => setTheme(v)}
                options={[
                  { id: 'light', label: t(UI.settings2.themeLight), icon: Sun },
                  { id: 'dark', label: t(UI.settings2.themeDark), icon: Moon },
                  { id: 'system', label: t(UI.settings2.themeSystem), icon: Monitor },
                ]}
              />
            ) : (
              <div className="h-14 rounded-2xl bg-muted" aria-hidden />
            )}
          </section>
        </StaggerItem>

        {/* saved items */}
        <StaggerItem className="mt-4">
          <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-card">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-extrabold">
                <Heart className="h-4 w-4 text-red-500" /> {t(UI.app.savedItems)}
              </h2>
              {!pro && (
                <span className="tabular rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">
                  {saved.length}/{FREE_SAVE_LIMIT}
                </span>
              )}
            </div>
            {saved.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-muted-foreground">{t(UI.app.noSaved)}</p>
            ) : (
              <ul className="space-y-2">
                {saved.map((s) => (
                  <li key={s.section + s.slug}>
                    <button
                      onClick={() => navigate(`${SECTION_PATH[s.section]}/${s.slug}`)}
                      className="flex min-h-14 w-full items-center gap-2.5 rounded-2xl bg-secondary/40 p-2.5 text-left active:bg-secondary/70"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background text-sm font-extrabold text-primary">
                        {s.name.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold">{s.name}</span>
                        <span className="block text-[10px] capitalize text-muted-foreground">{t(UI.nav[s.section])}</span>
                      </span>
                      {s.tier && <TierChip tier={s.tier} size="xs" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!pro && saved.length >= FREE_SAVE_LIMIT && (
              <button onClick={() => openPaywall('saves')} className="mt-2.5 min-h-11 w-full rounded-2xl border border-dashed border-gold bg-gold/10 text-[11px] font-extrabold text-gold-foreground">
                👑 {t(UI.app.saveLimitHit)}
              </button>
            )}
          </section>
        </StaggerItem>

        {/* settings */}
        <StaggerItem className="mt-4">
          <section className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
            <h2 className="px-4 pt-3.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">{t(UI.app.settings)}</h2>
            <div className="mt-1.5 divide-y divide-border/60">
              <SettingRow icon={Bell} label={t(UI.settings2.notificationsRow)} sub={t(UI.settings2.notificationsSub)} onClick={() => navigate('/notifications')} />
              <SettingRow icon={Globe} label={t(UI.app.language)} value={LANGUAGES.find((l) => l.id === lang)?.native || 'English'} onClick={() => setLangSheet(true)} />
              <SettingRow icon={RotateCcw} label={t(UI.settings2.replayIntro)} onClick={replayIntro} />
              {!installed && <SettingRow icon={Download} label={t(UI.app.installApp)} value={t(UI.app.installCta)} onClick={installPwa} />}
            </div>
          </section>
        </StaggerItem>

        {/* legal + editorial */}
        <StaggerItem className="mt-4">
          <section className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
            <h2 className="px-4 pt-3.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">{t(UI.app.legal)}</h2>
            <div className="mt-1.5 divide-y divide-border/60">
              <SettingRow icon={ScrollText} label={t(UI.nav.editorial)} onClick={() => navigate('/editorial')} />
              <SettingRow icon={ShieldCheck} label={t(UI.nav.privacy)} onClick={() => navigate('/privacy')} />
              <SettingRow icon={LayoutDashboard} label={t(UI.nav.admin)} onClick={() => navigate('/admin')} />
            </div>
          </section>
        </StaggerItem>

        <StaggerItem className="mt-4">
          <p className="pb-2 text-center text-[10px] leading-relaxed text-muted-foreground">
            {t(UI.brand)} · v3.5.0 · {t(UI.tagline)}
            <br />
            {t(UI.app.disclaimerShort)}
          </p>
        </StaggerItem>
      </Stagger>

      {/* language sheet — searchable, region-grouped, 60+ languages */}
      <LanguageSheet open={langSheet} onClose={() => setLangSheet(false)} />
    </div>
  )
}

function SettingRow({ icon: Icon, label, sub, value, onClick }: { icon: React.ElementType; label: string; sub?: string; value?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-secondary/40">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold">{label}</span>
        {sub && <span className="block truncate text-[10.5px] text-muted-foreground">{sub}</span>}
      </span>
      {value && <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">{value}</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

function installPwa() {
  // beforeinstallprompt captured in pwa-register; fall back to instructions
  const w = window as unknown as { __sanjeevaniInstallPrompt?: { prompt: () => Promise<void> } }
  if (w.__sanjeevaniInstallPrompt) {
    void w.__sanjeevaniInstallPrompt.prompt()
  } else {
    alert(
      navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')
        ? 'iOS: Share → Add to Home Screen'
        : 'Android: ⋮ menu → Add to Home screen / Install app'
    )
  }
}
