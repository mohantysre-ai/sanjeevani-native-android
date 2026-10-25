'use client'

// Daily tab — the retention engine:
// check-in streaks + calendar heatmap, daily plan, evidence quiz (XP), reminder.
// (Duolingo-style habit loop grounded in the platform's evidence-grade moat.)

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Check, Sunrise, Sun, Sunset, Moon, BrainCircuit, Trophy, BellRing, Sparkles } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { UI } from '@/lib/i18n'
import { apiGet } from '@/lib/api'
import { navigate } from '@/lib/router'
import {
  useApp, levelFromXp, xpIntoLevel, todayKey, MILESTONES, type Section,
} from '@/lib/app-store'
import { TierChip, TapCard, Stagger, StaggerItem, TierLegendChipRow, Photo } from '@/components/mobile/design'
import { useToast } from '@/hooks/use-toast'

interface DailyPick {
  section: Section
  slug: string
  name: string
  sub: string
  tier: string
  blurb: string | null
  image?: string | null
}
interface QuizQ {
  id: number
  entity: string
  statement: string
  answer: string
  source?: string
}
interface DailyResponse {
  date: string
  picks: Record<'herb' | 'asana' | 'food' | 'remedy', DailyPick | null>
  quiz: QuizQ[]
}

const SLOT = [
  { key: 'asana', icon: Sunrise, slotKey: UI.app.morning },
  { key: 'food', icon: Sun, slotKey: UI.app.midday },
  { key: 'herb', icon: Sunset, slotKey: UI.app.evening },
  { key: 'remedy', icon: Moon, slotKey: UI.app.night },
] as const

const TIER_LABELS: Record<string, { en: string; hi: string }> = {
  A: { en: 'A — Strong (systematic reviews)', hi: 'A — मज़बूत (समीक्षाएँ)' },
  B: { en: 'B — Promising (limited trials)', hi: 'B — आशाजनक (सीमित परीक्षण)' },
  C: { en: 'C — Early (lab / animal)', hi: 'C — प्रारंभिक (प्रयोगशाला)' },
  T: { en: 'T — Traditional (classical texts)', hi: 'T — पारंपरिक (शास्त्र)' },
}

function dateOffset(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return todayKey(d)
}

export function DailyTab() {
  const { lang, t } = useLanguage()
  const { toast } = useToast()
  const [daily, setDaily] = useState<DailyResponse | null>(null)

  const streak = useApp((s) => s.streak)
  const best = useApp((s) => s.best)
  const xp = useApp((s) => s.xp)
  const history = useApp((s) => s.history)
  const lastCheckIn = useApp((s) => s.lastCheckIn)
  const checkIn = useApp((s) => s.checkIn)
  const addXp = useApp((s) => s.addXp)
  const reminder = useApp((s) => s.reminder)
  const setReminder = useApp((s) => s.setReminder)

  // quiz state
  const [qIdx, setQIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [quizDone, setQuizDone] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const [justChecked, setJustChecked] = useState(false)

  useEffect(() => {
    apiGet<DailyResponse>(`/api/v1/daily?language=${lang}`)
      .then(setDaily)
      .catch(() => setDaily({ date: todayKey(), picks: { herb: null, asana: null, food: null, remedy: null }, quiz: [] }))
  }, [lang])

  const checkedToday = lastCheckIn === todayKey()
  const week = Array.from({ length: 7 }, (_, i) => dateOffset(6 - i))
  const heat = useMemo(() => new Set(history), [history])

  const doCheckIn = () => {
    const r = checkIn()
    if (r.already) return
    setJustChecked(true)
    if (r.milestone) {
      const msg = r.milestone === 3 ? UI.app.milestone3 : r.milestone === 7 ? UI.app.milestone7 : UI.app.milestone30
      toast({ title: `🔥 ${r.streak} ${t(UI.app.dayStreak)}!`, description: t(msg) })
    }
  }

  const questions = daily?.quiz || []
  const q = questions[qIdx]

  const answer = (tier: string) => {
    if (picked) return
    setPicked(tier)
    if (tier === q.answer) setScore((s) => s + 1)
  }

  const advance = () => {
    if (qIdx + 1 >= questions.length) {
      const earned = score * 10
      addXp(earned)
      doCheckIn()
      setQuizDone(true)
    } else {
      setQIdx((i) => i + 1)
      setPicked(null)
    }
  }

  return (
    <div className="px-4 pt-3">
      <Stagger>
        {/* streak hero */}
        <StaggerItem>
          <div className="grad-flame gloss relative overflow-hidden rounded-3xl p-4 text-white shadow-float">
            <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/15" />
            <div className="flex items-center gap-4">
              <motion.div animate={justChecked ? { scale: [1, 1.4, 1], rotate: [0, 10, -10, 0] } : {}} transition={{ duration: 0.7 }} className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur">
                <Flame className="h-10 w-10" />
              </motion.div>
              <div className="flex-1">
                <p className="tabular text-4xl font-extrabold leading-none">{streak}</p>
                <p className="text-xs font-bold opacity-90">{t(UI.app.dayStreak)}</p>
                <p className="tabular mt-0.5 text-[10px] opacity-80">
                  {t(UI.app.bestStreak)}: {best} · {t(UI.app.xpLevel)} {levelFromXp(xp)} ({xpIntoLevel(xp)}/100 XP)
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={doCheckIn}
                disabled={checkedToday}
                className={`min-h-12 shrink-0 rounded-2xl px-4 text-xs font-extrabold shadow-float ${
                  checkedToday ? 'bg-white/20 text-white/85' : 'bg-white text-amber-700'
                }`}
              >
                {checkedToday ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> ✓
                  </span>
                ) : (
                  t(UI.app.checkIn)
                )}
              </motion.button>
            </div>
            {/* week strip */}
            <div className="mt-3 flex justify-between rounded-2xl bg-white/15 px-3 py-2">
              {week.map((d) => {
                const on = heat.has(d) || (d === todayKey() && checkedToday)
                const isToday = d === todayKey()
                return (
                  <div key={d} className="flex flex-col items-center gap-0.5">
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-[9px] font-extrabold ${on ? 'bg-white text-amber-600' : 'bg-white/20 text-white/70'}`}>
                      {on ? '✓' : isToday ? '•' : ''}
                    </span>
                    <span className="text-[8px] font-bold opacity-75">{d.slice(8)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </StaggerItem>

        {/* heatmap */}
        <StaggerItem className="mt-4">
          <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-card">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold">
              <Trophy className="h-4 w-4 text-accent" /> {t(UI.app.streakCalendar)}
            </h2>
            <div className="grid grid-flow-col grid-rows-7 gap-1" aria-hidden>
              {Array.from({ length: 35 }, (_, i) => dateOffset(34 - i)).map((d) => {
                const on = heat.has(d)
                const isToday = d === todayKey()
                return (
                  <span
                    key={d}
                    className={`h-4 w-4 rounded-[5px] ${
                      on ? 'grad-flame' : isToday ? 'border-2 border-primary/50' : 'bg-muted'
                    }`}
                  />
                )
              })}
            </div>
          </section>
        </StaggerItem>

        {/* daily plan */}
        <StaggerItem className="mt-4">
          <h2 className="text-base font-extrabold tracking-tight">{t(UI.app.dailyPlan)}</h2>
          <div className="mt-2.5 space-y-2">
            {!daily
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="shimmer h-[72px] rounded-3xl" />)
              : SLOT.map(({ key, icon: Icon, slotKey }) => {
                  const p = daily.picks[key]
                  if (!p) return null
                  return (
                    <TapCard
                      key={key}
                      onClick={() => navigate(`/${p.section}/${p.slug}`)}
                      className="flex w-full items-center gap-3 rounded-3xl border border-border/60 bg-card p-3.5 shadow-card"
                    >
                      <Photo
                        src={p.image}
                        alt={p.name}
                        className="h-11 w-11 shrink-0 rounded-2xl"
                        fallback={
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary">
                            <Icon className="h-5 w-5 text-primary" />
                          </span>
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{t(slotKey)}</span>
                          <TierChip tier={p.tier} size="xs" />
                        </span>
                        <span className="block truncate text-sm font-bold">{p.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{p.sub}</span>
                      </span>
                    </TapCard>
                  )
                })}
          </div>
        </StaggerItem>

        {/* evidence quiz */}
        <StaggerItem className="mt-4">
          <section className="grad-hero gloss relative overflow-hidden rounded-3xl p-4 text-white shadow-float">
            <div className="pointer-events-none absolute -right-10 -bottom-12 h-36 w-36 rounded-full bg-white/10" />
            {!quizStarted && !quizDone && (
              <>
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-6 w-6" />
                  <h2 className="text-base font-extrabold">{t(UI.app.dailyQuiz)}</h2>
                </div>
                <p className="mt-1 text-[11px] opacity-85">{t(UI.app.dailyQuizSub)}</p>
                <TierLegendChipRow />
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setQuizStarted(true)}
                  disabled={questions.length === 0}
                  className="mt-3 min-h-12 w-full rounded-2xl bg-white text-sm font-extrabold text-emerald-800 shadow-float disabled:opacity-60"
                >
                  {t(UI.app.quizStart)}
                </motion.button>
              </>
            )}

            {quizStarted && !quizDone && q && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={qIdx + (picked || '')}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.18 }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                    {t(UI.app.quizQ)} {qIdx + 1}/{questions.length} · {q.entity}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug">“{q.statement}”</p>
                  <p className="mt-1 text-[11px] opacity-80">{t(UI.app.quizHowStrong)}</p>
                  <div className="mt-3 space-y-2">
                    {['A', 'B', 'C', 'T'].map((tier) => {
                      const isPicked = picked === tier
                      const isAnswer = q.answer === tier
                      const reveal = picked !== null
                      return (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          key={tier}
                          onClick={() => answer(tier)}
                          disabled={reveal}
                          className={`min-h-12 w-full rounded-2xl p-3 text-left text-[12px] font-bold transition-colors ${
                            reveal && isAnswer
                              ? 'bg-white text-emerald-700'
                              : reveal && isPicked && !isAnswer
                                ? 'bg-red-200 text-red-900'
                                : reveal
                                  ? 'bg-white/10 text-white/60'
                                  : 'bg-white/15 text-white'
                          }`}
                        >
                          {t(TIER_LABELS[tier])}
                          {reveal && isAnswer && ' ✓'}
                        </motion.button>
                      )
                    })}
                  </div>
                  {picked && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <p className="mt-2.5 text-[11px] font-extrabold">{picked === q.answer ? `🎉 ${t(UI.app.correct)}` : t(UI.app.incorrect)}</p>
                      {q.source && (
                        <p className="mt-0.5 text-[10px] opacity-75">
                          {lang === 'hi' ? 'स्रोत' : 'Source'}: {q.source}
                        </p>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={advance}
                        className="mt-2.5 min-h-11 w-full rounded-2xl bg-white text-xs font-extrabold text-emerald-800"
                      >
                        {qIdx + 1 >= questions.length ? t(UI.app.seeResults) : t(UI.app.next)}
                      </motion.button>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {quizDone && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-2 text-center">
                <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 0.8 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/20">
                  <Sparkles className="h-8 w-8" />
                </motion.div>
                <p className="mt-2 text-lg font-extrabold">{t(UI.app.quizDone)}</p>
                <p className="tabular mt-1 text-sm font-bold opacity-90">
                  {t(UI.app.quizScore)} {score}/{questions.length} · +{score * 10} XP
                </p>
                <p className="mt-1 text-[11px] opacity-80">{t(UI.app.quizComeback)}</p>
                <button onClick={() => navigate('/home')} className="mt-3 min-h-11 rounded-2xl bg-white/20 px-4 text-xs font-extrabold">
                  {t(UI.app.tabHome)}
                </button>
              </motion.div>
            )}
          </section>
        </StaggerItem>

        {/* reminder */}
        <StaggerItem className="mt-4">
          <section className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-card">
            <span className="grad-hero grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white">
              <BellRing className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">{t(UI.app.reminder)}</p>
              <p className="text-[11px] text-muted-foreground">{t(UI.app.reminderSub)}</p>
            </div>
            <input
              type="time"
              value={reminder || '20:00'}
              onChange={(e) => {
                setReminder(e.target.value)
                toast({ title: `${t(UI.app.reminderSet)} ${e.target.value}` })
              }}
              className="min-h-11 rounded-xl border border-input bg-background px-2 text-xs font-bold"
              aria-label={t(UI.app.reminder)}
            />
          </section>
        </StaggerItem>

        <StaggerItem className="mt-4">
          <p className="pb-2 text-center text-[10px] text-muted-foreground">{t(UI.app.disclaimerShort)}</p>
        </StaggerItem>
      </Stagger>
    </div>
  )
}
