'use client'

import { useEffect, useState, useCallback } from 'react'

// Lightweight hash router: #/herbs, #/herbs/turmeric, #/tools…
export interface Route {
  path: string // e.g. "herbs/curcuma-longa"
  segments: string[]
  query: URLSearchParams
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [pathPart, queryPart] = raw.split('?')
  const path = pathPart.replace(/^\/+|\/+$/g, '')
  return {
    path,
    segments: path ? path.split('/') : [],
    query: new URLSearchParams(queryPart || ''),
  }
}

export function navigate(to: string) {
  window.location.hash = to.startsWith('/') ? to : `/${to}`
}

export function useHashRoute(): Route {
  // SSR-safe: initialize with the empty route, then sync the real hash after
  // mount (a deep link like #/herbs/turmeric isn't visible to the server).
  // This keeps server HTML == first client render (no hydration mismatch).
  const [route, setRoute] = useState<Route>(() =>
    typeof window === 'undefined'
      ? { path: '', segments: [], query: new URLSearchParams() }
      : { path: '', segments: [], query: new URLSearchParams() }
  )

  const onChange = useCallback(() => {
    setRoute(parseHash())
    window.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    // sync the real hash once after mount (microtask: before paint)
    queueMicrotask(() => setRoute(parseHash()))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [onChange])

  return route
}
