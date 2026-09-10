// app/brand/[brand]/[model]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { getPhone } from '@/lib/api'
import { resolveDisplayPrice } from '@/lib/price'
import { SITE_URL } from '@/lib/config'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Phone specs and price on Specmob'

const IMAGE_FETCH_TIMEOUT_MS = 8_000

async function loadWordmarkFont() {
  return fetch(new URL('./InstrumentSerif-Italic.ttf', import.meta.url)).then(
    (res) => res.arrayBuffer()
  )
}

async function homepageOgFallback() {
  const res = await fetch(`${SITE_URL}/og-image.png`)
  const buffer = await res.arrayBuffer()
  return new Response(buffer, { headers: { 'content-type': 'image/png' } })
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/**
 * Routes the image through Vercel's image optimizer before fetching it.
 * This resizes any large source image (even multi-MB JPEGs) down to
 * a small WebP before we base64-encode it, so the Edge function never
 * has to handle the raw large file.
 */
async function fetchImageDataUri(
  url: string | null | undefined
): Promise<string | null> {
  if (!url) return null

  // Route through Vercel's image optimizer: resize to 400px wide, WebP output.
  // This is the same endpoint Next.js uses for <Image> components.
  const optimizedUrl = `${SITE_URL}/_next/image?url=${encodeURIComponent(url)}&w=400&q=80`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(optimizedUrl, {
      signal: controller.signal,
      // No cache: always get fresh image in case source URL changed
      cache: 'no-store',
    })

    if (!res.ok) {
      // Fall back to fetching the original URL directly if optimizer fails
      console.error(
        'OG image: optimizer fetch failed:',
        res.status,
        optimizedUrl
      )
      return await fetchOriginalDirectly(url)
    }

    const buffer = await res.arrayBuffer()
    if (buffer.byteLength === 0) return null

    const contentType = res.headers.get('content-type') || 'image/webp'
    const base64 = uint8ArrayToBase64(new Uint8Array(buffer))
    return `data:${contentType};base64,${base64}`
  } catch (err) {
    console.error('OG image: optimized fetch error:', err)
    return await fetchOriginalDirectly(url)
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Direct fetch of the original URL as a last resort. */
async function fetchOriginalDirectly(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength === 0) return null
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const base64 = uint8ArrayToBase64(new Uint8Array(buffer))
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
      <div
        style={{
          fontFamily: 'Instrument Serif',
          fontStyle: 'italic',
          fontSize: 34,
          color: '#15151F',
        }}
      >
        Specmob
      </div>
      <div
        style={{
          fontFamily: 'Instrument Serif',
          fontSize: 34,
          color: '#E13847',
          marginLeft: 2,
        }}
      >
        .
      </div>
    </div>
  )
}

export default async function Image({
  params,
}: {
  params: Promise<{ brand: string; model: string }>
}) {
  const { model } = await params

  try {
    const [phone, fontData] = await Promise.all([
      getPhone(model),
      loadWordmarkFont(),
    ])

    const fonts = [
      {
        name: 'Instrument Serif',
        data: fontData,
        style: 'italic' as const,
        weight: 400 as const,
      },
    ]

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
        { ...size, fonts }
      )
    }

    const [price, imageUri] = await Promise.all([
      Promise.resolve(resolveDisplayPrice(phone)),
      fetchImageDataUri(phone.main_image_url),
    ])

    // Strip brand prefix from model name for display (e.g. "Apple iPhone Duo" -> "iPhone Duo")
    const modelDisplayName = phone.model_name
      .replace(new RegExp(`^${phone.brand}\\s+`, 'i'), '')
      .trim()

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

          <div
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              marginTop: 32,
            }}
          >
            {/* Phone image box */}
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
                overflow: 'hidden',
              }}
            >
              {imageUri ? (
                <img
                  src={imageUri}
                  alt=""
                  width={340}
                  height={380}
                  style={{ objectFit: 'contain', width: 340, height: 380 }}
                />
              ) : (
                // Fallback when image can't be loaded
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    fontSize: 16,
                    color: '#9A9689',
                  }}
                >
                  {phone.brand}
                </div>
              )}
            </div>

            {/* Text info */}
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
                <div
                  style={{
                    display: 'flex',
                    fontSize: 40,
                    fontWeight: 700,
                    color: '#E13847',
                    marginTop: 28,
                  }}
                >
                  ${Math.round(price).toLocaleString()}
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  fontSize: 20,
                  color: '#59564D',
                  marginTop: 24,
                }}
              >
                Full specs &amp; price comparison
              </div>
            </div>
          </div>
        </div>
      ),
      { ...size, fonts }
    )
  } catch (err) {
    console.error('OG image failed for model route:', err)
    return homepageOgFallback()
  }
}
