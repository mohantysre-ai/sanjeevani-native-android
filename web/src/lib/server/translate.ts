// On-demand content translation — translates a single base entity (name +
// visible fields) into a target language via the z-ai LLM and persists the
// result into ContentTranslation so the whole platform (list APIs, detail
// APIs, search, daily) picks it up with zero redeploy. This is what lets
// EVERY entry render in EVERY supported language even when no pre-seeded
// translation exists: the first visit pays one LLM call, every later visit
// is a plain DB read.
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { languageInfo } from '@/lib/i18n'

export const SECTION_FIELDS: Record<string, string[]> = {
  herbs: ['description', 'usesBenefits', 'precautions', 'usageAndDose'],
  yoga: ['description', 'instructions', 'precautions'],
  foods: ['description', 'usesBenefits', 'servingGuidance', 'precautions'],
  homeopathy: ['description', 'indications', 'potencyDosage', 'precautions', 'category'],
}

export const SECTION_NAME_COL: Record<string, string> = {
  herbs: 'commonNameEn',
  yoga: 'nameEn',
  foods: 'nameEn',
  homeopathy: 'nameEn',
}

export const SECTIONS = Object.keys(SECTION_FIELDS)

// Per-section table accessor — keeps the route generic
async function findEntity(section: string, slug: string): Promise<Record<string, unknown> | null> {
  switch (section) {
    case 'herbs':
      return (await db.herb.findUnique({ where: { slug } })) as unknown as Record<string, unknown> | null
    case 'yoga':
      return (await db.asana.findUnique({ where: { slug } })) as unknown as Record<string, unknown> | null
    case 'foods':
      return (await db.food.findUnique({ where: { slug } })) as unknown as Record<string, unknown> | null
    case 'homeopathy':
      return (await db.homeopathyRemedy.findUnique({ where: { slug } })) as unknown as Record<string, unknown> | null
    default:
      return null
  }
}

export type TranslateResult =
  | { ok: true; name: string; fields: Record<string, string>; cached: boolean }
  | { ok: false; status: number; error: string }

function extractJSON(text: string): Record<string, unknown> | null {
  const t = (text || '').replace(/```json|```/g, '').trim()
  const s = t.indexOf('{')
  const e = t.lastIndexOf('}')
  if (s === -1 || e === -1 || e <= s) return null
  try {
    return JSON.parse(t.slice(s, e + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

// Shown to the model so it keeps health-safety framing intact
const SAFETY_PREAMBLE =
  'This is an educational AYUSH/yoga/nutrition/homeopathy reference. Translate faithfully; never add cure claims, recommendations or medical advice that is not in the source text.'

export async function translateEntity(
  section: string,
  slug: string,
  lang: string
): Promise<TranslateResult> {
  if (!SECTIONS.includes(section)) return { ok: false, status: 400, error: 'Unknown section' }
  if (!languageInfo(lang)) return { ok: false, status: 400, error: 'Unknown language' }
  if (lang === 'en') return { ok: false, status: 400, error: 'Source language is English' }

  // 1) cached?
  const existing = await db.contentTranslation.findUnique({
    where: { lang_section_slug: { lang, section, slug } },
  })
  if (existing) {
    let fields: Record<string, string> = {}
    try {
      fields = JSON.parse(existing.data || '{}')
    } catch {
      /* tolerate bad rows */
    }
    return { ok: true, name: existing.name, fields, cached: true }
  }

  // 2) load the English source entity
  const row = await findEntity(section, slug)
  if (!row) return { ok: false, status: 404, error: 'Entry not found' }

  const enName = String(row[SECTION_NAME_COL[section]] || slug)
  const fields: Record<string, string> = {}
  for (const f of SECTION_FIELDS[section]) {
    const v = row[f]
    if (v && String(v).trim()) fields[f] = String(v).trim().slice(0, 700)
  }
  if (!Object.keys(fields).length) return { ok: false, status: 404, error: 'No translatable content' }

  // 3) one LLM call — name + every field in a single strict-JSON response
  const target = languageInfo(lang)!
  const langLabel = `${target.english} (${target.native})`
  const payload = { name: enName, ...fields }

  let out: Record<string, unknown> | null = null
  try {
    const zai = await ZAI.create()
    for (let attempt = 0; attempt < 2 && !out; attempt++) {
      try {
        const completion = (await Promise.race([
          zai.chat.completions.create({
            messages: [
              {
                role: 'assistant',
                content: [
                  `You are a professional localizer for a premium health & wellness app. Translate the given JSON content into ${langLabel}.`,
                  `Rules:`,
                  `1. Natural, warm, everyday language — keep it readable on a phone.`,
                  `2. Keep botanical Latin binomials, homeopathic potency notations (X/C/M numbers), units (kg, cm, kcal, g, ml), "BMI", "XP", "DPDP", "DMR" as-is.`,
                  `3. Keep the exact JSON keys and structure. Respond with STRICT JSON only — no commentary, no code fences.`,
                  `4. ${SAFETY_PREAMBLE}`,
                ].join('\n'),
              },
              { role: 'user', content: JSON.stringify(payload) },
            ],
            thinking: { type: 'disabled' },
          }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('llm timeout')), 75000)),
        ])) as { choices?: { message?: { content?: string } }[] }
        out = extractJSON(completion.choices?.[0]?.message?.content || '')
      } catch {
        /* retry once */
      }
    }
  } catch {
    return { ok: false, status: 503, error: 'Translation service unavailable' }
  }
  if (!out) return { ok: false, status: 503, error: 'Translation failed' }

  const nameTr = typeof out.name === 'string' && out.name.trim() ? out.name.trim() : enName
  const fieldsTr: Record<string, string> = {}
  for (const f of Object.keys(fields)) {
    const v = out[f]
    if (typeof v === 'string' && v.trim()) fieldsTr[f] = v.trim()
  }
  if (!Object.keys(fieldsTr).length) return { ok: false, status: 503, error: 'Translation empty' }

  // 4) persist — every API reads ContentTranslation directly, so this
  //    immediately lights up lists, detail pages, search and Daily.
  await db.contentTranslation.upsert({
    where: { lang_section_slug: { lang, section, slug } },
    create: { lang, section, slug, name: nameTr, data: JSON.stringify(fieldsTr) },
    update: { name: nameTr, data: JSON.stringify(fieldsTr) },
  })
  return { ok: true, name: nameTr, fields: fieldsTr, cached: false }
}
