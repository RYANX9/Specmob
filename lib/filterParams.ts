import type { SearchFilters } from './types'

type NumericKey =
  | 'min_price' | 'max_price' | 'min_ram' | 'min_storage' | 'min_battery'
  | 'min_camera_mp' | 'min_screen_size' | 'max_screen_size'
  | 'min_year' | 'max_year' | 'max_weight' | 'min_charging_w'
  | 'min_refresh_rate' | 'min_antutu'

type StringKey = 'chipset_tier' | 'camera_setup_type' | 'brands'

type BooleanKey =
  | 'has_nfc' | 'has_ois' | 'has_wireless_charging' | 'has_headphone_jack'
  | 'is_foldable' | 'is_premium_gaming' | 'water_resistant'

const NUMERIC_KEYS: NumericKey[] = [
  'min_price', 'max_price', 'min_ram', 'min_storage', 'min_battery',
  'min_camera_mp', 'min_screen_size', 'max_screen_size',
  'min_year', 'max_year', 'max_weight', 'min_charging_w',
  'min_refresh_rate', 'min_antutu',
]

const STRING_KEYS: StringKey[] = ['chipset_tier', 'camera_setup_type', 'brands', 'features']

const BOOLEAN_KEYS: BooleanKey[] = [
  'has_nfc', 'has_ois', 'has_wireless_charging', 'has_headphone_jack',
  'is_foldable', 'is_premium_gaming', 'water_resistant',
]
// Parses every filter key that isn't route/query-scoped (q, brand — those
// stay caller-specific since brand pages fix `brand` via the route and
// don't use `q` at all).
export function parseFilterParams(sp: URLSearchParams): SearchFilters {
  const out: SearchFilters = {}
  for (const key of NUMERIC_KEYS) {
    const raw = sp.get(key)
    if (raw !== null && raw !== '') out[key] = Number(raw)
  }
  for (const key of STRING_KEYS) {
    const raw = sp.get(key)
    if (raw) out[key] = raw
  }
  for (const key of BOOLEAN_KEYS) {
    if (sp.get(key) === '1') out[key] = true
  }
  return out
}

export function serializeFilterParams(params: URLSearchParams, f: SearchFilters): void {
  for (const key of NUMERIC_KEYS) {
    const v = f[key]
    if (v !== undefined && v !== null) params.set(key, String(v))
  }
  for (const key of STRING_KEYS) {
    const v = f[key]
    if (v) params.set(key, v)
  }
  for (const key of BOOLEAN_KEYS) {
    if (f[key] === true) params.set(key, '1')
  }
}

export function hasAnyFilterParam(sp: URLSearchParams): boolean {
  return [...NUMERIC_KEYS, ...STRING_KEYS, ...BOOLEAN_KEYS].some(k => sp.get(k))
}
