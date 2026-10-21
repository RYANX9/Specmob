// app/compare/[phones]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { getComparePair } from '@/lib/api'
import type { PhoneDetail } from '@/lib/types'
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

/* ------------------------------------------------------------------ *
 * TUNABLES
 * ------------------------------------------------------------------ */

// Space between the card edge and the phone image (px). Lower = bigger phone.
// The whole phone is always shown (scaled to fit, never cropped).
const IMAGE_PADDING = 24

// Space between the header hairline and the names (px).
const TOP_MARGIN = 28

// Space between the name block and the phone card (px).
const NAME_TO_CARD_GAP = 18

// Biggest size of the model line (px) by number of phones.
const MAIN_MAX_BY_COUNT: Record<number, number> = {
  1: 92,
  2: 80,
  3: 64,
  4: 52,
}

/* ------------------------------------------------------------------ */

const PAGE_PADDING_X = 32
const PAGE_PADDING_TOP = 40
const HEADER_HEIGHT = 44
const HEADER_INSET = 16

const COLORS = {
  bg: '#F7F5F0',
  ink: '#15151F',
  inkSoft: '#6B6A63',
  inkMuted: '#9A9689',
  line: '#E2DDD2',
  red: '#E13847',
}

async function loadFile(path: URL) {
  const res = await fetch(path)

  if (!res.ok) {
    throw new Error(`Failed to load font: ${path.pathname}`)
  }

  return res.arrayBuffer()
}

/**
 * Same roles as the site:
 *  - Instrument Serif Italic: Specmob wordmark only
 *  - DM Serif Display: headlines (phone names)
 *  - Google Sans: labels, badges, UI text
 * Satori can't read woff2 or variable fonts, so Google Sans needs two STATIC
 * ttf files (400 and 700) next to this file.
 */
async function loadFonts() {
  const [italicData, regularData, sansRegularData, sansBoldData] =
    await Promise.all([
      loadFile(new URL('./InstrumentSerif-Italic.ttf', import.meta.url)),
      loadFile(new URL('./DMSerifDisplay-Regular.ttf', import.meta.url)),
      loadFile(new URL('./GoogleSans-Regular.ttf', import.meta.url)),
      loadFile(new URL('./GoogleSans-Bold.ttf', import.meta.url)),
    ])

  return { italicData, regularData, sansRegularData, sansBoldData }
}

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

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const CHUNK_SIZE = 0x8000

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length))
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function getResizedSupabaseImageUrl(
  url: string | null | undefined,
  px: number
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

    parsed.searchParams.set('width', String(px))
    parsed.searchParams.set('height', String(px))
    parsed.searchParams.set('resize', 'contain')
    parsed.searchParams.set('quality', '85')

    return parsed.toString()
  } catch (error) {
    console.error('Compare OG: failed to create resized URL:', error)
    return url
  }
}

type FetchedImage = {
  uri: string
  width: number
  height: number
}

/** Reads width/height from PNG, JPEG or WebP bytes. Returns null if unknown. */
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

        // Start-of-frame markers (not DHT/JPG/DAC)
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

async function fetchImageDataUri(
  url: string | null | undefined,
  px: number
): Promise<FetchedImage | null> {
  const resizedUrl = getResizedSupabaseImageUrl(url, px)

  if (!resizedUrl) {
    console.warn('Compare OG: phone has no main_image_url')
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
      console.error(
        'Compare OG: image request failed:',
        res.status,
        res.statusText,
        resizedUrl
      )
      return null
    }

    const type = res.headers.get('content-type') || 'image/jpeg'

    if (!type.startsWith('image/')) {
      console.error('Compare OG: response is not an image:', type, resizedUrl)
      return null
    }

    const buffer = await res.arrayBuffer()

    if (buffer.byteLength === 0) {
      console.error('Compare OG: image response is empty:', resizedUrl)
      return null
    }

    const bytes = new Uint8Array(buffer)
    const base64 = uint8ArrayToBase64(bytes)
    const dims = getImageDimensions(bytes)

    return {
      uri: `data:${type};base64,${base64}`,
      // If we cannot read the size, assume square; the fit maths keeps it safe.
      width: dims?.width ?? 1,
      height: dims?.height ?? 1,
    }
  } catch (error) {
    console.error('Compare OG: failed to fetch image:', resizedUrl, error)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/* ------------------------------------------------------------------ *
 * Model name splitting  ->  main / suffix
 * The brand is NOT part of the model name anymore; it comes from
 * phone.brand and is shown on its own line.
 *
 *  "Find X10 Pro Max" -> FIND X10 / PRO MAX
 *  "18 Pro Max"       -> 18       / PRO MAX
 *  "iPhone 15 Pro"    -> IPHONE 15 / PRO
 *  "Galaxy S26 Ultra" -> GALAXY S26 / ULTRA
 *  "Phone (4b)"       -> PHONE    / (4B)
 *  "Pixel 10"         -> PIXEL 10 / (none)
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

type NameParts = {
  brand: string
  main: string
  suffix: string
}

/** Removes a leading brand from the name, in case old data still has it. */
function stripBrand(name: string, brand: string): string {
  const n = name.trim()
  const b = brand.trim()

  if (b && n.toLowerCase().startsWith(b.toLowerCase() + ' ')) {
    return n.slice(b.length).trim()
  }

  return n
}

function splitModelName(rawName: string, brand: string): NameParts {
  const name = stripBrand(rawName, brand)
  const words = name.split(/\s+/).filter(Boolean)
  const brandUpper = brand.trim().toUpperCase()

  if (words.length === 0) {
    return { brand: brandUpper, main: '', suffix: '' }
  }

  if (words.length === 1) {
    return { brand: brandUpper, main: words[0].toUpperCase(), suffix: '' }
  }

  let i = words.length

  while (i > 1 && SUFFIX_WORDS.has(words[i - 1].toLowerCase())) {
    i--
  }

  // No suffix words: with 3+ words the last word becomes the suffix line.
  if (i === words.length && words.length >= 3) {
    i = words.length - 1
  }

  return {
    brand: brandUpper,
    main: words.slice(0, i).join(' ').toUpperCase(),
    suffix: words.slice(i).join(' ').toUpperCase(),
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
          fontStyle: 'italic',
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

/**
 * Load the pair. If the slug is not the canonical one the API answers with a
 * redirect, so follow it once instead of rendering an empty card.
 */
async function loadPair(slug: string) {
  let res = await getComparePair(slug).catch(() => null)

  if (res && 'redirect' in res) {
    const next = String(res.redirect).split('/').filter(Boolean).pop()
    res = next && next !== slug ? await getComparePair(next).catch(() => null) : null
  }

  return res && 'phones' in res ? res : null
}

async function buildResponse(
  phonesSlug: string | undefined
): Promise<Response> {
  const { italicData, regularData, sansRegularData, sansBoldData } =
    await loadFonts()

  const fonts = [
    {
      name: 'Instrument Serif',
      data: italicData,
      style: 'italic' as const,
      weight: 400 as const,
    },
    {
      name: 'DM Serif Display',
      data: regularData,
      style: 'normal' as const,
      weight: 400 as const,
    },
    {
      name: 'Google Sans',
      data: sansRegularData,
      style: 'normal' as const,
      weight: 400 as const,
    },
    {
      name: 'Google Sans',
      data: sansBoldData,
      style: 'normal' as const,
      weight: 700 as const,
    },
  ]

  const pair = phonesSlug?.trim() ? await loadPair(phonesSlug) : null
  const phones: PhoneDetail[] = pair ? pair.phones : []

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
            background: COLORS.bg,
          }}
        >
          <Wordmark />
        </div>
      ),
      { ...size, fonts }
    )
  }

  const count = shown.length

  /* ---------------- Columns ---------------- */

  const rowAvail = size.width - PAGE_PADDING_X * 2
  const gap = count === 4 ? 36 : count === 3 ? 44 : 56
  const maxCol = count === 1 ? 560 : 520

  const colWidth = Math.min(
    maxCol,
    Math.floor((rowAvail - gap * (count - 1)) / count)
  )

  const rowWidth = colWidth * count + gap * (count - 1)
  const rowOffset = Math.round((rowAvail - rowWidth) / 2)

  /* ---------------- Text sizing ----------------
   * Satori does not auto-shrink text, so every line gets ONE font size shared
   * by all phones, chosen so the longest name still fits its column.
   */
  const CHAR_WIDTH = 0.5
  const BRAND_CHAR_WIDTH = 0.68 // Google Sans bold caps
  const BRAND_TRACKING = 3
  const minSize = 18

  const parts = shown.map((phone) =>
    splitModelName(phone.name, phone.brand ?? '')
  )

  const fit = (
    chars: number,
    max: number,
    extraPerChar = 0,
    charWidth = CHAR_WIDTH
  ) =>
    chars === 0
      ? max
      : Math.max(
          minSize,
          Math.min(
            max,
            Math.floor(
              (colWidth * 0.92 - chars * extraPerChar) / (chars * charWidth)
            )
          )
        )

  const mainMax = MAIN_MAX_BY_COUNT[count] ?? 52

  const mainSize = Math.min(...parts.map((p) => fit(p.main.length, mainMax)))

  const brandMax = Math.max(20, Math.round(mainSize * 0.4))
  const brandSize = Math.min(
    brandMax,
    ...parts.map((p) =>
      fit(p.brand.length, brandMax, BRAND_TRACKING, BRAND_CHAR_WIDTH)
    )
  )

  const suffixMax = Math.round(mainSize * 0.72)
  const suffixSize = Math.min(
    suffixMax,
    ...parts.map((p) => fit(p.suffix.length, suffixMax))
  )

  const LINE_H = 1.05
  const brandLineH = Math.round(brandSize * LINE_H) + 6
  const mainLineH = Math.round(mainSize * LINE_H)
  const suffixLineH = Math.round(suffixSize * LINE_H)

  const nameBlockHeight = brandLineH + mainLineH + suffixLineH

  /* ---------------- Vertical layout ---------------- */

  const bodyHeight = size.height - PAGE_PADDING_TOP - HEADER_HEIGHT
  const innerBodyHeight = bodyHeight - 1 // hairline border on top

  // Card starts under the names and bleeds off the bottom edge.
  const cardHeight =
    innerBodyHeight - TOP_MARGIN - nameBlockHeight - NAME_TO_CARD_GAP
  const cardInnerWidth = colWidth - 2 // 1px border each side
  const cardInnerHeight = cardHeight - 1 // top border only

  // The padding is applied on all four sides, so the phone is always fully
  // visible and never touches (or is cut by) the bottom of the canvas.
  const imageBoxWidth = cardInnerWidth - IMAGE_PADDING * 2
  const imageBoxHeight = cardInnerHeight - IMAGE_PADDING * 2

  /* ---------------- Images ---------------- */

  const fetchPx = Math.min(
    1200,
    Math.round(Math.max(imageBoxWidth, imageBoxHeight) * 1.6)
  )

  const images = await Promise.all(
    shown.map((phone) => fetchImageDataUri(phone.main_image_url, fetchPx))
  )

  // Scale each image to fit its box (whole phone visible), centered.
  const placements = images.map((img) => {
    if (!img) {
      return null
    }

    const scale = Math.min(
      imageBoxWidth / img.width,
      imageBoxHeight / img.height
    )

    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)

    return {
      w,
      h,
      left: Math.round((cardInnerWidth - w) / 2),
      top: Math.round((cardInnerHeight - h) / 2),
    }
  })

  /* ---------------- VS badge ---------------- */
  const badge = count === 4 ? 48 : count === 3 ? 56 : 66
  const badgeFont = count === 4 ? 18 : count === 3 ? 20 : 24

  // Center of the gap between column i and i + 1, relative to the row.
  const seamX = (i: number) =>
    (i + 1) * colWidth + i * gap + Math.round(gap / 2)

  const cardTop = TOP_MARGIN + nameBlockHeight + NAME_TO_CARD_GAP
  const badgeTop = Math.round(cardTop + cardHeight / 2 - badge / 2)

  const nameLines = (p: NameParts) => [
    {
      key: 'brand',
      fontFamily: 'Google Sans',
      fontWeight: 700,
      text: p.brand,
      fontSize: brandSize,
      height: brandLineH,
      color: COLORS.inkMuted,
      letterSpacing: BRAND_TRACKING,
    },
    {
      key: 'main',
      fontFamily: 'DM Serif Display',
      fontWeight: 400,
      text: p.main,
      fontSize: mainSize,
      height: mainLineH,
      color: COLORS.ink,
      letterSpacing: 0,
    },
    {
      key: 'suffix',
      fontFamily: 'DM Serif Display',
      fontWeight: 400,
      text: p.suffix,
      fontSize: suffixSize,
      height: suffixLineH,
      color: COLORS.inkSoft,
      letterSpacing: 0,
    },
  ]

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
            padding: `0 ${HEADER_INSET}px`,
            boxSizing: 'border-box',
          }}
        >
          <Wordmark />

          <div
            style={{
              display: 'flex',
              fontFamily: 'Google Sans',
              fontWeight: 700,
              fontSize: 20,
              color: COLORS.inkMuted,
              letterSpacing: 3,
            }}
          >
            COMPARE
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: rowAvail,
            height: bodyHeight,
            borderTop: `1px solid ${COLORS.line}`,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Columns */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: TOP_MARGIN,
              left: rowOffset,
              width: rowWidth,
              height: innerBodyHeight - TOP_MARGIN,
            }}
          >
            {shown.map((phone, i) => (
              <div
                key={phone.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: colWidth,
                  height: '100%',
                  marginLeft: i === 0 ? 0 : gap,
                }}
              >
                {/* Name: brand / main / suffix */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: colWidth,
                    height: nameBlockHeight,
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {nameLines(parts[i]).map((line) => (
                    <div
                      key={line.key}
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        width: colWidth,
                        height: line.height,
                        flexShrink: 0,
                        fontFamily: line.fontFamily,
                        fontWeight: line.fontWeight,
                        fontSize: line.fontSize,
                        lineHeight: 1,
                        letterSpacing: line.letterSpacing,
                        color: line.color,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                      }}
                    >
                      {line.text || ' '}
                    </div>
                  ))}
                </div>

                {/* Phone card: white, bleeds off the bottom edge. The image
                    sits inside padding on all sides, so it is never cropped. */}
                <div
                  style={{
                    display: 'flex',
                    position: 'relative',
                    width: colWidth,
                    height: cardHeight,
                    marginTop: NAME_TO_CARD_GAP,
                    background: '#FFFFFF',
                    border: `1px solid ${COLORS.line}`,
                    borderBottom: 'none',
                    borderRadius: '24px 24px 0 0',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  }}
                >
                  {images[i] && placements[i] ? (
                    <img
                      src={images[i]!.uri}
                      alt=""
                      width={placements[i]!.w}
                      height={placements[i]!.h}
                      style={{
                        position: 'absolute',
                        left: placements[i]!.left,
                        top: placements[i]!.top,
                        width: placements[i]!.w,
                        height: placements[i]!.h,
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: cardInnerWidth,
                        height: cardInnerHeight,
                        fontFamily: 'Instrument Serif',
                        fontStyle: 'italic',
                        fontSize: 30,
                        color: COLORS.inkMuted,
                      }}
                    >
                      Specmob.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* VS badges between the cards (rendered last = painted on top) */}
          {shown.slice(0, -1).map((phone, i) => (
            <div
              key={`vs-${phone.id}`}
              style={{
                position: 'absolute',
                left: rowOffset + seamX(i) - Math.round(badge / 2),
                top: badgeTop,
                width: badge,
                height: badge,
                borderRadius: badge / 2,
                background: COLORS.red,
                border: `4px solid ${COLORS.bg}`,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Google Sans',
                fontWeight: 700,
                fontSize: badgeFont,
                paddingBottom: 2,
                boxSizing: 'border-box',
              }}
            >
              VS
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts }
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
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Compare OG render timeout')),
        RENDER_TIMEOUT_MS
      )
    )

    return await Promise.race([buildResponse(phonesSlug), timeoutPromise])
  } catch (err) {
    console.error('OG image failed for compare route:', err)

    return homepageOgFallback()
  }
}
