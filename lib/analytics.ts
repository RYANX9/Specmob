// lib/analytics.ts
import { sendGAEvent } from '@next/third-parties/google'

interface TrackedPhone {
  id: number
  brand: string
  model_name: string
  price_usd?: number | null
}

const MAX_LEN = 100

function clip(value: string): string {
  return value.length > MAX_LEN ? value.slice(0, MAX_LEN) : value
}

function tidyName(name: string): string {
  return name.replace(/^(.+?)\s+\1(?=\s|$)/i, '$1')
}

function phoneLabel(p: TrackedPhone): string {
  return clip(tidyName(`${p.brand} ${p.model_name}`))
}

function send(name: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  sendGAEvent('event', name, params)
}

let filterTimer: ReturnType<typeof setTimeout> | undefined

export const analytics = {
  phoneView(p: TrackedPhone) {
    send('phone_view', {
      phone_id: p.id,
      phone_name: phoneLabel(p),
      brand: p.brand,
      price: p.price_usd ?? undefined,
    })
  },

  pickStart() {
    send('pick_start', {})
  },

  pickComplete(params: { priorities: string; result_count: number; min_price?: number; max_price?: number }) {
    send('pick_complete', params)
  },

  compareAddPhone(p: TrackedPhone, compareSize: number) {
    send('compare_add_phone', { phone_id: p.id, phone_name: phoneLabel(p), compare_size: compareSize })
    if (compareSize === 2) send('compare_start', {})
  },

  compareView(phones: TrackedPhone[]) {
    send('compare_view', {
      phone_ids: phones.map(p => p.id).join(','),
      phone_names: clip(phones.map(p => p.model_name).join(' vs ')),
      compare_size: phones.length,
    })
  },

  tradeinStart(p: TrackedPhone) {
    send('tradein_start', { phone_id: p.id, phone_name: phoneLabel(p) })
  },

  tradeinComplete(params: { phone_id: number; estimated_low: number; estimated_high: number }) {
    send('tradein_complete', params)
  },

  affiliateClick(params: { phone_id: number; phone_name: string; retailer?: string; price?: number; location: string }) {
    send('affiliate_click', { ...params, phone_name: clip(tidyName(params.phone_name)) })
  },

  search(term: string, resultCount: number) {
    send('search', { search_term: clip(term), result_count: resultCount })
  },

  searchSelect(term: string, p: TrackedPhone) {
    send('search_select', { search_term: clip(term), phone_id: p.id, phone_name: phoneLabel(p) })
  },

  categoryView(slug: string) {
    send('category_view', { category: slug })
  },

  filterApply(filters: object) {
    clearTimeout(filterTimer)
    const values = filters as Record<string, unknown>
    const keys = Object.keys(values).filter(k => {
      const v = values[k]
      return k !== 'q' && v !== undefined && v !== null && v !== '' && v !== false
    })
    if (keys.length === 0) return
    filterTimer = setTimeout(() => {
      send('filter_apply', { filters: clip(keys.join(',')), filter_count: keys.length })
    }, 800)
  },
}
