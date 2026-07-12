import type { Phone } from './types'
import { findSpecValue } from './specs'

// Static FX table — no live rate source available client-side. Update periodically.
const CURRENCY_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  INR: 0.012,
  CNY: 0.14,
  JPY: 0.0067,
  KRW: 0.00073,
  AUD: 0.65,
  CAD: 0.73,
  BRL: 0.17,
  CHF: 1.13,
}

const CURRENCY_SYMBOLS: [RegExp, string][] = [
  [/€/, 'EUR'],
  [/£/, 'GBP'],
  [/₹/, 'INR'],
  [/¥/, 'CNY'],
  [/\$/, 'USD'],
]

function detectCurrencyCode(raw: string): string {
  const upper = raw.toUpperCase()
  for (const code of Object.keys(CURRENCY_TO_USD)) {
    if (upper.includes(code)) return code
  }
  for (const [sym, code] of CURRENCY_SYMBOLS) {
    if (sym.test(raw)) return code
  }
  return 'USD' // no marker found — treat as already USD
}

/**
 * Last-resort: full_specifications → Misc → Price, e.g. "About 520 EUR".
 * Strips "About", extracts the number, converts to USD.
 */
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

/**
 * Price to display, in priority order:
 *   1. Latest point on the price-history graph (points are ASC by date —
 *      walk from the end for the first non-null price_usd).
 *   2. phones.price_usd from the spec row.
 *   3. Parsed from full_specifications → Misc → Price, converted to USD.
 */
export function resolveDisplayPrice(phone: Phone, historyPoints?: PricePointLike[]): number | null {
  if (historyPoints?.length) {
    for (let i = historyPoints.length - 1; i >= 0; i--) {
      if (historyPoints[i].price_usd != null) return historyPoints[i].price_usd
    }
  }
  if (phone.price_usd != null) return phone.price_usd
  return parseMiscPrice(phone)
}
