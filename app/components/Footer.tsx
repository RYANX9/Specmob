'use client'

import Link from 'next/link'
import { ROUTES } from '@/lib/config'
import { c, f, mq } from '@/lib/tokens'

const COLS = [
  {
    title: 'Browse',
    links: [
      { label: 'All Phones',     href: ROUTES.home },
      { label: 'Compare',        href: '/compare' },
      { label: 'Help Me Choose', href: ROUTES.pick },
    ],
  },
  {
    title: 'Categories',
    links: [
      { label: 'Best Camera',   href: ROUTES.category('camera-phones') },
      { label: 'Best Battery',  href: ROUTES.category('battery-life') },
      { label: 'Under $300',    href: ROUTES.category('under-300') },
      { label: 'Under $500',    href: ROUTES.category('under-500') },
      { label: 'Gaming',        href: ROUTES.category('gaming-phones') },
      { label: 'Fast Charging', href: ROUTES.category('fast-charging') },
      { label: 'Lightweight',   href: ROUTES.category('lightweight') },
      { label: 'Compact',       href: ROUTES.category('compact-phones') },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Specmob', href: '/about' },
      { label: 'How We Score',   href: '/about#scoring' },
      { label: 'Data Sources',   href: '/about#data' },
      { label: 'Contact',        href: '/about#contact' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use',   href: '/terms' },
    ],
  },
]

export default function Footer() {
  return (
    <footer style={{ background: c.primary, color: '#A0A0B0', padding: '56px 0 28px', marginTop: 60 }}>
      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px)' }}>
        <div className="footer-inner-grid" style={{ marginBottom: 40 }}>
          <div className="footer-brand-col">
            <div style={{ fontFamily: f.serif, fontSize: 22, color: '#fff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/logored.svg" alt="Specmob" style={{ height: '1em', width: 'auto' }} />
              Specmob
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.65, maxWidth: 260, color: '#8A8A9A' }}>
              Find and compare phones that are actually available to buy.
              No clutter, no bias, no discontinued models.
            </p>
          </div>

          {COLS.map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14, color: '#7A7A8A' }}>
                {col.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {col.links.map(l => (
                  <Link
                    key={l.label}
                    href={l.href}
                    style={{ fontSize: 14, color: '#A0A0B0', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#A0A0B0' }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          paddingTop: 24,
          borderTop: '1px solid #2A2A3E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <span style={{ fontSize: 12, color: '#6A6A7A' }}>
            © {new Date().getFullYear()} Specmob. Spec data sourced from public manufacturer listings and GSMArena.
            All trademarks belong to their respective owners.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#6A6A7A' }}>
              Some purchase links are affiliate links. We may earn a commission at no cost to you.
            </span>
            <span style={{ fontSize: 12, color: '#6A6A7A', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, background: '#2D6A4F', borderRadius: '50%', display: 'block' }} />
              Specs updated daily
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .footer-inner-grid {
          display: grid;
          grid-template-columns: 1.4fr repeat(3, 1fr);
          gap: 40px;
        }
        ${mq.lg} {
          .footer-inner-grid { grid-template-columns: repeat(2, 1fr); gap: 32px; }
          .footer-brand-col { grid-column: 1 / -1; }
        }
        ${mq.sm} {
          .footer-inner-grid { grid-template-columns: 1fr 1fr; gap: 24px 16px; }
          .footer-brand-col { text-align: center; }
          .footer-brand-col p { max-width: 100% !important; }
        }
        @media (max-width: 400px) {
          .footer-inner-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </footer>
  )
}
