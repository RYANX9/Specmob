// app/brand/[brand]/[model]/opengraph-image.tsx

import { ImageResponse } from 'next/og'
import { getPhone } from '@/lib/api'
import { resolveDisplayPrice } from '@/lib/price'
import { SITE_URL, stripBrandFromDisplayName } from '@/lib/config'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Phone specs and price on Specmob'

async function loadWordmarkFont() {
  return fetch(new URL('./InstrumentSerif-Italic.ttf', import.meta.url)).then(res => res.arrayBuffer())
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
      <div style={{ fontFamily: 'Instrument Serif', fontSize: 34, color: '#E13847', marginLeft: 2 }}>.</div>
    </div>
  )
}

export default async function Image({ params }: { params: Promise<{ brand: string; model: string }> }) {
  const { brand, model } = await params

  try {
    const [phone, fontData] = await Promise.all([
      getPhone(`${brand}-${model}`),
      loadWordmarkFont(),
    ])
    const fonts = [{ name: 'Instrument Serif', data: fontData, style: 'italic' as const, weight: 400 as const }]

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
        { ...size, fonts },
      )
    }

    const price = resolveDisplayPrice(phone)
    const modelDisplayName = stripBrandFromDisplayName(phone.model_name, phone.brand)

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
          <div style={{ display: 'flex' }}>
            <Wordmark />
          </div>

          <div style={{ display: 'flex', flex: 1, alignItems: 'center', marginTop: 32 }}>
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
              }}
            >
              {phone.main_image_url && (
                <img
                  src={phone.main_image_url}
                  alt=""
                  width={300}
                  height={380}
                  style={{ objectFit: 'contain', width: 300, height: 380 }}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
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
              {price != null && (
                <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: '#E13847', marginTop: 28 }}>
                  ${Math.round(price).toLocaleString()}
                </div>
              )}
              <div style={{ display: 'flex', fontSize: 20, color: '#59564D', marginTop: 24 }}>
                Full specs &amp; price comparison
              </div>
            </div>
          </div>
        </div>
      ),
      { ...size, fonts },
    )
  } catch (err) {
    console.error('OG image failed for model route:', err)
    return homepageOgFallback()
  }
}
