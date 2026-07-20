import type { ChipsetTier } from './types'

export const TIER_ORDER = [
  'ultra_flagship',
  'flagship',
  'upper_mid_range',
  'mid_range',
  'budget',
] as const

export type TierId = typeof TIER_ORDER[number]

interface TierStyle {
  label: string
  color: string
  bg: string
}

export const TIER_STYLE: Record<string, TierStyle> = {
  ultra_flagship:   { label: 'Ultra Flagship',   color: '#C9A84C',       bg: 'rgba(201,168,76,0.12)' },
  flagship:         { label: 'Flagship',         color: 'var(--accent)', bg: 'var(--accent-light)' },
  upper_mid_range:  { label: 'Upper Mid-Range',  color: 'var(--blue)',   bg: 'var(--blue-light)' },
  mid_range:        { label: 'Mid-Range',        color: 'var(--blue)',   bg: 'var(--blue-light)' },
  mid:              { label: 'Mid-Range',        color: 'var(--blue)',   bg: 'var(--blue-light)' },
  entry:            { label: 'Budget',           color: 'var(--text-2)', bg: 'rgba(74,74,74,0.06)' },
  entry_level:      { label: 'Budget',           color: 'var(--text-2)', bg: 'rgba(74,74,74,0.06)' },
  budget:           { label: 'Budget',           color: 'var(--text-2)', bg: 'rgba(74,74,74,0.06)' },
}

/**
 * chipset_tier comes back from the API already resolved server-side
 * (shaping.py prefers smart_tier over the chipset regex fallback before
 * this ever reaches the client). Do not re-resolve it against
 * smart_score.tier here — that field is the same source, not a second
 * signal. This is a pure id -> style lookup.
 */
export function getTierStyle(chipsetTier: ChipsetTier | null | undefined): TierStyle | null {
  if (!chipsetTier || !chipsetTier.id || chipsetTier.id === 'unknown') return null
  return TIER_STYLE[chipsetTier.id] ?? {
    label: chipsetTier.label || chipsetTier.id.replace(/_/g, ' '),
    color: 'var(--text-2)',
    bg: 'rgba(74,74,74,0.06)',
  }
}

