// Single source of truth for chipset/smart tier display. Both the AI
// smart_score.tier (5 buckets: ultra_flagship, flagship, upper_mid_range,
// mid_range, budget) and the regex-derived chipset_tier fallback
// (flagship, mid, entry) resolve through this map, so every surface —
// card, detail page, filters — renders the same label and color for a
// given phone.

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
  // chipset_tier regex fallback only produces these three buckets
  mid:              { label: 'Mid-Range',        color: 'var(--blue)',   bg: 'var(--blue-light)' },
  entry:            { label: 'Budget',           color: 'var(--text-2)', bg: 'rgba(74,74,74,0.06)' },
  entry_level:      { label: 'Budget',           color: 'var(--text-2)', bg: 'rgba(74,74,74,0.06)' },
  budget:           { label: 'Budget',           color: 'var(--text-2)', bg: 'rgba(74,74,74,0.06)' },
}

/**
 * Resolves a phone's tier display, preferring the AI smart_score tier
 * (richer, 5-bucket vocabulary) and falling back to the regex-derived
 * chipset_tier when the phone hasn't been scored yet.
 */
export function resolveTier(
  smartTier: string | null | undefined,
  chipsetTier: string | null | undefined,
): TierStyle | null {
  const raw = smartTier || chipsetTier
  if (!raw || raw === 'unknown') return null
  return TIER_STYLE[raw] ?? { label: raw.replace(/_/g, ' '), color: 'var(--text-2)', bg: 'rgba(74,74,74,0.06)' }
}
