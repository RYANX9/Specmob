import type { Phone, PhoneAnalysis, PhoneDetail, PhoneMini, PhoneOffer, PhoneVariant } from './types'

export const FALLBACK_WEAKNESS = 'No major weakness identified from the supplied specification data.'

export function realWeaknesses(analysis: PhoneAnalysis | null | undefined): string[] {
  return (analysis?.weaknesses ?? []).filter(w => w.trim() && w.trim() !== FALLBACK_WEAKNESS)
}

export function phoneImageAlt(phone: Pick<PhoneMini, 'display_name'>): string {
  return phone.display_name
}

export function lowestVariantPrice(variants: PhoneVariant[] | undefined, fallback: number | null): number | null {
  const prices = (variants ?? []).map(v => v.price_usd).filter((p): p is number => p != null && p > 0)
  return prices.length ? Math.min(...prices) : fallback
}

export function isRealOffer(o: PhoneOffer): boolean {
  return !!o.url && o.is_available && !o.is_placeholder && o.price_source === 'retailer'
}

export function bestRealOffer(phone: Pick<PhoneDetail, 'offers'>): PhoneOffer | null {
  const real = (phone.offers?.offers ?? []).filter(isRealOffer)
  if (!real.length) return null
  return real.reduce((a, b) => ((a.usd ?? Infinity) <= (b.usd ?? Infinity) ? a : b))
}

export function buyUrl(phone: Pick<PhoneDetail, 'offers' | 'price_url'>): string | null {
  return bestRealOffer(phone)?.url ?? null
}

export function variantLabel(v: Pick<PhoneVariant, 'ram_gb' | 'storage_gb'>): string {
  const storage = v.storage_gb ? (v.storage_gb >= 1024 ? `${v.storage_gb / 1024}TB` : `${v.storage_gb}GB`) : null
  if (v.ram_gb && storage) return `${v.ram_gb}GB + ${storage}`
  return storage ?? (v.ram_gb ? `${v.ram_gb}GB RAM` : 'Standard')
}

export function scoreEntries(p: Pick<Phone, 'camera_score' | 'performance_score' | 'battery_score' | 'display_score' | 'build_score' | 'value_score'>) {
  return [
    { key: 'camera', label: 'Camera', value: p.camera_score },
    { key: 'performance', label: 'Performance', value: p.performance_score },
    { key: 'battery', label: 'Battery', value: p.battery_score },
    { key: 'display', label: 'Display', value: p.display_score },
    { key: 'build', label: 'Build', value: p.build_score },
    { key: 'value', label: 'Value', value: p.value_score },
  ]
}
