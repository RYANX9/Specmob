import { API_BASE } from './config'
import type {
  SearchResponse,
  SearchFilters,
  Phone,
  FilterStats,
  CategoryResult,
  BrandStats,
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

/**
 * Returns an AbortSignal that fires when ANY of the supplied signals abort.
 * Used to combine an external caller signal with the internal timeout signal.
 */
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
//
// These are RequestInit fragments merged into each fetch call.
//
// In Next.js SERVER components, `next: { revalidate }` triggers ISR:
//   - stable:      1 h  — brand lists, filter stats, category metadata
//   - phoneDetail: 24 h — phone specs and pricing
//   - trending:    15 m — trending phone list
//
// In CLIENT components (all the 'use client' pages), `next: { revalidate }`
// is silently ignored by the browser — only `cache: 'no-store'` has any
// effect client-side. The presets are still applied; they just do nothing
// extra in that context, so there is no functional regression.

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
  // Per-request timeout — prevents Render cold-start hangs from blocking
  // the UI indefinitely. The timeout signal is composed with any external
  // signal from the caller (e.g. an unmount AbortController).
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

// ─── public API surface ───────────────────────────────────────────────────────

export const api = {
  phones: {
    // User-driven — always fresh, cancellable via AbortSignal
    search: (filters: SearchFilters, signal?: AbortSignal) =>
      req<SearchResponse>(
        `/phones/search${qs(filters as Record<string, unknown>)}`,
        { ...CACHE.noStore, signal },
      ),

    // 24 h ISR in server components; fresh in client components
    detail: (id: number, signal?: AbortSignal) =>
      req<Phone>(`/phones/${id}`, { ...CACHE.phoneDetail, signal }),

    // Static enough to benefit from ISR
    latest: (limit = 20) =>
      req<{ phones: Phone[] }>(`/phones/latest?limit=${limit}`, CACHE.stable),

    // 15 min ISR — changes frequently enough to warrant short window
    trending: (limit = 10) =>
      req<{ phones: Phone[] }>(`/phones/trending?limit=${limit}`, CACHE.trending),

    similar: (id: number, limit = 12) =>
      req<{ phones: Phone[] }>(`/phones/${id}/similar?limit=${limit}`, CACHE.phoneDetail),

    // User-assembled comparison — always fresh
    compare: (ids: number[]) =>
      req<{ phones: Phone[] }>(`/phones/compare?ids=${ids.join(',')}`, CACHE.noStore),

    compareBySlugs: (slugs: string[]) =>
      req<{ phones: Phone[] }>(
        `/phones/compare?slugs=${slugs.map(encodeURIComponent).join(',')}`,
        CACHE.noStore,
      ),

    // User-driven recommendation — always fresh, cancellable
    recommend: (
      params: { min_price?: number; max_price?: number; priorities: string; limit?: number },
      signal?: AbortSignal,
    ) =>
      req<{ phones: Phone[]; priorities: string[] }>(
        `/phones/recommend${qs(params as Record<string, unknown>)}`,
        { ...CACHE.noStore, signal },
      ),
  },

  brands: {
    // Called on every Navbar mount. 1 h ISR in server components;
    // in client components the browser re-fetches but this is acceptable
    // since the brand list changes at most a few times per year.
    list: () =>
      req<{ brands: { brand: string; count: number }[] }>('/brands', CACHE.stable),

    detail: (slug: string) =>
      req<BrandStats>(`/brands/${slug}`, CACHE.stable),

    // Filtered by user input — always fresh
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

    // 1 h ISR — category rankings recalculate nightly from spec data
    get: (slug: string, limit = 10) =>
      req<CategoryResult>(`/categories/${slug}?limit=${limit}`, CACHE.stable),
  },

  filters: {
    // Price ranges and brand counts rarely change within an hour
    stats: () => req<FilterStats>('/filters/stats', CACHE.stable),
  },
}
