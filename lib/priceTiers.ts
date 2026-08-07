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

// Single source of truth for point-price padding, mirrored server-side in
// recommend_service.py:resolve_point_price_bounds. Used whenever a
// dragged/typed value collapses to one number rather than an explicit
// two-sided range.
export const POINT_PRICE_LOW_PAD = 0.15
export const POINT_PRICE_HIGH_PAD = 0.10

export function pointPriceBounds(value: number): { min: number; max: number } {
  return {
    min: Math.round(value * (1 - POINT_PRICE_LOW_PAD)),
    max: Math.round(value * (1 + POINT_PRICE_HIGH_PAD)),
  }
}

// Matches WIDE_RANGE_RATIO server-side — a custom range this narrow is
// treated as one number, not real min/max intent.
const WIDE_RANGE_RATIO = 1.5

export function isWideRange(min: number, max: number): boolean {
  if (min <= 0) return false
  return max / min >= WIDE_RANGE_RATIO
}
