export type TierId = 'budget' | 'mid_range' | 'upper_mid_range' | 'flagship' | 'ultra_flagship'
export type PriceBasis = 'offer' | 'placeholder' | 'catalog'
export type UpcomingStage = 'launching_soon' | 'announced' | 'rumored'


export interface LocalPrice {
  currency: string
  amount: number
  rate: number
}

export interface NextStep {
  slot: string
  kind: 'compare' | 'category' | 'phone' | 'pick' | 'tradein' | 'brand' | 'hub' | string
  label: string
  href: string
  phone?: PhoneMini
}

export interface PhoneMini {
  id: number
  brand: string
  brand_slug: string
  name: string
  slug: string
  full_slug: string
  display_name: string
  main_image_url: string | null
  price_usd: number | null
  price_basis: PriceBasis | null
  price_region: string | null
  price_local?: LocalPrice | null
  tier: TierId | null
  tier_label?: string | null
  overall_score: number | null
  path: string
  over_budget?: boolean | null
  stage?: UpcomingStage | null
  release_date_full?: string | null
}

export interface Phone extends PhoneMini {
  status?: string | null
  release_year: number | null
  release_ts: number | null
  views_7d?: number | null

  camera_score: number | null
  performance_score: number | null
  battery_score: number | null
  display_score: number | null
  build_score: number | null
  value_score: number | null
  durability_score?: number | null

  battery_capacity: number | null
  chipset: string | null
  screen_size: number | null
  weight_g: number | null
  fast_charging_w: number | null
  antutu_score: number | null
  main_camera_mp: number | null
  ram_max_gb: number | null
  ram_options?: number[] | null
  refresh_rate_hz: number | null

  has_nfc?: boolean | null
  has_ois?: boolean | null
  has_telephoto?: boolean | null
  has_wireless_charging?: boolean | null
  is_foldable?: boolean | null
  is_water_resistant?: boolean | null
  has_headphone_jack?: boolean | null
  is_premium_gaming?: boolean | null
  water_resistance?: string | null

  best_for?: string[]

  match_line?: string | null
  tradeoff_line?: string | null
  reason?: string | null
  summary?: string | null
  in_requested_budget?: boolean | null
  match_score?: number | null
  over_budget?: boolean | null
  stage?: UpcomingStage | null
  release_date_full?: string | null
}

export interface PhoneVariant {
  id: number
  ram_gb: number | null
  storage_gb: number | null
  is_default: boolean
  price_usd: number | null
  url: string | null
  retailer_key: string | null
  region: string | null
  is_placeholder: boolean | null
  offer_count: number
  local?: LocalPrice | null
}

export interface PhoneOffer {
  id: number
  variant_id: number
  ram_gb: number | null
  storage_gb: number | null
  retailer_key: string
  retailer_name: string
  domain: string | null
  scope: string
  region: string | null
  usd: number | null
  url: string | null
  is_available: boolean
  status: string | null
  is_placeholder: boolean
  price_source: string | null
  updated_at: string | null
  checked_at: string | null
  local?: LocalPrice | null
}

export interface OffersBlock {
  offers: PhoneOffer[]
  regions_available: string[]
  is_region_exclusive: boolean
}

export interface PhoneImage {
  id: number
  url: string
  kind: string | null
  alt: string | null
  width: number | null
  height: number | null
  sort_order: number
}

export interface PhoneAnalysis {
  reasoning: string | null
  strengths: string[]
  weaknesses: string[]
  model_version: string | null
  scored_at: string | null
}

export interface PhoneCategoryRank {
  slug: string
  rank: number
  score: number
  title: string
  path: string
}

export interface PhoneInsights {
  best_for: string[]
  not_for_if: string | null
  tags: string[]
  summary: string | null
}

export interface AggregateOfferSeo {
  '@type': 'AggregateOffer'
  priceCurrency: 'USD'
  lowPrice: number
  highPrice: number
  offerCount: number
}

export interface PhoneSeo {
  indexable: boolean
  aggregate_offer: AggregateOfferSeo | null
  allow_rating_markup: false
}

export interface ComparePair {
  pair_slug?: string
  path: string
  phones: PhoneMini[]
  sessions_30d?: number | null
  source?: 'popular' | 'curated' | 'same_tier' | 'rival' | string
}

export interface PhoneDetail extends Phone {
  release_month: number | null
  release_day: number | null
  release_date_full: string | null
  price_updated_at: string | null
  catalog_price_usd: number | null
  price_retailer: string | null
  price_url: string | null
  scored_at: string | null
  created_at: string | null
  updated_at: string | null

  thickness_mm: number | null
  screen_resolution: string | null
  display_type: string | null
  peak_brightness_nits: number | null
  measured_brightness_nits: number | null
  battery_material: string | null
  wireless_charging_w: number | null
  has_reverse_wireless: boolean | null
  antutu_version: string | null
  geekbench_single: number | null
  geekbench_multi: number | null
  gpu_score: number | null
  storage_options: number[] | null
  storage_max_gb: number | null
  build_material: string | null
  design_form: string | null
  sim_layout: string | null
  network_generation: string | null
  main_sensor_format: string | null
  main_sensor_area_mm2: number | null
  main_aperture: string | null
  optical_zoom_x: number | null
  has_optical_zoom: boolean | null
  telephoto_mp: number | null
  is_periscope: boolean | null
  has_ultrawide: boolean | null
  ultrawide_mp: number | null
  video_max_4k_fps: number | null
  has_8k: boolean | null
  has_dolby_vision: boolean | null
  has_log_video: boolean | null
  selfie_mp: number | null
  camera_setup_type: string | null
  camera_summary: string | null
  video_resolution: string | null
  views_7d?: number | null
  compares_30d?: number | null

  variants: PhoneVariant[]
  offers: OffersBlock
  images: PhoneImage[]
  features: string[]
  price_history_points: number
  analysis?: PhoneAnalysis | null
  categories: PhoneCategoryRank[]
  brand_path: string
  insights: PhoneInsights
  seo: PhoneSeo
}

export interface RelatedResponse {
  similar: Phone[]
  compare_with: ComparePair[]
  next_steps: NextStep[]
}

export interface BuyOfferInfo {
  url: string
  retailer: string
}

export interface FullSpecificationsResponse {
  phone_id: number
  full_specifications: {
    specifications?: Record<string, Record<string, string>>
    quick_specs?: Record<string, string>
    [key: string]: unknown
  } | null
}

export interface PriceHistoryResponse {
  phone_id: number
  series: {
    variant_id: number
    ram_gb: number | null
    storage_gb: number | null
    points: { date: string; usd: number }[]
  }[]
  lowest: { date: string; usd: number }[]
}

export interface SearchResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: Phone[]
  has_more?: boolean
  empty?: {
    closest: PhoneMini[]
    categories: { slug: string; title: string; path: string }[]
  }
}

export interface BrandPhonesResponse {
  brand_slug: string
  total: number
  page: number
  page_size: number
  total_pages: number
  results: Phone[]
}

export interface SearchFilters {
  q?: string
  brand?: string
  brands?: string
  min_price?: number
  max_price?: number
  min_ram?: number
  min_storage?: number
  min_battery?: number
  min_camera_mp?: number
  min_screen_size?: number
  max_screen_size?: number
  min_year?: number
  max_year?: number
  max_weight?: number
  min_charging_w?: number
  min_refresh_rate?: number
  min_antutu?: number
  tier?: string
  has_nfc?: boolean
  has_ois?: boolean
  has_wireless_charging?: boolean
  has_headphone_jack?: boolean
  is_foldable?: boolean
  is_premium_gaming?: boolean
  water_resistant?: boolean
  camera_setup_type?: string
  features?: string
  include_upcoming?: boolean
  region?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export interface FilterStats {
  total_phones: number
  total_brands: number
  min_price: number | null
  max_price: number | null
  min_year: number | null
  max_year: number | null
  max_battery: number | null
  max_ram: number | null
  max_storage: number | null
  max_charging_w: number | null
  max_refresh_rate: number | null
  max_camera_mp: number | null
  min_screen: number | null
  max_screen: number | null
  min_weight: number | null
  max_weight: number | null
  tiers: TierId[]
}

export interface BrandListItem {
  brand: string
  brand_slug: string
  phone_count: number
  min_price: number | null
  max_price: number | null
  avg_price: number | null
  avg_battery: number | null
  latest_year: number | null
  updated_at: string | null
  path: string
  top_phone: PhoneMini | null
  upcoming: Phone[]
  phones?: PhoneMini[]
}

export interface BrandCompact {
  brand: string
  brand_slug: string
  path: string
  phone_count: number
}

export interface BrandDetail {
  brand: string
  brand_slug: string
  path: string
  total_phones: number
  price_range: { min: number | null; max: number | null; avg: number | null }
  avg_battery: number | null
  latest_year: number | null
  updated_at: string | null
  latest_phone: Phone | null
  top_phones: Phone[]
  categories: { slug: string; ranked: number; best_rank: number; title: string; path: string }[]
  similar_brands: { brand: string; brand_slug: string; path: string; phone_count: number }[]
  next_steps: NextStep[]
  indexable: boolean
  upcoming: Phone[]
  phones: Phone[]
  phones_total: number
}

export interface CategoryListItem {
  slug: string
  title: string
  description: string
  path: string
  ranked_count: number
  indexable: boolean
}

export interface CategoryGroupDef {
  id: string
  title: string
  slugs: string[]
}

export interface CategoriesResponse {
  categories: CategoryListItem[]
  groups: CategoryGroupDef[]
}

export interface CategoryPhone extends Phone {
  category_score: number
  category_rank: number
  position: number
  breakdown?: Record<string, unknown> | null
}

export interface CategoryDetail {
  slug: string
  title: string
  description: string
  path: string
  ranked_count: number
  shown: number
  indexable: boolean
  crowded: boolean
  phones: CategoryPhone[]
  next_steps: NextStep[]
  alias_of: string | null
  buy: Record<string, BuyOfferInfo>
  top_weakness: string | null
}

export interface BestHubTile {
  slug: string
  title: string
  path: string
  ranked_count: number
  indexable: boolean
  top_phone: CategoryPhone | null
}

export interface BestHubResponse {
  groups: { id: string; title: string; categories: BestHubTile[] }[]
  next_steps: NextStep[]
}

export interface HomeBrandItem {
  brand: string
  brand_slug: string
  path: string
  phone_count: number
}

export type HomeBlock =
  | { id: 'chooser'; slot: string; items: NextStep[] }
  | { id: 'top_rated'; slot: string; items: Phone[] }
  | { id: 'most_compared'; slot: string; items: ComparePair[] }
  | { id: 'categories'; slot: string; items: BestHubTile[] }
  | { id: 'new_releases'; slot: string; items: Phone[] }
  | { id: 'brands'; slot: string; items: HomeBrandItem[] }
  | { id: 'upcoming'; slot: string; items: Phone[] }
  | { id: 'most_viewed'; slot: string; items: Phone[] }
  | { id: 'coming_soon'; slot: string; items: Phone[] }

export interface HomeResponse {
  blocks: HomeBlock[]
}

export interface CompareLandingResponse {
  most_compared: ComparePair[]
  category_matchups: {
    category: { slug: string; title: string }
    path: string
    phones: CategoryPhone[]
  }[]
  next_steps: NextStep[]
}

export interface CompareVerdict {
  verdict: string
  picks: { id: number; for_label: string; reason: string }[]
  winner_id?: number | null
}

export interface ComparePayload {
  phones: PhoneDetail[]
  winner_id: number | null
  axis_winners: Record<string, number | null>
  summary: {
    items: { phone_id: number; display_name: string; wins: string[] }[]
    text: string | null
  }
  verdict: CompareVerdict | null
  canonical: { slug: string; path: string }
  indexable: boolean
  next_steps: NextStep[]
}

export type CompareByPairResponse = ComparePayload | { redirect: string }

export interface CompareVerdictResponse {
  winner_id: number | null
  verdict: CompareVerdict | null
}

export interface RecommendResponse {
  phones: Phone[]
  priorities: string[]
  hard_filters: string[]
  mode?: 'tier' | 'dial' | 'range'
  tier?: string | null
  budget?: number | null
  requested_price_range: { min: number | null; max: number | null }
  effective_price_range: { min: number | null; max: number | null }
  budget_widened: boolean
  insufficient_matches: boolean
  next_steps: NextStep[]
}

export interface SitemapEntry {
  path: string
  lastmod: string | null
  image?: string | null
}

export interface SitemapSection {
  section: 'phones' | 'brands' | 'categories' | 'compares'
  page: number
  page_size: number
  total: number
  pages: number
  entries: SitemapEntry[]
}

export interface SlugIndexRow {
  id: number
  brand_slug: string
  slug: string
  full_slug: string
  display_name: string
  status: string | null
  is_regional_edition: boolean | null
  updated_at: string | null
}

export interface ResolvedSlug {
  id: number
  brand_slug: string
  slug: string
  path: string
}

export interface TradeInRequest {
  phone_id: number
  variant_id?: number
  screen_condition: 'perfect' | 'minor_scratches' | 'deep_scratches' | 'cracked_touch_ok' | 'cracked_unresponsive'
  body_condition: 'flawless' | 'light_wear' | 'moderate_wear' | 'heavy_wear' | 'cracked_back'
  battery_health: number
  battery_non_original: boolean
  screen_non_original?: boolean
  broken_components: string[]
}

export interface TradeInResponse {
  phone_id: number
  brand: string
  name: string
  display_name: string
  baseline_price: number
  baseline_variant?: { id: number; ram_gb: number | null; storage_gb: number | null } | null
  price_basis: PriceBasis | null
  price_tier_id: string
  score_breakdown: {
    screen: number
    body: number
    battery: number
    functional: number
    brand_bonus: number
    raw_total: number
    normalized: number
  }
  condition_tier: 'excellent' | 'good' | 'fair' | 'poor'
  price_tier_bucket: 's' | 'ab' | 'cd'
  deduction_range: { low_pct: number; high_pct: number }
  estimated_range: { low: number; high: number }
  next_steps: NextStep[]
}

export interface FeedbackRequest {
  message: string
  email?: string
  page_url?: string
  website?: string
}

export interface FeedbackResponse {
  status: string
}

export interface AppEvent {
  type: string
  page_type?: string
  path?: string
  phone_id?: number
  target?: string
  slot?: string
  value?: number
}
