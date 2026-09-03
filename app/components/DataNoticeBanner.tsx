'use client'

import { useState, useEffect } from 'react'

export default function DataNoticeBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem('data-notice-dismissed')) setVisible(true)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    sessionStorage.setItem('data-notice-dismissed', '1')
    setVisible(false)
  }

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
        onClick={dismiss}
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
