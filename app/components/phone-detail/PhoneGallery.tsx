'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Smartphone } from 'lucide-react'
import { c } from '@/lib/tokens'
import type { PhoneDetail } from '@/lib/types'

export function buildGalleryUrls(phone: Pick<PhoneDetail, 'images' | 'main_image_url'>): string[] {
  const extra = (phone.images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(img => img.url)
    .filter(url => url !== phone.main_image_url)

  const urls = phone.main_image_url ? [phone.main_image_url, ...extra] : extra
  return urls.filter(Boolean)
}

// Source PNGs carry different amounts of baked-in whitespace. This measures
// the visible bounding box and returns a scale that normalizes the subject
// to a consistent fraction of the frame.
const TARGET_FILL = 0.86
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
            const isBackground = alpha < 10 || (r > 245 && g > 245 && b > 245)
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

        const contentFrac = Math.max((maxX - minX) / w, (maxY - minY) / h)
        const scale = contentFrac > 0
          ? Math.min(Math.max(TARGET_FILL / contentFrac, 0.6), 1.8)
          : 1

        scaleCache[url] = scale
        resolve(scale)
      } catch {
        // canvas throws on CORS-tainted images
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return scales
}

const GALLERY_MAIN_SIZE = 340
const GALLERY_THUMB_SIZE = 56
const GALLERY_GAP = 16

// Desktop stage height with a thumbnail row, measured so the card ends level
// with the affiliate disclosure line. Without thumbnails the stage absorbs
// the missing row so the card height stays identical.
const STAGE_HEIGHT_WITH_THUMBS = 395
const STAGE_HEIGHT_NO_THUMBS = STAGE_HEIGHT_WITH_THUMBS + GALLERY_THUMB_SIZE + GALLERY_GAP

export default function PhoneGallery({ phone }: { phone: Pick<PhoneDetail, 'images' | 'main_image_url' | 'display_name'> }) {
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
      borderRadius: 'var(--r-xl)', padding: 20,
      display: 'flex', flexDirection: 'column', gap: GALLERY_GAP,
    }}>
      <div
        className={hasMultiple ? 'pg-stage' : 'pg-stage pg-stage-solo'}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {current && !failed[index]
          ? <img
              src={current}
              alt={phone.display_name}
              fetchPriority="high"
              loading="eager"
              onError={() => setFailed(prev => ({ ...prev, [index]: true }))}
              style={{
                width: GALLERY_MAIN_SIZE,
                height: GALLERY_MAIN_SIZE,
                maxWidth: '92%',
                maxHeight: '92%',
                objectFit: 'contain',
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
                flexShrink: 0, width: GALLERY_THUMB_SIZE, height: GALLERY_THUMB_SIZE, padding: 0,
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

      <style>{`
        .pg-stage { aspect-ratio: 1; }
        @media (min-width: 1024px) {
          .pg-stage { aspect-ratio: auto; height: ${STAGE_HEIGHT_WITH_THUMBS}px; }
          .pg-stage-solo { height: ${STAGE_HEIGHT_NO_THUMBS}px; }
        }
      `}</style>
    </div>
  )
}
