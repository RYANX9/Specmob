// app/compare/[phones]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { parseCompareSlug, resolveComparePhones } from '@/lib/api'
import { SITE_URL } from '@/lib/config'

export const runtime = 'edge'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export const alt = 'Phone comparison on Specmob'

const IMAGE_FETCH_TIMEOUT_MS = 8_000
const RENDER_TIMEOUT_MS = 10_000

/**
 * Load the Specmob wordmark font.
 */
async function loadWordmarkFont() {
  const res = await fetch(
    new URL('./InstrumentSerif-Italic.ttf', import.meta.url)
  )

  if (!res.ok) {
    throw new Error(
      `Failed to load wordmark font: ${res.status}`
    )
  }

  return res.arrayBuffer()
}

/**
 * Fallback OG image.
 */
async function homepageOgFallback() {
  const res = await fetch(`${SITE_URL}/og-image.png`)

  if (!res.ok) {
    throw new Error(
      `Failed to load homepage OG image: ${res.status}`
    )
  }

  const buffer = await res.arrayBuffer()

  return new Response(buffer, {
    headers: {
      'content-type': 'image/png',
    },
  })
}

/**
 * Convert Uint8Array to base64 safely.
 *
 * DO NOT use:
 *
 * String.fromCharCode(...bytes)
 *
 * on the entire image because large images can exceed
 * Edge runtime argument limits.
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
 * Original:
 *
 * /storage/v1/object/public/phone-images/phones/foo.jpg
 *
 * Becomes:
 *
 * /storage/v1/render/image/public/phone-images/phones/foo.jpg
 * ?width=400&height=400&resize=contain&quality=80
 *
 * This prevents the Edge function from downloading the
 * original multi-megabyte phone image.
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
      /**
       * Non-Supabase image.
       *
       * We leave it alone rather than breaking existing
       * image URLs from another provider.
       */
      return url
    }

    parsed.pathname = parsed.pathname.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    )

    /**
     * Resize before downloading.
     *
     * 400x400 is intentional.
     *
     * The comparison image is displayed around 180x280,
     * so 400x400 gives Satori enough resolution while
     * remaining dramatically smaller than the original.
     */
    parsed.searchParams.set('width', '400')
    parsed.searchParams.set('height', '400')
    parsed.searchParams.set('resize', 'contain')
    parsed.searchParams.set('quality', '80')

    return parsed.toString()
  } catch (error) {
    console.error(
      'Compare OG: failed to create resized URL:',
      error
    )

    return url
  }
}

/**
 * Fetch one phone image, resize it through Supabase,
 * then convert it to a data URI.
 */
async function fetchImageDataUri(
  url: string | null | undefined
): Promise<string | null> {
  const resizedUrl = getResizedSupabaseImageUrl(url)

  if (!resizedUrl) {
    console.warn(
      'Compare OG: phone has no main_image_url'
    )

    return null
  }

  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, IMAGE_FETCH_TIMEOUT_MS)

  try {
    console.log(
      'Compare OG: fetching resized image:',
      resizedUrl
    )

    const res = await fetch(resizedUrl, {
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error(
        'Compare OG: image request failed:',
        res.status,
        res.statusText,
        resizedUrl
      )

      return null
    }

    const contentType =
      res.headers.get('content-type') || 'image/jpeg'

    /**
     * Make sure Supabase actually returned an image.
     */
    if (!contentType.startsWith('image/')) {
      console.error(
        'Compare OG: response is not an image:',
        contentType,
        resizedUrl
      )

      return null
    }

    const buffer = await res.arrayBuffer()

    if (buffer.byteLength === 0) {
      console.error(
        'Compare OG: image response is empty:',
        resizedUrl
      )

      return null
    }

    console.log(
      'Compare OG: resized image downloaded:',
      buffer.byteLength,
      'bytes'
    )

    const bytes = new Uint8Array(buffer)

    /**
     * Safe base64 conversion.
     */
    const base64 = uint8ArrayToBase64(bytes)

    return `data:${contentType};base64,${base64}`
  } catch (error) {
    console.error(
      'Compare OG: failed to fetch image:',
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
 * Build the comparison OG image.
 */
async function buildResponse(
  phonesSlug: string | undefined
): Promise<Response> {
  /**
   * Load font first.
   */
  const fontData = await loadWordmarkFont()

  const fonts = [
    {
      name: 'Instrument Serif',
      data: fontData,
      style: 'italic' as const,
      weight: 400 as const,
    },
  ]

  /**
   * Resolve comparison phones.
   */
  const slugParts = phonesSlug?.trim()
    ? parseCompareSlug(phonesSlug)
    : []

  const { phones } = slugParts.length
    ? await resolveComparePhones(slugParts)
    : { phones: [] }

  /**
   * Never show more than 3 phones in the OG image.
   */
  const shown = phones.slice(0, 3)

  /**
   * No phones found.
   */
  if (shown.length === 0) {
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
   * Fetch every image in parallel.
   *
   * Each image is resized by Supabase BEFORE the Edge
   * function receives it.
   */
  const imageUris = await Promise.all(
    shown.map((phone) =>
      fetchImageDataUri(phone.main_image_url)
    )
  )

  console.log(
    'Compare OG: image results:',
    shown.map((phone, index) => ({
      id: phone.id,
      name: phone.model_name,
      imageUrl: phone.main_image_url,
      hasImage: Boolean(imageUris[index]),
    }))
  )

  /**
   * Generate the final OG image.
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
          padding: '56px 64px',
        }}
      >
        {/* ============================================
            HEADER
        ============================================ */}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Wordmark />

          <div
            style={{
              display: 'flex',
              fontSize: 22,
              fontWeight: 700,
              color: '#9A9689',
              letterSpacing: 1,
            }}
          >
            COMPARE
          </div>
        </div>

        {/* ============================================
            COMPARISON
        ============================================ */}

        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {shown.map((phone, i) => (
            <div
              key={phone.id}
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {/* ======================================
                  PHONE COLUMN
              ====================================== */}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 280,
                }}
              >
                {/* ====================================
                    PHONE IMAGE BOX
                ==================================== */}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',

                    width: 240,
                    height: 320,

                    background: '#FFFFFF',

                    border: '1px solid #E7E2D8',
                    borderRadius: 24,

                    overflow: 'hidden',
                  }}
                >
                  {imageUris[i] ? (
                    <img
                      src={imageUris[i]!}
                      alt=""
                      width={180}
                      height={280}
                      style={{
                        objectFit: 'contain',
                        width: 180,
                        height: 280,
                      }}
                    />
                  ) : (
                    /**
                     * Image fallback.
                     *
                     * Instead of displaying an unexplained
                     * blank box, show the Specmob wordmark.
                     */
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'Instrument Serif',
                        fontStyle: 'italic',
                        fontSize: 26,
                        color: '#9A9689',
                      }}
                    >
                      Specmob.
                    </div>
                  )}
                </div>

                {/* ====================================
                    PHONE NAME
                    (model_name already includes the brand
                    as its first word, e.g. "Apple iPhone
                    17 Pro Max" or "Samsung Galaxy S26
                    Ultra" — so we render it alone and do
                    NOT prepend phone.brand again, to avoid
                    duplicating the brand name)
                ==================================== */}

                <div
                  style={{
                    display: 'flex',
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#15151F',
                    marginTop: 20,
                    textAlign: 'center',
                  }}
                >
                  {phone.model_name}
                </div>
              </div>

              {/* ======================================
                  VS
              ====================================== */}

              {i < shown.length - 1 && (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#E13847',
                    margin: '0 20px',
                  }}
                >
                  VS
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    }
  )
}

/**
 * Main OG image handler.
 */
export default async function Image({
  params,
}: {
  params: Promise<{
    phones: string
  }>
}) {
  const { phones: phonesSlug } = await params

  try {
    /**
     * Overall timeout.
     *
     * If something unexpectedly takes too long,
     * return the homepage OG image instead of allowing
     * the Edge function to fail completely.
     */
    const timeoutPromise = new Promise<never>(
      (_, reject) =>
        setTimeout(() => {
          reject(
            new Error('Compare OG render timeout')
          )
        }, RENDER_TIMEOUT_MS)
    )

    return await Promise.race([
      buildResponse(phonesSlug),
      timeoutPromise,
    ])
  } catch (err) {
    console.error(
      'OG image failed for compare route:',
      err
    )

    return homepageOgFallback()
  }
}
