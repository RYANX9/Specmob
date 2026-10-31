import { API_BASE } from './config'
import type { AppEvent } from './types'
import { isLikelyBot } from './bot'

const CLIENT_KEY = 'specmob-cid'

type PageType =
  | 'home' | 'phone' | 'compare' | 'category' | 'brand' | 'brands'
  | 'pick' | 'best_hub' | 'tradein' | 'methodology' | 'other'

function clientId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    let id = sessionStorage.getItem(CLIENT_KEY)
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, '')
      sessionStorage.setItem(CLIENT_KEY, id)
    }
    return id
  } catch {
    return undefined
  }
}

function post(path: string, body: Record<string, unknown>): void {
  if (typeof window === 'undefined' || isLikelyBot()) return
  try {
    void fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // analytics must never break a page
  }
}

export function trackEvent(events: AppEvent[], region?: string | null): void {
  post('/events', {
    client_id: clientId(),
    region: region ?? undefined,
    referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    events,
  })
}

const seenViews = new Set<string>()

export function trackPageView(pageType: PageType, path: string, phoneId?: number, region?: string | null): void {
  if (typeof window === 'undefined') return
  const key = `${pageType}:${path}`
  if (seenViews.has(key)) return
  seenViews.add(key)
  trackEvent([{ type: 'page_view', page_type: pageType, path, phone_id: phoneId }], region)
}

export function trackNextStep(slot: string, href: string, pageType: PageType, phoneId?: number): void {
  trackEvent([{ type: 'next_step_click', page_type: pageType, slot, target: href, phone_id: phoneId }])
}

export function trackBlockClick(slot: string, href: string, pageType: PageType, phoneId?: number): void {
  trackEvent([{ type: 'block_click', page_type: pageType, slot, target: href, phone_id: phoneId }])
}

export type CompareEntry = 'search' | 'category' | 'phone_page' | 'home' | 'pick' | 'tray' | 'direct' | 'next_step'

export function trackCompareVisit(phoneIds: number[], entry: CompareEntry = 'direct'): void {
  if (phoneIds.length < 2) return
  post('/events/compare', { client_id: clientId(), phone_ids: phoneIds.slice(0, 4), entry })
}
