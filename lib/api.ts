import { API_BASE } from './config'
import type {
  SearchResponse,
  SearchFilters,
  Phone,
  FilterStats,
  CategoryResult,
  BrandStats,
  CompareVerdict,
  RecommendResponse,
} from './types'

// ─── error class ─────────────────────────────────────────────────────────────

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

// ─── signal helpers ───────────────────────────────────────────────────────────

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

// ─── cache presets ────────────────────────────────────────────────────────────

const CACHE = {
  noStore:     { cache: 'no-store' } as RequestInit,
  stable:      { next: { revalidate: 3_600  } } as RequestInit,
  phoneDetail: { next: { revalidate: 86_400 } } as RequestInit,
  trending:    { next: { revalidate: 900    } } as RequestInit,
} as const

// ─── core fetch wrapper ───────────────────────────────────────────────────────

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

// ─── query-string builder ─────────────────────────────────────────────────────

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

// ─── price history types ───────────────────────────────────────────────────────
// Matches routes/phones.py GET /phones/{id}/price-history exactly.
// NOT the same shape as the PriceHistoryResponse in lib/types.ts (that one
// assumes a `current_price_usd` + `history` shape the backend doesn't send).

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

// ─── public API surface ───────────────────────────────────────────────────────

export const api = {
  phones: {
    search: (filters: SearchFilters, signal?: AbortSignal) =>
      req<SearchResponse>(
        `/phones/search${qs(filters as Record<string, unknown>)}`,
        { ...CACHE.noStore, signal },
      ),

    detail: (id: number, signal?: AbortSignal) =>
      req<Phone>(`/phones/${id}`, { ...CACHE.phoneDetail, signal }),

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
}
