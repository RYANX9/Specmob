'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, ChevronDown, X, Menu } from 'lucide-react'
import { api } from '@/lib/api'
import { ROUTES, brandSlug, phoneSlug } from '@/lib/config'
import { c, f, z } from '@/lib/tokens'
import type { Phone } from '@/lib/types'

interface NavbarProps {
  compareCount?: number
  onOpenCompare?: () => void
}

export default function Navbar({ compareCount = 0, onOpenCompare }: NavbarProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const urlQ         = searchParams.get('q') ?? ''

  const [query, setQuery]           = useState(urlQ)
  const [results, setResults]       = useState<Phone[]>([])
  const [searching, setSearching]   = useState(false)
  const [focused, setFocused]       = useState(false)
  const [activeIdx, setActiveIdx]   = useState(-1)
  const [brands, setBrands]         = useState<{ brand: string; count: number }[]>([])
  const [brandsOpen, setBrandsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled]     = useState(false)

  const inputRef  = useRef<HTMLInputElement>(null)
  const brandsRef = useRef<HTMLDivElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout>>()

  // Module-level brand cache: avoid re-fetching on every page navigation
  const brandsCache = useRef<{ data: { brand: string; count: number }[]; ts: number } | null>(null)

  useEffect(() => { setQuery(urlQ) }, [urlQ])

  useEffect(() => {
    const CACHE_TTL = 60 * 60 * 1000 // 1 hour
    const now = Date.now()
    if (brandsCache.current && now - brandsCache.current.ts < CACHE_TTL) {
      setBrands(brandsCache.current.data.slice(0, 24))
      return
    }
    api.brands.list().then(d => {
      const sliced = d.brands.slice(0, 24)
      brandsCache.current = { data: sliced, ts: now }
      setBrands(sliced)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close brands dropdown on outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (brandsRef.current && !brandsRef.current.contains(e.target as Node))
        setBrandsOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // Close brands dropdown on Escape key
  useEffect(() => {
    if (!brandsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBrandsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [brandsOpen])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
    setBrandsOpen(false)
  }, [pathname])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // Reset keyboard active index when results change
  useEffect(() => { setActiveIdx(-1) }, [results])

  const runSearch = useCallback((q: string) => {
    clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); setSearching(false); return }
    setSearching(true)
    timerRef.current = setTimeout(async () => {
      try {
        const d = await api.phones.search({ q, page_size: 6 })
        setResults(d.results)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 280)
  }, [])

  const handleQueryChange = (v: string) => {
    setQuery(v)
    runSearch(v)
  }

  const handlePhoneSelect = (phone: Phone) => {
    setQuery('')
    setResults([])
    setFocused(false)
    setActiveIdx(-1)
    router.push(ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (activeIdx >= 0 && results[activeIdx]) {
      handlePhoneSelect(results[activeIdx])
      return
    }
    if (!query.trim()) return
    setFocused(false)
    setResults([])
    router.push(`${ROUTES.home}?q=${encodeURIComponent(query.trim())}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIdx(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIdx(prev => Math.max(prev - 1, -1))
        break
      case 'Escape':
        setFocused(false)
        setActiveIdx(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setActiveIdx(-1)
    setSearching(false)
    inputRef.current?.focus()
    if (pathname === '/') router.replace('/')
  }

  // Always navigate: open /compare directly when <2 phones,
  // or call onOpenCompare callback (which scrolls/routes) when >=2
  const handleCompareClick = () => {
    if (compareCount >= 2 && onOpenCompare) {
      onOpenCompare()
    } else {
      router.push('/compare')
    }
  }

  // Show dropdown when: focused, has query, AND either has results, is searching,
  // or query is long enough to display a "no results" state
  const showDropdown = focused && query.length > 0 && (
    results.length > 0 || searching || (!searching && query.length > 1)
  )

  return (
    <>
      <nav
        role="navigation"
        aria-label="Main navigation"
        style={{
          position: 'sticky', top: 0, zIndex: z.nav,
          height: 'var(--nav-h)',
          background: scrolled ? 'rgba(248,248,245,0.92)' : c.bg,
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: `1px solid ${c.border}`,
          transition: 'background 0.2s ease, box-shadow 0.2s ease',
          boxShadow: scrolled ? '0 1px 0 var(--border)' : 'none',
        }}
      >
        <div style={{
          maxWidth: 'var(--max-w)', margin: '0 auto',
          padding: '0 var(--page-px)', height: '100%',
          display: 'flex', alignItems: 'center', gap: 24,
        }}>
          <Link href={ROUTES.home} style={{
            fontFamily: f.serif, fontSize: 22, color: c.primary,
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.4px',
          }}>
            <img src="/logored.svg" alt="Mobylite" style={{ height: '1em', width: 'auto' }} />
            Mobylite
          </Link>

          {/* Desktop search — full combobox ARIA pattern */}
          <div
            role="combobox"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            aria-owns="search-listbox"
            style={{ flex: 1, maxWidth: 520, position: 'relative' }}
            className="nav-search-wrap"
          >
            <form onSubmit={handleSubmit}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: c.text3, pointerEvents: 'none',
                }} aria-hidden="true" />
                <input
                  ref={inputRef}
                  id="nav-search-input"
                  role="searchbox"
                  aria-label="Search phones"
                  aria-autocomplete="list"
                  aria-controls="search-listbox"
                  aria-activedescendant={activeIdx >= 0 ? `search-option-${activeIdx}` : undefined}
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setTimeout(() => { setFocused(false); setActiveIdx(-1) }, 150)}
                  onKeyDown={handleKeyDown}
                  placeholder='Search phones or try "best camera under 500"'
                  style={{
                    width: '100%', height: 40,
                    padding: '0 36px 0 40px',
                    background: c.surface,
                    border: `1px solid ${focused ? c.primary : c.border}`,
                    borderRadius: 'var(--r-full)',
                    fontSize: 14, color: c.text1,
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxShadow: focused ? '0 0 0 3px rgba(26,26,46,0.07)' : 'none',
                  }}
                />
                {query && (
                  <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear search"
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      color: c.text3, display: 'flex', padding: 2, background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </form>

            {showDropdown && (
              <div
                id="search-listbox"
                role="listbox"
                aria-label="Search results"
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                  background: c.surface, border: `1px solid ${c.border}`,
                  borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)',
                  overflow: 'hidden', zIndex: z.dropdown, animation: 'fadeIn 0.12s ease',
                }}
              >
                {searching && results.length === 0 && (
                  <div style={{ padding: '14px 16px', fontSize: 13, color: c.text3, textAlign: 'center' }}>
                    Searching...
                  </div>
                )}

                {!searching && results.length === 0 && query.length > 1 && (
                  <div style={{ padding: '14px 16px', fontSize: 13, color: c.text3, textAlign: 'center' }}>
                    No phones found for &ldquo;{query}&rdquo;
                  </div>
                )}

                {results.map((phone, idx) => (
                  <button
                    key={phone.id}
                    id={`search-option-${idx}`}
                    role="option"
                    aria-selected={idx === activeIdx}
                    type="button"
                    onMouseDown={() => handlePhoneSelect(phone)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', textAlign: 'left',
                      transition: 'background 0.1s',
                      borderBottom: `1px solid ${c.border}`,
                      background: idx === activeIdx ? c.bg : 'transparent',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, background: c.bg, borderRadius: 'var(--r-sm)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, overflow: 'hidden',
                    }}>
                      {phone.main_image_url && (
                        <img
                          src={phone.main_image_url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          style={{ width: 32, height: 32, objectFit: 'contain' }}
                        />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: c.text3, textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 1 }}>
                        {phone.brand}
                      </div>
                      <div style={{ fontSize: 14, color: c.text1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {phone.model_name}
                      </div>
                    </div>
                    {phone.price_usd && (
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.text1, flexShrink: 0 }}>
                        ${phone.price_usd.toLocaleString()}
                      </div>
                    )}
                  </button>
                ))}

                {results.length > 0 && (
                  <button
                    type="button"
                    onMouseDown={handleSubmit as any}
                    style={{ width: '100%', padding: '10px 14px', textAlign: 'center', fontSize: 12, color: c.text3, background: c.bg, border: 'none', cursor: 'pointer', transition: 'color 0.1s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.text1 }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text3 }}
                  >
                    See all results for &ldquo;{query}&rdquo; →
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} className="nav-links">
            {/* Brands mega-menu */}
            <div ref={brandsRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setBrandsOpen(o => !o)}
                aria-expanded={brandsOpen}
                aria-haspopup="menu"
                aria-controls="brands-menu"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px',
                  fontSize: 14, fontWeight: 500, color: c.text2, borderRadius: 'var(--r-sm)',
                  transition: 'all 0.15s', background: brandsOpen ? 'rgba(26,26,46,0.05)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.text1; (e.currentTarget as HTMLElement).style.background = 'rgba(26,26,46,0.04)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text2; (e.currentTarget as HTMLElement).style.background = brandsOpen ? 'rgba(26,26,46,0.05)' : 'transparent' }}
              >
                Brands
                <ChevronDown size={12} style={{ transition: 'transform 0.15s', transform: brandsOpen ? 'rotate(180deg)' : 'none' }} aria-hidden="true" />
              </button>

              {brandsOpen && (
                <div
                  id="brands-menu"
                  role="menu"
                  aria-label="Browse by brand"
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
                    width: 360, background: c.surface, border: `1px solid ${c.border}`,
                    borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-xl)', padding: 16,
                    zIndex: z.dropdown, animation: 'fadeIn 0.12s ease',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
                    {brands.map(b => (
                      <Link
                        key={b.brand}
                        href={ROUTES.brand(brandSlug(b.brand))}
                        role="menuitem"
                        onClick={() => setBrandsOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 10px', borderRadius: 'var(--r-sm)', transition: 'background 0.1s',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = c.bg }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 500, color: c.text1 }}>{b.brand}</span>
                        <span style={{ fontSize: 11, color: c.text3 }}>{b.count}</span>
                      </Link>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
                    <Link
                      href="/brand"
                      role="menuitem"
                      onClick={() => setBrandsOpen(false)}
                      style={{ fontSize: 13, color: c.accent, fontWeight: 500 }}
                    >
                      View all brands &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              href={ROUTES.pick}
              style={{
                padding: '7px 12px', fontSize: 14, fontWeight: 500, color: c.accent,
                borderRadius: 'var(--r-sm)', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-light)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              Help Me Choose
            </Link>

            {/* Compare button: always navigates — to /compare when <2 phones selected,
                or triggers the onOpenCompare callback when >=2 */}
            <button
              onClick={handleCompareClick}
              aria-label={
                compareCount > 0
                  ? `Compare (${compareCount} phone${compareCount !== 1 ? 's' : ''} selected)`
                  : 'Compare phones'
              }
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px',
                fontSize: 14, fontWeight: 500, color: c.primary,
                border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', transition: 'all 0.15s',
                background: 'transparent', cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.background = 'rgba(26,26,46,0.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              Compare
              {compareCount > 0 && (
                <span style={{
                  background: c.accent, color: '#fff', fontSize: 11, fontWeight: 700,
                  minWidth: 18, height: 18, borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                }}>
                  {compareCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            style={{ color: c.text2, display: 'none', marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            className="nav-mobile-btn"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          style={{ position: 'fixed', inset: 0, top: 'var(--nav-h)', zIndex: z.drawer, background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              width: 280, height: '100%', background: c.surface,
              padding: 20, animation: 'slideIn 0.2s ease', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile search */}
            <form
              role="search"
              onSubmit={e => {
                e.preventDefault()
                setMobileOpen(false)
                if (query.trim()) router.push(`/?q=${encodeURIComponent(query.trim())}`)
              }}
              style={{ position: 'relative', marginBottom: 16 }}
            >
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.text3, pointerEvents: 'none' }} aria-hidden="true" />
              <input
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="Search phones..."
                aria-label="Search phones"
                style={{
                  width: '100%', height: 40, padding: '0 36px 0 38px',
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 'var(--r-full)', fontSize: 14, color: c.text1,
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange('')}
                  aria-label="Clear search"
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: c.text3, display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              )}
            </form>

            <Link href={ROUTES.pick} style={{ display: 'block', padding: '10px 0', fontSize: 15, fontWeight: 600, color: c.accent }}>
              Help Me Choose
            </Link>
            <Link href="/compare" style={{ display: 'block', padding: '10px 0', fontSize: 15, fontWeight: 500, color: c.text1 }}>
              Compare
              {compareCount > 0 && (
                <span style={{ marginLeft: 8, background: c.accent, color: '#fff', fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 9 }}>
                  {compareCount}
                </span>
              )}
            </Link>
            <div style={{ height: 1, background: c.border, margin: '12px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: c.text3, marginBottom: 8 }}>
              Brands
            </div>
            {brands.map(b => (
              <Link
                key={b.brand}
                href={ROUTES.brand(brandSlug(b.brand))}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, color: c.text1, borderBottom: `1px solid ${c.border}` }}
              >
                <span>{b.brand}</span>
                <span style={{ color: c.text3 }}>{b.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @media (max-width: 768px) {
          .nav-search-wrap { display: none !important; }
          .nav-links       { display: none !important; }
          .nav-mobile-btn  { display: flex !important; }
        }
      `}</style>
    </>
  )
}
