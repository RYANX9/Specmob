export interface FeatureTag {
  key: string
  label: string
}

// Mirrors FEATURE_TAG_PATTERNS in app/core/scoring.py. Keys must match —
// this side only needs the display label, matching happens server-side.
export const FEATURE_TAGS: FeatureTag[] = [
  { key: 'fingerprint_display', label: 'In-Display Fingerprint' },
  { key: 'fingerprint_side',    label: 'Side-Mounted Fingerprint' },
  { key: 'fingerprint_rear',    label: 'Rear Fingerprint' },
  { key: 'stylus',              label: 'Stylus Support' },
  { key: 'esim',                label: 'eSIM' },
  { key: 'gyroscope',           label: 'Gyroscope' },
  { key: 'compass',             label: 'Compass' },
  { key: 'barometer',           label: 'Barometer' },
  { key: 'heart_rate',          label: 'Heart Rate Sensor' },
]

export function featureTagLabel(key: string): string {
  return FEATURE_TAGS.find(t => t.key === key)?.label ?? key
}
