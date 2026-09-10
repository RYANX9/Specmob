// app/brand/[brand]/[model]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { getPhone } from '@/lib/api'
import { resolveDisplayPrice } from '@/lib/price'
import { SITE_URL, stripBrandFromDisplayName } from '@/lib/config'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Phone specs and price on Specmob'

const IMAGE_FETCH_TIMEOUT_MS = 4_000

async function loadWordmarkFont() {
  return fetch(new URL('./InstrumentSerif-Italic.ttf', import.meta.url)).then(res => res.arrayBuffer())
}

async function homepageOgFallback() {
  const res = await fetch(`${SITE_URL}/og-image.png`)
  const buffer = await res.arrayBuffer()
  return new Response(buffer, { headers: { 'content-type': 'image/png' } })
}

// Fetches the phone photo server-side and inlines it as a data URI so the
// render never depends on a live remote fetch succeeding at generation
// time. Previously this route passed main_image_url straight to <img>,
// which renders blank with no error if the fetch hiccups even once — and
// since social platforms cache that render per-URL, one bad crawl stuck
// permanently until manually revalidated. Short timeout, resolves to null
// on any failure so a bad photo never blocks the rest of the image.
async function fetchImageDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/png'
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 34, color: '#15151F' }}>
        Specmob
      </div>
      <div style={{ fontFamily: 'Instrument Serif', fontSize: 34, color: '#E13847', marginLeft: 2 }}>.</div>
    </div>
  )
}

export default async function Image({ params }: { params: Promise<{ brand: string; model: string }> }) {
  const { brand, model } = await params

  try {
    const [phone, fontData] = await Promise.all([
      getPhone(`${brand}-${model}`),
      loadWordmarkFont(),
    ])
    const fonts = [{ name: 'Instrument Serif', data: fontData, style: 'italic' as const, weight: 400 as const }]

    if (!phone) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#F7F5F0',
            }}
          >
            <Wordmark />
          </div>
        ),
        { ...size, fonts },
      )
    }

    const [price, imageUri] = await Promise.all([
      Promise.resolve(resolveDisplayPrice(phone)),
      fetchImageDataUri(phone.main_image_url),
    ])
    const modelDisplayName = stripBrandFromDisplayName(phone.model_name, phone.brand)

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#F7F5F0',
            padding: 64,
          }}
        >
          <div style={{ display: 'flex' }}>
            <Wordmark />
          </div>

          <div style={{ display: 'flex', flex: 1, alignItems: 'center', marginTop: 32 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 420,
                height: 420,
                background: '#FFFFFF',
                border: '1px solid #E7E2D8',
                borderRadius: 32,
                marginRight: 56,
              }}
            >
              {imageUri && (
                <img
                  src={imageUri}
                  alt=""
                  width={300}
                  height={380}
                  style={{ objectFit: 'contain', width: 300, height: 380 }}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 2,
                  color: '#9A9689',
                  textTransform: 'uppercase',
                }}
              >
                {phone.brand}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 54,
                  fontWeight: 700,
                  color: '#15151F',
                  marginTop: 8,
                  lineHeight: 1.1,
                }}
              >
                {modelDisplayName}
              </div>
              {price != null && (
                <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: '#E13847', marginTop: 28 }}>
                  ${Math.round(price).toLocaleString()}
                </div>
              )}
              <div style={{ display: 'flex', fontSize: 20, color: '#59564D', marginTop: 24 }}>
                Full specs &amp; price comparison
              </div>
            </div>
          </div>
        </div>
      ),
      { ...size, fonts },
    )
  } catch (err) {
    console.error('OG image failed for model route:', err)
    return homepageOgFallback()
  }
}
