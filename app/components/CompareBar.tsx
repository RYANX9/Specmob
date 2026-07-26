// app/components/CompareBar.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, GitCompare } from 'lucide-react'
import { ROUTES, phoneSlug } from '@/lib/config'
import { c, z, ease } from '@/lib/tokens'
import { useCompare } from '@/lib/compareStore'

export default function CompareBar() {
  const router = useRouter()
  const { phones, remove, clear } = useCompare()

  // Allow keyboard users to dismiss with Escape
  useEffect(() => {
    if (phones.length === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clear()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [phones.length, clear])

  if (phones.length === 0) return null

  const canCompare = phones.length >= 2

  const handleCompare = () => {
    if (!canCompare) return
    router.push(ROUTES.compare(...phones.map(phoneSlug)))
  }

  return (
    <div
      role="region"
      aria-label={`Compare bar — ${phones.length} phone${phones.length !== 1 ? 's' : ''} selected`}
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: z.compareBar,
        background: c.primary,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        animation: `slideUp 220ms ${ease.spring}`,
      }}
    >
      <div style={{
        maxWidth: 'var(--max-w)',
        margin: '0 auto',
        padding: '12px var(--page-px)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>

        {/* Phone thumbnails stacked */}
        <div style={{ display: 'flex', alignItems: 'center' }} aria-hidden="true">
          {phones.map((p, i) => (
            <div
              key={p.id}
              style={{
                width: 38, height: 38,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: '2px solid rgba(255,255,255,0.15)',
                marginLeft: i > 0 ? -10 : 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                zIndex: phones.length - i,
              }}
            >
              {p.main_image_url ? (
                <img
                  src={p.main_image_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{ width: 28, height: 28, objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  {p.brand[0]}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Summary label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
            {phones.length} {phones.length === 1 ? 'phone' : 'phones'} selected
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {phones.map(p => p.model_name.split(' ').slice(-2).join(' ')).join(' vs ')}
          </div>
        </div>

        {/* Individual remove chips — hidden below sm breakpoint */}
        <div style={{ display: 'flex', gap: 6 }} className="compare-bar-removes">
          {phones.map(p => (
            <button
              key={p.id}
              onClick={() => remove(p.id)}
              aria-label={`Remove ${p.model_name} from comparison`}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px',
                borderRadius: 'var(--r-full)',
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                fontSize: 11, color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                transition: `background 150ms ${ease.standard}`,
                maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.model_name.split(' ').slice(-1)[0]}
              </span>
              <X size={10} aria-hidden="true" />
            </button>
          ))}
        </div>

        {/* Clear all */}
        <button
          onClick={clear}
          aria-label="Clear all phones from comparison"
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.45)',
            transition: `color 150ms ${ease.standard}`,
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 6px',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' }}
        >
          Clear
        </button>

        {/* Compare CTA */}
        <button
          onClick={handleCompare}
          disabled={!canCompare}
          aria-disabled={!canCompare}
          aria-label={
            canCompare
              ? `Compare ${phones.map(p => p.model_name).join(', ')} side by side`
              : `Add ${2 - phones.length} more phone${2 - phones.length !== 1 ? 's' : ''} to compare`
          }
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 22px',
            background: canCompare ? c.accent : 'rgba(255,255,255,0.1)',
            color: canCompare ? '#fff' : 'rgba(255,255,255,0.35)',
            borderRadius: 'var(--r-full)',
            fontSize: 14, fontWeight: 600,
            transition: `all 150ms ${ease.standard}`,
            flexShrink: 0,
            cursor: canCompare ? 'pointer' : 'not-allowed',
            border: 'none',
          }}
          onMouseEnter={e => {
            if (canCompare) (e.currentTarget as HTMLElement).style.background = '#d32f3e'
          }}
          onMouseLeave={e => {
            if (canCompare) (e.currentTarget as HTMLElement).style.background = c.accent
          }}
        >
          <GitCompare size={16} strokeWidth={2} aria-hidden="true" />
          {canCompare ? 'Compare Now' : `Add ${2 - phones.length} more`}
        </button>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .compare-bar-removes { display: none !important; }
        }
      `}</style>
    </div>
  )
}
