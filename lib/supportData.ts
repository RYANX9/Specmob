// lib/supportData.ts

export interface CostItem {
  label: string
  detail: string
  monthlyUsd: number
  status: 'covered' | 'needed'
}

export interface SupportLink {
  label: string
  url: string
  note: string
}

export interface CryptoAddress {
  label: string
  network: string
  address: string
}

export const COST_ITEMS: CostItem[] = [
  { label: 'Domain renewal', detail: 'specmob.com — $110.28/yr renewal', monthlyUsd: 9.4, status: 'needed' },
  { label: 'Database storage', detail: 'Postgres storage tier upgrade', monthlyUsd: 15, status: 'needed' },
  { label: 'API hosting', detail: 'Render — upgrading off the free tier to remove cold starts', monthlyUsd: 7, status: 'needed' },
  { label: 'AI copy generation', detail: 'Gemini API usage for match/verdict copy', monthlyUsd: 5, status: 'needed' },
]

export const MONTHLY_GOAL_USD = COST_ITEMS.reduce((sum, item) => sum + item.monthlyUsd, 0)
export const MONTHLY_RAISED_USD = COST_ITEMS
  .filter(item => item.status === 'covered')
  .reduce((sum, item) => sum + item.monthlyUsd, 0)

export const SUPPORT_LINKS: SupportLink[] = [
  { label: 'Ko-fi', url: 'https://ko-fi.com/specmob', note: 'One-time or monthly' },
]

// TRC20 and BEP20 are different addresses on different chains — never
// collapse these into one entry, a BEP20 deposit sent to a TRC20-only
// address is unrecoverable.
export const CRYPTO_ADDRESSES: CryptoAddress[] = [
  { label: 'USDT', network: 'Tron (TRC20)', address: 'TCiHfuTAniqCjMkNUZVtMzrKsRNwgHey3Z' },
  { label: 'USDT', network: 'BNB Smart Chain (BEP20)', address: '0x193e9db22cc7776f6793cc5f41010f60dab329c3' },
]
