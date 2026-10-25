'use client'

// Sanjeevani — native-feeling mobile app (single visible route, hash deep links).
// native-data MUST be imported before AppShell: inside the Capacitor WebView it
// overrides window.fetch so every /api/v1/* call is served from bundled JSON.
import '@/lib/native-data'
import { AppShell } from '@/components/mobile/app-shell'

export default function Page() {
  return <AppShell />
}
