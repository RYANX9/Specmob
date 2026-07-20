export type ChipsetTier = string | { id: string; label: string } | null

export interface FullSpecifications {
  [groupName: string]: Record<string, unknown>
}

export interface Phone {
  id: number
  slug: string | null
  model_name: string
  brand: string
  price_usd: number | null
  price_original?: number | null
  currency?: string | null
  availability_status?: string | null
  main_image_url: string | null

  screen_size: number | null
  screen_resolution: string | null
  display_type?: string | null
  refresh_rate_hz?: number | null
  peak_brightness_nits?: number | null
  measured_brightness_nits?: number | null

  battery_capacity: number | null
  battery_material?: string | null
  fast_charging_w: number | null
  has_wireless_charging?: boolean | null
  wireless_charging_w?: number | null
  has_reverse_wireless?: boolean | null

  ram_options: number[] | null
  storage_options: number[] | null

  main_camera_mp: number | null
  camera_setup_type?: string | null
  optical_zoom?: string | null
  has_ois?: boolean | null
  camera_summary?: string | null

  chipset: string | null
  antutu_score: number | null
  geekbench_single?: number | null
  geekbench_multi?: number | null
  gpu_score?: number | null
  is_premium_gaming?: boolean | null

  water_resistance?: string | null
  build_material?: string | null
  design_form?: string | null
  is_foldable?: boolean | null

  sim_layout?: string | null
  network_generation?: string | null
  has_nfc?: boolean | null
  has_headphone_jack?: boolean | null

  amazon_link: string | null
  release_year: number | null
  release_month: number | null
  release_day: number | null
  release_date_full: string | null
  release_ts: number | null

  weight_g: number | null
  thickness_mm: number | null
  full_specifications: FullSpecifications | null
  features: string[] | null

  value_score?: number | null
  chipset_tier?: ChipsetTier
  popularity?: number | null
  smart_score?: SmartScore | null
  price_updated_at?: string | null
  price_scope?: string | null

  variants?: PhoneVariant[]
  images?: { id: number; image_url: string; sort_order: number }[]

  match_line?: string | null
  tradeoff_line?: string | null
  in_requested_budget?: boolean | null
  match_score?: number | null
}

export interface PhoneVariant {
  id: number
  ram_gb: number
  storage_gb: number
  price_usd: number | null

}

export interface PhoneImage {
  id: number
  image_url: string
  sort_order: number
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
  brands?: string          // comma-separated, for multi-brand selection
  min_price?: number
  max_price?: number
  min_ram?: number
  min_storage?: number
  min_battery?: number
  min_camera_mp?: number
  min_screen_size?: number
  max_screen_size?: number
  min_year?: number
  max_weight?: number
  min_charging_w?: number
  min_refresh_rate?: number
  min_antutu?: number
  chipset_tier?: string
  has_nfc?: boolean
  has_ois?: boolean
  has_wireless_charging?: boolean
  has_headphone_jack?: boolean
  is_foldable?: boolean
  is_premium_gaming?: boolean
  water_resistant?: boolean
  camera_setup_type?: string
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
