'use client'

// Sanjeevani mobile app — client engagement state (streak / XP / saves / Pro).
// Persisted locally (pseudonymous, DPDP-friendly: nothing leaves the device).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Section = 'herbs' | 'yoga' | 'nutrition' | 'homeopathy'

export interface SavedItem {
  slug: string
  section: Section
  name: string
  tier?: string
}

export const FREE_SAVE_LIMIT = 5
export const MILESTONES = [3, 7, 14, 30, 60, 100] as const

export function todayKey(d = new Date()): string {
  // local-date key (YYYY-MM-DD) — streaks follow the user's device clock
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return todayKey(d)
}

interface AppState {
  streak: number
  best: number
  lastCheckIn: string | null
  history: string[] // YYYY-MM-DD dates with a check-in
  xp: number
  pro: boolean
  saved: SavedItem[]
  reminder: string | null // "HH:MM"
  onboarded: boolean
  recent: SavedItem[] // recently opened entries (personalized "continue" strip)
  focusAreas: Section[] // onboarding personalization — orders Home shortcuts

  checkIn: () => { already: boolean; streak: number; milestone: number | null }
  addXp: (n: number) => void
  toggleSave: (item: SavedItem) => 'added' | 'removed' | 'limit'
  isSaved: (section: Section, slug: string) => boolean
  setPro: (v: boolean) => void
  setReminder: (t: string | null) => void
  setOnboarded: () => void
  pushRecent: (item: SavedItem) => void
  setFocusAreas: (areas: Section[]) => void
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      streak: 0,
      best: 0,
      lastCheckIn: null,
      history: [],
      xp: 0,
      pro: false,
      saved: [],
      reminder: null,
      onboarded: false,
      recent: [],
      focusAreas: [],

      checkIn: () => {
        const today = todayKey()
        const s = get()
        if (s.lastCheckIn === today) {
          return { already: true, streak: s.streak, milestone: null }
        }
        const streak = s.lastCheckIn === yesterdayKey() ? s.streak + 1 : 1
        const history = s.history.includes(today) ? s.history : [...s.history, today].slice(-400)
        const best = Math.max(s.best, streak)
        set({ streak, best, lastCheckIn: today, history, xp: s.xp + 5 })
        const milestone = (MILESTONES as readonly number[]).includes(streak) ? streak : null
        return { already: false, streak, milestone }
      },

      addXp: (n) => set((s) => ({ xp: s.xp + n })),

      toggleSave: (item) => {
        const s = get()
        const exists = s.saved.some((x) => x.section === item.section && x.slug === item.slug)
        if (exists) {
          set({ saved: s.saved.filter((x) => !(x.section === item.section && x.slug === item.slug)) })
          return 'removed'
        }
        if (!s.pro && s.saved.length >= FREE_SAVE_LIMIT) return 'limit'
        set({ saved: [{ ...item }, ...s.saved].slice(0, 500) })
        return 'added'
      },

      isSaved: (section, slug) => get().saved.some((x) => x.section === section && x.slug === slug),

      setPro: (v) => set({ pro: v }),
      setReminder: (t) => set({ reminder: t }),
      setOnboarded: () => set({ onboarded: true }),

      pushRecent: (item) =>
        set((s) => ({
          recent: [{ ...item }, ...s.recent.filter((x) => !(x.section === item.section && x.slug === item.slug))].slice(0, 12),
        })),

      setFocusAreas: (areas) => set({ focusAreas: areas.slice(0, 4) }),
    }),
    { name: 'sanjeevani-app-v1' }
  )
)

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 100) + 1
}

export function xpIntoLevel(xp: number): number {
  return xp % 100
}
