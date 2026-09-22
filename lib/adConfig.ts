export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true'
export const USE_PLACEHOLDERS = process.env.NEXT_PUBLIC_ADS_PLACEHOLDER !== 'false'

export type AdSize = { width: number; height: number; label: string }

export const AD_SIZES = {
  leaderboard: { width: 728, height: 90, label: '728x90' },
  rectangle:   { width: 300, height: 250, label: '300x250' },
  skyscraper:  { width: 300, height: 600, label: '300x600' },
  inline:      { width: 728, height: 90, label: '728x90' },
} as const satisfies Record<string, AdSize>

export type AdPlacement = keyof typeof AD_SIZES
