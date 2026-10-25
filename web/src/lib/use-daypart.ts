'use client'

// M3 Expressive dynamic-color driver — the web analog of Android 12+
// wallpaper-derived palettes. Computes the part of the day on the USER'S
// device, publishes it as <html data-daypart="…"> so the CSS daypart
// palettes in globals.css retune hero/ambient hues, and exposes the
// value to React for time-aware content (greetings, pick ordering).
//
// External-store pattern (same as tab-home's clock): stable server
// snapshot (null), no hydration mismatch, re-checks every minute.

import { useSyncExternalStore } from 'react'

export type Daypart = 'dawn' | 'morn' | 'noon' | 'dusk' | 'night'

function compute(): Daypart {
  const h = new Date().getHours()
  if (h >= 5 && h < 9) return 'dawn'
  if (h >= 9 && h < 12) return 'morn'
  if (h >= 12 && h < 17) return 'noon'
  if (h >= 17 && h < 21) return 'dusk'
  return 'night'
}

let current: Daypart | null = null
const subs = new Set<() => void>()

function tick() {
  const next = compute()
  if (next !== current) {
    current = next
    if (typeof document !== 'undefined') document.documentElement.dataset.daypart = next
    subs.forEach((fn) => fn())
  }
}

if (typeof window !== 'undefined') {
  current = compute()
  document.documentElement.dataset.daypart = current
  const id = window.setInterval(tick, 60_000)
  // don't hold the tab open in background/agent contexts
  ;(window as unknown as { __daypartTimer?: number }).__daypartTimer = id
}

const subscribe = (fn: () => void) => {
  subs.add(fn)
  return () => {
    subs.delete(fn)
  }
}

const getSnapshot = () => current
const getServerSnapshot = () => null as Daypart | null

export function useDaypart(): Daypart | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// time-of-day affinity for content personalization: which sections
// naturally fit each part of the day (used by the Living Dashboard)
export const DAYPART_AFFINITY: Record<Daypart, string[]> = {
  dawn: ['yoga', 'herbs'],
  morn: ['yoga', 'nutrition'],
  noon: ['nutrition', 'herbs'],
  dusk: ['yoga', 'homeopathy'],
  night: ['homeopathy', 'yoga'],
}

export const DAYPART_LABEL: Record<Daypart, { en: string; hi: string }> = {
  dawn: { en: 'Fresh start', hi: 'ताज़ी शुरुआत' },
  morn: { en: 'Morning flow', hi: 'सुबह का रफ़्तार' },
  noon: { en: 'Midday recharge', hi: 'दोपहर का रिचार्ज' },
  dusk: { en: 'Wind-down', hi: 'शाम की राहत' },
  night: { en: 'Rest & restore', hi: 'आराम और पुनर्स्थापन' },
}

export const DAYPART_ICON: Record<Daypart, string> = {
  dawn: '🌅',
  morn: '☀️',
  noon: '🌤️',
  dusk: '🌆',
  night: '🌙',
}
