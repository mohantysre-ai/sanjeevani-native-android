'use client'

// Notifications center — honest, local-first inbox.
// "Your activity" items are derived from device state (check-in, reminder,
// streak); "Health updates" carries editorial/compliance guidance and a live
// library snapshot from /api/v1/stats. No fabricated messages.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BellRing, BellOff, Flame, Check, BrainCircuit, Trophy, ScrollText,
  ShieldAlert, Library, ChevronRight, CalendarCheck,
} from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiGet } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useApp, todayKey } from '@/lib/app-store'
import { Stagger, StaggerItem, EmptyState } from '@/components/mobile/design'

interface StatsResponse {
  herbs: number
  asanas: number
  foods: number
  remedies: number
  claims: number
}

type Tone = 'primary' | 'saffron' | 'teal' | 'gold'
const TONE_BG: Record<Tone, string> = {
  primary: 'grad-hero text-white',
  saffron: 'grad-flame text-white',
  teal: 'grad-remedy text-white',
  gold: 'grad-foods text-white',
}

function Item({
  icon: Icon,
  tone = 'primary',
  title,
  body,
  actionLabel,
  onAction,
  read = false,
}: {
  icon: React.ElementType
  tone?: Tone
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
  read?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 rounded-3xl border p-3.5 shadow-card ${
        read ? 'border-border/60 bg-card' : 'border-primary/25 bg-card ring-1 ring-primary/10'
      }`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${TONE_BG[tone]} shadow-card`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[13px] font-extrabold leading-tight">
          <span className="min-w-0">{title}</span>
          {!read && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
        </p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{body}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-full bg-secondary px-3.5 text-[11px] font-extrabold text-secondary-foreground active:bg-secondary/70"
          >
            {actionLabel} <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export function NotificationsScreen() {
  const { t, lang } = useLanguage()
  const streak = useApp((s) => s.streak)
  const best = useApp((s) => s.best)
  const lastCheckIn = useApp((s) => s.lastCheckIn)
  const reminder = useApp((s) => s.reminder)
  const [stats, setStats] = useState<StatsResponse | null>(null)

  useEffect(() => {
    apiGet<StatsResponse>('/api/v1/stats')
      .then(setStats)
      .catch(() => setStats(null))
  }, [])

  const checkedToday = lastCheckIn === todayKey()
  const entries = (stats ? stats.herbs + stats.asanas + stats.foods + stats.remedies : 0).toLocaleString('en-IN')

  const activityCount = 4
  const healthCount = 3

  return (
    <div className="px-4 pt-1">
      <Stagger>
        {/* activity */}
        <StaggerItem>
          <h2 className="t-label uppercase tracking-wider text-muted-foreground">{t(UI.notif.activity)}</h2>
        </StaggerItem>
        <StaggerItem className="mt-2 space-y-2">
          {checkedToday ? (
            <Item icon={CalendarCheck} tone="primary" title={t(UI.notif.checkInDone)} body={t(UI.notif.checkInDoneBody)} read />
          ) : (
            <Item
              icon={Flame}
              tone="saffron"
              title={t(UI.notif.checkInDue)}
              body={t(UI.notif.checkInDueBody)}
              actionLabel={t(UI.notif.openDaily)}
              onAction={() => navigate('/daily')}
            />
          )}
          <Item
            icon={reminder ? BellRing : BellOff}
            tone={reminder ? 'teal' : 'gold'}
            title={t(reminder ? UI.notif.reminderOn : UI.notif.reminderOff)}
            body={
              reminder
                ? `${t(UI.notif.reminderOnBody)} ${reminder}`
                : t(UI.notif.reminderOffBody)
            }
            actionLabel={t(UI.notif.openSettings)}
            onAction={() => navigate('/daily')}
            read={!!reminder}
          />
          <Item
            icon={BrainCircuit}
            tone="primary"
            title={t(UI.notif.quizReady)}
            body={t(UI.notif.quizReadyBody)}
            actionLabel={t(UI.notif.openDaily)}
            onAction={() => navigate('/daily')}
          />
          {streak > 0 && (
            <Item
              icon={Trophy}
              tone="saffron"
              title={t(UI.notif.streakNow)}
              body={`${t(UI.notif.streakNowBody)}: ${streak} ${t(UI.notif.days)} · ${t(UI.notif.bestIs)} ${best} · +${streak * 5} XP`}
              actionLabel={t(UI.app.tabDaily)}
              onAction={() => navigate('/daily')}
              read
            />
          )}
        </StaggerItem>

        {/* health updates */}
        <StaggerItem className="mt-5">
          <h2 className="t-label uppercase tracking-wider text-muted-foreground">{t(UI.notif.health)}</h2>
        </StaggerItem>
        <StaggerItem className="mt-2 space-y-2">
          <Item
            icon={Library}
            tone="teal"
            title={t(UI.notif.libraryUpdated)}
            body={`${entries} ${t(UI.notif.libraryUpdatedBody)}`}
            actionLabel={t(UI.app.tabExplore)}
            onAction={() => navigate('/explore')}
            read
          />
          <Item
            icon={ScrollText}
            tone="gold"
            title={t(UI.notif.reviewNote)}
            body={t(UI.notif.reviewNoteBody)}
            actionLabel={t(UI.nav.editorial)}
            onAction={() => navigate('/editorial')}
            read
          />
          <Item
            icon={ShieldAlert}
            tone="primary"
            title={t(UI.notif.safetyNote)}
            body={t(UI.notif.safetyNoteBody)}
            actionLabel={t(UI.app.interactionChecker)}
            onAction={() => navigate('/checker')}
            read
          />
        </StaggerItem>

        {/* when everything is read & nothing personal exists, still show guidance —
            so the empty state only applies to the (impossible) no-items case */}
        {activityCount + healthCount === 0 && (
          <StaggerItem className="mt-6">
            <EmptyState icon={Check} title={t(UI.notif.empty)} body={t(UI.notif.emptyHint)} />
          </StaggerItem>
        )}

        <StaggerItem className="mt-5">
          <p className="pb-2 text-center text-[10px] leading-relaxed text-muted-foreground">
            {lang === 'hi'
              ? 'सूचनाएँ आपके डिवाइस पर बनती हैं — कोई सर्वर नोटिफिकेशन नहीं।'
              : 'Notifications are generated on your device — no server push required.'}
          </p>
        </StaggerItem>
      </Stagger>
    </div>
  )
}
