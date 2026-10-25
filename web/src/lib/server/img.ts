// Shared image helpers for list/detail APIs.
// Catalog images are stored as tiny WebP pairs produced by scripts/img_optimize.py
// and scripts/fetch_images_v4.py:
//   /img/<section>/<base>.webp     detail hero, max width 512, ~25-45 KB
//   /img/<section>/<base>-t.webp   list thumb,  max width 192, ~8-15 KB
// Deriving the thumb path server-side keeps the low-bandwidth policy in one
// place: list rows always ship the 192px variant and never the full photo.

export function thumbFor(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null
  return imageUrl.endsWith('.webp') ? imageUrl.replace(/\.webp$/, '-t.webp') : imageUrl
}

// Strip condition/variant qualifiers so "Arnica Montana for sprains" and plain
// "Arnica Montana" group into one list entry with a ×N variant chip — same
// rule the photo pipeline uses, so every variant row shares one real photo.
// For homeopathy remedies, potency suffixes ("30C", "200X", "1M") are variant
// qualifiers too: "Aconitum Napellus 30C" == "Aconitum Napellus 200C" subject.
export function cleanName(name: string | null | undefined, isRemedy = false): string {
  let n = (name || '')
    .replace(/\s+for\s+.*$/i, '')
    .replace(/\s+[-–—]\s+.*$/, '')
    .replace(/\s*\)+\s*$/, '') // stray closing parens from malformed catalog names
  if (isRemedy) {
    n = n.replace(/\s+\d+\s*[CXMK]\s*(?:\(.*?\))?$/i, '')
  }
  n = n
    .replace(/\s*\(([^)]*)\)\s*$/, '')
    .replace(/\s+(Beginner|Intermediate|Advanced)\s+Variations?$/i, '')
    .replace(/\s+(Modern|Traditional)$/i, '')
  return n.trim()
}

// Low-bandwidth list paging bounds. 60 rows ≈ one app screen-and-a-half; the
// UI loads more on demand. Max page keeps a single response well under ~100 KB.
export const DEFAULT_PAGE_LIMIT = 60
export const MAX_PAGE_LIMIT = 240

export function pageParams(url: URL): { limit: number; offset: number; q: string } {
  const limit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(1, parseInt(url.searchParams.get('limit') || '', 10) || DEFAULT_PAGE_LIMIT),
  )
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '', 10) || 0)
  const q = (url.searchParams.get('q') || '').trim().slice(0, 80)
  return { limit, offset, q }
}
