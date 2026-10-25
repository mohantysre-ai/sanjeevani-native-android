'use client'

// Sanjeevani Mobile App Shell — floating glass tab bar, glass app bar with
// notification bell, onboarding gate, spring screen transitions.
// Hash routes preserved for deep links. Android conventions: back closes the
// top screen (history.back), system insets respected via safe-top/safe-bottom.

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { House, Compass, Flame, Calculator, CircleUser, ChevronLeft, Crown, Leaf, Bell } from 'lucide-react'
import { useHashRoute, navigate } from '@/lib/router'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { useApp, todayKey } from '@/lib/app-store'
import { usePaywall, PaywallSheet } from '@/components/mobile/paywall'
import { ConsentBanner } from '@/components/site/consent-banner'
import { PwaRegister } from '@/components/site/pwa-register'
import { HomeTab } from '@/components/mobile/tab-home'
import { DailyTab } from '@/components/mobile/tab-daily'
import { ToolsTab } from '@/components/mobile/tab-tools'
import { ProfileTab } from '@/components/mobile/tab-profile'
import { ExploreTab, SectionListScreen } from '@/components/mobile/tab-explore'
import { DetailScreen } from '@/components/mobile/detail-screens'
import { CheckerScreen } from '@/components/mobile/checker-screen'
import { LegalScreen } from '@/components/mobile/legal-screens'
import { Onboarding } from '@/components/mobile/onboarding'
import { NotificationsScreen } from '@/components/mobile/notifications'

const SECTION_TITLES: Record<string, { en: string; hi: string }> = {
  herbs: UI.nav.herbs,
  yoga: UI.nav.yoga,
  nutrition: UI.nav.nutrition,
  homeopathy: UI.nav.homeopathy,
  checker: UI.nav.checker,
  editorial: UI.nav.editorial,
  privacy: UI.nav.privacy,
  admin: UI.nav.admin,
}

type TabId = 'home' | 'explore' | 'daily' | 'tools' | 'profile'

function tabFor(section: string | undefined): TabId {
  switch (section) {
    case undefined:
    case '':
    case 'home':
    case 'notifications':
      return 'home'
    case 'explore':
    case 'search':
    case 'herbs':
    case 'yoga':
    case 'nutrition':
    case 'homeopathy':
      return 'explore'
    case 'daily':
      return 'daily'
    case 'tools':
    case 'checker':
      return 'tools'
    case 'profile':
      return 'profile'
    default:
      return 'profile'
  }
}

function isDetailRoute(section: string | undefined, param: string | undefined): boolean {
  if (!section) return false
  if (['herbs', 'yoga', 'nutrition', 'homeopathy'].includes(section) && param) return true
  return ['checker', 'editorial', 'privacy', 'admin', 'notifications'].includes(section)
}

// ── Top app bar ───────────────────────────────────────────────────────────
function AppBar({ showBack, title }: { showBack: boolean; title: string | null }) {
  const { t } = useLanguage()
  const streak = useApp((s) => s.streak)
  const pro = useApp((s) => s.pro)
  const lastCheckIn = useApp((s) => s.lastCheckIn)
  const openPaywall = usePaywall((s) => s.show)
  const hasUnread = lastCheckIn !== todayKey()

  return (
    <header className="glass backdrop-blur-xl backdrop-saturate-150 safe-top sticky top-0 z-40 border-b border-border/50">
      <div className="flex h-16 items-center gap-2 px-4">
        {showBack ? (
          <button
            aria-label={t(UI.common.backToList)}
            onClick={() => window.history.back()}
            className="grid h-12 w-12 place-items-center rounded-full bg-secondary active:scale-90 transition-transform"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="grad-hero gloss grid h-9 w-9 place-items-center rounded-xl text-white shadow-float">
              <Leaf className="h-[18px] w-[18px]" />
            </span>
            <span className="t-headline font-extrabold tracking-tight text-grad-hero">{t(UI.brand)}</span>
          </div>
        )}
        {title && <h1 className="ml-1 truncate text-base font-bold">{title}</h1>}
        <div className="ml-auto flex items-center gap-2">
          <span className="grad-flame gloss flex h-9 items-center gap-1 rounded-full px-2.5 text-xs font-extrabold text-white tabular shadow-card">
            <Flame className="h-3.5 w-3.5" />
            {streak}
          </span>
          <button
            aria-label={t(UI.notif.title)}
            onClick={() => navigate('/notifications')}
            className="relative grid h-11 w-11 place-items-center rounded-full bg-secondary active:scale-90 transition-transform"
          >
            <Bell className="h-[18px] w-[18px]" />
            {hasUnread && (
              <span
                aria-hidden
                className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[8px] font-extrabold text-accent-foreground ring-2 ring-background"
              >
                1
              </span>
            )}
          </button>
          {!pro && (
            <button
              aria-label={t(UI.app.goPro)}
              onClick={() => openPaywall()}
              className="grid h-11 w-11 place-items-center rounded-full bg-gold/20 text-gold-foreground active:scale-90 transition-transform"
            >
              <Crown className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

// ── Bottom tab bar — floating glass pill ──────────────────────────────────
function TabItem({
  active,
  icon: Icon,
  label,
  path,
}: {
  active: boolean
  icon: React.ElementType
  label: string
  path: string
}) {
  return (
    <button
      onClick={() => navigate(path)}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className="relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 tap-none"
    >
      {active && (
        <motion.span
          layoutId="tab-pill"
          transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          className="absolute inset-x-2 top-1 bottom-1 rounded-full bg-primary/15"
        />
      )}
      <motion.span
        animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }}
        whileTap={{ scale: 0.82 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        className="relative"
      >
        <Icon
          className={`h-[22px] w-[22px] transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
          strokeWidth={active ? 2.4 : 2}
        />
      </motion.span>
      <span className={`relative max-w-full truncate px-0.5 text-[10px] font-bold leading-none transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </button>
  )
}

function TabBar({ active }: { active: TabId }) {
  const { t } = useLanguage()
  const streak = useApp((s) => s.streak)

  return (
    <nav
      aria-label="Primary"
      className="glass-nav backdrop-blur-2xl backdrop-saturate-150 safe-bottom fixed bottom-3 left-1/2 z-40 flex h-[68px] w-[min(488px,calc(100%-24px))] -translate-x-1/2 items-stretch rounded-[26px] shadow-tab"
    >
      <TabItem active={active === 'home'} icon={House} label={t(UI.app.tabHome)} path="/home" />
      <TabItem active={active === 'explore'} icon={Compass} label={t(UI.app.tabExplore)} path="/explore" />
      {/* center daily action */}
      <button
        onClick={() => navigate('/daily')}
        aria-label={t(UI.app.tabDaily)}
        aria-current={active === 'daily' ? 'page' : undefined}
        className="relative flex h-full flex-1 items-end justify-center pb-1.5 tap-none"
      >
        <motion.span
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          className={`grad-flame gloss -mt-8 grid h-14 w-14 place-items-center rounded-full text-white shadow-float ring-4 ring-card ${
            active === 'daily' ? '' : 'opacity-95'
          }`}
        >
          <Flame className="h-6 w-6" />
          {streak > 0 && (
            <span className="tabular absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[10px] font-extrabold text-background">
              {streak}
            </span>
          )}
        </motion.span>
        <span className={`mt-0.5 text-[10px] font-bold ${active === 'daily' ? 'text-primary' : 'text-muted-foreground'}`}>
          {t(UI.app.tabDaily)}
        </span>
      </button>
      <TabItem active={active === 'tools'} icon={Calculator} label={t(UI.app.tabTools)} path="/tools" />
      <TabItem active={active === 'profile'} icon={CircleUser} label={t(UI.app.tabProfile)} path="/profile" />
    </nav>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────
export function AppShell() {
  const route = useHashRoute()
  const onboarded = useApp((s) => s.onboarded)
  const [section, param] = route.segments
  const tab = tabFor(section)
  const detail = isDetailRoute(section, param)
  const listRoute = ['herbs', 'yoga', 'nutrition', 'homeopathy'].includes(section || '') && !param
  const reduce = useReducedMotion()

  const screenKey = route.path || 'home'

  let screen: React.ReactNode
  switch (section) {
    case undefined:
    case '':
    case 'home':
      screen = <HomeTab />
      break
    case 'daily':
      screen = <DailyTab />
      break
    case 'tools':
      screen = <ToolsTab />
      break
    case 'profile':
      screen = <ProfileTab />
      break
    case 'notifications':
      screen = <NotificationsScreen />
      break
    case 'explore':
      screen = <ExploreTab initialSection={route.query.get('section') || 'all'} initialQuery={route.query.get('q') || ''} />
      break
    case 'search':
      screen = <ExploreTab initialSection="all" initialQuery={route.query.get('q') || ''} />
      break
    case 'herbs':
    case 'yoga':
    case 'nutrition':
    case 'homeopathy':
      screen = param ? (
        <DetailScreen section={section as 'herbs' | 'yoga' | 'nutrition' | 'homeopathy'} slug={param} />
      ) : (
        <SectionListScreen section={section as 'herbs' | 'yoga' | 'nutrition' | 'homeopathy'} />
      )
      break
    case 'checker':
      screen = <CheckerScreen />
      break
    case 'editorial':
      screen = <LegalScreen kind="editorial" />
      break
    case 'privacy':
      screen = <LegalScreen kind="privacy" />
      break
    default:
      screen = <HomeTab />
  }

  // first launch: preference registration before any content
  if (!onboarded) {
    return (
      <div className="app-ambient min-h-dvh">
        <Onboarding />
        <ConsentBanner />
      </div>
    )
  }

  // immersive: detail screens draw their own hero header
  const hideAppBar = detail && ['herbs', 'yoga', 'nutrition', 'homeopathy'].includes(section || '')

  return (
    <div className="app-ambient min-h-dvh">
      <div className="relative mx-auto flex min-h-dvh max-w-[520px] flex-col bg-background shadow-float">
        {!hideAppBar && <AppBar showBack={detail || listRoute} title={null} />}
        <main className="flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={screenKey}
              initial={reduce ? { opacity: 1 } : { opacity: 0, x: detail ? 44 : 0, y: detail ? 0 : 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, x: detail ? -24 : 0, scale: detail ? 0.99 : 1 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="pb-[108px]"
            >
              {screen}
            </motion.div>
          </AnimatePresence>
        </main>
        <TabBar active={tab} />
        <PaywallSheet />
      </div>
      <ConsentBanner />
      <PwaRegister />
    </div>
  )
}
