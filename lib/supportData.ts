export interface CostItem {
  label: string
  detail: string
  monthlyUsd: number
  status: 'covered' | 'needed'
}

export const COST_ITEMS: CostItem[] = [
  { label: 'Domain renewal', detail: 'specmob.com — $11.28/yr renewal (first-year promo price does not apply)', monthlyUsd: 0.94, status: 'needed' },
  { label: 'Database storage', detail: 'Postgres instance', monthlyUsd: 0, status: 'needed' },
  { label: 'API hosting', detail: 'FastAPI backend', monthlyUsd: 0, status: 'needed' },
  { label: 'AI copy generation', detail: 'Gemini API calls for verdicts/match copy', monthlyUsd: 0, status: 'needed' },
]

export const MONTHLY_GOAL_USD = 0
export const MONTHLY_RAISED_USD = 0

export interface SupportLink {
  label: string
  url: string
  note: string
}

export const SUPPORT_LINKS: SupportLink[] = [
  { label: 'Ko-fi', url: 'https://ko-fi.com/YOUR_HANDLE', note: 'via PayPal' },
]

export interface CryptoAddress {
  network: string
  address: string
}

export const CRYPTO_ADDRESSES: CryptoAddress[] = [
  { network: 'USDT (TRC20)', address: 'PASTE_YOUR_TRC20_ADDRESS' },
]
