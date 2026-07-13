'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Smartphone } from 'lucide-react'
import { c, f, r } from '@/lib/tokens'
import { ROUTES, brandSlug, phoneSlug } from '@/lib/config'
import { api } from '@/lib/api'
import Navbar from '@/app/components/Navbar'
import type { Phone } from '@/lib/types'

function NotFoundContent() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [trending, setTrending] = useState<Phone[]>([])

  useEffect(() => {
    api.phones.trending(8)
      .then(d => setTrending(d.phones))
      .catch(() => {})
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', flexDirection: 'column' }}>
      <Navbar compareCount={0} />
      
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
          
          <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: f.serif, fontSize: 120, color: c.border, letterSpacing: -8, userSelect: 'none', opacity: 0.6, fontWeight: 400 }}>404</div>
            
            <div style={{ position: 'relative', width: 80, height: 120 }}>
              <div style={{ width: '100%', height: '100%', background: c.surface, border: `2px solid ${c.border}`, borderRadius: 14, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                <div style={{ position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%)', width: 24, height: 4, background: c.border, borderRadius: 2 }} />
                <div style={{ position: 'absolute', top: 10, left: 6, right: 6, bottom: 12, background: c.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Smartphone size={28} color={c.border} strokeWidth={1} style={{ opacity: 0.15 }} />
                </div>
              </div>
            </div>

            <div style={{ position: 'absolute', top: -10, right: -10, width: 44, height: 44, background: c.surface, border: `2px solid ${c.border}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)', zIndex: 2, animation: 'floatBob 3s ease-in-out infinite' }}>
              <img src="/logored.svg" alt="Specmob" style={{ width: 24, height: 24 }} />
            </div>
          </div>

          <h1 style={{ fontFamily: f.serif, fontSize: 32, color: c.text1, letterSpacing: '-0.5px', marginBottom: 14 }}>This page doesn't exist.</h1>
          <p style={{ fontSize: 16, color: c.text2, lineHeight: 1.7, marginBottom: 32 }}>
            Maybe you mistyped the URL, or this phone was discontinued.<br />
            <strong>We only list phones you can actually buy</strong> — discontinued models don't live here.
          </p>

          <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            <input 
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for a phone..." 
              style={{
                width: '100%',
                height: 48,
                padding: '0 16px 0 46px',
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: 'var(--r-full)',
                fontSize: 15,
                color: c.text1
              }}
            />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: c.text3, pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <button type="submit" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '7px 18px', background: c.primary, color: 'white', borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
              Search
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 40, marginTop: 24 }}>
            <Link href="/" style={{ padding: '11px 24px', background: c.primary, color: 'white', borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Go Home
            </Link>
            <Link href="/best/camera-phones" style={{ padding: '11px 24px', border: `1px solid ${c.border}`, color: c.text2, borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Browse Best Phones
            </Link>
            <Link href="/pick" style={{ padding: '11px 24px', border: `1px solid var(--accent-border)`, color: 'var(--accent)', borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 500, background: 'var(--accent-light)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Help Me Choose →
            </Link>
          </div>

          {trending.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: c.text3, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                Trending right now
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                {trending.map(phone => (
                  <Link
                    key={phone.id}
                    href={ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}
                    style={{ padding: '6px 14px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', fontSize: 13, color: c.text2, transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
                  >
                    {phone.model_name}
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      <footer style={{ background: c.primary, color: 'white', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: f.serif, fontSize: 18, color: 'white' }}>
            <img src="/logored.svg" alt="Specmob" style={{ width: 22, height: 22 }} />
            Specmob
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <a href="/" style={{ fontSize: 13, color: '#A0A0B0', transition: 'color 0.15s' }}>Browse</a>
            <a href="/compare" style={{ fontSize: 13, color: '#A0A0B0', transition: 'color 0.15s' }}>Compare</a>
            <a href="/pick" style={{ fontSize: 13, color: '#A0A0B0', transition: 'color 0.15s' }}>Help Me Choose</a>
            <a href="/about" style={{ fontSize: 13, color: '#A0A0B0', transition: 'color 0.15s' }}>About</a>
          </div>
          <span style={{ fontSize: 12, color: '#6A6A7A' }}>© {new Date().getFullYear()} Specmob</span>
        </div>
      </footer>

      <style>{`
        @keyframes floatBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

export default function NotFound() {
  return (
    <Suspense fallback={null}>
      <NotFoundContent />
    </Suspense>
  )
}
