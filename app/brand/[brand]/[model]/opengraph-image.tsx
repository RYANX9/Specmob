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

async function loadFonts() {
  const [italicRes, regularRes] = await Promise.all([
    fetch(new URL('./InstrumentSerif-Italic.ttf', import.meta.url)),
    fetch(new URL('./InstrumentSerif-Regular.ttf', import.meta.url)),
  ])

  if (!italicRes.ok || !regularRes.ok) {
    throw new Error('Failed to load wordmark fonts')
  }

  const [italicData, regularData] = await Promise.all([
    italicRes.arrayBuffer(),
    regularRes.arrayBuffer(),
  ])

  return { italicData, regularData }
}

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
      return url
    }

    parsed.pathname = parsed.pathname.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    )

    parsed.searchParams.set('width', '700')
    parsed.searchParams.set('height', '700')
    parsed.searchParams.set('resize', 'contain')
    parsed.searchParams.set('quality', '85')

    return parsed.toString()
  } catch (error) {
    console.error(
      'Compare OG: failed to create resized URL:',
      error
    )

    return url
  }
}

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

async function buildResponse(
  phonesSlug: string | undefined
): Promise<Response> {
  const { italicData, regularData } = await loadFonts()

  const fonts = [
    {
      name: 'Instrument Serif',
      data: italicData,
      style: 'italic' as const,
      weight: 400 as const,
    },
    {
      name: 'Instrument Serif',
      data: regularData,
      style: 'normal' as const,
      weight: 400 as const,
    },
  ]

  const slugParts = phonesSlug?.trim()
    ? parseCompareSlug(phonesSlug)
    : []

  const { phones } = slugParts.length
    ? await resolveComparePhones(slugParts)
    : { phones: [] }

  const shown = phones.slice(0, 4)

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

  /*
   * Layout sizing
   *
   * 1–3 phones:
   *   Stage: 380px
   *   Image: 360px
   *
   * 4 phones:
   *   Stage: 270px
   *   Image: 255px
   *
   * This keeps the 4-phone comparison inside the 1200px canvas
   * while preserving the same oversized/cropped visual treatment.
   */
  const isFourPhones = shown.length === 4

  const stageWidth = isFourPhones ? 270 : 380
  const imageWidth = isFourPhones ? 255 : 360
  const stageHeight = 570
  const imageHeight = 560

  const vsMargin = isFourPhones ? 5 : 12
  const vsFontSize = isFourPhones ? 22 : 30
  const vsCircleSize = isFourPhones ? 36 : 48

  const modelNameFontSize = isFourPhones ? 25 : 28
  const modelNameHeight = isFourPhones ? 54 : 58

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#F7F5F0',
          padding: '42px 64px 0 64px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 46,
            flexShrink: 0,
          }}
        >
          <Wordmark />

          <div
            style={{
              display: 'flex',
              fontFamily: 'Instrument Serif',
              fontSize: 23,
              fontWeight: 700,
              color: '#9A9689',
              letterSpacing: 1,
            }}
          >
            COMPARE
          </div>
        </div>

        {/* Comparison area */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 18,
            paddingBottom: 0,
            overflow: 'visible',
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
              {/* Phone column */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: stageWidth,
                  margin: 0,
                  padding: 0,
                }}
              >
                {/* Phone image stage */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: stageWidth,
                    height: stageHeight,
                    background: '#FFFFFF',
                    border: '1px solid #E7E2D8',
                    borderRadius: '24px 24px 0 0',
                    overflow: 'hidden',
                    position: 'relative',
                    margin: 0,
                    padding: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Model name */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: modelNameHeight,
                      flexShrink: 0,
                      padding: '0 10px',
                      fontFamily: 'Instrument Serif',
                      fontSize: modelNameFontSize,
                      fontWeight: 700,
                      color: '#15151F',
                      textAlign: 'center',
                      lineHeight: 1.15,
                      boxSizing: 'border-box',
                    }}
                  >
                    {phone.model_name}
                  </div>

                  {/* Phone image */}
                  {imageUris[i] ? (
                    <img
                      src={imageUris[i]!}
                      alt=""
                      width={imageWidth}
                      height={imageHeight}
                      style={{
                        width: imageWidth,
                        height: imageHeight,
                        objectFit: 'contain',
                        objectPosition: 'center top',
                        flexShrink: 0,
                        display: 'block',
                        margin: 0,
                        padding: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: imageWidth,
                        height: imageHeight,
                        flexShrink: 0,
                        fontFamily: 'Instrument Serif',
                        fontStyle: 'italic',
                        fontSize: 27,
                        color: '#9A9689',
                        margin: 0,
                        padding: 0,
                      }}
                    >
                      Specmob.
                    </div>
                  )}
                </div>
              </div>

              {/* VS */}
              {i < shown.length - 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: `0 ${vsMargin}px`,
                    height: stageHeight,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: vsCircleSize,
                      height: vsCircleSize,
                      borderRadius: '50%',
                      background: '#E13847',
                      color: '#FFFFFF',
                      fontFamily: 'Instrument Serif',
                      fontSize: vsFontSize,
                      fontWeight: 700,
                    }}
                  >
                    VS
                  </div>
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

export default async function Image({
  params,
}: {
  params: Promise<{
    phones: string
  }>
}) {
  const { phones: phonesSlug } = await params

  try {
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
