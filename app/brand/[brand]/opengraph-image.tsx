import { ImageResponse } from 'next/og'
import { getBrandInfo } from '@/lib/brandData'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Brand phones — specs, prices and comparisons on Specmob'

export default async function Image({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params
  const info = getBrandInfo(brand)
  const brandName = info?.name ?? brand.replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #15151F 0%, #2A2A42 100%)',
        }}
      >
        {info?.logo && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 280,
              height: 280,
              background: '#FFFFFF',
              borderRadius: 32,
              marginBottom: 48,
              padding: 32,
            }}
          >
            <img
              src={info.logo}
              alt=""
              width={216}
              height={216}
              style={{ objectFit: 'contain', width: 216, height: 216 }}
            />
          </div>
        )}
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>
          {brandName} Phones
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#B8B4A8', marginTop: 16 }}>
          Specs, Prices &amp; Comparisons — Specmob
        </div>
      </div>
    ),
    { ...size },
  )
}
