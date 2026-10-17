// app/best/[category]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { getCategory } from '@/lib/api'
import { SITE_URL } from '@/lib/config'
import { paletteFor } from '@/app/components/category/categoryVisuals'

export const runtime = 'edge'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export const alt = 'Phone rankings on Specmob'

const DATA_TIMEOUT_MS = 6_000
const RENDER_TIMEOUT_MS = 10_000

/* ------------------------------------------------------------------ *
 * TUNABLES
 * ------------------------------------------------------------------ */

// Space under the text block, kept clear of the pill X draws bottom-left.
const SAFE_BOTTOM = 96

// Width of the tinted panel on the right (px).
const PANEL_WIDTH = 460

// Space between the text column and the panel (px).
const PANEL_GAP = 40

// Podium bars: width, gap, heights left to right (rank 3, 2, 1).
const BAR_WIDTH = 104
const BAR_GAP = 24
const BAR_HEIGHTS = [170, 260, 360]

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

  return [
    { name: 'Instrument Serif', data: italicData, style: 'italic' as const, weight: 400 as const },
    { name: 'Instrument Serif', data: regularData, style: 'normal' as const, weight: 400 as const },
  ]
}

async function homepageOgFallback() {
  const res = await fetch(`${SITE_URL}/og-image.png`)

  if (!res.ok) {
    throw new Error(`Failed to load homepage OG image: ${res.status}`)
  }

  return new Response(await res.arrayBuffer(), {
    headers: { 'content-type': 'image/png' },
  })
}

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

/** Title sized by length; Satori does not auto-shrink and wraps by width. */
function titleSize(title: string): number {
  if (title.length <= 18) return 96
  if (title.length <= 24) return 84
  return 72
}

async function loadCategory(slug: string) {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), DATA_TIMEOUT_MS))
  return Promise.race([getCategory(slug), timeout])
}

async function buildResponse(slug: string): Promise<Response> {
  const [fonts, data] = await Promise.all([loadFonts(), loadCategory(slug)])

  if (!data) {
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

  const pal = paletteFor(data.alias_of ? data.slug : slug)

  // Year only, no phone data is rendered.
  const years = data.phones.map((p) => p.release_year).filter((y): y is number => !!y)
  const year = years.length ? Math.max(...years) : new Date().getFullYear()

  const rowAvail = size.width - PAGE_PADDING_X * 2
  const bodyHeight = size.height - PAGE_PADDING_TOP - HEADER_HEIGHT
  const panelHeight = bodyHeight - 1 - PANEL_TOP_MARGIN
  const panelInnerWidth = PANEL_WIDTH - 2
  const textColWidth = rowAvail - PANEL_WIDTH - PANEL_GAP
  const podiumWidth = BAR_WIDTH * 3 + BAR_GAP * 2

  const ranks = [3, 2, 1]

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
            BEST PHONES
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
              paddingBottom: SAFE_BOTTOM,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
              <div
                style={{
                  display: 'flex',
                  width: 36,
                  height: 6,
                  borderRadius: 3,
                  background: pal.iconColor,
                  marginRight: 14,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Instrument Serif',
                  fontSize: 28,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                  color: pal.iconColor,
                }}
              >
                {year} ranking
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                fontFamily: 'Instrument Serif',
                fontSize: titleSize(data.title),
                lineHeight: 1.02,
                color: COLORS.ink,
              }}
            >
              {data.title}
            </div>

            {data.ranked_count > 0 ? (
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Instrument Serif',
                  fontSize: 30,
                  color: COLORS.inkSoft,
                  marginTop: 24,
                }}
              >
                {data.ranked_count} phones ranked on specs
              </div>
            ) : null}
          </div>

          {/* Tinted podium panel, bleeds off the bottom edge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              width: PANEL_WIDTH,
              height: panelHeight,
              marginLeft: PANEL_GAP,
              marginTop: PANEL_TOP_MARGIN,
              background: pal.bg,
              border: `1px solid ${COLORS.line}`,
              borderBottom: 'none',
              borderRadius: '28px 28px 0 0',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                width: podiumWidth,
                maxWidth: panelInnerWidth,
              }}
            >
              {ranks.map((rank, i) => {
                const top = rank === 1
                return (
                  <div
                    key={rank}
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      width: BAR_WIDTH,
                      height: BAR_HEIGHTS[i],
                      marginLeft: i === 0 ? 0 : BAR_GAP,
                      paddingTop: 22,
                      background: top ? pal.iconColor : pal.iconBg,
                      borderRadius: '24px 24px 0 0',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        fontFamily: 'Instrument Serif',
                        fontStyle: 'italic',
                        fontSize: 60,
                        lineHeight: 1,
                        color: top ? '#FFFFFF' : pal.iconColor,
                      }}
                    >
                      {rank}
                    </div>
                  </div>
                )
              })}
            </div>
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
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Category OG render timeout')), RENDER_TIMEOUT_MS)
    )

    return await Promise.race([buildResponse(category), timeout])
  } catch (err) {
    console.error('OG image failed for category route:', err)

    return homepageOgFallback()
  }
}
