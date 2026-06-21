'use client'

import { useRouter } from 'next/navigation'
import { X, GitCompare } from 'lucide-react'
import { ROUTES, phoneSlug } from '@/lib/config'
import { c } from '@/lib/tokens'
import type { Phone } from '@/lib/types'

interface CompareBarProps {
  phones: Phone[]
  onRemove: (id: number) => void
  onClear: () => void
}

export default function CompareBar({ phones, onRemove, onClear }: CompareBarProps) {
  const router = useRouter()

  if (phones.length === 0) return null

  const handleCompare = () => {
    router.push(ROUTES.compare(...phones.map(phoneSlug)))
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 80,
        background: c.primary,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        animation: 'slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--max-w)',
          margin: '0 auto',
          padding: '12px var(--page-px)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Thumbnails */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {phones.map((p, i) => (
            <div
              key={p.id}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: '2px solid rgba(255,255,255,0.15)',
                marginLeft: i > 0 ? -10 : 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                zIndex: phones.length - i,
              }}
            >
              {p.main_image_url ? (
                <img src={p.main_image_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  {p.brand[0]}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Labels */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
            {phones.length} {phones.length === 1 ? 'phone' : 'phones'} selected
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
            {phones.map(p => p.model_name.split(' ').slice(-2).join(' ')).join(' vs ')}
          </div>
        </div>

        {/* Individual remove */}
        <div style={{ display: 'flex', gap: 6 }} className="compare-bar-removes">
          {phones.map(p => (
            <button
              key={p.id}
              onClick={() => onRemove(p.id)}
              title={`Remove ${p.model_name}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 'var(--r-full)',
                background: 'rgba(255,255,255,0.08)',
                fontSize: 11,
                color: 'rgba(255,255,255,0.7)',
                transition: 'background 0.15s',
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.model_name.split(' ').slice(-1)[0]}
              </span>
              <X size={10} />
            </button>
          ))}
        </div>

        {/* Clear */}
        <button
          onClick={onClear}
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', transition: 'color 0.15s', flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' }}
        >
          Clear
        </button>

        {/* Compare CTA */}
        <button
          onClick={handleCompare}
          disabled={phones.length < 2}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 22px',
            background: phones.length < 2 ? 'rgba(255,255,255,0.1)' : c.accent,
            color: phones.length < 2 ? 'rgba(255,255,255,0.35)' : '#fff',
            borderRadius: 'var(--r-full)',
            fontSize: 14,
            fontWeight: 600,
            transition: 'all 0.15s',
            flexShrink: 0,
            cursor: phones.length < 2 ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => {
            if (phones.length >= 2) (e.currentTarget as HTMLElement).style.background = '#d32f3e'
          }}
          onMouseLeave={e => {
            if (phones.length >= 2) (e.currentTarget as HTMLElement).style.background = c.accent
          }}
        >
          <GitCompare size={16} strokeWidth={2} />
          Compare Now
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
