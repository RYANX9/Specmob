// app/brand/[brand]/[model]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { api, APIError } from '@/lib/api'
import { SITE_URL } from '@/lib/config'

export const runtime = 'edge'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export const alt = 'Phone specs and price on Specmob'

const IMAGE_FETCH_TIMEOUT_MS = 8_000

// Social crawlers give up after a few seconds, so don't wait for the API's
// default 45s timeout (+ cold-start retry) when rendering a card.
const PHONE_FETCH_TIMEOUT_MS = 6_000

/* ------------------------------------------------------------------ *
 * TUNABLES
 * ------------------------------------------------------------------ */

// Width of the white phone panel on the right (px).
const PANEL_WIDTH = 540

// Space between the text column and the panel (px).
const PANEL_GAP = 40

// Space between the panel edge and the phone image (px). Lower = bigger phone.
const IMAGE_PADDING = 28

// Biggest size of the main model line (px). It shrinks automatically for
// long names.
const MAIN_MAX_SIZE = 112

// Line shown instead of the score badge when the phone has no score yet.
// '' hides it.
const TAGLINE = 'Full specs \u00B7 Price \u00B7 Score'

const TIER_LABELS: Record<string, string> = {
  ultra_flagship: 'Ultra flagship',
  flagship: 'Flagship',
  upper_mid_range: 'Upper mid-range',
  mid_range: 'Mid-range',
  budget: 'Budget',
}

/* ------------------------------------------------------------------ */

const PAGE_PADDING_X = 32
const PAGE_PADDING_TOP = 40
const HEADER_HEIGHT = 44
const TEXT_INSET = 16
const PANEL_TOP_MARGIN = 28

const COLORS = {
  bg: '#F7F5F0',
  ink: '#15151F',
  inkSoft: '#6B6A63',
  inkMuted: '#9A9689',
  line: '#E2DDD2',
  red: '#E13847',
}

/**
 * Instrument Serif fonts. The two .ttf files must sit next to this file.
 */
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

/** Fields this card reads. Numerics can arrive as numbers or "799.00" strings. */
type OgPhone = {
  brand: string
  name: string
  main_image_url?: string | null
  price_usd?: number | string | null
  price_from_usd?: number | string | null
  overall_score?: number | string | null
  tier?: string | null
}

function toPositive(v: number | string | null | undefined): number | null {
  const n = v == null ? NaN : Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Load the phone with a short timeout. 404 -> null (renders the plain
 * wordmark card). Any other failure throws, so the caller falls back to the
 * homepage image instead of caching a broken card.
 */
async function loadPhone(brand: string, model: string): Promise<OgPhone | null> {
  try {
    const phone = await api.phones.bySlug(
      brand,
      model,
      undefined,
      AbortSignal.timeout(PHONE_FETCH_TIMEOUT_MS)
    )
    return phone as unknown as OgPhone
  } catch (err) {
    if (err instanceof APIError && err.isNotFound) return null
    throw err
  }
}

/** Homepage image if the whole render fails. */
async function homepageOgFallback() {
  const res = await fetch(`${SITE_URL}/og-image.png`)

  if (!res.ok) {
    throw new Error(`Failed to load homepage OG image: ${res.status}`)
  }

  return new Response(await res.arrayBuffer(), {
    headers: { 'content-type': 'image/png' },
  })
}

/** Uint8Array -> base64 in chunks (Edge argument limits). */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const CHUNK_SIZE = 0x8000

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length))
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

/**
 * Supabase public Storage URL -> resized image-transformation URL, so the
 * Edge function never downloads the original.
 */
function getResizedSupabaseImageUrl(
  url: string | null | undefined,
  px: number
): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)

    const isSupabaseStorage =
      parsed.hostname.endsWith('.supabase.co') &&
      parsed.pathname.includes('/storage/v1/object/public/')

    if (!isSupabaseStorage) return url

    parsed.pathname = parsed.pathname.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    )

    parsed.searchParams.set('width', String(px))
    parsed.searchParams.set('height', String(px))
    parsed.searchParams.set('resize', 'contain')
    parsed.searchParams.set('quality', '85')

    return parsed.toString()
  } catch (error) {
    console.error('OG image: failed to create resized image URL:', error)
    return url
  }
}

type FetchedImage = {
  uri: string
  width: number
  height: number
}

/** Reads width/height from PNG, JPEG or WebP bytes. Null if unknown. */
function getImageDimensions(
  b: Uint8Array
): { width: number; height: number } | null {
  try {
    // PNG
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
      const width = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]
      const height = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]
      return width > 0 && height > 0 ? { width, height } : null
    }

    // JPEG
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2

      while (i + 9 < b.length) {
        if (b[i] !== 0xff) {
          i++
          continue
        }

        const marker = b[i + 1]

        if (
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc
        ) {
          const height = (b[i + 5] << 8) | b[i + 6]
          const width = (b[i + 7] << 8) | b[i + 8]
          return width > 0 && height > 0 ? { width, height } : null
        }

        i += 2 + ((b[i + 2] << 8) | b[i + 3])
      }

      return null
    }

    // WebP
    if (
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50
    ) {
      const kind = String.fromCharCode(b[12], b[13], b[14], b[15])

      if (kind === 'VP8 ') {
        return {
          width: (b[26] | (b[27] << 8)) & 0x3fff,
          height: (b[28] | (b[29] << 8)) & 0x3fff,
        }
      }

      if (kind === 'VP8L') {
        return {
          width: 1 + (((b[22] & 0x3f) << 8) | b[21]),
          height:
            1 +
            (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)),
        }
      }

      if (kind === 'VP8X') {
        return {
          width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
          height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
        }
      }
    }
  } catch {
    // fall through
  }

  return null
}

/**
 * Fetch the phone image (resized through Supabase) and convert it to a
 * data URI for Satori, with its real dimensions.
 */
async function fetchImageDataUri(
  url: string | null | undefined,
  px: number
): Promise<FetchedImage | null> {
  const resizedUrl = getResizedSupabaseImageUrl(url, px)

  if (!resizedUrl) {
    console.warn('OG image: phone does not have a main_image_url')
    return null
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(resizedUrl, {
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error('OG image: phone image request failed:', res.status, resizedUrl)
      return null
    }

    const type = res.headers.get('content-type') || 'image/jpeg'

    if (!type.startsWith('image/')) {
      console.error('OG image: response is not an image:', type, resizedUrl)
      return null
    }

    const buffer = await res.arrayBuffer()

    if (buffer.byteLength === 0) {
      console.error('OG image: image response is empty:', resizedUrl)
      return null
    }

    const bytes = new Uint8Array(buffer)
    const dims = getImageDimensions(bytes)

    return {
      uri: `data:${type};base64,${uint8ArrayToBase64(bytes)}`,
      width: dims?.width ?? 1,
      height: dims?.height ?? 1,
    }
  } catch (error) {
    console.error('OG image: failed to fetch phone image:', resizedUrl, error)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/* ------------------------------------------------------------------ *
 * Model name splitting -> main / suffix  (brand is shown separately)
 *
 *  "iPhone 18 Pro Max" -> IPHONE 18  / PRO MAX
 *  "Galaxy S25 Ultra"  -> GALAXY S25 / ULTRA
 *  "Pixel 10"          -> PIXEL 10   / (none)
 * ------------------------------------------------------------------ */

const SUFFIX_WORDS = new Set([
  'pro',
  'max',
  'ultra',
  'plus',
  'mini',
  'lite',
  'fe',
  'air',
  'se',
  'turbo',
  'neo',
])

function splitModelName(name: string): { main: string; suffix: string } {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return { main: '', suffix: '' }
  if (words.length === 1) return { main: words[0].toUpperCase(), suffix: '' }

  let i = words.length

  while (i > 1 && SUFFIX_WORDS.has(words[i - 1].toLowerCase())) {
    i--
  }

  // No suffix words: with 3+ words the last word becomes the suffix line.
  if (i === words.length && words.length >= 3) {
    i = words.length - 1
  }

  return {
    main: words.slice(0, i).join(' ').toUpperCase(),
    suffix: words.slice(i).join(' ').toUpperCase(),
  }
}

/** New schema: `name` is already brand-free, but strip it if it ever isn't. */
function stripBrand(brand: string, name: string): string {
  const b = (brand || '').trim().toLowerCase()
  const n = (name || '').trim()

  if (b && n.toLowerCase().startsWith(b + ' ')) {
    return n.slice(b.length).trim()
  }

  return n
}

/** Specmob wordmark. */
function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      <div
        style={{
          display: 'flex',
          fontFamily: 'Instrument Serif',
          fontStyle: 'italic',
          fontSize: 34,
          color: COLORS.ink,
        }}
      >
        Specmob
      </div>

      <div
        style={{
          display: 'flex',
          fontFamily: 'Instrument Serif',
          fontSize: 34,
          color: COLORS.red,
          marginLeft: 2,
        }}
      >
        .
      </div>
    </div>
  )
}

/** Generate the model OG image. */
export default async function Image({
  params,
}: {
  params: Promise<{ brand: string; model: string }>
}) {
  const { brand, model } = await params

  try {
    const [phone, { italicData, regularData }] = await Promise.all([
      loadPhone(brand, model),
      loadFonts(),
    ])

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

    /* Phone wasn't found. */
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
              background: COLORS.bg,
            }}
          >
            <Wordmark />
          </div>
        ),
        { ...size, fonts }
      )
    }

    /* ---------------- Layout maths ---------------- */

    const rowAvail = size.width - PAGE_PADDING_X * 2
    const bodyHeight = size.height - PAGE_PADDING_TOP - HEADER_HEIGHT

    const panelHeight = bodyHeight - 1 - PANEL_TOP_MARGIN
    const panelInnerWidth = PANEL_WIDTH - 2
    const panelInnerHeight = panelHeight - 1

    const imageBoxWidth = panelInnerWidth - IMAGE_PADDING * 2
    const imageBoxHeight = panelInnerHeight - IMAGE_PADDING * 2

    const textColWidth = rowAvail - PANEL_WIDTH - PANEL_GAP
    const textWidth = textColWidth - TEXT_INSET

    /* ---------------- Data ---------------- */

    const image = await fetchImageDataUri(
      phone.main_image_url,
      Math.min(1200, Math.round(imageBoxHeight * 1.6))
    )

    // Live "from" price (cheapest offer) wins over the catalog price.
    const fromPrice = toPositive(phone.price_from_usd)
    const price = fromPrice ?? toPositive(phone.price_usd)
    const priceLabel = fromPrice ? 'From' : 'Price'
    const priceText = price != null ? `$${Math.round(price).toLocaleString('en-US')}` : ''

    const scoreRaw = phone.overall_score != null ? Number(phone.overall_score) : NaN
    const score = Number.isFinite(scoreRaw) && scoreRaw > 0 ? scoreRaw : null
    const scoreText = score != null ? score.toFixed(1) : ''
    const tierText = phone.tier ? TIER_LABELS[phone.tier] ?? '' : ''

    const { main, suffix } = splitModelName(stripBrand(phone.brand, phone.name))

    /* ---------------- Text sizing ----------------
     * Satori does not auto-shrink text, so the main line is sized to fit.
     */
    const CHAR_WIDTH = 0.48

    const mainSize = Math.max(
      40,
      Math.min(
        MAIN_MAX_SIZE,
        Math.floor((textWidth * 0.97) / (Math.max(main.length, 1) * CHAR_WIDTH))
      )
    )

    // The suffix line is smaller, but long suffixes must still fit.
    const suffixSize = Math.max(
      28,
      Math.min(
        Math.round(mainSize * 0.7),
        Math.floor((textWidth * 0.97) / (Math.max(suffix.length, 1) * CHAR_WIDTH))
      )
    )

    /* ---------------- Phone image placement ---------------- */

    let drawWidth = imageBoxWidth
    let drawHeight = imageBoxHeight

    if (image) {
      const scale = Math.min(
        imageBoxWidth / image.width,
        imageBoxHeight / image.height
      )

      drawWidth = Math.round(image.width * scale)
      drawHeight = Math.round(image.height * scale)
    }

    const drawLeft = Math.round((panelInnerWidth - drawWidth) / 2)
    const drawTop = Math.round((panelInnerHeight - drawHeight) / 2)

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: COLORS.bg,
            padding: `${PAGE_PADDING_TOP}px ${PAGE_PADDING_X}px 0 ${PAGE_PADDING_X}px`,
            overflow: 'hidden',
          }}
        >
          {/* Header strip */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              height: HEADER_HEIGHT,
              flexShrink: 0,
              padding: `0 ${TEXT_INSET}px`,
              boxSizing: 'border-box',
            }}
          >
            <Wordmark />

            <div
              style={{
                display: 'flex',
                fontFamily: 'Instrument Serif',
                fontSize: 22,
                color: COLORS.inkMuted,
                letterSpacing: 3,
              }}
            >
              PHONE
            </div>
          </div>

          {/* Body */}
          <div
            style={{
              display: 'flex',
              width: rowAvail,
              height: bodyHeight,
              borderTop: `1px solid ${COLORS.line}`,
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {/* Text column */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                width: textColWidth,
                height: '100%',
                paddingLeft: TEXT_INSET,
                paddingBottom: 24,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Instrument Serif',
                  fontSize: 30,
                  letterSpacing: 4,
                  color: COLORS.inkMuted,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                {phone.brand}
              </div>

              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Instrument Serif',
                  fontSize: mainSize,
                  lineHeight: 1.02,
                  color: COLORS.ink,
                }}
              >
                {main}
              </div>

              {suffix ? (
                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'Instrument Serif',
                    fontSize: suffixSize,
                    lineHeight: 1.02,
                    color: COLORS.inkSoft,
                  }}
                >
                  {suffix}
                </div>
              ) : null}

              {price != null && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: 30,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: 'Instrument Serif',
                      fontSize: 24,
                      letterSpacing: 3,
                      textTransform: 'uppercase',
                      color: COLORS.inkMuted,
                      marginBottom: 2,
                    }}
                  >
                    {priceLabel}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      fontFamily: 'Instrument Serif',
                      fontSize: 76,
                      lineHeight: 1,
                      color: COLORS.red,
                    }}
                  >
                    {priceText}
                  </div>
                </div>
              )}

              {/* Score badge + tier chip, or the plain tagline */}
              {score != null ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginTop: 28,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: COLORS.ink,
                      borderRadius: 999,
                      padding: '6px 20px 8px 20px',
                      marginRight: 14,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        fontFamily: 'Instrument Serif',
                        fontSize: 38,
                        lineHeight: 1,
                        color: '#FFFFFF',
                      }}
                    >
                      {scoreText}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        fontFamily: 'Instrument Serif',
                        fontSize: 20,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        color: '#B9B6AB',
                        marginLeft: 10,
                        marginTop: 6,
                      }}
                    >
                      Smart Score
                    </div>
                  </div>

                  {tierText ? (
                    <div
                      style={{
                        display: 'flex',
                        fontFamily: 'Instrument Serif',
                        fontSize: 22,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        color: COLORS.inkSoft,
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: 999,
                        padding: '8px 18px 9px 18px',
                      }}
                    >
                      {tierText}
                    </div>
                  ) : null}
                </div>
              ) : TAGLINE ? (
                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'Instrument Serif',
                    fontSize: 26,
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                    color: COLORS.inkMuted,
                    marginTop: 28,
                  }}
                >
                  {TAGLINE}
                </div>
              ) : null}
            </div>

            {/* Phone panel */}
            <div
              style={{
                display: 'flex',
                position: 'relative',
                width: PANEL_WIDTH,
                height: panelHeight,
                marginLeft: PANEL_GAP,
                marginTop: PANEL_TOP_MARGIN,
                background: '#FFFFFF',
                border: `1px solid ${COLORS.line}`,
                borderBottom: 'none',
                borderRadius: '28px 28px 0 0',
                overflow: 'hidden',
                boxSizing: 'border-box',
              }}
            >
              {image ? (
                <img
                  src={image.uri}
                  alt=""
                  width={drawWidth}
                  height={drawHeight}
                  style={{
                    position: 'absolute',
                    left: drawLeft,
                    top: drawTop,
                    width: drawWidth,
                    height: drawHeight,
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: panelInnerWidth,
                    height: panelInnerHeight,
                    fontFamily: 'Instrument Serif',
                    fontStyle: 'italic',
                    fontSize: 32,
                    color: COLORS.inkMuted,
                  }}
                >
                  Specmob.
                </div>
              )}
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
