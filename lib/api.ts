import { API_BASE } from './config'
import type {
  SearchResponse,
  SearchFilters,
  Phone,
  FilterStats,
  CategoryResult,
  BrandStats,
  CompareVerdict,
  PhoneVariant,
  RecommendResponse,
  FullSpecifications,
  TradeInRequest, 
  TradeInResponse,
  FeedbackRequest,
  FeedbackResponse,
} from './types'
import type { RetailerOffersResponse } from './retailer'

export class APIError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'APIError'
  }

  get isNotFound()    { return this.status === 404 }
  get isServerError() { return this.status >= 500 }
  get isRateLimit()   { return this.status === 429 }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const ctrl = new AbortController()
  for (const sig of signals) {
    if (sig.aborted) {
      ctrl.abort(sig.reason)
      break
    }
    sig.addEventListener('abort', () => ctrl.abort(sig.reason), { once: true })
  }
  return ctrl.signal
}

const CACHE = {
  noStore:     { cache: 'no-store' } as RequestInit,
  stable:      { next: { revalidate: 3_600  } } as RequestInit,
  phoneDetail: { next: { revalidate: 86_400 } } as RequestInit,
  trending:    { next: { revalidate: 900    } } as RequestInit,
} as const

const DEFAULT_TIMEOUT_MS = 12_000

async function req<T>(
  path: string,
  init: RequestInit & { signal?: AbortSignal } = {},
): Promise<T> {
  const timeoutCtrl = new AbortController()
  const timeoutId   = setTimeout(
    () => timeoutCtrl.abort(new DOMException('Request timed out', 'TimeoutError')),
    DEFAULT_TIMEOUT_MS,
  )

  const signal = init.signal
    ? anySignal([init.signal, timeoutCtrl.signal])
    : timeoutCtrl.signal

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      let msg = `HTTP ${res.status}`
      try {
        const body = await res.json()
        msg = body.detail || body.message || msg
      } catch { /* body may not be JSON */ }
      throw new APIError(res.status, msg)
    }

    return res.json() as Promise<T>
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}


export async function getPhone(idOrSlug: string): Promise<Phone | null> {
  try {
    return await api.phones.detail(idOrSlug)
  } catch {
    return null
  }
}

// ── Compare-route slug resolution ────────────────────────────────────────
// Moved from app/compare/[phones]/page.tsx so opengraph-image.tsx (edge
// runtime) can reuse the same logic without importing the page module.

export function parseCompareSlug(slug: string): string[] {
  return slug.split('-vs-').filter(Boolean)
}

function toSlugForCompare(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Handles brand-prefixed DB slugs (e.g. "samsung-galaxy-s24-ultra") matching
// against shorter model_name-derived candidates ("galaxy-s24-ultra").
function compareSimilarity(target: string, candidate: string): number {
  if (target === candidate) return candidate.length

  if (target.endsWith(candidate)) {
    return candidate.length - Math.abs(target.length - candidate.length) * 0.1
  }

  if (target.includes(candidate)) {
    return candidate.length * 0.85
  }

  let score = 0
  let ti = 0
  for (let ci = 0; ci < candidate.length && ti < target.length; ci++) {
    if (candidate[ci] === target[ti]) { score++; ti++ }
  }
  return score - Math.abs(candidate.length - target.length) * 0.5
}

async function searchCompareCandidates(slug: string): Promise<Phone[]> {
  try {
    const res = await api.phones.search({ q: slug.replace(/-/g, ' '), page_size: 10 })
    return res.results
  } catch {
    return []
  }
}

async function resolvePhoneIds(slugParts: string[]): Promise<number[]> {
  const candidateLists = await Promise.all(slugParts.map(searchCompareCandidates))
  const claimed = new Set<number>()
  const resolved: (Phone | null)[] = new Array(slugParts.length).fill(null)

  // Pass 1: exact match against computed slug OR the DB slug field
  slugParts.forEach((slug, i) => {
    const target = slug.toLowerCase()
    const exact = candidateLists[i].find(p => {
      if (claimed.has(p.id)) return false
      if (toSlugForCompare(p.model_name) === target) return true
      if (p.slug != null && p.slug.toLowerCase() === target) return true
      return false
    })
    if (exact) { resolved[i] = exact; claimed.add(exact.id) }
  })

  // Pass 2: fuzzy matching for any unresolved slugs
  slugParts.forEach((slug, i) => {
    if (resolved[i]) return
    const target = slug.toLowerCase()
    let best: Phone | null = null
    let bestScore = -Infinity
    for (const p of candidateLists[i]) {
      if (claimed.has(p.id)) continue
      const s = compareSimilarity(target, toSlugForCompare(p.model_name))
      if (s > bestScore) { bestScore = s; best = p }
    }
    if (best && bestScore > target.length * 0.3) {
      resolved[i] = best
      claimed.add(best.id)
    }
  })

  return resolved.filter((p): p is Phone => p !== null).map(p => p.id)
}

export async function resolveComparePhones(
  slugParts: string[],
): Promise<{ phones: Phone[]; verdict: CompareVerdict | null }> {
  const ids = await resolvePhoneIds(slugParts)
  if (ids.length === 0) return { phones: [], verdict: null }

  try {
    const { phones, verdict } = await api.phones.compare(ids)
    const byId = new Map(phones.map(p => [p.id, p]))
    const ordered = ids.map(id => byId.get(id)).filter((p): p is Phone => Boolean(p))
    return { phones: ordered, verdict: verdict ?? null }
  } catch {
    return { phones: [], verdict: null }
  }
}

function qs(params: Record<string, unknown>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) {
      v.forEach(item => p.append(k, String(item)))
    } else {
      p.append(k, String(v))
    }
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

// Matches routes/phones.py GET /phones/{id}/price-history exactly.
export interface PriceHistoryPoint {
  snapshot_date: string
  condition: string | null
  min_price_usd: number | null
  max_price_usd: number | null
  avg_price_usd: number | null
  listing_count: number | null
}

export interface PricePointRow {
  snapshot_date: string
  scope: string
  price_usd: number | null
}

export interface PriceHistoryApiResponse {
  phone_id: number
  points: PriceHistoryPoint[]
  price_points: PricePointRow[]
}

export const api = {
  phones: {
    search: (filters: SearchFilters, signal?: AbortSignal) =>
      req<SearchResponse>(
        `/phones/search${qs(filters as Record<string, unknown>)}`,
        { ...CACHE.noStore, signal },
      ),

    // Backend accepts numeric id or slug on GET /phones/{phone_id}.
    // Response never includes full_specifications — use fullSpecs() below.
    detail: (idOrSlug: number | string, signal?: AbortSignal) =>
      req<Phone>(`/phones/${idOrSlug}`, { ...CACHE.phoneDetail, signal }),

    fullSpecs: (id: number, signal?: AbortSignal) =>
      req<{ phone_id: number; full_specifications: FullSpecifications | null }>(
        `/phones/${id}/full-specs`,
        { ...CACHE.phoneDetail, signal },
      ),

    latest: (limit = 20) =>
      req<{ phones: Phone[] }>(`/phones/latest?limit=${limit}`, CACHE.stable),

    trending: (limit = 10) =>
      req<{ phones: Phone[] }>(`/phones/trending?limit=${limit}`, CACHE.trending),

    similar: (id: number, limit = 12) =>
      req<{ phones: Phone[] }>(`/phones/${id}/similar?limit=${limit}`, CACHE.phoneDetail),

    compare: (ids: number[]) =>
      req<{ phones: Phone[]; verdict: CompareVerdict | null }>(
        `/phones/compare?ids=${ids.join(',')}`,
        CACHE.noStore,
      ),

    compareBySlugs: (slugs: string[]) =>
      req<{ phones: Phone[]; verdict: CompareVerdict | null }>(
        `/phones/compare?slugs=${slugs.map(encodeURIComponent).join(',')}`,
        CACHE.noStore,
      ),

    recommend: (
      params: { min_price?: number; max_price?: number; priorities: string; limit?: number },
      signal?: AbortSignal,
    ) =>
      req<RecommendResponse>(
        `/phones/recommend${qs(params as Record<string, unknown>)}`,
        { ...CACHE.noStore, signal },
      ),

    priceHistory: (
      id: number,
      opts: { condition?: 'new' | 'used' | 'all'; scope?: 'global' | 'local' | 'all' } = {},
      signal?: AbortSignal,
    ) =>
      req<PriceHistoryApiResponse>(
        `/phones/${id}/price-history${qs(opts as Record<string, unknown>)}`,
        { ...CACHE.phoneDetail, signal },
      ),

    variants: (id: number, signal?: AbortSignal) =>
      req<{ phone_id: number; variants: PhoneVariant[] }>(`/phones/${id}/variants`, { ...CACHE.phoneDetail, signal }),

    offers: (id: number, region?: string, signal?: AbortSignal) =>
      req<RetailerOffersResponse>(`/phones/${id}/offers${qs({ region })}`, { cache: 'no-store', signal }),
  },

  brands: {
    list: () =>
      req<{ brands: { brand: string; count: number }[] }>('/brands', CACHE.stable),

    detail: (slug: string) =>
      req<BrandStats>(`/brands/${slug}`, CACHE.stable),

    phones: (
      slug: string,
      params: {
        sort_by?: string
        sort_order?: string
        page?: number
        page_size?: number
      } = {},
    ) =>
      req<SearchResponse>(
        `/brands/${slug}/phones${qs(params as Record<string, unknown>)}`,
        CACHE.noStore,
      ),
  },

  tradein: {
    estimate: (payload: TradeInRequest, signal?: AbortSignal) =>
      req<TradeInResponse>('/tradein/estimate', {
        method: 'POST',
        body: JSON.stringify(payload),
        cache: 'no-store',
        signal,
      }),
  },
  
  categories: {
    list: () =>
      req<{ categories: { slug: string; title: string; description: string }[] }>(
        '/categories',
        CACHE.stable,
      ),

    get: (slug: string, limit = 10) =>
      req<CategoryResult>(`/categories/${slug}?limit=${limit}`, CACHE.stable),
  },

  filters: {
    stats: () => req<FilterStats>('/filters/stats', CACHE.stable),
  },
  feedback: {
    submit: (payload: FeedbackRequest, signal?: AbortSignal) =>
      req<FeedbackResponse>('/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
        cache: 'no-store',
        signal,
      }),
  },
}
