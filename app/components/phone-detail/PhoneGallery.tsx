'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Smartphone } from 'lucide-react'
import { c } from '@/lib/tokens'
import type { Phone } from '@/lib/types'

// ─── gallery URL resolution ─────────────────────────────────────────────────

export function buildGalleryUrls(phone: Phone): string[] {
  const extra = (phone.images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(img => img.image_url)
    .filter(url => url !== phone.main_image_url)

  const urls = phone.main_image_url ? [phone.main_image_url, ...extra] : extra
  return urls.filter(Boolean)
}

// ─── gallery component ───────────────────────────────────────────────────────

export default function PhoneGallery({ phone }: { phone: Phone }) {
  const gallery = buildGalleryUrls(phone)
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState<Record<number, boolean>>({})

  const current = gallery[index]
  const hasMultiple = gallery.length > 1
  const goTo = (i: number) => setIndex((i + gallery.length) % gallery.length)

  return (
    <div style={{
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: 'var(--r-xl)', padding: 32,
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ position: 'relative', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {current && !failed[index]
          ? <img
              src={current}
              alt={`${phone.brand} ${phone.model_name}`}
              onError={() => setFailed(prev => ({ ...prev, [index]: true }))}
              style={{
                width: '100%', height: '100%', objectFit: 'contain', padding: '10%',
              }}
            />
          : <Smartphone size={100} color={c.border} strokeWidth={0.8} />}

        {hasMultiple && (
          <>
            <button
              onClick={() => goTo(index - 1)}
              aria-label="Previous image"
              style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: c.surface, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text2, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => goTo(index + 1)}
              aria-label="Next image"
              style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: c.surface, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text2, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="scrollbar-none" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {gallery.map((url, i) => (
            <button
              key={`${url}-${i}`}
              onClick={() => setIndex(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === index}
              style={{
                flexShrink: 0, width: 56, height: 56, padding: 0,
                borderRadius: 'var(--r-sm)',
                border: `2px solid ${i === index ? c.accent : c.border}`,
                background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s',
              }}
            >
              {!failed[i]
                ? <img
                    src={url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(prev => ({ ...prev, [i]: true }))}
                    style={{
                      width: '100%', height: '100%', objectFit: 'contain', padding: '8%',
                    }}
                  />
                : <Smartphone size={20} color={c.border} strokeWidth={1} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
