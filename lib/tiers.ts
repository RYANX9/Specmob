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

// Distinct hue per tier (gold / blue / green / gray / light gray) —
// previously flagship and upper-mid both rode on the accent/blue colors,
// which made the badge tell you less than the label already did.
export const TIER_STYLE: Record<string, TierStyle> = {
  ultra_flagship:  { label: 'Ultra Flagship',  color: 'var(--tier-ultra)',    bg: 'var(--tier-ultra-bg)' },
  flagship:        { label: 'Flagship',        color: 'var(--tier-flagship)', bg: 'var(--tier-flagship-bg)' },
  upper_mid_range: { label: 'Upper Mid-Range', color: 'var(--tier-upper)',    bg: 'var(--tier-upper-bg)' },
  mid_range:       { label: 'Mid-Range',       color: 'var(--tier-mid)',      bg: 'var(--tier-mid-bg)' },
  mid:             { label: 'Mid-Range',       color: 'var(--tier-mid)',      bg: 'var(--tier-mid-bg)' },
  entry:           { label: 'Budget',          color: 'var(--tier-budget)',   bg: 'var(--tier-budget-bg)' },
  entry_level:     { label: 'Budget',          color: 'var(--tier-budget)',   bg: 'var(--tier-budget-bg)' },
  budget:          { label: 'Budget',          color: 'var(--tier-budget)',   bg: 'var(--tier-budget-bg)' },
}

// chipset_tier comes back as a plain string on some endpoints and as
// {id, label} on others. Normalise to an id before lookup instead of
// assuming one shape.
export type RawTier = string | { id: string; label?: string } | null | undefined

function tierId(raw: RawTier): string | null {
  if (!raw) return null
  return typeof raw === 'string' ? raw : raw.id ?? null
}

export function resolveTier(smartTier: RawTier, chipsetTier: RawTier): TierStyle | null {
  const raw = smartTier ?? chipsetTier
  const id = tierId(raw)
  if (!id || id === 'unknown') return null
  if (TIER_STYLE[id]) return TIER_STYLE[id]
  const fallbackLabel = typeof raw === 'object' && raw?.label ? raw.label : id.replace(/_/g, ' ')
  return { label: fallbackLabel, color: 'var(--tier-mid)', bg: 'var(--tier-mid-bg)' }
}


export function getChipsetTierLabel(chipsetTier: RawTier): string {
  return resolveTier(null, chipsetTier)?.label ?? '—'
}

// chipset-only lookup for call sites without a smart_score tier available
export function getTierStyle(chipsetTier: RawTier): TierStyle | null {
  return resolveTier(null, chipsetTier)
}
