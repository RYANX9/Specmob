export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://renderphones-1.onrender.com'
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.specmob.com').replace(/\/+$/, '')
export const SITE_NAME = 'Specmob'
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@specmob.com'

export { valueScoreColor } from './valueScore'

export const MAX_COMPARE = 4
export const PAGE_SIZE = 24
export const BRAND_PHONES_LIMIT = 12
export const TRENDING_LIMIT = 10

export const PAIR_SEPARATOR = '-vs-'

export const ROUTES = {
  home: '/',
  brands: '/brands',
  best: '/best',
  methodology: '/methodology',
  compare: '/compare',
  pick: '/pick',
  tradein: '/trade-in',
  about: '/about',
  contact: '/contact',
  support: '/support',
  privacy: '/privacy',
  terms: '/terms',
  search: (q?: string) => (q ? `/search?q=${encodeURIComponent(q)}` : '/search'),
  brand: (brandSlug: string) => `/brand/${brandSlug}`,
  phone: (brandSlug: string, slug: string) => `/brand/${brandSlug}/${slug}`,
  category: (slug: string) => `/best/${slug}`,
  comparePair: (...fullSlugs: string[]) =>
    `/compare/${Array.from(new Set(fullSlugs)).sort().join(PAIR_SEPARATOR)}`,
  tradeinFor: (phoneId: number | string) => `/trade-in?phone=${phoneId}`,
} as const

export function formatPrice(price: number | null | undefined): string {
  if (price == null) return 'Price TBA'
  return `$${Math.round(price).toLocaleString('en-US')}`
}

export function parsePairSlug(value: string): string[] {
  return value.split(PAIR_SEPARATOR).map(s => s.trim().toLowerCase()).filter(Boolean)
}
