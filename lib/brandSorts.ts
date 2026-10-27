export const BRAND_SORTS = [
  { key: 'newest', label: 'Newest first', sort_by: 'release_year', sort_order: 'desc' },
  { key: 'oldest', label: 'Oldest first', sort_by: 'release_year', sort_order: 'asc' },
  { key: 'price_asc', label: 'Price: low to high', sort_by: 'price_usd', sort_order: 'asc' },
  { key: 'price_desc', label: 'Price: high to low', sort_by: 'price_usd', sort_order: 'desc' },
  { key: 'score', label: 'Highest score', sort_by: 'overall_score', sort_order: 'desc' },
  { key: 'battery', label: 'Battery', sort_by: 'battery_capacity', sort_order: 'desc' },
  { key: 'camera', label: 'Camera', sort_by: 'main_camera_mp', sort_order: 'desc' },
  { key: 'performance', label: 'Performance', sort_by: 'antutu_score', sort_order: 'desc' },
] as const

export const BRAND_TIERS = [
  { id: 'budget', label: 'Budget' },
  { id: 'mid_range', label: 'Mid-range' },
  { id: 'upper_mid_range', label: 'Upper mid' },
  { id: 'flagship', label: 'Flagship' },
  { id: 'ultra_flagship', label: 'Ultra' },
] as const
