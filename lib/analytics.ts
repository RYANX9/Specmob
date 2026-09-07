// lib/analytics.ts
import { sendGAEvent } from '@next/third-parties/google'

interface TrackedPhone {
  id: number
  brand: string
  model_name: string
  price_usd?: number | null
}

function phoneLabel(p: TrackedPhone): string {
  return `${p.brand} ${p.model_name}`
}

export const analytics = {
  phoneView(p: TrackedPhone) {
    sendGAEvent('event', 'phone_view', {
      phone_id: p.id,
      phone_name: phoneLabel(p),
      brand: p.brand,
      price: p.price_usd ?? undefined,
    })
  },

  pickStart() {
    sendGAEvent('event', 'pick_start', {})
  },

  pickComplete(params: { priorities: string; result_count: number; min_price?: number; max_price?: number }) {
    sendGAEvent('event', 'pick_complete', params)
  },

  compareAddPhone(p: TrackedPhone, compareSize: number) {
    sendGAEvent('event', 'compare_add_phone', { phone_id: p.id, phone_name: phoneLabel(p), compare_size: compareSize })
    if (compareSize === 2) sendGAEvent('event', 'compare_start', {})
  },

  tradeinStart(p: TrackedPhone) {
    sendGAEvent('event', 'tradein_start', { phone_id: p.id, phone_name: phoneLabel(p) })
  },

  tradeinComplete(params: { phone_id: number; estimated_low: number; estimated_high: number }) {
    sendGAEvent('event', 'tradein_complete', params)
  },

  affiliateClick(params: { phone_id: number; phone_name: string; retailer?: string; price?: number; location: string }) {
    sendGAEvent('event', 'affiliate_click', params)
  },
}
