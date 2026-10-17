import type { TierId } from './types'

export const TIER_ORDER: TierId[] = ['ultra_flagship', 'flagship', 'upper_mid_range', 'mid_range', 'budget']

export interface TierStyle {
  label: string
  color: string
  bg: string
}

export const TIER_STYLE: Record<TierId, TierStyle> = {
  ultra_flagship:  { label: 'Ultra Flagship',  color: 'var(--tier-ultra)',    bg: 'var(--tier-ultra-bg)' },
  flagship:        { label: 'Flagship',        color: 'var(--tier-flagship)', bg: 'var(--tier-flagship-bg)' },
  upper_mid_range: { label: 'Upper Mid-Range', color: 'var(--tier-upper)',    bg: 'var(--tier-upper-bg)' },
  mid_range:       { label: 'Mid-Range',       color: 'var(--tier-mid)',      bg: 'var(--tier-mid-bg)' },
  budget:          { label: 'Budget',          color: 'var(--tier-budget)',   bg: 'var(--tier-budget-bg)' },
}

export function tierStyle(tier: string | null | undefined): TierStyle | null {
  if (!tier) return null
  return TIER_STYLE[tier as TierId] ?? { label: tier.replace(/_/g, ' '), color: 'var(--tier-mid)', bg: 'var(--tier-mid-bg)' }
}

export function tierLabel(tier: string | null | undefined): string | null {
  return tierStyle(tier)?.label ?? null
}
