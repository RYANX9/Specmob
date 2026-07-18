'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, ArrowRight, ArrowUpRight, Camera, Battery, Zap, Tag, Feather,
  Smartphone, ChevronLeft, ChevronRight, ChevronDown,
  Gamepad2, Monitor, Bolt, BadgeDollarSign, X, RotateCcw,
} from 'lucide-react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import PhoneCard, { PhoneCardSkeleton } from './components/PhoneCard'
import FilterPanel from './components/FilterPanel'
import CompareBar from './components/CompareBar'
import { useToast } from './components/Toast'
import { api } from '@/lib/api'
import { ROUTES, brandSlug, phoneSlug, PAGE_SIZE, MAX_COMPARE, CATEGORY_META } from '@/lib/config'
import { c, f, z, mq } from '@/lib/tokens'
import { PRICE_TIERS, type PriceTierId } from '@/lib/priceTiers'
import type { Phone, SearchFilters } from '@/lib/types'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'camera-phones':  <Camera size={16} strokeWidth={1.5} />,
  'battery-life':   <Battery size={16} strokeWidth={1.5} />,
  'gaming-phones':  <Zap size={16} strokeWidth={1.5} />,
  'under-300':      <Tag size={16} strokeWidth={1.5} />,
  'under-500':      <Tag size={16} strokeWidth={1.5} />,
  'lightweight':    <Feather size={16} strokeWidth={1.5} />,
  'compact-phones': <Smartphone size={16} strokeWidth={1.5} />,
  'fast-charging':  <Zap size={16} strokeWidth={1.5} />,
}

const SORT_OPTIONS = [
  { label: 'Newest First',       sort_by: 'release_ts',       sort_order: 'desc' },
  { label: 'Price: Low to High', sort_by: 'price_usd',        sort_order: 'asc'  },
  { label: 'Price: High to Low', sort_by: 'price_usd',        sort_order: 'desc' },
  { label: 'Best Performance',   sort_by: 'antutu_score',     sort_order: 'desc' },
  { label: 'Best Battery',       sort_by: 'battery_capacity', sort_order: 'desc' },
  { label: 'Best Camera',        sort_by: 'main_camera_mp',   sort_order: 'desc' },
] as const

const EMPTY_FILTERS: SearchFilters = {}

const QUICK_PRIORITIES: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'camera',        label: 'Camera',        icon: <Camera size={14} strokeWidth={2} /> },
  { id: 'battery',       label: 'Battery',       icon: <Battery size={14} strokeWidth={2} /> },
  { id: 'performance',   label: 'Performance',   icon: <Zap size={14} strokeWidth={2} /> },
  { id: 'gaming',        label: 'Gaming',        icon: <Gamepad2 size={14} strokeWidth={2} /> },
  { id: 'display',       label: 'Display',       icon: <Monitor size={14} strokeWidth={2} /> },
  { id: 'fast_charging', label: 'Fast Charging', icon: <Bolt size={14} strokeWidth={2} /> },
  { id: 'compact',       label: 'Compact',       icon: <Smartphone size={14} strokeWidth={2} /> },
  { id: 'lightweight',   label: 'Lightweight',   icon: <Feather size={14} strokeWidth={2} /> },
  { id: 'value',         label: 'Best Value',    icon: <BadgeDollarSign size={14} strokeWidth={2} /> },
]

const PROOF_STATS = [
  { value: '12,000+', label: 'phones tracked' },
  { value: 'Daily',   label: 'price refresh' },
  { value: 'Zero',    label: 'sponsored picks' },
]

function parseFiltersFromParams(sp: URLSearchParams): SearchFilters {
  return {
    q:               sp.get('q')               || undefined,
    brand:           sp.get('brand')           || undefined,
    min_price:       sp.get('min_price')       ? Number(sp.get('min_price'))       : undefined,
    max_price:       sp.get('max_price')       ? Number(sp.get('max_price'))       : undefined,
    min_ram:         sp.get('min_ram')         ? Number(sp.get('min_ram'))         : undefined,
    min_battery:     sp.get('min_battery')     ? Number(sp.get('min_battery'))     : undefined,
    min_camera_mp:   sp.get('min_camera_mp')   ? Number(sp.get('min_camera_mp'))   : undefined,
    min_screen_size: sp.get('min_screen_size') ? Number(sp.get('min_screen_size')) : undefined,
    max_screen_size: sp.get('max_screen_size') ? Number(sp.get('max_screen_size')) : undefined,
    min_year:        sp.get('min_year')        ? Number(sp.get('min_year'))        : undefined,
    max_weight:      sp.get('max_weight')      ? Number(sp.get('max_weight'))      : undefined,
    min_charging_w:  sp.get('min_charging_w')  ? Number(sp.get('min_charging_w'))  : undefined,
    chipset_tier:    sp.get('chipset_tier')    || undefined,
  }
}

function buildSearchUrl(f: SearchFilters, p: number, sIdx: number): string {
  const params = new URLSearchParams()
  if (f.q)               params.set('q',               f.q)
  if (f.brand)           params.set('brand',           f.brand)
  if (f.min_price)       params.set('min_price',       String(f.min_price))
  if (f.max_price)       params.set('max_price',       String(f.max_price))
  if (f.min_ram)         params.set('min_ram',         String(f.min_ram))
  if (f.min_battery)     params.set('min_battery',     String(f.min_battery))
  if (f.min_camera_mp)   params.set('min_camera_mp',   String(f.min_camera_mp))
  if (f.min_screen_size) params.set('min_screen_size', String(f.min_screen_size))
  if (f.max_screen_size) params.set('max_screen_size', String(f.max_screen_size))
  if (f.min_year)        params.set('min_year',        String(f.min_year))
  if (f.max_weight)      params.set('max_weight',      String(f.max_weight))
  if (f.min_charging_w)  params.set('min_charging_w',  String(f.min_charging_w))
  if (f.chipset_tier)    params.set('chipset_tier',    f.chipset_tier)
  if (p > 1)    params.set('page', String(p))
  if (sIdx > 0) params.set('sort', String(sIdx))
  const str = params.toString()
  return str ? `/?${str}` : '/'
}

function hasActiveUrlState(sp: URLSearchParams): boolean {
  for (const key of ['q', 'brand', 'min_price', 'max_price', 'min_ram', 'min_battery',
    'min_camera_mp', 'min_screen_size', 'max_screen_size', 'min_year', 'max_weight',
    'min_charging_w', 'chipset_tier', 'page', 'sort']) {
    if (sp.get(key)) return true
  }
  return false
}

// Cheap SVG noise texture — no image asset, keeps the dark hero from
// reading as a flat gradient.
function GrainOverlay() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05, mixBlendMode: 'overlay', pointerEvents: 'none' }}
    >
      <filter id="home-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#home-grain)" />
    </svg>
  )
}

// ─── Hero ───────────────────────────────────────────────────────────────────
// Full-bleed editorial cover. The picker console is the only real CTA on
// the page — search is a demoted, understated fallback beneath it.

function Hero({ searchOpen, setSearchOpen, searchQuery, setSearchQuery, onSearchSubmit }: {
  searchOpen: boolean
  setSearchOpen: (v: boolean) => void
  searchQuery: string
  setSearchQuery: (v: string) => void
  onSearchSubmit: (e: React.FormEvent) => void
}) {
  const router = useRouter()
  const [tierId, setTierId] = useState<PriceTierId | null>(null)
  const [priorities, setPriorities] = useState<Set<string>>(new Set())

  const togglePriority = (id: string) => {
    setPriorities(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 3) next.add(id)
      return next
    })
  }

  const ready = !!tierId && priorities.size >= 2
  const activeTier = tierId ? PRICE_TIERS.find(t => t.id === tierId) : null

  const handleGo = () => {
    if (!ready) return
    const params = new URLSearchParams()
    params.set('step', '3')
    params.set('tier', tierId as string)
    params.set('p', Array.from(priorities).join(','))
    router.push(`/pick?${params.toString()}`)
  }

  const handleReset = () => { setTierId(null); setPriorities(new Set()) }

  return (
    <section style={{ background: c.primary, position: 'relative', overflow: 'hidden' }}>
      <GrainOverlay />

      <div style={{
        position: 'absolute', top: '-24%', right: '-10%', width: 620, height: 620,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(230,57,70,0.20) 0%, transparent 68%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-30%', left: '-6%', width: 460, height: 460,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(69,123,157,0.14) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.5), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Oversized ghost numeral — cover-page signature mark */}
      <div aria-hidden="true" className="hero-ghost-mark" style={{
        position: 'absolute', top: -40, left: -10,
        fontFamily: f.serif, fontSize: 360, lineHeight: 1, color: 'rgba(255,255,255,0.03)',
        fontStyle: 'italic', letterSpacing: '-10px', pointerEvents: 'none', userSelect: 'none',
      }}>
        01
      </div>

      <div className="hero-grid" style={{
        maxWidth: 'var(--max-w)', margin: '0 auto', padding: '76px var(--page-px) 64px',
        display: 'grid', gridTemplateColumns: '1fr 460px', gap: 56, alignItems: 'start',
        position: 'relative',
      }}>
        {/* ── Left: the statement ── */}
        <div>
          <div className="hero-fade" style={{ animationDelay: '0ms', display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28 }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: c.accent, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '2.4px' }}>
              An honest answer, not another list
            </span>
          </div>

          <h1 className="hero-fade hero-headline" style={{
            animationDelay: '70ms', fontFamily: f.serif, letterSpacing: '-2px', lineHeight: 0.98, marginBottom: 28,
          }}>
            <span style={{ display: 'block', color: '#fff' }}>Stop comparing.</span>
            <span style={{ display: 'block', color: '#fff' }}>Start <em style={{ color: c.accent, fontStyle: 'italic' }}>owning</em> it.</span>
          </h1>

          <p className="hero-fade" style={{ animationDelay: '130ms', fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 420, marginBottom: 40 }}>
            Tell us your budget and what actually matters. We hand you five phones,
            ranked and reasoned — no forty-tab spec crawl, no sponsored nudge.
          </p>

          <div className="hero-fade" style={{ animationDelay: '190ms', display: 'flex', gap: 0, marginBottom: 44, flexWrap: 'wrap' }}>
            {PROOF_STATS.map((stat, i) => (
              <div key={stat.label} style={{
                paddingRight: 28, marginRight: 28,
                borderRight: i < PROOF_STATS.length - 1 ? '1px solid rgba(255,255,255,0.14)' : 'none',
              }}>
                <div style={{ fontFamily: f.serif, fontSize: 26, color: '#fff', letterSpacing: '-0.5px', marginBottom: 2 }}>{stat.value}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="hero-fade" style={{ animationDelay: '250ms' }}>
            {!searchOpen ? (
              <button
                onClick={() => setSearchOpen(true)}
                style={{
                  fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  paddingBottom: 2, borderBottom: '1px solid rgba(255,255,255,0.2)',
                  transition: 'color 150ms ease, border-color 150ms ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
              >
                <Search size={12} /> Already know the model? Search directly
              </button>
            ) : (
              <form onSubmit={onSearchSubmit} style={{ position: 'relative', maxWidth: 340 }}>
                <Search size={13} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="iPhone 17 Pro, Galaxy S26..."
                  aria-label="Search phones directly"
                  style={{
                    width: '100%', height: 40, padding: '0 36px 0 36px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 'var(--r-full)', fontSize: 13, color: '#fff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                  aria-label="Close search"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
                >
                  <X size={12} />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Right: the decision console ── */}
        <div className="hero-fade hero-console" style={{
          animationDelay: '160ms',
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          borderRadius: 'var(--r-lg)', padding: '28px 28px 26px', position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.4px' }}>
              01 · Budget — 02 · Priorities
            </span>
            {(tierId || priorities.size > 0) && (
              <button
                onClick={handleReset}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)' }}
              >
                <RotateCcw size={10} /> Reset
              </button>
            )}
          </div>

          <div className="tier-segmented" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.12)', marginBottom: 22 }}>
            {PRICE_TIERS.map(tier => {
              const active = tierId === tier.id
              return (
                <button
                  key={tier.id}
                  onClick={() => setTierId(tier.id)}
                  style={{
                    flex: 1, padding: '0 0 12px', background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: `2px solid ${active ? c.accent : 'transparent'}`, marginBottom: -1,
                    display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
                    transition: 'border-color 150ms ease',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.5px', color: active ? '#fff' : 'rgba(255,255,255,0.35)' }}>
                    {tier.label}
                  </span>
                  <span style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)' }}>
                    {tier.max == null ? `$${tier.min / 1000}k+` : `$${tier.min}–${tier.max}`}
                  </span>
                </button>
              )
            })}
          </div>

          {!tierId ? (
            <div style={{ padding: '18px 4px 22px', fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.65 }}>
              Pick a budget above — we'll immediately narrow the field to what's actually worth choosing between.
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 250ms ease' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.4px' }}>
                  What matters most
                </span>
                <span style={{ fontSize: 11, color: priorities.size >= 2 ? c.accent : 'rgba(255,255,255,0.35)' }}>
                  {priorities.size}/3
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 22 }}>
                {QUICK_PRIORITIES.map(p => {
                  const active = priorities.has(p.id)
                  const dimmed = priorities.size >= 3 && !active
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePriority(p.id)}
                      disabled={dimmed}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                        borderRadius: 'var(--r-full)', cursor: dimmed ? 'not-allowed' : 'pointer',
                        border: `1px solid ${active ? c.accent : 'rgba(255,255,255,0.16)'}`,
                        background: active ? c.accent : 'transparent',
                        opacity: dimmed ? 0.35 : 1, transition: 'all 120ms ease',
                      }}
                    >
                      <span style={{ color: active ? '#fff' : 'rgba(255,255,255,0.5)', display: 'flex' }}>{p.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: active ? '#fff' : 'rgba(255,255,255,0.7)' }}>{p.label}</span>
                    </button>
                  )
                })}
              </div>

              <button
                onClick={handleGo}
                disabled={!ready}
                className="hero-cta"
                style={{
                  width: '100%', padding: '15px 20px', borderRadius: 'var(--r-md)',
                  fontSize: 14, fontWeight: 700, border: 'none',
                  background: ready ? c.accent : 'rgba(255,255,255,0.08)',
                  color: ready ? '#fff' : 'rgba(255,255,255,0.35)',
                  cursor: ready ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => { if (ready) (e.currentTarget as HTMLElement).style.background = '#D32F3E' }}
                onMouseLeave={e => { if (ready) (e.currentTarget as HTMLElement).style.background = c.accent }}
              >
                <span>{ready ? 'Show my 5 matches' : `Pick ${2 - priorities.size} more`}</span>
                <ArrowRight size={16} strokeWidth={2.4} className="hero-cta-arrow" />
              </button>

              {activeTier && (
                <div style={{ marginTop: 14, fontSize: 11.5, color: 'rgba(255,255,255,0.35)', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.2px' }}>
                  {activeTier.name} · {priorities.size > 0 ? Array.from(priorities).map(id => QUICK_PRIORITIES.find(q => q.id === id)?.label).join(' + ') : 'awaiting priorities'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="hero-fade" style={{ animationDelay: '320ms', display: 'flex', justifyContent: 'center', paddingBottom: 28, position: 'relative' }}>
        <ChevronDown size={16} color="rgba(255,255,255,0.25)" className="scroll-cue" />
      </div>
    </section>
  )
}

// ─── Rankings rail — editorial index, not app tiles ────────────────────────

function RankingsRail() {
  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '64px var(--page-px) 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, fontStyle: 'italic' }}>Or take the shortcut —</span>
          <span style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, marginLeft: 8 }}>pre-decided rankings.</span>
        </div>
        <span style={{ fontSize: 12, color: c.text3 }}>Recomputed from live pricing every night</span>
      </div>

      <div className="rankings-rail" style={{ borderTop: `1px solid ${c.border}` }}>
        {Object.entries(CATEGORY_META).map(([slug, meta], i) => (
          <Link
            key={slug}
            href={ROUTES.category(slug)}
            className="rankings-rail-item"
            style={{
              display: 'flex', alignItems: 'center', gap: 18, padding: '16px 4px',
              borderBottom: `1px solid ${c.border}`, position: 'relative', textDecoration: 'none',
            }}
          >
            <span className="rankings-rail-bar" style={{ position: 'absolute', left: -1, top: 0, bottom: 0, width: 2, background: c.accent, transform: 'scaleY(0)', transformOrigin: 'center' }} />
            <span style={{ fontFamily: f.serif, fontSize: 22, color: c.border, minWidth: 34, fontStyle: 'italic' }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ color: c.text3, display: 'flex', flexShrink: 0 }}>{CATEGORY_ICONS[slug]}</span>
            <span className="rankings-rail-title" style={{ fontSize: 15, fontWeight: 600, color: c.text1, flexShrink: 0, transition: 'transform 150ms ease' }}>{meta.title}</span>
            <span style={{ fontSize: 13, color: c.text3, flex: 1 }}>{meta.desc}</span>
            <ArrowUpRight size={16} color={c.text3} className="rankings-rail-arrow" style={{ flexShrink: 0, transition: 'all 150ms ease' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Trending — same ghost-numeral editorial language as the rankings rail ─

function TrendingScroll({ phones }: { phones: Phone[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  if (phones.length === 0) return null
  return (
    <section style={{ marginBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
        <span style={{ fontFamily: f.serif, fontSize: 24, color: c.text1 }}>This week's verdicts</span>
        <span style={{ fontSize: 12, color: c.text3 }}>Most viewed, ranked by conviction</span>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 60, background: 'linear-gradient(-90deg, var(--bg) 0%, transparent 100%)', pointerEvents: 'none', zIndex: z.badge }} />
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
          aria-label="Scroll left"
          style={{ position: 'absolute', top: '50%', left: -14, transform: 'translateY(-50%)', width: 36, height: 36, background: c.surface, border: `1px solid ${c.border}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text2, zIndex: z.badge, boxShadow: 'var(--shadow-sm)', transition: 'all 150ms ease' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
        >
          <ChevronLeft size={16} />
        </button>
        <div ref={scrollRef} className="scrollbar-none" style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 4 }}>
          {phones.map((phone, i) => (
            <div
              key={phone.id}
              onClick={() => router.push(ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone)))}
              className="trending-item"
              style={{ flexShrink: 0, width: 172, scrollSnapAlign: 'start', padding: '18px 16px', cursor: 'pointer', position: 'relative', textAlign: 'center' }}
            >
              <div aria-hidden="true" style={{ position: 'absolute', top: 2, left: 8, fontFamily: f.serif, fontSize: 44, color: c.bg, fontStyle: 'italic', zIndex: 0, lineHeight: 1 }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ position: 'relative', width: 76, height: 76, margin: '10px auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {phone.main_image_url
                  ? <img src={phone.main_image_url} alt={phone.model_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <Smartphone size={32} color={c.border} strokeWidth={1} />}
              </div>
              <div style={{ position: 'relative', fontFamily: f.serif, fontSize: 13, color: c.text1, marginBottom: 5, lineHeight: 1.3 }}>{phone.model_name}</div>
              <div style={{ position: 'relative', fontSize: 12, fontWeight: 600, color: c.text2 }}>{phone.price_usd ? `$${phone.price_usd.toLocaleString()}` : 'Price TBA'}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
          aria-label="Scroll right"
          style={{ position: 'absolute', top: '50%', right: -14, transform: 'translateY(-50%)', width: 36, height: 36, background: c.surface, border: `1px solid ${c.border}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text2, zIndex: z.badge, boxShadow: 'var(--shadow-sm)', transition: 'all 150ms ease' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  )
}

function FilterChips({ filters, onChange }: { filters: SearchFilters; onChange: (f: SearchFilters) => void }) {
  const chips: { label: string; clear: () => void }[] = []
  if (filters.q) chips.push({ label: `"${filters.q}"`, clear: () => onChange({ ...filters, q: undefined }) })
  if (filters.min_price || filters.max_price) {
    const lo = filters.min_price ? `$${filters.min_price}` : ''
    const hi = filters.max_price ? `$${filters.max_price}` : ''
    chips.push({ label: lo && hi ? `${lo} – ${hi}` : lo ? `From ${lo}` : `Up to ${hi}`, clear: () => onChange({ ...filters, min_price: undefined, max_price: undefined }) })
  }
  if (filters.brand)          chips.push({ label: filters.brand, clear: () => onChange({ ...filters, brand: undefined }) })
  if (filters.min_year)       chips.push({ label: `${filters.min_year}+`, clear: () => onChange({ ...filters, min_year: undefined }) })
  if (filters.min_ram)        chips.push({ label: `${filters.min_ram}GB+ RAM`, clear: () => onChange({ ...filters, min_ram: undefined }) })
  if (filters.min_battery)    chips.push({ label: `${filters.min_battery.toLocaleString()}+ mAh`, clear: () => onChange({ ...filters, min_battery: undefined }) })
  if (filters.min_camera_mp)  chips.push({ label: `${filters.min_camera_mp}+ MP`, clear: () => onChange({ ...filters, min_camera_mp: undefined }) })
  if (filters.chipset_tier)   chips.push({ label: filters.chipset_tier, clear: () => onChange({ ...filters, chipset_tier: undefined }) })
  if (filters.min_charging_w) chips.push({ label: `${filters.min_charging_w}W+`, clear: () => onChange({ ...filters, min_charging_w: undefined }) })
  if (filters.max_weight)     chips.push({ label: `Under ${filters.max_weight}g`, clear: () => onChange({ ...filters, max_weight: undefined }) })
  if (chips.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      {chips.map(chip => (
        <div key={chip.label} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
          background: c.surface, border: `1px solid ${c.border}`,
          borderRadius: 'var(--r-full)', fontSize: 12, color: c.text2,
        }}>
          {chip.label}
          <button
            onClick={chip.clear}
            aria-label={`Remove ${chip.label} filter`}
            style={{ color: c.text3, display: 'flex', transition: 'color 100ms ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.accent }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text3 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange(EMPTY_FILTERS)}
        style={{
          fontSize: 12, fontWeight: 500, color: c.accent, padding: '4px 8px',
          borderRadius: 'var(--r-full)', transition: 'background 100ms ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-light)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        Clear all
      </button>
    </div>
  )
}

function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }
  const btn = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: active ? 600 : 400,
    color: active ? '#fff' : disabled ? c.border : c.text2,
    background: active ? c.primary : 'transparent',
    cursor: disabled ? 'default' : 'pointer', transition: 'all 120ms ease', border: 'none',
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 40 }}>
      <button style={btn(false, page === 1)} onClick={() => page > 1 && onChange(page - 1)} disabled={page === 1} aria-label="Previous page"><ChevronLeft size={16} /></button>
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`e${i}`} style={{ width: 36, textAlign: 'center', fontSize: 14, color: c.text3 }}>...</span>
          : (
            <button
              key={p} style={btn(p === page)} onClick={() => onChange(p as number)}
              aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined}
              onMouseEnter={e => { if (p !== page) (e.currentTarget as HTMLElement).style.background = 'rgba(26,26,46,0.06)' }}
              onMouseLeave={e => { if (p !== page) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {p}
            </button>
          )
      )}
      <button style={btn(false, page === totalPages)} onClick={() => page < totalPages && onChange(page + 1)} disabled={page === totalPages} aria-label="Next page"><ChevronRight size={16} /></button>
    </div>
  )
}

function HomeContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { toast }    = useToast()

  const [filters, setFilters] = useState<SearchFilters>(() =>
    parseFiltersFromParams(new URLSearchParams(searchParams.toString()))
  )
  const [page, setPage]       = useState(() => parseInt(searchParams.get('page') ?? '1', 10))
  const [sortIdx, setSortIdx] = useState(() => parseInt(searchParams.get('sort') ?? '0', 10))
  const [phones, setPhones]               = useState<Phone[]>([])
  const [trending, setTrending]           = useState<Phone[]>([])
  const [total, setTotal]                 = useState(0)
  const [loading, setLoading]             = useState(true)
  const [comparePhones, setComparePhones] = useState<Phone[]>([])
  const [searchQuery, setSearchQuery]     = useState(searchParams.get('q') ?? '')
  const [searchOpen, setSearchOpen]       = useState(!!searchParams.get('q'))
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const [catalogOpen, setCatalogOpen] = useState(() => hasActiveUrlState(new URLSearchParams(searchParams.toString())))

  const ownUpdate = useRef(false)
  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '').length

  const spString = searchParams.toString()
  useEffect(() => {
    if (ownUpdate.current) { ownUpdate.current = false; return }
    const parsed = parseFiltersFromParams(new URLSearchParams(spString))
    setFilters(parsed)
    setSearchQuery(parsed.q ?? '')
    setPage(parseInt(searchParams.get('page') ?? '1', 10))
    setSortIdx(parseInt(searchParams.get('sort') ?? '0', 10))
    if (hasActiveUrlState(new URLSearchParams(spString))) setCatalogOpen(true)
  }, [spString])

  const commit = useCallback((f: SearchFilters, p: number, s: number) => {
    ownUpdate.current = true
    router.replace(buildSearchUrl(f, p, s), { scroll: false })
  }, [router])

  const fetchPhones = useCallback(async (f: SearchFilters, p: number, sIdx: number, signal?: AbortSignal) => {
    setLoading(true)
    const { sort_by, sort_order } = SORT_OPTIONS[sIdx]
    try {
      const data = await api.phones.search(
        { ...f, sort_by, sort_order: sort_order as 'asc' | 'desc', page: p, page_size: PAGE_SIZE },
        signal,
      )
      setPhones(data.results)
      setTotal(data.total)
    } catch (err) {
      if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) return
      setPhones([])
      setTotal(0)
      toast('Failed to load phones', 'error')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (!catalogOpen) return
    const controller = new AbortController()
    fetchPhones(filters, page, sortIdx, controller.signal)
    return () => controller.abort()
  }, [filters, page, sortIdx, fetchPhones, catalogOpen])

  useEffect(() => {
    api.phones.trending(10).then(d => setTrending(d.phones)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!mobileFiltersOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileFiltersOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileFiltersOpen])

  const handleFiltersChange = (f: SearchFilters) => { setFilters(f); setPage(1); commit(f, 1, sortIdx) }
  const handleReset = () => { setFilters(EMPTY_FILTERS); setPage(1); setSearchQuery(''); commit(EMPTY_FILTERS, 1, sortIdx) }
  const handleSortChange = (idx: number) => { setSortIdx(idx); setPage(1); commit(filters, 1, idx) }
  const handlePageChange = (p: number) => {
    setPage(p)
    commit(filters, p, sortIdx)
    document.getElementById('phone-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openCatalog = () => {
    setCatalogOpen(true)
    setTimeout(() => document.getElementById('phone-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const f = { ...filters, q: searchQuery.trim() }
    setFilters(f); setPage(1); setCatalogOpen(true); commit(f, 1, sortIdx)
    setTimeout(() => document.getElementById('phone-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const handleCompareToggle = (phone: Phone) => {
    setComparePhones(prev => {
      if (prev.find(p => p.id === phone.id)) { toast('Removed from compare', 'info'); return prev.filter(p => p.id !== phone.id) }
      if (prev.length >= MAX_COMPARE) { toast(`Maximum ${MAX_COMPARE} phones in compare`, 'error'); return prev }
      toast('Added to compare', 'success')
      return [...prev, phone]
    })
  }

  const compareIds = comparePhones.map(p => p.id)

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar
        compareCount={comparePhones.length}
        onOpenCompare={() => comparePhones.length >= 2 && router.push(ROUTES.compare(...comparePhones.map(p => phoneSlug(p))))}
      />

      <Hero
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
      />

      <RankingsRail />

      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px)' }}>
        <div style={{ marginTop: 56 }}>
          <TrendingScroll phones={trending} />
        </div>
      </div>

      {/* Catalog fallback — deliberately understated, a footnote not a feature */}
      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px) 32px' }}>
        {!catalogOpen ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingTop: 8 }}>
            <div style={{ flex: 1, height: 1, background: c.border }} />
            <button
              onClick={openCatalog}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: c.text3,
                textTransform: 'uppercase', letterSpacing: '0.6px', padding: '6px 4px',
                transition: 'color 150ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.text1 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text3 }}
            >
              Prefer to browse the full catalog yourself <ChevronDown size={13} />
            </button>
            <div style={{ flex: 1, height: 1, background: c.border }} />
          </div>
        ) : (
          <div style={{ height: 1, background: c.border }} />
        )}
      </div>

      {catalogOpen && (
        <div id="phone-grid" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '24px var(--page-px) 64px', display: 'grid', gridTemplateColumns: 'var(--sidebar-w) 1fr', gap: 32, alignItems: 'start' }}>
          <div className="filter-sidebar">
            <FilterPanel filters={filters} onChange={handleFiltersChange} onReset={handleReset} />
          </div>

          <div>
            <div style={{ fontFamily: f.serif, fontSize: 20, color: c.text1, marginBottom: 16 }}>The full catalog</div>

            <FilterChips filters={filters} onChange={handleFiltersChange} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  style={{ display: 'none', alignItems: 'center', gap: 6, padding: '7px 14px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500, color: c.text1 }}
                  className="mobile-filter-btn"
                  aria-label="Open filters"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/></svg>
                  Filters
                  {activeFilterCount > 0 && (
                    <span style={{ background: c.accent, color: '#fff', fontSize: 10, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div style={{ position: 'relative' }}>
                  <select
                    value={sortIdx}
                    onChange={e => handleSortChange(Number(e.target.value))}
                    aria-label="Sort phones"
                    style={{ appearance: 'none', padding: '7px 30px 7px 12px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500, color: c.text1, cursor: 'pointer' }}
                  >
                    {SORT_OPTIONS.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
                  </select>
                  <ChevronRight size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: c.text3, pointerEvents: 'none' }} />
                </div>

                {!loading && <span style={{ fontSize: 13, color: c.text3 }}>{total.toLocaleString()} phone{total !== 1 ? 's' : ''}</span>}
              </div>

              <Link
                href={ROUTES.pick}
                style={{ fontSize: 13, fontWeight: 600, color: c.accent, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                Not sure? Take the 30s quiz instead <ArrowRight size={13} />
              </Link>
            </div>

            {loading ? (
              <div className="phone-grid-layout">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => <PhoneCardSkeleton key={i} />)}
              </div>
            ) : phones.length > 0 ? (
              <>
                <div className="phone-grid-layout">
                  {phones.map(phone => <PhoneCard key={phone.id} phone={phone} compareIds={compareIds} onCompareToggle={handleCompareToggle} />)}
                </div>
                <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={handlePageChange} />
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <Smartphone size={56} color={c.border} strokeWidth={1.5} style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, marginBottom: 8 }}>No phones found</h3>
                <p style={{ fontSize: 14, color: c.text3, marginBottom: 20 }}>Try adjusting your filters or search terms.</p>
                <button
                  onClick={handleReset}
                  style={{ padding: '9px 22px', background: c.primary, color: '#fff', borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'background 150ms ease' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />

      <CompareBar
        phones={comparePhones}
        onRemove={id => setComparePhones(prev => prev.filter(p => p.id !== id))}
        onClear={() => setComparePhones([])}
      />

      {mobileFiltersOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          style={{ position: 'fixed', inset: 0, zIndex: z.drawer, background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: c.surface, borderRadius: 'var(--r-xl) var(--r-xl) 0 0', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'slideUp 250ms ease' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '10px 0 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 4, background: c.border, borderRadius: 2 }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px' }}>
              <FilterPanel filters={filters} onChange={handleFiltersChange} onReset={() => { handleReset(); setMobileFiltersOpen(false) }} />
            </div>
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${c.border}`, display: 'flex', gap: 10 }}>
              <button onClick={() => { handleReset(); setMobileFiltersOpen(false) }} style={{ flex: 1, padding: '11px 0', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 600, color: c.text1, cursor: 'pointer' }}>Reset</button>
              <button onClick={() => setMobileFiltersOpen(false)} style={{ flex: 2, padding: '11px 0', background: c.primary, borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer' }}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-fade { opacity: 0; animation: heroFadeUp 620ms cubic-bezier(0.16,1,0.3,1) forwards; }

        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.7); }
        }
        .pulse-dot { animation: pulseDot 2.2s ease-in-out infinite; }

        @keyframes scrollCue {
          0%, 100% { transform: translateY(0); opacity: 0.25; }
          50%      { transform: translateY(5px); opacity: 0.6; }
        }
        .scroll-cue { animation: scrollCue 1.8s ease-in-out infinite; }

        .hero-cta:hover .hero-cta-arrow { transform: translateX(3px); }
        .hero-cta-arrow { transition: transform 150ms ease; }

        .rankings-rail-item:hover .rankings-rail-bar { transform: scaleY(1); transition: transform 180ms ease; }
        .rankings-rail-item:hover .rankings-rail-title { transform: translateX(4px); }
        .rankings-rail-item:hover .rankings-rail-arrow { color: ${c.accent}; transform: translate(2px,-2px); }
        .rankings-rail-item .rankings-rail-bar { transition: transform 180ms ease; }

        .trending-item { border-radius: var(--r-lg); transition: background 150ms ease; }
        .trending-item:hover { background: var(--surface); box-shadow: var(--shadow-sm); }

        .hero-headline { font-size: clamp(42px, 4.8vw, 66px); }
        .phone-grid-layout { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }

        ${mq.xl} {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-console { max-width: 460px; }
        }
        ${mq.lg} {
          #phone-grid { grid-template-columns: 1fr !important; }
          .filter-sidebar { display: none !important; }
          .mobile-filter-btn { display: flex !important; }
          .phone-grid-layout { grid-template-columns: repeat(4, 1fr); gap: 12px; }
          .hero-ghost-mark { display: none; }
        }
        @media (max-width: 860px) { .phone-grid-layout { grid-template-columns: repeat(3, 1fr); gap: 10px; } }
        ${mq.sm} {
          .hero-headline { font-size: 36px !important; }
          .phone-grid-layout { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .tier-segmented { flex-wrap: wrap; }
          .tier-segmented > button { flex: 1 1 33%; }
          .rankings-rail-title { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-fade { animation: none; opacity: 1; }
          .pulse-dot, .scroll-cue { animation: none; }
        }
      `}</style>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}
