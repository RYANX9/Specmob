'use client'

import Link from 'next/link'
import { Instagram } from 'lucide-react'
import { ROUTES } from '@/lib/config'
import { TEAM } from '@/lib/team'
import { c, f, mq } from '@/lib/tokens'
import FeedbackTrigger from './FeedbackTrigger'
import FeedbackModal from './FeedbackModal'

const COLS = [
  {
    title: 'Browse',
    links: [
      { label: 'All Phones',     href: ROUTES.home },
      { label: 'Compare',        href: ROUTES.compare() },
      { label: 'Help Me Choose', href: ROUTES.pick },
      { label: 'Trade-in',       href: ROUTES.tradein },
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
      { label: 'Foldables',      href: ROUTES.category('foldables') },
      { label: 'Compact',       href: ROUTES.category('compact-phones') },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Specmob', href: ROUTES.about },
      { label: 'How We Score',   href: `${ROUTES.about}#scoring` },
      { label: 'Data Sources',   href: `${ROUTES.about}#data` },
      { label: 'Contact',        href: ROUTES.contact },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use',   href: '/terms' },
      { label: 'Support Specmob', href: ROUTES.support },
    ],
  },
]

const xUrl = 'https://x.com/specmobplatform'
const instagramUrl = 'https://instagram.com/specmobplatfrom'

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer style={{ background: c.primary, color: 'rgba(255,255,255,0.55)', padding: '0 0 0' }}>
      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '64px var(--page-px) 48px' }} className="footer-inner-grid">
        <div className="footer-brand-col">
          <div style={{ fontFamily: f.serif, fontStyle: 'italic', fontSize: 23, color: '#fff', marginBottom: 14, letterSpacing: '-0.3px' }}>
            Specmob<span style={{ color: c.accent, fontStyle: 'normal' }}>.</span>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, maxWidth: 260, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>
            Find and compare phones that are actually available to buy.
            No clutter, no bias, no discontinued models.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Got a bug or an idea?</span>
            <FeedbackTrigger variant="footer" />
          </div>
          <div style={{ display: 'flex', gap: 8 }} className="footer-social">
            <a
              href={xUrl} target="_blank" rel="noopener noreferrer" aria-label="X"
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}
            >
              <XIcon size={14} />
            </a>
            <a
              href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}
            >
              <Instagram size={14} />
            </a>
          </div>
        </div>

        {COLS.map(col => (
          <div key={col.title}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, color: 'rgba(255,255,255,0.35)' }}>
              {col.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {col.links.map(l => (
                <Link
                  key={l.label}
                  href={l.href}
                  style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', transition: 'color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)' }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{
          maxWidth: 'var(--max-w)', margin: '0 auto', padding: '22px var(--page-px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
            © {new Date().getFullYear()} Specmob. Spec data sourced from public manufacturer listings and GSMArena.
            All trademarks belong to their respective owners.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
              Some purchase links are affiliate links. We may earn a commission at no cost to you.
            </span>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, background: c.green, borderRadius: '50%', display: 'block' }} />
              Specs updated daily
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .footer-inner-grid {
          display: grid;
          grid-template-columns: 1.3fr repeat(3, 1fr);
          gap: 40px;
        }
        ${mq.lg} {
          .footer-inner-grid { grid-template-columns: repeat(2, 1fr); gap: 32px; }
          .footer-brand-col { grid-column: 1 / -1; }
        }
        ${mq.sm} {
          .footer-inner-grid { grid-template-columns: 1fr 1fr; gap: 24px 16px; }
          .footer-brand-col { text-align: center; }
          .footer-brand-col p { max-width: 100% !important; margin-left: auto; margin-right: auto; }
          .footer-social { justify-content: center; }
        }
        @media (max-width: 400px) {
          .footer-inner-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <FeedbackModal />
    </footer>
  )
}
