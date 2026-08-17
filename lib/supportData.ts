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

export const MONTHLY_GOAL_USD = 37
export const MONTHLY_RAISED_USD = 0

export const COST_ITEMS: CostItem[] = [
  {
    label: 'Domain renewal',
    detail: 'specmob.vercel.app custom domain, annual',
    monthlyUsd: 10,
    status: 'needed',
  },
  {
    label: 'Database storage',
    detail: 'Postgres storage tier upgrade',
    monthlyUsd: 15,
    status: 'needed',
  },
  {
    label: 'API hosting',
    detail: 'Render — upgrading off the free tier to remove cold starts',
    monthlyUsd: 7,
    status: 'needed',
  },
  {
    label: 'AI copy generation',
    detail: 'Gemini API usage for match/verdict copy',
    monthlyUsd: 5,
    status: 'needed',
  },
]

export const SUPPORT_LINKS: SupportLink[] = [
  {
    label: 'Ko-fi',
    url: 'https://ko-fi.com/specmob',
    note: 'One-time or monthly',
  },
  {
    label: 'Direct PayPal',
    url: 'https://paypal.me/specmob',
    note: 'Direct payment via PayPal balance or card',
  },

]

export const CRYPTO_ADDRESSES: CryptoAddress[] = [
  {
    label: 'USDT',
    network: 'TRC-20 / BEP-20',
    address: 'YOUR_WALLET_ADDRESS_HERE',
  },
]
