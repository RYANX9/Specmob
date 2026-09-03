// lib/config.ts

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://renderphones.onrender.com'
export const SITE_URL = 'https://specmob.vercel.app'

// value_score color scale lives in lib/valueScore.ts (single source of
// truth — see review #7/#8). Re-exported here so any existing
// `import { valueScoreColor } from '@/lib/config'` call site keeps working.
export { valueScoreColor } from './valueScore'

/**
 * Strips a leading brand prefix from a URL slug.
 * Expects lowercase, hyphen-separated slugs (e.g. "samsung-galaxy-s25-ultra").
 * NOT for display strings — use stripBrandFromDisplayName for those.
 */
export function stripBrandWord(slug: string, brandSlugValue: string): string {
  const prefix = `${brandSlugValue}-`
  return slug.startsWith(prefix) ? slug.slice(prefix.length) : slug
}

/**
 * Strips a leading brand word from a human-readable display name
 * (space-separated, case-insensitive) — for titles, meta descriptions,
 * JSON-LD, and OG images. NOT for slugs — use stripBrandWord for those.
 */
export function stripBrandFromDisplayName(name: string, brand: string): string {
  const prefix = `${brand} `
  return name.toLowerCase().startsWith(prefix.toLowerCase())
    ? name.slice(prefix.length)
    : name
}

export const ROUTES = {
  home:     '/',
  brand:    (brand: string) => `/brand/${brand}`,
  phone:    (brand: string, model: string) => `/brand/${brand}/${stripBrandWord(model, brand)}`,
  compare:  (...slugs: string[]) => `/compare/${slugs.join('-vs-')}`,
  category: (slug: string) => `/best/${slug}`,
  pick:     '/pick',
  tradein:  '/trade-in',
  about:    '/about',
  contact:  '/contact',
  support:  '/support',
} as const

/**
 * Formats a price_usd value from the API.
 * Strips the float decimals that come from the DB (e.g. 1026.57 → "$1,027").
 * Returns 'Price TBA' for null/undefined.
 */
export function formatPrice(price: number | null | undefined): string {
  if (price == null) return 'Price TBA'
  return `$${Math.round(price).toLocaleString('en-US')}`
}

// Used by the category quick-links strip on the homepage and the
// category tab bar on best/[category]. Icon strings are resolved
// to Lucide components at the call site.
export const CATEGORY_META: Record<string, { title: string; icon: string; desc: string }> = {
  'camera-phones':  { title: 'Best Camera',   icon: 'camera',     desc: 'Top 10 ranked'  },
  'battery-life':   { title: 'Battery Kings', icon: 'battery',    desc: '5000mAh+'       },
  'gaming-phones':  { title: 'Gaming',        icon: 'zap',        desc: 'Flagship chips' },
  'under-300':      { title: 'Under $300',    icon: 'dollar',     desc: 'Best value'     },
  'under-500':      { title: 'Under $500',    icon: 'tag',        desc: 'Sweet spot'     },
  'lightweight':    { title: 'Lightweight',   icon: 'feather',    desc: 'Under 185g'     },
  'compact-phones': { title: 'Compact',       icon: 'smartphone', desc: 'Under 6.3"'     },
  'fast-charging':  { title: 'Fast Charge',   icon: 'bolt',       desc: '65W+'           },
  'foldables':      { title: 'Foldables',      icon: 'layers',     desc: 'Fold & flip'    },
}

export const MAX_COMPARE    = 4
export const PAGE_SIZE      = 24
export const TRENDING_LIMIT = 10

/**
 * Derives a URL slug from a phone record.
 */
export function phoneSlug(phone: { id: number; model_name: string; slug?: string | null }): string {
  if (phone.slug) return phone.slug
  return phone.model_name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Derives a URL slug from a brand name.
 * Applies the same diacritic-safe normalisation as phoneSlug.
 */
export function brandSlug(brand: string): string {
  return brand
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
}
