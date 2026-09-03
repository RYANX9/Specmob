import { ImageResponse } from 'next/og'
import { SITE_URL } from '@/lib/config'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Compare phones side by side on Specmob'

const RENDER_TIMEOUT_MS = 8_000

async function loadFonts() {
  const [italic, regular] = await Promise.all([
    fetch(new URL('./InstrumentSerif-Italic.ttf', import.meta.url)).then(res => res.arrayBuffer()),
    fetch(new URL('./InstrumentSerif-Regular.ttf', import.meta.url)).then(res => res.arrayBuffer()),
  ])
  return [
    { name: 'Instrument Serif', data: italic, style: 'italic' as const, weight: 400 as const },
    { name: 'Instrument Serif', data: regular, style: 'normal' as const, weight: 400 as const },
  ]
}

async function homepageOgFallback() {
  const res = await fetch(`${SITE_URL}/og-image.png`)
  const buffer = await res.arrayBuffer()
  return new Response(buffer, { headers: { 'content-type': 'image/png' } })
}

function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 34, color: '#15151F' }}>
        Specmob
      </div>
      <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 34, color: '#E13847', marginLeft: 2 }}>.</div>
    </div>
  )
}

function PhoneSlot({ filled }: { filled: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        width: 130,
        height: 230,
        borderRadius: 20,
        background: filled ? '#FFFFFF' : 'transparent',
        border: filled ? '1px solid #E7E2D8' : '2px dashed #D2CBBC',
      }}
    />
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
          padding: '56px 64px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Wordmark />
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: '#9A9689', letterSpacing: 1 }}>
            COMPARE
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <PhoneSlot filled />
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#B8B4A8' }}>vs</div>
          <PhoneSlot filled />
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#B8B4A8' }}>vs</div>
          <PhoneSlot filled={false} />
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#B8B4A8' }}>vs</div>
          <PhoneSlot filled={false} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: 44, color: '#15151F', marginBottom: 8 }}>
            Compare up to 4 phones side by side
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: '#59564D' }}>
            Specs, benchmarks, and value scores — no sponsored picks
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}

export default async function Image() {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('OG render timeout')), RENDER_TIMEOUT_MS),
    )
    return await Promise.race([buildResponse(), timeoutPromise])
  } catch (err) {
    console.error('OG image failed for compare index route:', err)
    return homepageOgFallback()
  }
}
