import type { LocalPrice, PhoneMini } from './types'

export function formatUsd(price: number | null | undefined): string {
  return price != null ? `$${Math.round(price).toLocaleString('en-US')}` : 'Price TBA'
}

export function formatLocal(local: LocalPrice | null | undefined): string | null {
  if (!local) return null
  try {
    return `\u2248 ${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: local.currency,
      maximumFractionDigits: local.amount >= 1000 ? 0 : 2,
    }).format(local.amount)}`
  } catch {
    return `\u2248 ${Math.round(local.amount).toLocaleString('en-US')} ${local.currency}`
  }
}

export function displayPrice(
  phone: Pick<PhoneMini, 'price_usd' | 'price_local' | 'price_region'>,
  viewerRegion?: string | null,
): { usd: string; local: string | null } {
  const sameRegion =
    !!viewerRegion && !!phone.price_region && viewerRegion.toUpperCase() === phone.price_region.toUpperCase()
  return {
    usd: formatUsd(phone.price_usd),
    local: sameRegion ? formatLocal(phone.price_local) : null,
  }
}
