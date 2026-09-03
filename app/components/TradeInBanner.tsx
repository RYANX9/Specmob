'use client'

import Link from 'next/link'
import { RotateCcw, ArrowRight, Smartphone } from 'lucide-react'
import { c, f, r } from '@/lib/tokens'
import { ROUTES } from '@/lib/config'

export default function TradeInBanner() {
  return (
    <section style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '32px var(--page-px) 0' }}>
      <Link
        href={ROUTES.tradein}
        className="tradein-banner"
        style={{
          display: 'flex', alignItems: 'center', gap: 28,
          background: 'linear-gradient(135deg, #1A1A2E 0%, #2A2A4E 100%)',
          borderRadius: r.xl, padding: '28px 36px',
          textDecoration: 'none', position: 'relative', overflow: 'hidden',
        }}
      >
        <div
          className="tradein-banner-icon"
          style={{
            flexShrink: 0, width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <RotateCcw size={26} color="#fff" strokeWidth={1.75} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px',
            background: 'rgba(230,57,70,0.18)', border: '1px solid rgba(230,57,70,0.3)',
            borderRadius: r.full, fontSize: 11, fontWeight: 700, color: '#FF8088',
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10,
          }}>
            Trade-In Estimator
          </div>
          <div style={{ fontFamily: f.serif, fontSize: 'clamp(20px,2.4vw,26px)', color: '#fff', letterSpacing: '-0.4px', marginBottom: 4 }}>
            Got an old phone? See what it&apos;s worth.
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            Condition, battery health, functional issues — get an estimated value in under a minute.
          </div>
        </div>

        <div
          className="tradein-banner-cta"
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 22px', background: c.accent, color: '#fff',
            borderRadius: r.full, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
          }}
        >
          Get my estimate <ArrowRight size={15} strokeWidth={2} />
        </div>

        <Smartphone
          size={140} strokeWidth={0.6} color="rgba(255,255,255,0.05)"
          style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%) rotate(-12deg)', pointerEvents: 'none' }}
        />
      </Link>

      <style>{`
        .tradein-banner { transition: transform 150ms ease, box-shadow 150ms ease; }
        .tradein-banner:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
        @media (max-width: 640px) {
          .tradein-banner { flex-wrap: wrap; padding: 24px 22px !important; gap: 16px !important; }
          .tradein-banner-icon { display: none; }
          .tradein-banner-cta { width: 100%; justify-content: center; }
        }
      `}</style>
    </section>
  )
}
