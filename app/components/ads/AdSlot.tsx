'use client'

import { AD_SIZES, ADS_ENABLED, AdPlacement } from '@/lib/adConfig'
import { c } from '@/lib/tokens'

export default function AdSlot({ placement }: { placement: AdPlacement }) {
  if (!ADS_ENABLED) return null
  const size = AD_SIZES[placement]

  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%', maxWidth: size.width, height: size.height, margin: '0 auto',
        background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 'var(--r-md)',
        overflow: 'hidden',
      }}
    >
      <div data-ad-placement={placement} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
