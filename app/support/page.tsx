// app/support/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Server, HardDrive, Globe, Sparkles, Heart } from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { c, f, r, sh } from '@/lib/tokens'
import { COST_ITEMS, MONTHLY_GOAL_USD, MONTHLY_RAISED_USD, SUPPORT_LINKS, CRYPTO_ADDRESSES } from '@/lib/supportData'
import CryptoCard from '@/app/components/support/CryptoCard'

export const metadata: Metadata = {
  title: 'Support Specmob',
  description: 'What it costs to run Specmob and how to help keep it free, ad-light, and unbiased.',
  openGraph: {
    title: 'Support Specmob',
    description: 'What it costs to run Specmob and how to help keep it free, ad-light, and unbiased.',
  },
}

const ICON_BY_LABEL: Record<string, React.ReactNode> = {
  'Domain renewal': <Globe size={16} strokeWidth={1.5} />,
  'Database storage': <HardDrive size={16} strokeWidth={1.5} />,
  'API hosting': <Server size={16} strokeWidth={1.5} />,
  'AI copy generation': <Sparkles size={16} strokeWidth={1.5} />,
}

export default function SupportPage() {
  const pct = Math.min(100, Math.round((MONTHLY_RAISED_USD / MONTHLY_GOAL_USD) * 100))

  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F0' }}>
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 var(--page-px) 80px' }}>
        <nav style={{ padding: '24px 0 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/" style={{ color: c.text2, textDecoration: 'none' }}>Home</Link>
          <span>/</span>
          <span>Support</span>
        </nav>

        <div style={{ padding: '40px 0 40px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px',
            background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
            borderRadius: r.full, fontSize: 11, fontWeight: 600, color: c.accent,
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 18,
          }}>
            No ads on this page. No pressure anywhere else.
          </div>
          <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(32px,4vw,48px)', color: c.text1, letterSpacing: '-0.6px', marginBottom: 12, fontWeight: 400 }}>
            Keeping Specmob running
          </h1>
          <p style={{ fontSize: 15, color: c.text3, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Specmob is self-funded and has no sponsored placements. Here's exactly
            what it costs to run each month, and what your support goes toward.
          </p>
        </div>

        <section style={{
          background: '#FFFFFF', border: `1px solid ${c.border}`, borderRadius: r.xl,
          padding: '24px 26px', marginBottom: 20, boxShadow: sh.sm,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: c.text2 }}>Monthly running cost</span>
            <span style={{ fontSize: 13, color: c.text3 }}>
              ${MONTHLY_RAISED_USD.toFixed(2)} of ${MONTHLY_GOAL_USD.toFixed(2)} covered
            </span>
          </div>
          <div style={{ height: 8, background: '#F8F6F0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', borderRadius: 4 }} />
          </div>
          <p style={{ fontSize: 12, color: c.text3, marginTop: 10 }}>
            Updated manually, not a live counter. Figures reflect actual hosting bills.
          </p>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, marginBottom: 16, fontWeight: 400 }}>
            Where it goes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {COST_ITEMS.map(item => (
              <div
                key={item.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  background: '#FFFFFF', border: `1px solid ${c.border}`, borderRadius: r.lg,
                }}
              >
                <div style={{
                  width: 34, height: 34, flexShrink: 0, borderRadius: r.sm,
                  background: '#F8F6F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: c.text2,
                }}>
                  {ICON_BY_LABEL[item.label]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: c.text1 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: c.text3, marginTop: 1 }}>{item.detail}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: c.text1 }}>${item.monthlyUsd.toFixed(2)}/mo</div>
                  <div style={{
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px',
                    color: item.status === 'covered' ? 'var(--green)' : 'var(--orange)',
                  }}>
                    {item.status === 'covered' ? 'Covered' : 'Needed'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ textAlign: 'center', marginBottom: 8 }}>
          <h2 style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, marginBottom: 6, fontWeight: 400 }}>
            Chip in
          </h2>
          <p style={{ fontSize: 13, color: c.text3, marginBottom: 22 }}>
            Entirely optional. The site stays free and unbiased either way.
          </p>

          {SUPPORT_LINKS.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              {SUPPORT_LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="support-link"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                    background: c.primary, color: '#fff', borderRadius: r.full,
                    fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: 'background 0.15s',
                  }}
                >
                  <Heart size={15} strokeWidth={2} /> {link.label}
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>{link.note}</span>
                </a>
              ))}
            </div>
          )}

          {CRYPTO_ADDRESSES.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: c.border }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: c.text3, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Or send crypto directly
                </span>
                <div style={{ flex: 1, height: 1, background: c.border }} />
              </div>
              <CryptoCard entries={CRYPTO_ADDRESSES} />
            </div>
          )}
        </section>
      </div>

      <Footer />

      <style>{`
        .support-link:hover { background: #2A2A42 !important; }
      `}</style>
    </div>
  )
}
