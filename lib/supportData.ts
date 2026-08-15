// lib/supportData.ts
export interface CostItem {
  label: string
  detail: string
  monthlyUsd: number
  status: 'covered' | 'needed'
}

// Update monthlyUsd/status as your actual bills change — this is the
// single source of truth the page renders from.
export const COST_ITEMS: CostItem[] = [
  { label: 'Domain renewal', detail: 'specmob.vercel.app custom domain, annual', monthlyUsd: 1, status: 'needed' },
  { label: 'Database storage', detail: 'Postgres storage tier upgrade', monthlyUsd: 15, status: 'needed' },
  { label: 'API hosting', detail: 'Render — upgrading off the free tier to remove cold starts', monthlyUsd: 7, status: 'needed' },
  { label: 'AI copy generation', detail: 'Gemini API usage for match/verdict copy', monthlyUsd: 5, status: 'covered' },
]

export const MONTHLY_GOAL_USD = COST_ITEMS.reduce((sum, item) => sum + item.monthlyUsd, 0)
export const MONTHLY_RAISED_USD = COST_ITEMS
  .filter(item => item.status === 'covered')
  .reduce((sum, item) => sum + item.monthlyUsd, 0)

export interface SupportLink {
  label: string
  url: string
  note: string
}

export const SUPPORT_LINKS: SupportLink[] = [
  { label: 'GitHub Sponsors', url: 'https://github.com/sponsors/yourhandle', note: 'One-time or monthly' },
  { label: 'Ko-fi', url: 'https://ko-fi.com/yourhandle', note: 'One-time' },
]
