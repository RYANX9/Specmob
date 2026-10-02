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

/* ------------------------------------------------------------------ *
 * TUNABLES
 * ------------------------------------------------------------------ */

// Images are always drawn at the FULL column width (never clipped sideways).
// The visible height is whatever space is left under the names, so fewer
// phones = wider columns = taller images = deeper bottom crop, and 4 phones
// usually show the whole phone.
//
// This is an extra cap on top of that: the max fraction of the image height
// that may be shown, by number of phones. 1.0 = no extra cap.
// Lower a value (e.g. 0.6) to force a deeper crop for that count.
const IMAGE_VISIBLE_BY_COUNT: Record<number, number> = {
  1: 1.0,
  2: 1.0,
  3: 1.0,
  4: 1.0,
}

/* ------------------------------------------------------------------ */

const PAGE_PADDING_X = 32
const PAGE_PADDING_TOP = 40
const HEADER_HEIGHT = 44
const MIN_TOP_SPACE = 22 // minimum space between header rule and names
const NAME_TO_PHONE_GAP = 12

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

async function loadFonts() {
  const [italicData, regularData] = await Promise.all([
    loadFile(new URL('./InstrumentSerif-Italic.ttf', import.meta.url)),
    loadFile(new URL('./InstrumentSerif-Regular.ttf', import.meta.url)),
  ])

  return { italicData, regularData }
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
      // If we cannot read the size, assume square; objectFit keeps it safe.
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
 * Model name splitting  ->  brand / main / suffix
 *
 *  "Oppo Find X10 Pro Max"    -> OPPO     / FIND X10   / PRO MAX
 *  "Xiaomi 18 Pro Max"        -> XIAOMI   / 18         / PRO MAX
 *  "Apple iPhone 15 Pro Max"  -> APPLE    / IPHONE 15  / PRO MAX
 *  "Samsung Galaxy S26 Ultra" -> SAMSUNG  / GALAXY S26 / ULTRA
 *  "Nothing Phone (4b)"       -> NOTHING  / PHONE      / (4B)
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

function splitModelName(name: string): NameParts {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) {
    return { brand: '', main: '', suffix: '' }
  }

  if (words.length === 1) {
    return { brand: '', main: words[0].toUpperCase(), suffix: '' }
  }

  let i = words.length

  while (i > 1 && SUFFIX_WORDS.has(words[i - 1].toLowerCase())) {
    i--
  }

  // No suffix words found: the last word becomes the suffix line.
  if (i === words.length) {
    i = words.length - 1
  }

  const prefix = words.slice(0, i)
  const suffix = words.slice(i).join(' ').toUpperCase()

  if (prefix.length >= 2) {
    return {
      brand: prefix[0].toUpperCase(),
      main: prefix.slice(1).join(' ').toUpperCase(),
      suffix,
    }
  }

  return { brand: '', main: prefix[0].toUpperCase(), suffix }
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

  const slugParts = phonesSlug?.trim() ? parseCompareSlug(phonesSlug) : []

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
  const gap = count === 4 ? 24 : count === 3 ? 32 : 48
  const maxCol = count === 1 ? 520 : 460

  const colWidth = Math.min(
    maxCol,
    Math.floor((rowAvail - gap * (count - 1)) / count)
  )

  const rowWidth = colWidth * count + gap * (count - 1)
  const rowOffset = Math.round((rowAvail - rowWidth) / 2)

  // Fetch a bit larger than we draw so the image stays sharp.
  const fetchPx = Math.min(1200, Math.round(colWidth * 2.2))

  const images = await Promise.all(
    shown.map((phone) => fetchImageDataUri(phone.main_image_url, fetchPx))
  )

  // Full column width, height follows each image's own aspect ratio.
  const imageHeights = images.map((img) =>
    img ? Math.round((colWidth * img.height) / img.width) : null
  )

  /* ---------------- Text sizing ----------------
   * Satori does not auto-shrink text, so every line gets ONE font size shared
   * by all phones, chosen so the longest name still fits its column.
   * Lines also clip inside their column as a safety net.
   */
  const CHAR_WIDTH = 0.5
  const BRAND_TRACKING = 3 // px letter-spacing on the small brand line
  const minSize = 18

  const parts = shown.map((phone) => splitModelName(phone.model_name))

  const fit = (chars: number, max: number, extraPerChar = 0) =>
    chars === 0
      ? max
      : Math.max(
          minSize,
          Math.min(
            max,
            Math.floor(
              (colWidth * 0.92 - chars * extraPerChar) / (chars * CHAR_WIDTH)
            )
          )
        )

  const mainMax = count <= 2 ? 84 : count === 3 ? 72 : 60

  const mainSize = Math.min(...parts.map((p) => fit(p.main.length, mainMax)))

  const brandMax = Math.round(mainSize * 0.4)
  const brandSize = Math.min(
    brandMax,
    ...parts.map((p) => fit(p.brand.length, brandMax, BRAND_TRACKING))
  )

  const suffixMax = Math.round(mainSize * 0.72)
  const suffixSize = Math.min(
    suffixMax,
    ...parts.map((p) => fit(p.suffix.length, suffixMax))
  )

  const LINE_H = 1.05
  const brandLineH = Math.round(brandSize * LINE_H) + 4
  const mainLineH = Math.round(mainSize * LINE_H)
  const suffixLineH = Math.round(suffixSize * LINE_H)

  const nameBlockHeight = brandLineH + mainLineH + suffixLineH + 4

  /* ---------------- Vertical layout ----------------
   * Names + phones form ONE block pinned to the bottom of the canvas.
   * Leftover space ends up under the header rule, never between a name and
   * its phone.
   */
  const bodyHeight = size.height - PAGE_PADDING_TOP - HEADER_HEIGHT
  const maxBlockHeight = bodyHeight - MIN_TOP_SPACE

  // The window can never be taller than the shortest image, otherwise a
  // blank strip would show at the bottom of that column.
  const knownHeights = imageHeights.filter((h): h is number => h !== null)

  const shortestImage = knownHeights.length
    ? Math.min(...knownHeights)
    : colWidth

  const windowHeight = Math.max(
    120,
    Math.min(
      Math.round(shortestImage * (IMAGE_VISIBLE_BY_COUNT[count] ?? 1)),
      maxBlockHeight - nameBlockHeight - NAME_TO_PHONE_GAP
    )
  )

  const blockHeight = nameBlockHeight + NAME_TO_PHONE_GAP + windowHeight

  /* ---------------- VS badge ---------------- */
  const badge = count === 4 ? 46 : count === 3 ? 54 : 64
  const badgeFont = count === 4 ? 24 : count === 3 ? 28 : 34

  // Seam (center of the gap) x-position for divider i, relative to the block.
  const seamX = (i: number) =>
    (i + 1) * colWidth + i * gap + Math.round(gap / 2)

  const nameLines = (p: NameParts) => [
    {
      key: 'brand',
      text: p.brand,
      fontSize: brandSize,
      height: brandLineH,
      color: COLORS.inkMuted,
      letterSpacing: BRAND_TRACKING,
    },
    {
      key: 'main',
      text: p.main,
      fontSize: mainSize,
      height: mainLineH,
      color: COLORS.ink,
      letterSpacing: 0,
    },
    {
      key: 'suffix',
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
        {/* Header with hairline rule */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            height: HEADER_HEIGHT,
            flexShrink: 0,
            padding: `0 ${48 - PAGE_PADDING_X}px`,
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
          }}
        >
          {/* Vertical hairlines between columns (full body height) */}
          {shown.slice(0, -1).map((phone, i) => (
            <div
              key={`line-${phone.id}`}
              style={{
                position: 'absolute',
                top: 0,
                left: rowOffset + seamX(i),
                width: 1,
                height: bodyHeight,
                background: COLORS.line,
              }}
            />
          ))}

          {/* Names + phones block, pinned to bottom */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: rowOffset,
              display: 'flex',
              width: rowWidth,
              height: blockHeight,
            }}
          >
            {shown.map((phone, i) => (
              <div
                key={phone.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: colWidth,
                  height: blockHeight,
                  marginLeft: i === 0 ? 0 : gap,
                }}
              >
                {/* Name: three stacked lines */}
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
                        fontFamily: 'Instrument Serif',
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

                {/* Phone window: bottom of image is cut by the canvas */}
                <div
                  style={{
                    display: 'flex',
                    position: 'relative',
                    width: colWidth,
                    height: windowHeight,
                    marginTop: NAME_TO_PHONE_GAP,
                    overflow: 'hidden',
                  }}
                >
                  {images[i] ? (
                    <img
                      src={images[i]!.uri}
                      alt=""
                      width={colWidth}
                      height={imageHeights[i]!}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: colWidth,
                        height: imageHeights[i]!,
                        objectFit: 'contain',
                        objectPosition: 'center top',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: colWidth,
                        height: windowHeight,
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

            {/* VS badges on the hairlines (rendered last = painted on top) */}
            {shown.slice(0, -1).map((phone, i) => (
              <div
                key={`vs-${phone.id}`}
                style={{
                  position: 'absolute',
                  left: seamX(i) - Math.round(badge / 2),
                  top: Math.round(nameBlockHeight / 2 - badge / 2),
                  width: badge,
                  height: badge,
                  borderRadius: badge / 2,
                  background: COLORS.red,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Instrument Serif',
                  fontStyle: 'italic',
                  fontSize: badgeFont,
                  paddingBottom: 2,
                  boxSizing: 'border-box',
                }}
              >
                vs
              </div>
            ))}
          </div>
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
