'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { c, r, sh, z } from '@/lib/tokens'
import { retailerDisplayName, type RetailerOffer } from '@/lib/retailer'

function formatOfferPrice(offer: RetailerOffer): string | null {
  if (offer.price == null) return null
  const currency = offer.currency || 'USD'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(offer.price)
  } catch {
    return `${offer.price} ${currency}`
  }
}

export default function AlternateOfferPicker({ offers }: { offers: RetailerOffer[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  if (offers.length === 0) return null

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Other places to buy this phone"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, borderRadius: r.full,
          border: `1px solid ${c.border}`, background: c.surface,
          color: c.text2, cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border }}
      >
        <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Alternate retailers"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            minWidth: 240, background: c.surface, border: `1px solid ${c.border}`,
            borderRadius: r.lg, boxShadow: sh.lg, overflow: 'hidden',
            zIndex: z.dropdown, animation: 'fadeIn 0.12s ease',
          }}
        >
          <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3, borderBottom: `1px solid ${c.border}` }}>
            Also available from
          </div>
          {offers.map((offer, i) => {
            const price = formatOfferPrice(offer)
            return (
              <a
                key={`${offer.retailer}-${offer.region}-${i}`}
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, padding: '11px 14px', textDecoration: 'none',
                  borderBottom: i < offers.length - 1 ? `1px solid ${c.border}` : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = c.bg }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.text1 }}>
                    {retailerDisplayName(offer.retailer)}
                  </div>
                  <div style={{ fontSize: 11, color: c.text3, marginTop: 1 }}>
                    {offer.region}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {price && <span style={{ fontSize: 13, fontWeight: 700, color: c.text1 }}>{price}</span>}
                  <ExternalLink size={12} color={c.text3} />
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}