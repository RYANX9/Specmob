'use client'

import { c } from '@/lib/tokens'
import { ADS_ENABLED } from '@/lib/adConfig'

export default function AdCard() {
  if (!ADS_ENABLED) return null

  return (
    <div
      aria-hidden="true"
      style={{
        background: c.surface, border: `1px dashed ${c.border}`,
        borderRadius: 'var(--r-lg)', overflow: 'hidden',
      }}
    >
      <div style={{ width: '100%', aspectRatio: '1', background: c.bg }} data-ad-placement="in-feed" />
      <div style={{ padding: '10px 12px 12px', height: 14 }} />
    </div>
  )
}
