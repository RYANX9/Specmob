export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://renderphones.onrender.com'

export const ROUTES = {
  home:     '/',
  brand:    (brand: string) => `/brand/${brand}`,
  phone:    (brand: string, model: string) => `/brand/${brand}/${model}`,
  compare:  (...slugs: string[]) => `/compare/${slugs.join('-vs-')}`,
  category: (slug: string) => `/best/${slug}`,
  pick:     '/pick',
  about:    '/about',
} as const

// Add this to lib/config.ts alongside the existing exports

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
}

export const MAX_COMPARE    = 4
export const PAGE_SIZE      = 24
export const TRENDING_LIMIT = 10

/**
 * Derives a URL slug from a phone record.
 *
 * Priority: server-supplied slug field → computed from model_name.
 * Computed path:
 *   1. NFD-normalise to decompose diacritics (é → e + combining acute)
 *   2. Strip combining marks so "café" → "cafe" not "caf"
 *   3. Lowercase, collapse non-alphanumeric runs to hyphens, trim edge hyphens
 *
 * The backend's sitemap route uses a different algorithm (.replace(" ", "-") only),
 * which is a known mismatch documented in the review. The server-supplied slug
 * field, when present, bypasses this entirely and is always preferred.
 */
export function phoneSlug(phone: { model_name: string; slug?: string | null }): string {
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

/**
 * Colour for the server-computed value_score displayed on phone detail
 * and compare pages. This is a peer-relative score (0–10).
 *
 * Note: pick/page.tsx has its own match-score colour function with
 * different thresholds — that score represents priority match quality,
 * not peer-relative value, so the two are intentionally separate.
 */
export function valueScoreColor(score: number | null | undefined): string {
  if (score == null) return 'var(--text-3)'
  if (score >= 8)    return 'var(--green)'
  if (score >= 6)    return 'var(--text-2)'
  return 'var(--orange)'
}
