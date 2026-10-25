'use client'

import { TIER_META, Tier } from '@/lib/evidence'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function EvidenceBadge({ tier, size = 'sm' }: { tier: Tier | string | null; size?: 'sm' | 'md' }) {
  if (!tier) return null
  const meta = TIER_META[tier as Tier]
  if (!meta) return null
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${meta.classes} ${size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0 text-[11px]'} font-semibold cursor-help`}
          >
            {meta.short}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-56 text-xs">
          {meta.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function TierLegend({ labels }: { labels: Record<string, string> }) {
  const tiers: Tier[] = ['A', 'B', 'C', 'T']
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {tiers.map((t) => (
        <div key={t} className="flex items-start gap-2 text-xs text-muted-foreground">
          <span className={`mt-0.5 inline-block h-2.5 w-2.5 rounded-full ${TIER_META[t].dot}`} />
          <span>
            <strong className="text-foreground">Tier {t}.</strong> {labels[t]}
          </span>
        </div>
      ))}
    </div>
  )
}
