// Evidence tier metadata shared by badges, lists and detail pages
export type Tier = 'A' | 'B' | 'C' | 'T'

export const TIER_ORDER: Tier[] = ['A', 'B', 'C', 'T']

export const TIER_META: Record<
  Tier,
  { label: string; short: string; classes: string; dot: string }
> = {
  A: {
    label: 'Systematic reviews / meta-analyses',
    short: 'Tier A',
    classes: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    dot: 'bg-emerald-600',
  },
  B: {
    label: 'Limited human trials',
    short: 'Tier B',
    classes: 'bg-teal-100 text-teal-900 border-teal-300',
    dot: 'bg-teal-600',
  },
  C: {
    label: 'Preclinical / pilot studies',
    short: 'Tier C',
    classes: 'bg-amber-100 text-amber-900 border-amber-300',
    dot: 'bg-amber-500',
  },
  T: {
    label: 'Traditional use (classical texts)',
    short: 'Tier T',
    classes: 'bg-stone-200 text-stone-800 border-stone-300',
    dot: 'bg-stone-500',
  },
}

export function highestTier(tiers: string[]): Tier | null {
  for (const t of TIER_ORDER) {
    if (tiers.includes(t)) return t
  }
  return null
}

export const WORKFLOW_STAGES = ['draft', 'source_checked', 'expert_reviewed', 'compliance_checked', 'published'] as const
export type WorkflowStage = (typeof WORKFLOW_STAGES)[number]

export const SEVERITY_META: Record<string, { classes: string }> = {
  high: { classes: 'bg-red-100 text-red-900 border-red-300' },
  moderate: { classes: 'bg-amber-100 text-amber-900 border-amber-300' },
  mild: { classes: 'bg-lime-100 text-lime-900 border-lime-300' },
}
