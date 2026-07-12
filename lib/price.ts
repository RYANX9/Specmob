import type { Phone } from './types'
import { findSpecValue } from './specs'

// Static FX table — no live rate source client-side. Update periodically.
const CURRENCY_TO_USD: Record<string, number> = {
  USD: 1, EUR: 1.08, GBP: 1.27, INR: 0.012, CNY: 0.14,
  JPY: 0.0067, KRW: 0.00073, AUD: 0.65, CAD: 0.73, BRL: 0.17, CHF: 1.13,
}

const CURRENCY_SYMBOLS: [RegExp, string][] = [
  [/€/, 'EUR'], [/£/, 'GBP'], [/₹/, 'INR'], [/¥/, 'CNY'], [/\$/, 'USD'],
]

function detectCurrencyCode(raw: string): string {
  const upper = raw.toUpperCase()
  for (const code of Object.keys(CURRENCY_TO_USD)) {
    if (upper.includes(code)) return code
  }
  for (const [sym, code] of CURRENCY_SYMBOLS) {
    if (sym.test(raw)) return code
  }
  return 'USD'
}

export function formatDisplayPrice(phone: Phone, historyPoints?: PricePointLike[]): string {
  const price = resolveDisplayPrice(phone, historyPoints)
  return price != null ? `$${Math.round(price).toLocaleString()}` : 'Price TBA'
}

/** full_specifications → Misc → Price, e.g. "About 520 EUR" → number of USD. */
export function parseMiscPrice(phone: Phone): number | null {
  const raw = findSpecValue(phone, ['Misc'], ['Price'])
  if (!raw) return null
  const match = raw.match(/([\d]{1,3}(?:[.,]\d{3})*(?:\.\d+)?)/)
  if (!match) return null
  const amount = parseFloat(match[1].replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) return null
  const rate = CURRENCY_TO_USD[detectCurrencyCode(raw)] ?? 1
  return Math.round(amount * rate)
}

export interface PricePointLike {
  price_usd: number | null
}

/** Priority: latest price-history point → phones.price_usd → parsed Misc price. */
export function resolveDisplayPrice(phone: Phone, historyPoints?: PricePointLike[]): number | null {
  if (historyPoints?.length) {
    for (let i = historyPoints.length - 1; i >= 0; i--) {
      if (historyPoints[i].price_usd != null) return historyPoints[i].price_usd
    }
  }
  if (phone.price_usd != null) return phone.price_usd
  return parseMiscPrice(phone)
}

/** Renames the Misc→Price spec row to "Launch Price" and replaces its value
 * with the parsed/converted USD number, so the raw "About 520 EUR" string
 * never reaches the UI. */
export function withLaunchPrice(
  specGroups: Array<[string, Record<string, string>]>,
  phone: Phone,
): Array<[string, Record<string, string>]> {
  const usd = parseMiscPrice(phone)
  return specGroups.map(([groupName, rows]) => {
    if (!/misc/i.test(groupName)) return [groupName, rows] as [string, Record<string, string>]
    const next: Record<string, string> = {}
    let injected = false
    for (const [k, v] of Object.entries(rows)) {
      if (/price/i.test(k)) {
        next['Launch Price'] = usd != null ? `$${usd.toLocaleString()}` : v
        injected = true
      } else {
        next[k] = v
      }
    }
    if (!injected && usd != null) next['Launch Price'] = `$${usd.toLocaleString()}`
    return [groupName, next] as [string, Record<string, string>]
  })
}
