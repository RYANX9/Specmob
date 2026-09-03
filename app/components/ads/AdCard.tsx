'use client'

import { c } from '@/lib/tokens'
import { USE_PLACEHOLDERS } from '@/lib/adConfig'

export default function AdCard() {
  return (
    <div style={{
      background: c.surface, border: `1px dashed ${c.border}`,
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
    }}>
      <div style={{ width: '100%', aspectRatio: '1', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {USE_PLACEHOLDERS ? (
          <img src="https://placehold.co/300x250/e2e8f0/475569?text=Sponsored" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div data-ad-placement="in-feed" style={{ width: '100%', height: '100%' }} />
        )}
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3 }}>Sponsored</span>
      </div>
    </div>
  )
}
