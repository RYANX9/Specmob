export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://renderphones.onrender.com'

export const ROUTES = {
  home:       '/',
  brand:      (brand: string) => `/brand/${brand}`,
  phone:      (brand: string, model: string) => `/brand/${brand}/${model}`,
  compare:    (...slugs: string[]) => `/compare/${slugs.join('-vs-')}`,
  compareIds: (ids: number[]) => `/compare?ids=${ids.join(',')}`,
  category:   (slug: string) => `/best/${slug}`,
  pick:       '/pick',
  about:      '/about',
} as const

export const SORT_OPTIONS = [
  { value: 'release_ts',       label: 'Newest First',       order: 'desc' },
  { value: 'price_usd',        label: 'Price: Low to High', order: 'asc'  },
  { value: 'price_usd',        label: 'Price: High to Low', order: 'desc' },
  { value: 'antutu_score',     label: 'Best Performance',   order: 'desc' },
  { value: 'battery_capacity', label: 'Best Battery',       order: 'desc' },
  { value: 'main_camera_mp',   label: 'Best Camera',        order: 'desc' },
] as const

export const CATEGORY_META: Record<string, { title: string; icon: string; desc: string }> = {
  'camera-phones':  { title: 'Best Camera',    icon: 'camera',     desc: 'Top 10 ranked'  },
  'battery-life':   { title: 'Battery Kings',  icon: 'battery',    desc: '5000mAh+'       },
  'gaming-phones':  { title: 'Gaming',         icon: 'zap',        desc: 'Flagship chips' },
  'under-300':      { title: 'Under $300',     icon: 'dollar',     desc: 'Best value'     },
  'under-500':      { title: 'Under $500',     icon: 'tag',        desc: 'Sweet spot'     },
  'lightweight':    { title: 'Lightweight',    icon: 'feather',    desc: 'Under 175g'     },
  'compact-phones': { title: 'Compact',        icon: 'smartphone', desc: 'Under 6.3"'     },
  'fast-charging':  { title: 'Fast Charge',    icon: 'bolt',       desc: '65W+'           },
}

export const MAX_COMPARE = 4
export const PAGE_SIZE    = 24
export const TRENDING_LIMIT = 10

export function phoneSlug(phone: { model_name: string; slug?: string | null }) {
  if (phone.slug) return phone.slug
  return phone.model_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function brandSlug(brand: string) {
  return brand.toLowerCase().replace(/\s+/g, '-')
}

export function valueScoreColor(score: number | null | undefined): string {
  if (!score) return 'var(--text-3)'
  if (score >= 8) return 'var(--green)'
  if (score >= 6) return 'var(--text-2)'
  return 'var(--orange)'
}
