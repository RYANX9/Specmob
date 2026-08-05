'use client'

import { useEffect, useState } from 'react'
import { useAdBlockDetected } from '@/lib/useAdBlockDetected'
import { c, z } from '@/lib/tokens'

export default function AdBlockBanner() {
  const blocked = useAdBlockDetected()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(sessionStorage.getItem('adblock-dismissed') === '1')
  }, [])

  if (!blocked || dismissed) return null

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: z.toast, maxWidth: 300,
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)', padding: '14px 16px',
    }}>
      <p style={{ fontSize: 13, color: c.text2, marginBottom: 10, lineHeight: 1.5 }}>
        Specmob runs on ads to stay free. Consider allowlisting us if you find it useful.
      </p>
      <button
        onClick={() => { sessionStorage.setItem('adblock-dismissed', '1'); setDismissed(true) }}
        style={{ fontSize: 12, fontWeight: 600, color: c.accent, background: 'none', border: 'none', cursor: 'pointer' }}
      >
        Dismiss
      </button>
    </div>
  )
}
