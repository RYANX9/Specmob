const REGION_STORAGE_KEY = 'Specmob-region'
const DEFAULT_REGION = 'US'

function regionFromLocale(): string | null {
  if (typeof navigator === 'undefined' || !navigator.language) return null
  const parts = navigator.language.split('-')
  if (parts.length < 2) return null
  const region = parts[1].toUpperCase()
  return /^[A-Z]{2}$/.test(region) ? region : null
}

export function getStoredRegion(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(REGION_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setStoredRegion(region: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(REGION_STORAGE_KEY, region.toUpperCase())
  } catch {
    // private browsing / storage quota — non-fatal
  }
}

export function resolveInitialRegion(): string {
  return getStoredRegion() ?? regionFromLocale() ?? DEFAULT_REGION
}

export { DEFAULT_REGION }