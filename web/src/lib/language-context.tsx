'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { UI, LANGUAGES, Lang, languageInfo } from './i18n'

interface LanguageCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (entry: { en: string; hi: string } | string) => string
}

const Ctx = createContext<LanguageCtx>({
  lang: 'en',
  setLang: () => {},
  t: (e) => (typeof e === 'string' ? e : e.en),
})

// Reverse index: UI entry object identity → "namespace.key". UI is a frozen
// const tree, so the exact same object reference is passed to t() everywhere;
// this lets translation packs key off the string table without changing
// every call site to pass keys instead of objects.
const KEY_OF = new Map<object, string>()
for (const [ns, obj] of Object.entries(UI)) {
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v && typeof v === 'object') KEY_OF.set(v, `${ns}.${k}`)
  }
}

// ── Lazy translation packs ─────────────────────────────────────────────
// Only the ACTIVE language's pack is fetched (~10 KB gzipped) and cached at
// three tiers: memory → localStorage → /locales/<pack>.json (service-worker
// cache-first after the first visit). English/Hindi are inline in the UI
// table and never fetch anything.
const PACK_MEM = new Map<string, Record<string, string>>()

function readLocalStore(pack: string): Record<string, string> | null {
  try {
    const raw = window.localStorage.getItem(`sanjeevani_pack_${pack}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function writeLocalStore(pack: string, table: Record<string, string>) {
  try {
    window.localStorage.setItem(`sanjeevani_pack_${pack}`, JSON.stringify(table))
  } catch {
    /* quota — memory cache still works */
  }
}

async function loadPack(pack: string): Promise<Record<string, string>> {
  const mem = PACK_MEM.get(pack)
  if (mem) return mem
  const local = readLocalStore(pack)
  if (local && Object.keys(local).length > 0) {
    PACK_MEM.set(pack, local)
    return local
  }
  try {
    const res = await fetch(`/locales/${pack}.json`, { cache: 'force-cache' })
    if (res.ok) {
      const table = (await res.json()) as Record<string, string>
      PACK_MEM.set(pack, table)
      writeLocalStore(pack, table)
      return table
    }
  } catch {
    /* offline first visit — English fallback until a connection exists */
  }
  return {}
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')
  const [packTable, setPackTable] = useState<Record<string, string>>({})

  // Restore saved language + prewarm its pack
  useEffect(() => {
    const saved = window.localStorage.getItem('sanjeevani_lang') as Lang | null
    if (saved && LANGUAGES.some((l) => l.id === saved)) {
      queueMicrotask(() => {
        setLangState(saved)
        applyDocAttrs(saved)
      })
    }
  }, [])

  // Load the pack whenever the language changes
  useEffect(() => {
    const info = languageInfo(lang)
    let dead = false
    const safeSet = (table: Record<string, string>) => {
      if (!dead) setPackTable(table)
    }
    if (!info?.pack) {
      queueMicrotask(() => safeSet({}))
      return
    }
    const pack = info.pack
    if (PACK_MEM.has(pack)) {
      queueMicrotask(() => safeSet(PACK_MEM.get(pack)!))
      return
    }
    // Instant paint from localStorage if present, then refresh from network
    const local = readLocalStore(pack)
    if (local && Object.keys(local).length > 0) queueMicrotask(() => safeSet(local))
    loadPack(pack).then((table) => {
      if (Object.keys(table).length > 0) safeSet(table)
    })
    return () => {
      dead = true
    }
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    window.localStorage.setItem('sanjeevani_lang', l)
    applyDocAttrs(l)
  }, [])

  const t = useCallback(
    (entry: { en: string; hi: string } | string) => {
      if (typeof entry === 'string') return entry
      if (!entry || typeof entry !== 'object') return ''
      if (lang === 'en') return entry.en
      if (lang === 'hi') return entry.hi || entry.en
      const key = KEY_OF.get(entry)
      return (key && packTable[key]) || entry.en
    },
    [lang, packTable]
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function applyDocAttrs(l: Lang) {
  document.documentElement.lang = l
  document.documentElement.dir = languageInfo(l)?.rtl ? 'rtl' : 'ltr'
}

export function useLanguage() {
  return useContext(Ctx)
}

// Convenience: typed helper to read a UI string by dotted path
export function uiString(key: string, lang: Lang): string {
  const parts = key.split('.')
  let node: unknown = UI
  for (const p of parts) {
    node = (node as Record<string, unknown>)?.[p]
    if (!node) return key
  }
  const leaf = node as { en?: string; hi?: string } | string
  if (typeof leaf === 'string') return leaf
  if (lang === 'en') return leaf.en ?? key
  if (lang === 'hi') return leaf.hi ?? leaf.en ?? key
  const info = languageInfo(lang)
  const pack = info?.pack
  const table = (pack && PACK_MEM.get(pack)) || {}
  return table[key] || leaf.en || key
}
