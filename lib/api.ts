import { API_BASE } from './config'
import type {
  SearchResponse, SearchFilters, Phone, PhoneDetail, PhoneMini, FilterStats,
  BrandListItem, BrandCompact, RelatedResponse, BrandDetail, BrandPhonesResponse, CategoriesResponse, CategoryDetail,
  BestHubResponse, HomeResponse, CompareLandingResponse, ComparePayload, CompareByPairResponse,
  CompareVerdictResponse, RecommendResponse, FullSpecificationsResponse, PriceHistoryResponse,
  OffersBlock, PhoneVariant, SitemapSection, SlugIndexRow, ResolvedSlug,
  TradeInRequest, TradeInResponse, FeedbackRequest, FeedbackResponse,
} from './types'

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
  phoneDetail: { next: { revalidate: 3_600  } } as RequestInit,
  trending:    { next: { revalidate: 900    } } as RequestInit,
  short:       { next: { revalidate: 300    } } as RequestInit,
  compare:     { next: { revalidate: 300    } } as RequestInit,
  offers:      { next: { revalidate: 600    } } as RequestInit,
  slugs:       { next: { revalidate: 86_400 } } as RequestInit,
} as const


const DEFAULT_TIMEOUT_MS = 45_000
const COLD_START_RETRY_DELAY_MS = 3_000

// lib/api.ts
function isRetryableNetworkError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'TimeoutError') return true
  if (err instanceof TypeError && /fetch failed/i.test(err.message)) return true
  return false
}

type ReqInit = Omit<RequestInit, 'signal'> & { signal?: AbortSignal | null; timeoutMs?: number }

async function req<T>(
  path: string,
  init: ReqInit = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal, ...rest } = init
  const method = (rest.method ?? 'GET').toUpperCase()
  const retryable = method === 'GET'

  const attempt = async (): Promise<Response> => {
    const timeoutCtrl = new AbortController()
    const timeoutId = setTimeout(
      () => timeoutCtrl.abort(new DOMException('Request timed out', 'TimeoutError')),
      timeoutMs,
    )
    const signal = externalSignal ? anySignal([externalSignal, timeoutCtrl.signal]) : timeoutCtrl.signal
    try {
      return await fetch(`${API_BASE}${path}`, {
        ...rest,
        signal,
        headers: {
          ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
          ...(typeof window === 'undefined' && process.env.INTERNAL_API_KEY
            ? { 'X-Internal-Key': process.env.INTERNAL_API_KEY }
            : {}),
          ...(rest.headers as Record<string, string> | undefined),
        },
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }

  let res: Response
  try {
    res = await attempt()
  } catch (err) {
    if (retryable && isRetryableNetworkError(err) && !externalSignal?.aborted) {
      await new Promise(r => setTimeout(r, COLD_START_RETRY_DELAY_MS))
      res = await attempt()
    } else {
      throw err
    }
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      msg = body.detail || body.message || msg
    } catch {}
    throw new APIError(res.status, msg)
  }

  return res.json() as Promise<T>
}


function qs(params: Record<string, unknown>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) v.forEach(item => p.append(k, String(item)))
    else p.append(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const api = {
  phones: {
    search: (filters: SearchFilters, signal?: AbortSignal) =>
      req<SearchResponse>(`/phones/search${qs(filters as Record<string, unknown>)}`, { ...CACHE.short, signal }),

    bySlug: (brandSlug: string, slug: string, region?: string, signal?: AbortSignal) =>
      req<PhoneDetail>(
        `/phones/by-slug/${encodeURIComponent(brandSlug)}/${encodeURIComponent(slug)}${qs({ region })}`,
        { ...CACHE.phoneDetail, signal },
      ),

    byId: (id: number, region?: string, signal?: AbortSignal) =>
      req<PhoneDetail>(`/phones/${id}${qs({ region })}`, { ...CACHE.phoneDetail, signal }),

    byIds: (ids: number[], signal?: AbortSignal) =>
      req<{ phones: PhoneMini[] }>(`/phones/by-ids?ids=${ids.join(',')}`, { cache: 'no-store', signal }),

    resolve: (fullSlug: string) =>
      req<ResolvedSlug>(`/phones/resolve/${encodeURIComponent(fullSlug)}`, CACHE.stable),

    slugs: () => req<{ phones: SlugIndexRow[] }>('/phones/slugs', CACHE.slugs),

    fullSpecs: (id: number, signal?: AbortSignal) =>
      req<FullSpecificationsResponse>(`/phones/${id}/full-specs`, { ...CACHE.phoneDetail, signal }),

    variants: (id: number, signal?: AbortSignal) =>
      req<{ phone_id: number; variants: PhoneVariant[] }>(`/phones/${id}/variants`, { ...CACHE.phoneDetail, signal }),

    offers: (id: number, region?: string, signal?: AbortSignal) =>
      req<OffersBlock>(`/phones/${id}/offers${qs({ region })}`, { ...CACHE.offers, signal }),

    related: (id: number, limit = 14, region?: string, signal?: AbortSignal) =>
      req<RelatedResponse>(`/phones/${id}/related${qs({ limit, region })}`, { ...CACHE.phoneDetail, signal }),

    searchIndex: (signal?: AbortSignal) =>
      req<{ phones: { id: number; n: string; b: string; p: string; u: number | null; i: string | null }[] }>('/phones/search-index', { ...CACHE.stable, signal }),

    similar: (id: number, limit = 12, region?: string, signal?: AbortSignal) =>
      req<{ phones: Phone[] }>(`/phones/${id}/similar${qs({ limit, region })}`, { ...CACHE.phoneDetail, signal }),

    priceHistory: (id: number, signal?: AbortSignal) =>
      req<PriceHistoryResponse>(`/phones/${id}/price-history`, { ...CACHE.phoneDetail, signal }),

    latest: (limit = 20) => req<{ phones: Phone[] }>(`/phones/latest?limit=${limit}`, CACHE.stable),
    upcoming: (limit = 20) => req<{ phones: Phone[] }>(`/phones/upcoming?limit=${limit}`, CACHE.stable),
    trending: (limit = 10, region?: string) =>
      req<{ phones: Phone[] }>(`/phones/trending${qs({ limit, region })}`, CACHE.trending),
    topRated: (limit = 10, region?: string) =>
      req<{ phones: Phone[] }>(`/phones/top-rated${qs({ limit, region })}`, CACHE.stable),

    compare: (ids: number[], region?: string, signal?: AbortSignal) =>
      req<ComparePayload>(`/phones/compare${qs({ ids: ids.join(','), region })}`, { ...CACHE.compare, signal }),

    compareVerdict: (ids: number[], signal?: AbortSignal) =>
      req<CompareVerdictResponse>(`/phones/compare/verdict?ids=${ids.join(',')}`, { signal, timeoutMs: 30_000 }),

    recommend: (
      params: { priorities?: string; tier?: 's' | 'a' | 'b' | 'c' | 'd'; budget?: number; min_price?: number; max_price?: number; limit?: number; region?: string },
      signal?: AbortSignal,
    ) => req<RecommendResponse>(`/phones/recommend${qs(params as Record<string, unknown>)}`, { ...CACHE.short, signal }),
    
  },

  compare: {
    pair: (pair: string, region?: string, signal?: AbortSignal) =>
      req<CompareByPairResponse>(`/compare/pair/${encodeURIComponent(pair)}${qs({ region })}`, { ...CACHE.compare, signal }),
  },

  brands: {
    compact: () => req<{ brands: BrandCompact[] }>('/brands?compact=true', CACHE.stable),
    list: async (opts: { featured?: number; perBrand?: number } = {}) => {
      const res = await req<{ brands: BrandListItem[] }>(
        `/brands${qs({ featured: opts.featured, per_brand: opts.perBrand })}`,
        CACHE.stable,
      )
      const bySlug = new Map<string, BrandListItem>()
      for (const b of res.brands) {
        const prev = bySlug.get(b.brand_slug)
        if (!prev) { bySlug.set(b.brand_slug, { ...b }); continue }
        const mins = [prev.min_price, b.min_price].filter((n): n is number => n != null)
        const maxs = [prev.max_price, b.max_price].filter((n): n is number => n != null)
        bySlug.set(b.brand_slug, {
          ...prev,
          phone_count: prev.phone_count + b.phone_count,
          min_price: mins.length ? Math.min(...mins) : null,
          max_price: maxs.length ? Math.max(...maxs) : null,
          latest_year: Math.max(prev.latest_year ?? 0, b.latest_year ?? 0) || null,
          top_phone: prev.top_phone ?? b.top_phone,
          phones: prev.phones ?? b.phones,
        })
      }
      return { brands: [...bySlug.values()].sort((x, y) => y.phone_count - x.phone_count) }
    },
    detail: (slug: string) => req<BrandDetail>(`/brands/${encodeURIComponent(slug)}`, CACHE.stable),
    phones: (
      slug: string,
      params: SearchFilters & { sort_by?: string; sort_order?: string; page?: number; page_size?: number; tier?: string } = {},
      signal?: AbortSignal,
    ) =>
      req<BrandPhonesResponse>(
        `/brands/${encodeURIComponent(slug)}/phones${qs(params as Record<string, unknown>)}`,
        { ...CACHE.short, signal },
      ),
  },

  categories: {
    list: () => req<CategoriesResponse>('/categories', CACHE.stable),
    get: (slug: string, opts: { limit?: number; brand_cap?: number; region?: string } = {}) =>
      req<CategoryDetail>(`/categories/${encodeURIComponent(slug)}${qs(opts)}`, CACHE.stable),
  },

  discover: {
    home: (region?: string) => req<HomeResponse>(`/discover/home${qs({ region })}`, CACHE.trending),
    bestHub: (region?: string) => req<BestHubResponse>(`/discover/best-hub${qs({ region })}`, CACHE.stable),
    compareLanding: () => req<CompareLandingResponse>('/discover/compare-landing', CACHE.trending),
  },

  seo: {
    sitemap: (section: SitemapSection['section'], page = 1, pageSize = 5000) =>
      req<SitemapSection>(`/seo/sitemap${qs({ section, page, page_size: pageSize })}`, CACHE.slugs),
  },

  filters: {
    stats: () => req<FilterStats>('/filters/stats', CACHE.stable),
  },

  tradein: {
    estimate: (payload: TradeInRequest, signal?: AbortSignal) =>
      req<TradeInResponse>('/tradein/estimate', { method: 'POST', body: JSON.stringify(payload), cache: 'no-store', signal }),
  },

  feedback: {
    submit: (payload: FeedbackRequest, signal?: AbortSignal) =>
      req<FeedbackResponse>('/feedback', { method: 'POST', body: JSON.stringify(payload), cache: 'no-store', signal }),
  },
}

export async function getPhoneBySlug(brandSlug: string, slug: string, region?: string): Promise<PhoneDetail | null> {
  try {
    return await api.phones.bySlug(brandSlug, slug, region)
  } catch (err) {
    if (err instanceof APIError && err.isNotFound) return null
    throw err
  }
}

export async function getBrand(slug: string): Promise<BrandDetail | null> {
  try {
    return await api.brands.detail(slug)
  } catch (err) {
    if (err instanceof APIError && err.isNotFound) return null
    throw err
  }
}

export async function getCategory(slug: string, opts: { limit?: number; region?: string } = {}): Promise<CategoryDetail | null> {
  try {
    return await api.categories.get(slug, opts)
  } catch (err) {
    if (err instanceof APIError && err.isNotFound) return null
    throw err
  }
}

export async function getComparePair(pair: string, region?: string): Promise<CompareByPairResponse | null> {
  try {
    return await api.compare.pair(pair, region)
  } catch (err) {
    if (err instanceof APIError && err.isNotFound) return null
    throw err
  }
}
