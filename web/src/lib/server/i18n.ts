// Server-side content localization — merge ContentTranslation rows into API
// responses. English is the source of truth and lives in the content tables;
// every other language resolves through ContentTranslation with a graceful
// per-field fallback to English when a row/field is missing. Long-tail
// entries can be translated on demand via /api/v1/translate.

import { db } from '@/lib/db'
import { LANG_IDS } from '@/lib/i18n'

export const CONTENT_LANGS: readonly string[] = LANG_IDS
export type ContentLang = string

const LANG_SET = new Set<string>(CONTENT_LANGS)

export function isContentLang(v: string | null | undefined): v is ContentLang {
  return !!v && LANG_SET.has(v)
}

export function resolveContentLang(v: string | null | undefined): ContentLang {
  return LANG_SET.has(v || '') ? (v as ContentLang) : 'en'
}

export interface LocalizedFields {
  nameLoc?: string
  fieldsLoc?: Record<string, string>
}

// Batch lookup for one page of items. Returns map slug → { nameLoc, fieldsLoc }.
export async function translationsFor(
  section: string,
  slugs: string[],
  lang: ContentLang
): Promise<Map<string, LocalizedFields>> {
  const out = new Map<string, LocalizedFields>()
  if (lang === 'en' || slugs.length === 0) return out
  const rows = await db.contentTranslation.findMany({
    where: { lang, section, slug: { in: slugs } },
    select: { slug: true, name: true, data: true },
  })
  for (const r of rows) {
    let fields: Record<string, string> = {}
    try {
      fields = JSON.parse(r.data || '{}')
    } catch {
      /* tolerate bad rows */
    }
    out.set(r.slug, { nameLoc: r.name, fieldsLoc: fields })
  }
  return out
}

// Pick the best name: translation → existing hi column (herbs/homeopathy) → english.
export function localizedName(
  tr: LocalizedFields | undefined,
  fallbackEn: string,
  existingHi?: string | null,
  lang?: ContentLang
): string {
  if (lang && tr?.nameLoc) return tr.nameLoc
  if (lang === 'hi' && existingHi) return existingHi
  return fallbackEn
}

// Pick a localized field with English fallback.
export function localizedField(
  tr: LocalizedFields | undefined,
  field: string,
  fallbackEn: string | null | undefined
): string | null | undefined {
  const loc = tr?.fieldsLoc?.[field]
  if (loc && loc.trim()) return loc
  return fallbackEn
}
