// app/components/DataNoticeBanner.tsx
'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'data-notice-dismissed'

export default function DataNoticeBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      return
    }
    setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div style={{
      background: '#1A1A2E',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, margin: 0 }}>
        <strong style={{ color: '#fff' }}>Heads up:</strong>{' '}
        Prices are estimates and vary by region and retailer.
      </p>
      <button
        onClick={() => setVisible(false)}
        style={{
          fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
          background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '4px 0',
        }}
      >
        Got it
      </button>
    </div>
  )
}
