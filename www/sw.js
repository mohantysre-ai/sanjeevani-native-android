// Sanjeevani service worker — offline shell caching (PWA)
// v7 (2026-10-10): 60+ language release.
//  - /locales/** UI translation packs are CACHE-FIRST: one tiny (~10 KB
//    gzipped) JSON per language, immutable between releases, so switching
//    languages offline works and revisits cost ZERO bytes.
//  - /img/** catalog photos stay CACHE-FIRST: immutable, tiny WebP files
//    (thumb ≤ ~15 KB, detail ≤ ~50 KB).
//  - Everything else stays network-first (freshness for health content).
const CACHE = 'sanjeevani-v7'
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    /^\/icon-\d+\.png$/.test(url.pathname) ||
    url.pathname === '/manifest.webmanifest'
  )
}

function isCatalogImage(url) {
  return url.pathname.startsWith('/img/')
}

function isLocalePack(url) {
  return url.pathname.startsWith('/locales/')
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // 1) App navigations (HTML) — network-first, cache fallback for offline.
  //    This is what guarantees users always see the latest sections (e.g. Homeopathy).
  if (event.request.mode === 'navigate' || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((cache) => cache.put('/', clone))
          }
          return res
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  // 2) Catalog photos + locale packs — CACHE-FIRST (immutable tiny assets).
  //    First view fills the cache; every later view is served with no network
  //    round-trip at all. Falls back to network (and caches) on a cache miss.
  if (isCatalogImage(url) || isLocalePack(url)) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ||
          fetch(event.request).then((res) => {
            if (res.ok) {
              const clone = res.clone()
              caches.open(CACHE).then((cache) => cache.put(event.request, clone))
            }
            return res
          })
      )
    )
    return
  }

  // 3) API & content — network-first (freshness matters for health content).
  //    Only successful payloads are cached, so a transient failure during a
  //    data re-seed can never be pinned into the offline cache.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((cache) => cache.put(event.request, clone))
          }
          return res
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // 4) Static assets — network-first (self-healing). Production content-hashed
  //    URLs still hit browser HTTP cache; the SW cache is the offline fallback.
  if (isStaticAsset(url)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((cache) => cache.put(event.request, clone))
          }
          return res
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // 5) Everything else — network-first with cache fallback.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone))
        }
        return res
      })
      .catch(() => caches.match(event.request))
  )
})
