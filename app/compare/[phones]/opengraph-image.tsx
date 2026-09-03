import { ImageResponse } from 'next/og'
import { parseCompareSlug, resolveComparePhones } from '@/lib/api'
import { SITE_URL } from '@/lib/config'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Phone comparison on Specmob'

const IMAGE_FETCH_TIMEOUT_MS = 4_000
const RENDER_TIMEOUT_MS = 8_000

async function loadWordmarkFont() {
  return fetch(new URL('./InstrumentSerif-Italic.ttf', import.meta.url)).then(res => res.arrayBuffer())
}

async function homepageOgFallback() {
  const res = await fetch(`${SITE_URL}/og-image.png`)
  const buffer = await res.arrayBuffer()
  return new Response(buffer, { headers: { 'content-type': 'image/png' } })
}

// Fetches a remote image and inlines it as a data URI so ImageResponse never
// has to reach out to Supabase itself. Runs with its own short timeout so one
// slow phone photo can't drag the whole comparison render past the function
// limit — on any failure it just resolves to null and that phone renders
// without an image instead of stalling everyone else.
async function fetchImageDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/png'
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
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
      <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 34, color: '#15151F' }}>
        Specmob
      </div>
      <div style={{ fontFamily: 'Instrument Serif', fontSize: 34, color: '#E13847', marginLeft: 2 }}>.</div>
    </div>
  )
}

async function buildResponse(phonesSlug: string | undefined): Promise<Response> {
  const fontData = await loadWordmarkFont()
  const fonts = [{ name: 'Instrument Serif', data: fontData, style: 'italic' as const, weight: 400 as const }]

  const slugParts = phonesSlug?.trim() ? parseCompareSlug(phonesSlug) : []
  const { phones } = slugParts.length ? await resolveComparePhones(slugParts) : { phones: [] }
  const shown = phones.slice(0, 3)

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
      { ...size, fonts },
    )
  }

  // Fetch every phone image in parallel instead of letting ImageResponse
  // pull each one sequentially — see fetchImageDataUri for why.
  const imageUris = await Promise.all(shown.map(p => fetchImageDataUri(p.main_image_url)))

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

        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {shown.map((phone, i) => (
            <div key={phone.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 280 }}>
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
                  }}
                >
                  {imageUris[i] && (
                    <img
                      src={imageUris[i]!}
                      alt=""
                      width={180}
                      height={280}
                      style={{ objectFit: 'contain', width: 180, height: 280 }}
                    />
                  )}
                </div>
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
                  {phone.brand} {phone.model_name}
                </div>
              </div>
              {i < shown.length - 1 && (
                <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#E13847', margin: '0 20px' }}>
                  VS
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}

export default async function Image({ params }: { params: Promise<{ phones: string }> }) {
  const { phones: phonesSlug } = await params

  try {
    // Overall guard: if the whole render (data fetch + image fetch + satori)
    // takes too long, bail to the static homepage image rather than risk a
    // hard function timeout with no response at all.
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('OG render timeout')), RENDER_TIMEOUT_MS),
    )
    return await Promise.race([buildResponse(phonesSlug), timeoutPromise])
  } catch (err) {
    console.error('OG image failed for compare route:', err)
    return homepageOgFallback()
  }
}
