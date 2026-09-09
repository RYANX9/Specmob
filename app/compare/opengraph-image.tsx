import { ImageResponse } from 'next/og'
import { SITE_URL } from '@/lib/config'

export const runtime = 'edge'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export const alt =
  'Compare up to 4 phones on Specmob and find out which one to pick'

const RENDER_TIMEOUT_MS = 8_000

async function loadFonts() {
  const [italic, regular] = await Promise.all([
    fetch(
      new URL('./InstrumentSerif-Italic.ttf', import.meta.url),
    ).then((res) => res.arrayBuffer()),

    fetch(
      new URL('./InstrumentSerif-Regular.ttf', import.meta.url),
    ).then((res) => res.arrayBuffer()),
  ])

  return [
    {
      name: 'Instrument Serif',
      data: italic,
      style: 'italic' as const,
      weight: 400 as const,
    },
    {
      name: 'Instrument Serif',
      data: regular,
      style: 'normal' as const,
      weight: 400 as const,
    },
  ]
}

async function homepageOgFallback() {
  const res = await fetch(`${SITE_URL}/og-image.png`)
  const buffer = await res.arrayBuffer()

  return new Response(buffer, {
    headers: {
      'content-type': 'image/png',
    },
  })
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
          fontSize: 36,
          color: '#15151F',
        }}
      >
        Specmob
      </div>

      <div
        style={{
          fontFamily: 'Instrument Serif',
          fontStyle: 'italic',
          fontSize: 36,
          color: '#E13847',
          marginLeft: 2,
        }}
      >
        .
      </div>
    </div>
  )
}

function PhoneCard({
  number,
  accent = false,
}: {
  number: string
  accent?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 150,
        height: 235,
        borderRadius: 24,
        background: '#FFFFFF',
        border: accent
          ? '2px solid #E13847'
          : '1px solid #E2DED5',
        position: 'relative',
        boxShadow: '0 8px 24px rgba(21, 21, 31, 0.06)',
      }}
    >
      {/* Camera island */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: 18,
          left: 18,
          width: 48,
          height: 58,
          borderRadius: 15,
          background: '#15151F',
          padding: 7,
          flexDirection: 'column',
          gap: 5,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 12,
            height: 12,
            borderRadius: 999,
            background: '#F7F5F0',
          }}
        />
        <div
          style={{
            display: 'flex',
            width: 12,
            height: 12,
            borderRadius: 999,
            background: '#F7F5F0',
          }}
        />
      </div>

      {/* Phone number */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: 18,
          right: 20,
          fontSize: 17,
          fontWeight: 700,
          color: '#B3AEA2',
        }}
      >
        {number}
      </div>

      {/* Score placeholder */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: 18,
          left: 20,
          fontFamily: 'Instrument Serif',
          fontSize: 25,
          color: accent ? '#E13847' : '#15151F',
        }}
      >
        ?
      </div>
    </div>
  )
}

function Vs() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 42,
        height: 42,
        borderRadius: 999,
        background: '#EAE6DD',
        color: '#777267',
        fontSize: 17,
        fontWeight: 800,
        letterSpacing: -0.5,
      }}
    >
      VS
    </div>
  )
}

function VerdictBadge() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 17px',
        borderRadius: 999,
        background: '#15151F',
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: 700,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 8,
          height: 8,
          borderRadius: 999,
          background: '#E13847',
        }}
      />

      SMART VERDICT
    </div>
  )
}

async function buildResponse(): Promise<Response> {
  const fonts = await loadFonts()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#F7F5F0',
          padding: '50px 64px 48px',
          color: '#15151F',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Wordmark />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 19,
              fontWeight: 800,
              letterSpacing: 1.5,
              color: '#9A9689',
            }}
          >
            PHONE COMPARISON
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 60,
          }}
        >
          {/* Left side */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 515,
            }}
          >
            <VerdictBadge />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginTop: 24,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Instrument Serif',
                  fontSize: 62,
                  lineHeight: 0.98,
                  letterSpacing: -1.5,
                }}
              >
                Compare 4 phones.
              </div>

              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Instrument Serif',
                  fontSize: 62,
                  lineHeight: 0.98,
                  letterSpacing: -1.5,
                }}
              >
                Find your pick.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: 22,
                fontSize: 22,
                lineHeight: 1.35,
                color: '#59564D',
                maxWidth: 500,
              }}
            >
              Compare the trade-offs across specs, performance,
              camera, battery, display and value — then get a
              Smart Verdict showing who wins.
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: 22,
                fontSize: 17,
                fontWeight: 700,
                color: '#8C877B',
              }}
            >
              No sponsored picks · Ranked on specs only
            </div>
          </div>

          {/* Right side */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 500,
            }}
          >
            {/* Comparison cards */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <PhoneCard number="01" accent />
              <Vs />
              <PhoneCard number="02" />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 16,
              }}
            >
              <PhoneCard number="03" />
              <Vs />
              <PhoneCard number="04" />
            </div>

            {/* Winner indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 18,
                padding: '12px 20px',
                borderRadius: 16,
                background: '#FFFFFF',
                border: '1px solid #E2DED5',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: 11,
                  height: 11,
                  borderRadius: 999,
                  background: '#E13847',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#59564D',
                }}
              >
                Smart Verdict picks the winner
              </div>
            </div>
          </div>
        </div>

        {/* Bottom feature strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            width: '100%',
            borderTop: '1px solid #DED9CE',
            paddingTop: 20,
          }}
        >
          {[
            'CAMERA',
            'BATTERY',
            'CHARGING',
            'PERFORMANCE',
            'DISPLAY',
            'WEIGHT',
            'VALUE',
          ].map((item, index) => (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: 1,
                  color: '#8E897D',
                  padding: '0 15px',
                }}
              >
                {item}
              </div>

              {index < 6 && (
                <div
                  style={{
                    display: 'flex',
                    width: 1,
                    height: 15,
                    background: '#D7D2C7',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  )
}

export default async function Image() {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('OG render timeout')),
        RENDER_TIMEOUT_MS,
      ),
    )

    return await Promise.race([
      buildResponse(),
      timeoutPromise,
    ])
  } catch (err) {
    console.error(
      'OG image failed for compare index route:',
      err,
    )

    return homepageOgFallback()
  }
}
