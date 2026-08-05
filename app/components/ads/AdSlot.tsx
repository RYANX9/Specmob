'use client'

import { AD_SIZES, USE_PLACEHOLDERS, ADS_ENABLED, AdPlacement } from '@/lib/adConfig'
import { c } from '@/lib/tokens'

export default function AdSlot({ placement }: { placement: AdPlacement }) {
  if (!ADS_ENABLED) return null
  const size = AD_SIZES[placement]

  return (
    <div style={{
      width: '100%', maxWidth: size.width, height: size.height, margin: '0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 'var(--r-md)',
      overflow: 'hidden',
    }}>
      {USE_PLACEHOLDERS ? (
        <img
          src={`https://placehold.co/${size.width}x${size.height}/e2e8f0/475569?text=Ad+${size.label}`}
          alt="Advertisement placeholder"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      ) : (
        <div data-ad-placement={placement} style={{ width: '100%', height: '100%' }} />
      )}
    </div>
  )
}
