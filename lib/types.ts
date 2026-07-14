export interface Phone {
  id: number
  slug: string | null
  model_name: string
  brand: string
  price_usd: number | null
  main_image_url: string | null
  screen_size: number | null
  battery_capacity: number | null
  ram_options: number[] | null
  storage_options: number[] | null
  main_camera_mp: number | null
  chipset: string | null
  antutu_score: number | null
  amazon_link: string | null
  release_year: number | null
  release_month: number | null
  release_day: number | null
  release_date_full: string | null
  // Unix timestamp computed server-side: EXTRACT(EPOCH FROM MAKE_DATE(year, month, day))
  release_ts: number | null
  // Detail-only (null on list endpoints)
  weight_g: number | null
  thickness_mm: number | null
  screen_resolution: string | null
  fast_charging_w: number | null
  full_specifications: FullSpecifications | null
  features: string[] | null
  value_score?: number | null
  chipset_tier?: string | null
  popularity?: number | null
  smart_score?: SmartScore | null
  price_updated_at?: string | null
  price_scope?: string | null
  // Per-request personalized copy from /phones/recommend, generated from
  // the shopper's actual budget + priorities. Present only when that call
  // succeeded — always treat as optional.
  match_line?: string | null
  tradeoff_line?: string | null
  // Only present on /phones/recommend results. False means this phone fell
  // outside the shopper's requested price range and was included only
  // because a hard filter (e.g. foldable) needed the budget widened to
  // find enough matches.
  in_requested_budget?: boolean | null
  match_score?: number | null
}

export interface SmartScore {
  overall_score: number | null
  camera_score: number | null
  performance_score: number | null
  battery_score: number | null
  display_score: number | null
  build_score: number | null
  value_score: number | null
  strengths: string[] | null
  weaknesses: string[] | null
  reasoning: string | null
  tier: string | null
  model_version: string | null
  scored_at: string | null
}

export interface PricePoint {
  snapshot_date: string
  scope: string
  price_usd: number | null
  price_original?: number | null
  fx_rate_used?: number | null
}

export interface PriceHistoryResponse {
  phone_id: number
  current_price_usd: number | null
  count: number
  history: PricePoint[]
}

export interface FullSpecifications {
  specifications: Record<string, Record<string, string>>
  quick_specs: QuickSpecs
}

export interface QuickSpecs {
  displaytype?: string
  internalmemory?: string
  cam1modules?: string
  cam2modules?: string
  wlan?: string
  models?: string
  featuresother?: string
}

export interface SearchResponse {
  total: number
  page: number
  page_size: number
  results: Phone[]
}

export interface SearchFilters {
  q?: string
  brand?: string
  min_price?: number
  max_price?: number
  min_ram?: number
  min_battery?: number
  min_camera_mp?: number
  min_screen_size?: number
  max_screen_size?: number
  min_year?: number
  max_weight?: number
  min_charging_w?: number
  chipset_tier?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export interface FilterStats {
  total_phones: number
  total_brands: number
  price_range: { min: number; max: number }
  battery_range: { min: number; max: number }
  screen_range: { min: number; max: number }
  weight_range: { min: number; max: number }
  charging_range: { min: number; max: number }
  year_range: { min: number; max: number }
  brands: { brand: string; count: number }[]
  ram_options: number[]
  release_years: number[]
}

export interface CategoryResult {
  slug: string
  title: string
  description: string
  phones: (Phone & { category_score: number; smart_tier?: string | null; smart_overall_score?: number | null })[]
}

export interface BrandStats {
  brand: string
  total_phones: number
  price_range: { min: number | null; max: number | null; avg: number | null }
  avg_battery: number | null
  latest_year: number | null
  latest_phone: Phone | null
}

// One holistic verdict plus one labeled pick per compared phone, generated
// fresh for the exact set of phones in the request. Present only when the
// backend's Gemini call succeeded — always guard with `?.` at call sites.
export interface CompareVerdict {
  verdict: string
  picks: { id: number; for_label: string; reason: string }[]
}

// Response shape for GET /phones/recommend. Carries the budget-widening and
// hard-filter transparency fields the pick flow needs to explain itself
// instead of silently backfilling non-matching phones.
export interface RecommendResponse {
  phones: Phone[]
  priorities: string[]
  hard_filters: string[]
  requested_price_range: { min: number | null; max: number | null }
  effective_price_range: { min: number | null; max: number | null }
  budget_widened: boolean
  insufficient_matches: boolean
}

export type SortOption =
  | 'release_ts'
  | 'release_year'
  | 'price_usd'
  | 'battery_capacity'
  | 'main_camera_mp'
  | 'antutu_score'
  | 'weight_g'

export type CategorySlug =
  | 'camera-phones'
  | 'battery-life'
  | 'under-300'
  | 'under-500'
  | 'gaming-phones'
  | 'lightweight'
  | 'compact-phones'
  | 'fast-charging'
