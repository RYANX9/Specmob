'use client'

import { useState, useEffect } from 'react'
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

// ─── image content normalization ────────────────────────────────────────────

const TARGET_FILL = 0.85
const scaleCache: Record<string, number> = {}

function measureContentScale(url: string): Promise<number> {
  if (scaleCache[url] !== undefined) return Promise.resolve(scaleCache[url])

  return new Promise((resolve) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (!w || !h) return resolve(1)

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(1)

        ctx.drawImage(img, 0, 0)
        const { data } = ctx.getImageData(0, 0, w, h)

        let minX = w, minY = h, maxX = 0, maxY = 0
        let found = false
        const step = 2

        for (let y = 0; y < h; y += step) {
          for (let x = 0; x < w; x += step) {
            const idx = (y * w + x) * 4
            const alpha = data[idx + 3]
            const r = data[idx], g = data[idx + 1], b = data[idx + 2]
            
            // broader tolerance for off-white backgrounds, shadows, and subtle compression artifacts
            const isBackground = alpha < 15 || (r > 230 && g > 230 && b > 230)
            if (!isBackground) {
              found = true
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
          }
        }

        if (!found) { scaleCache[url] = 1; return resolve(1) }

        const contentWidth = maxX - minX
        const contentHeight = maxY - minY
        const contentFrac = Math.max(contentWidth / w, contentHeight / h)
        
        const scale = contentFrac > 0
          ? Math.min(Math.max(TARGET_FILL / contentFrac, 0.8), 1.3)
          : 1

        scaleCache[url] = scale
        resolve(scale)
      } catch {
        scaleCache[url] = 1
        resolve(1)
      }
    }

    img.onerror = () => { scaleCache[url] = 1; resolve(1) }
    img.src = url
  })
}

function useContentScales(urls: string[]): Record<string, number> {
  const [scales, setScales] = useState<Record<string, number>>({})
  const key = urls.join('|')

  useEffect(() => {
    let cancelled = false
    urls.forEach((url) => {
      if (!url) return
      measureContentScale(url).then((scale) => {
        if (!cancelled) setScales((prev) => (prev[url] === scale ? prev : { ...prev, [url]: scale }))
      })
    })
    return () => { cancelled = true }
  }, [key])

  return scales
}

// ─── gallery component ───────────────────────────────────────────────────────

export default function PhoneGallery({ phone }: { phone: Phone }) {
  const gallery = buildGalleryUrls(phone)
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState<Record<number, boolean>>({})
  const scales = useContentScales(gallery)

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
                width: '80%', height: '80%', objectFit: 'contain',
                transform: `scale(${scales[current] ?? 1})`,
                transition: 'transform 0.15s ease',
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
                      width: '80%', height: '80%', objectFit: 'contain',
                      transform: `scale(${scales[url] ?? 1})`,
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
