'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { c, r } from '@/lib/tokens'
import type { CryptoAddress } from '@/lib/supportData'

export default function CryptoCard({ entries }: { entries: CryptoAddress[] }) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (address: string) => {
    await navigator.clipboard.writeText(address)
    setCopied(address)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420, margin: '0 auto' }}>
      {entries.map(e => (
        <div
          key={e.network}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md,
          }}
        >
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: c.text3, marginBottom: 2 }}>{e.network}</div>
            <div style={{ fontSize: 12, color: c.text1, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {e.address}
            </div>
          </div>
          <button
            onClick={() => copy(e.address)}
            aria-label={`Copy ${e.network} address`}
            style={{ display: 'flex', color: copied === e.address ? 'var(--green)' : c.text3, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            {copied === e.address ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      ))}
    </div>
  )
}
