export type PriceTierId = 's' | 'a' | 'b' | 'c' | 'd'

export interface PriceTier {
  id: PriceTierId
  label: string
  name: string
  min: number
  max: number | undefined
  blurb: string
  examples: string
}

export const PRICE_TIERS: PriceTier[] = [
  {
    id: 's',
    label: 'S-Tier',
    name: 'Ultra Flagship',
    min: 1000,
    max: undefined,
    blurb: 'Top-of-the-line chipsets, periscope zoom cameras, titanium/glass builds, foldables.',
    examples: 'iPhone Pro Max, Galaxy Ultra, Pixel Pro XL',
  },
  {
    id: 'a',
    label: 'A-Tier',
    name: 'Flagship',
    min: 700,
    max: 999,
    blurb: '90% of S-Tier performance and camera quality, without extreme zoom or folding screens.',
    examples: 'Standard iPhone, base Galaxy S, standard Pixel Pro',
  },
  {
    id: 'b',
    label: 'B-Tier',
    name: 'Upper Mid-Range',
    min: 400,
    max: 699,
    blurb: 'Flagship-grade chipset and screen, with minor trade-offs on materials or telephoto.',
    examples: 'Pixel A-series, Galaxy FE, OnePlus R-series',
  },
  {
    id: 'c',
    label: 'C-Tier',
    name: 'Mid-Range',
    min: 200,
    max: 399,
    blurb: 'Great battery and a solid 120Hz screen. Gaming and low-light photos show the limits.',
    examples: 'Galaxy A35/A55, Motorola Edge, Nothing Phone (a)',
  },
  {
    id: 'd',
    label: 'D-Tier',
    name: 'Budget',
    min: 0,
    max: 199,
    blurb: 'The essentials — calling, texting, social, browsing. Plastic builds, basic cameras.',
    examples: 'Galaxy A15/A05, Moto G Power, entry Redmi',
  },
]

export function getPriceTier(id: PriceTierId): PriceTier {
  return PRICE_TIERS.find(t => t.id === id) ?? PRICE_TIERS[2]
}

export function tierForPrice(price: number | null | undefined): PriceTier | null {
  if (price == null) return null
  return PRICE_TIERS.find(t => price >= t.min && (t.max == null || price <= t.max)) ?? null
}

// Tier OR dial, never both. Picking a tier uses PRICE_TIERS' fixed range and the
// dial is locked. The server (TIER_RANGES in recommend_service.py) treats the
// upper bound as exclusive, so $699.50 is B-Tier and nothing falls in a gap.
export function tierRangeText(t: PriceTier): string {
  return t.max == null ? `$${t.min.toLocaleString()}+` : `$${t.min.toLocaleString()} – $${t.max.toLocaleString()}`
}

export function isPriceTierId(v: string | null | undefined): v is PriceTierId {
  return v === 's' || v === 'a' || v === 'b' || v === 'c' || v === 'd'
}

// ─── Budget dial ────────────────────────────────────────────────────────────
// The dial value is a CEILING. The server derives the range from it with the
// same ratios (app/services/recommend_service.py). Keep both in sync.

export const BUDGET_FLOOR_RATIO = 0.8
export const BUDGET_CEILING_RATIO = 1.05
export const DEFAULT_DIAL_VALUE = 550
export const DIAL_MIN = 100
export const DIAL_MAX = 2000 // at this value the ceiling is removed

export function budgetBounds(budget: number): { min: number; max: number | null } {
  return {
    min: Math.round(budget * BUDGET_FLOOR_RATIO),
    max: budget >= DIAL_MAX ? null : Math.round(budget * BUDGET_CEILING_RATIO),
  }
}

// Non-linear dial: more resolution in the common $100-$1000 range.
const STOPS: readonly (readonly [number, number])[] = [
  [0, DIAL_MIN],
  [0.45, 400],
  [0.8, 1000],
  [1, DIAL_MAX],
]

const clamp = (v: number) => Math.min(DIAL_MAX, Math.max(DIAL_MIN, v))
const stepFor = (v: number) => (v < 400 ? 25 : v < 1000 ? 50 : 100)

export function dialValueFromRatio(t: number): number {
  const r = Math.min(1, Math.max(0, t))
  let i = 1
  while (i < STOPS.length - 1 && STOPS[i][0] < r) i++
  const [p1, v1] = STOPS[i - 1]
  const [p2, v2] = STOPS[i]
  const raw = v1 + ((r - p1) / (p2 - p1)) * (v2 - v1)
  const s = stepFor(raw)
  return clamp(Math.round(raw / s) * s)
}

export function dialRatioFromValue(value: number): number {
  const x = clamp(value)
  let i = 1
  while (i < STOPS.length - 1 && STOPS[i][1] < x) i++
  const [p1, v1] = STOPS[i - 1]
  const [p2, v2] = STOPS[i]
  return p1 + ((x - v1) / (v2 - v1)) * (p2 - p1)
}

export function stepDial(value: number, dir: 1 | -1): number {
  return clamp(value + dir * stepFor(dir < 0 ? value - 1 : value))
}