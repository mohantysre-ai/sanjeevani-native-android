'use client'

// Minimal typed fetch helpers for the SPA views
export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return res.json() as Promise<T>
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${url} → ${res.status}`)
  return res.json() as Promise<T>
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${url} → ${res.status}`)
  return res.json() as Promise<T>
}

// ── Response shapes ───────────────────────────────────────────────────────

export interface HerbListItem {
  slug: string
  name: string
  latinBinomial: string
  sanskritName: string
  synonyms: string[]
  evidenceTier: string
  image?: string | null
  thumb?: string | null
  variants?: number
}

export interface ClaimShape {
  id: number
  statement: string
  tier: string
  sources: { title: string; publisher: string; year: number }[]
  reviewer: { name: string; credentials: string }
  lastReviewed: string
  nextReview: string
}

export interface HerbDetail {
  slug: string
  name: string
  nameAlt: string
  latinBinomial: string
  sanskritName: string
  synonyms: string[]
  ayurvedicProperties: {
    rasa: string
    guna: string
    virya: string
    vipaka: string
    doshaAction: string
  } | null
  safetyFlags: {
    pregnancy: { en: string; hi: string }
    children: { en: string; hi: string }
    doseLimit: { en: string; hi: string }
    interactions: string[]
    warnings: { en: string; hi: string }[]
  } | null
  usageAndDose: string
  // catalog enrichment (excel_v1_2026-10-03)
  category?: string | null
  description?: string | null
  usesBenefits?: string | null
  precautions?: string | null
  evidenceGrade?: string | null
  safetyLevel?: string | null
  sourceUrl?: string | null
  evidenceTier: string
  linkedYoga: { slug: string; name: string; sanskrit: string }[]
  claims: ClaimShape[]
  image?: string | null
}

export interface AsanaListItem {
  slug: string
  name: string
  sanskrit: string
  category: string
  difficulty: string
  evidenceTier: string
  image?: string | null
  thumb?: string | null
  variants?: number
}

export interface AsanaDetail {
  slug: string
  name: string
  sanskrit: string
  category: string
  difficulty: string
  description?: string | null
  instructions?: string | null
  precautions?: string | null
  evidenceGrade?: string | null
  sourceUrl?: string | null
  contraindications: string[]
  benefits: string[]
  evidenceTier: string
  claims: ClaimShape[]
  image?: string | null
}

// Slim list shape — full composition (protein/carbs/fibre/micronutrients)
// comes from the per-food detail endpoint so browsing stays tiny on 2G/3G.
export interface FoodItem {
  slug: string
  name: string
  category: string
  calories?: number | null
  image?: string | null
  thumb?: string | null
  variants?: number
}

export interface RemedyListItem {
  slug: string
  name: string
  translit: string | null
  latinSource: string | null
  category: string
  evidenceTier: string
  safetyLevel: string
  emergencyWarning: boolean
  disclaimerRequired: boolean
  synonyms: string[]
  image?: string | null
  thumb?: string | null
  variants?: number
}

// Paged list envelope shared by the four section list endpoints.
export interface PageMeta {
  total: number
  limit: number
  offset: number
}

// Full composition row (food detail endpoint + legacy desktop views).
export interface FoodFullItem {
  slug: string
  name: string
  category: string
  servingSizeG?: number | null
  calories?: number | null
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
  fiberG?: number | null
  micronutrients?: Record<string, number>
  image?: string | null
  thumb?: string | null
}

export interface RemedyDetail {
  slug: string
  name: string
  nameAlt: string
  translit: string | null
  latinSource: string | null
  category: string
  description: string | null
  indications: string | null
  potencyDosage: string | null
  precautions: string | null
  safetyFlags: string[]
  safetyLevel: string
  emergencyWarning: boolean
  evidenceTier: string
  evidenceBasis: string | null
  synonyms: string[]
  sourceUrl: string | null
  workflowStatus: string
  dmr: {
    disclaimer_required: boolean
    disclaimer_key: string
    self_diagnosis_warning: boolean
    disclaimer: string
  }
  claims: ClaimShape[]
  image?: string | null
}

export interface SearchResults {
  query: string
  expandedTerms: string[]
  herbs: { slug: string; name: string; sub: string; tier: string | null; image?: string | null }[]
  yoga: { slug: string; name: string; sub: string; tier: string | null; image?: string | null }[]
  foods: { slug: string; name: string; sub: string; tier: string | null; image?: string | null }[]
  conditions: { slug: string; name: string; sub: string; tier: string | null }[]
  homeopathy?: { slug: string; name: string; sub: string; tier: string | null; image?: string | null }[]
}

export interface InteractionCheckResponse {
  interaction_found: boolean
  severity: string
  description: string
  actionable_advice: string
  matches?: {
    herb: string
    medication: string
    severity: string
    description: string
    actionable_advice: string
    sources: string[]
  }[]
}

export interface AdminClaim {
  id: number
  entityType: string
  entityTable: string
  entityName: string
  entitySlug: string
  statement: string
  tier: string
  reviewer: string
  lastReviewed: string
  nextReview: string
  status: string
}

export interface AdminResponse {
  counts: Record<string, number>
  claims: AdminClaim[]
}
