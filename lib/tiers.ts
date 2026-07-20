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
  ultra_flagship:  { label: 'Ultra Flagship',  color: '#C9A84C',       bg: 'rgba(201,168,76,0.12)' },
  flagship:        { label: 'Flagship',        color: 'var(--accent)', bg: 'var(--accent-light)' },
  upper_mid_range: { label: 'Upper Mid-Range', color: 'var(--blue)',   bg: 'var(--blue-light)' },
  mid_range:       { label: 'Mid-Range',       color: 'var(--blue)',   bg: 'var(--blue-light)' },
  mid:             { label: 'Mid-Range',       color: 'var(--blue)',   bg: 'var(--blue-light)' },
  entry:           { label: 'Budget',          color: 'var(--text-2)', bg: 'rgba(74,74,74,0.06)' },
  entry_level:     { label: 'Budget',          color: 'var(--text-2)', bg: 'rgba(74,74,74,0.06)' },
  budget:          { label: 'Budget',          color: 'var(--text-2)', bg: 'rgba(74,74,74,0.06)' },
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
  return { label: fallbackLabel, color: 'var(--text-2)', bg: 'rgba(74,74,74,0.06)' }
}

export function getChipsetTierLabel(chipsetTier: RawTier): string {
  return resolveTier(null, chipsetTier)?.label ?? '—'
}
