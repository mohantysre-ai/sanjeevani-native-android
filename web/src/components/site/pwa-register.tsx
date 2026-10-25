'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // Capture the install prompt so the Profile tab can trigger native install.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      ;(window as unknown as { __sanjeevaniInstallPrompt?: unknown }).__sanjeevaniInstallPrompt = e
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // When an updated service worker takes control (e.g. cache-version bump),
    // reload ONCE so the app shell it serves is the fresh one.
    let refreshing = false
    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* PWA is progressive enhancement — ignore failures */
      })
    }
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('load', onLoad)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])
  return null
}
