// app/brand/[brand]/[model]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { getPhone } from '@/lib/api'
import { resolveDisplayPrice } from '@/lib/price'
import { SITE_URL, stripBrandFromDisplayName } from '@/lib/config'

export const runtime = 'edge'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export const alt = 'Phone specs and price on Specmob'

const IMAGE_FETCH_TIMEOUT_MS = 8_000

/**
 * Load the Instrument Serif font used by the Specmob wordmark.
 */
async function loadWordmarkFont() {
  const res = await fetch(
    new URL('./InstrumentSerif-Italic.ttf', import.meta.url)
  )

  if (!res.ok) {
    throw new Error(`Failed to load wordmark font: ${res.status}`)
  }

  return res.arrayBuffer()
}

/**
 * Homepage fallback if the entire OG render fails.
 */
async function homepageOgFallback() {
  const res = await fetch(`${SITE_URL}/og-image.png`)

  if (!res.ok) {
    throw new Error(`Failed to load homepage OG image: ${res.status}`)
  }

  const buffer = await res.arrayBuffer()

  return new Response(buffer, {
    headers: {
      'content-type': 'image/png',
    },
  })
}

/**
 * Convert a Uint8Array to base64 safely.
 *
 * We do this in chunks instead of:
 *
 * String.fromCharCode(...bytes)
 *
 * because spreading a large image into a function call can
 * exceed the Edge runtime's argument/call-stack limits.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''

  const CHUNK_SIZE = 0x8000

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + CHUNK_SIZE, bytes.length)
    )

    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

/**
 * Convert a Supabase public Storage URL into a resized
 * Supabase image transformation URL.
 *
 * Example:
 *
 * /storage/v1/object/public/phone-images/phones/foo.jpg
 *
 * becomes:
 *
 * /storage/v1/render/image/public/phone-images/phones/foo.jpg
 * ?width=400&height=400&resize=contain&quality=80
 *
 * This means the OG Edge function doesn't need to download
 * the original multi-megabyte phone image.
 */
function getResizedSupabaseImageUrl(
  url: string | null | undefined
): string | null {
  if (!url) {
    return null
  }

  try {
    const parsed = new URL(url)

    const isSupabaseStorage =
      parsed.hostname.endsWith('.supabase.co') &&
      parsed.pathname.includes('/storage/v1/object/public/')

    if (!isSupabaseStorage) {
      // If this isn't a Supabase Storage URL, just use
      // the original URL.
      return url
    }

    parsed.pathname = parsed.pathname.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    )

    /**
     * 400x400 gives Satori enough resolution for the
     * ~300x380 display area while still keeping the
     * downloaded image small.
     */
    parsed.searchParams.set('width', '400')
    parsed.searchParams.set('height', '400')
    parsed.searchParams.set('resize', 'contain')
    parsed.searchParams.set('quality', '80')

    return parsed.toString()
  } catch (error) {
    console.error(
      'OG image: failed to create resized image URL:',
      error
    )

    return url
  }
}

/**
 * Fetch the phone image server-side, after resizing it through
 * Supabase, then convert it into a data URI for Satori.
 */
async function fetchImageDataUri(
  url: string | null | undefined
): Promise<string | null> {
  const resizedUrl = getResizedSupabaseImageUrl(url)

  if (!resizedUrl) {
    console.warn(
      'OG image: phone does not have a main_image_url'
    )

    return null
  }

  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, IMAGE_FETCH_TIMEOUT_MS)

  try {
    console.log(
      'OG image: fetching phone image:',
      resizedUrl
    )

    const res = await fetch(resizedUrl, {
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error(
        'OG image: phone image request failed:',
        res.status,
        res.statusText,
        resizedUrl
      )

      return null
    }

    const contentType =
      res.headers.get('content-type') || 'image/jpeg'

    if (!contentType.startsWith('image/')) {
      console.error(
        'OG image: response is not an image:',
        contentType,
        resizedUrl
      )

      return null
    }

    const buffer = await res.arrayBuffer()

    if (buffer.byteLength === 0) {
      console.error(
        'OG image: image response is empty:',
        resizedUrl
      )

      return null
    }

    console.log(
      'OG image: resized image downloaded:',
      buffer.byteLength,
      'bytes'
    )

    const bytes = new Uint8Array(buffer)

    const base64 = uint8ArrayToBase64(bytes)

    return `data:${contentType};base64,${base64}`
  } catch (error) {
    console.error(
      'OG image: failed to fetch phone image:',
      resizedUrl,
      error
    )

    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Specmob wordmark.
 */
function Wordmark() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
      }}
    >
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

/**
 * Generate the model OG image.
 */
export default async function Image({
  params,
}: {
  params: Promise<{
    brand: string
    model: string
  }>
}) {
  const { brand, model } = await params

  try {
    /**
     * Load the phone and font at the same time.
     */
    const [phone, fontData] = await Promise.all([
      getPhone(`${brand}-${model}`),
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

    /**
     * Phone wasn't found.
     */
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
        {
          ...size,
          fonts,
        }
      )
    }

    /**
     * Resolve price and fetch the resized phone image
     * simultaneously.
     */
    const [price, imageUri] = await Promise.all([
      Promise.resolve(resolveDisplayPrice(phone)),
      fetchImageDataUri(phone.main_image_url),
    ])

    console.log('OG image result:', {
      phone: phone.model_name,
      originalImageUrl: phone.main_image_url,
      hasImage: Boolean(imageUri),
    })

    const modelDisplayName = stripBrandFromDisplayName(
      phone.model_name,
      phone.brand
    )

    /**
     * Generate final OG image.
     */
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
          {/* ============================================
              WORDMARK
          ============================================ */}
          <div
            style={{
              display: 'flex',
            }}
          >
            <Wordmark />
          </div>

          {/* ============================================
              MAIN CONTENT
          ============================================ */}
          <div
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              marginTop: 32,
            }}
          >
            {/* ==========================================
                PHONE IMAGE
            ========================================== */}
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
                  width={300}
                  height={380}
                  style={{
                    objectFit: 'contain',
                    width: 300,
                    height: 380,
                  }}
                />
              ) : (
                /**
                 * If the phone image cannot be loaded,
                 * don't leave an unexplained empty box.
                 */
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Instrument Serif',
                    fontStyle: 'italic',
                    fontSize: 28,
                    color: '#9A9689',
                  }}
                >
                  Specmob.
                </div>
              )}
            </div>

            {/* ==========================================
                PHONE INFORMATION
            ========================================== */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
              }}
            >
              {/* Brand */}
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

              {/* Model */}
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

              {/* Price */}
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

              {/* Description */}
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
      {
        ...size,
        fonts,
      }
    )
  } catch (err) {
    console.error(
      'OG image failed for model route:',
      err
    )

    return homepageOgFallback()
  }
}
