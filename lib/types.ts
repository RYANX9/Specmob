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
  chipset_tier?: 'flagship' | 'mid' | 'entry' | 'unknown'
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
  phones: (Phone & { category_score: number })[]
}

export interface BrandStats {
  brand: string
  total_phones: number
  price_range: { min: number | null; max: number | null; avg: number | null }
  avg_battery: number | null
  latest_year: number | null
  latest_phone: Phone | null
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
