// Server-side content helpers: safe JSON parsing + language resolution
import { db } from '@/lib/db'
import { Tier, highestTier } from '@/lib/evidence'

export function parseJ<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// Bilingual helper language — 'hi' picks the inline Hindi column, every other
// supported language resolves through ContentTranslation instead.
export type Lang = 'en' | 'hi' | (string & {})

export function pick(lang: Lang, en: string, hi: string): string {
  return lang === 'hi' && hi ? hi : en
}

export interface BilingualItem {
  en: string
  hi: string
}

// DMR Act 1954 — mandatory scientific-consensus disclaimer for every
// consumer-facing homeopathy surface (spec §Compliance).
export const HOMEOPATHY_DISCLAIMER: Record<Lang, string> = {
  en: 'Homeopathic remedies are highly diluted preparations. The scientific consensus (including the 2017 NIH-endorsed assessment by the European and Australian science academies) is that homeopathy is not a reliable, evidence-based treatment: any perceived benefit is consistent with placebo and natural recovery. This listing documents classical homeopathic materia medica for educational reference only and does not endorse clinical efficacy. Do not use homeopathic remedies as a substitute for conventional medical care in acute or serious illness.',
  hi: 'होम्योपैथिक औषधियाँ अत्यंत तनु (डाइल्यूट) रूप में होती हैं। वैज्ञानिक सहमति (2017 का NIH-समर्थित मूल्यांकन सहित) यह है कि होम्योपैथी एक विश्वसनीय, प्रमाण-आधारित उपचार नहीं है — कोई भी लाभ प्लेसीबो और स्वाभाविक स्वास्थ्य-लाभ के अनुरूप है। यह सूची केवल शैक्षिक संदर्भ हेतु शास्त्रीय होम्योपैथिक मैटेरिया मेडिका का दस्तावेज़ीकरण है और नैदानिक प्रभावकारिता का समर्थन नहीं करती। गंभीर या तीव्र बीमारी में होम्योपैथिक औषधियों को पारंपरिक चिकित्सा देखभाल का विकल्प न बनाएँ।',
}

export function pickItem(lang: Lang, item: BilingualItem): string {
  return lang === 'hi' ? item.hi || item.en : item.en
}

// ── Tier aggregation ──────────────────────────────────────────────────────

export async function tierMapFor(entityType: string, ids: number[]): Promise<Map<number, Tier | null>> {
  const claims = await db.claim.findMany({
    where: { entityType, entityId: { in: ids }, workflowStatus: 'published' },
    select: { entityId: true, evidenceTier: true },
  })
  const byEntity = new Map<number, string[]>()
  for (const c of claims) {
    const arr = byEntity.get(c.entityId) || []
    arr.push(c.evidenceTier)
    byEntity.set(c.entityId, arr)
  }
  const out = new Map<number, Tier | null>()
  for (const id of ids) out.set(id, highestTier(byEntity.get(id) || []))
  return out
}
