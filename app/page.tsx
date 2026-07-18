'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, ArrowRight, Camera, Battery, Zap, Tag, Feather,
  Smartphone, ChevronLeft, ChevronRight, ChevronDown,
  Gamepad2, Monitor, Bolt, BadgeDollarSign, Check, X, RotateCcw,
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
  'camera-phones':  <Camera size={18} strokeWidth={1.5} />,
  'battery-life':   <Battery size={18} strokeWidth={1.5} />,
  'gaming-phones':  <Zap size={18} strokeWidth={1.5} />,
  'under-300':      <Tag size={18} strokeWidth={1.5} />,
  'under-500':      <Tag size={18} strokeWidth={1.5} />,
  'lightweight':    <Feather size={18} strokeWidth={1.5} />,
  'compact-phones': <Smartphone size={18} strokeWidth={1.5} />,
  'fast-charging':  <Zap size={18} strokeWidth={1.5} />,
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

const STEPS_COPY = [
  { n: '01', title: 'Set your budget', desc: 'Five clear tiers, budget to ultra flagship.' },
  { n: '02', title: 'Pick what matters', desc: 'Camera, battery, gaming — 2 or 3, no more.' },
  { n: '03', title: 'Get your answer', desc: 'Five ranked phones. Reasoning included. Done.' },
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

// ─── Hero: full-bleed dark editorial panel. Left = statement + sequence,
// right = the picker itself, staged (step 2 doesn't exist until step 1 is
// answered). Nothing here is a "card floating on the page" — it IS the page. ───

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
      <div style={{
        position: 'absolute', top: '-20%', right: '-8%', width: 520, height: 520,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(230,57,70,0.16) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="hero-grid" style={{
        maxWidth: 'var(--max-w)', margin: '0 auto', padding: '64px var(--page-px) 56px',
        display: 'grid', gridTemplateColumns: '1fr 460px', gap: 56, alignItems: 'start',
        position: 'relative',
      }}>
        {/* ── Left: the statement ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 26 }}>
            <span style={{ width: 7, height: 7, background: c.accent, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1.4px' }}>
              No specs. No tabs. One answer.
            </span>
          </div>

          <h1 className="hero-headline" style={{
            fontFamily: f.serif, letterSpacing: '-1.5px', lineHeight: 1.02, marginBottom: 24,
          }}>
            <span style={{ display: 'block', color: '#fff' }}>Stop comparing</span>
            <span style={{ display: 'block', color: '#fff' }}>specs.</span>
            <span style={{ display: 'block', color: c.accent, fontStyle: 'italic' }}>Start deciding.</span>
          </h1>

          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, maxWidth: 400, marginBottom: 44 }}>
            Budget in, priorities in, five phones out — ranked, reasoned, done. The full catalog is still here if you want it. You won't need it.
          </p>

          <div className="hero-steps" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {STEPS_COPY.map(step => (
              <div key={step.n} style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
                <span style={{ fontFamily: f.serif, fontSize: 34, color: 'rgba(255,255,255,0.14)', lineHeight: 1, minWidth: 44 }}>{step.n}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{step.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40 }}>
            {!searchOpen ? (
              <button
                onClick={() => setSearchOpen(true)}
                style={{
                  fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  paddingBottom: 2, borderBottom: '1px solid rgba(255,255,255,0.2)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
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

        {/* ── Right: the picker console ── */}
        <div style={{
          background: '#22223a', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 'var(--r-lg)', padding: '26px 26px 24px', position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Your budget
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
            <div style={{ padding: '18px 4px 22px', fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              Pick a budget above to see what's worth choosing between.
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
                        opacity: dimmed ? 0.35 : 1, transition: 'all 0.12s',
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
                style={{
                  width: '100%', padding: '14px 18px', borderRadius: 'var(--r-md)',
                  fontSize: 14, fontWeight: 700, border: 'none',
                  background: ready ? c.accent : 'rgba(255,255,255,0.08)',
                  color: ready ? '#fff' : 'rgba(255,255,255,0.35)',
                  cursor: ready ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (ready) (e.currentTarget as HTMLElement).style.background = '#D32F3E' }}
                onMouseLeave={e => { if (ready) (e.currentTarget as HTMLElement).style.background = c.accent }}
              >
                <span>{ready ? 'Show my 5 matches' : `Pick ${2 - priorities.size} more`}</span>
                <ArrowRight size={16} strokeWidth={2.4} />
              </button>

              {activeTier && (
                <div style={{ marginTop: 12, fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
                  {activeTier.name} · {priorities.size > 0 ? Array.from(priorities).map(id => QUICK_PRIORITIES.find(q => q.id === id)?.label).join(', ') : 'no priorities yet'}
                </div>
              )}
            </div>
          )}
        </div>
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
            style={{ color: c.text3, display: 'flex', transition: 'color 0.1s' }}
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
          borderRadius: 'var(--r-full)', transition: 'background 0.1s',
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
    cursor: disabled ? 'default' : 'pointer', transition: 'all 0.12s', border: 'none',
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

function TrendingScroll({ phones }: { phones: Phone[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  if (phones.length === 0) return null
  return (
    <section style={{ marginBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontFamily: f.serif, fontSize: 28, color: c.text1 }}>Trending This Week</h2>
        <span style={{ fontSize: 14, color: c.text3 }}>Most viewed phones</span>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 60, background: 'linear-gradient(-90deg, var(--bg) 0%, transparent 100%)', pointerEvents: 'none', zIndex: z.badge }} />
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}
          aria-label="Scroll left"
          style={{ position: 'absolute', top: '50%', left: -14, transform: 'translateY(-50%)', width: 36, height: 36, background: c.surface, border: `1px solid ${c.border}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text2, zIndex: z.badge, boxShadow: 'var(--shadow-sm)', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
        >
          <ChevronLeft size={16} />
        </button>
        <div ref={scrollRef} className="scrollbar-none" style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 4 }}>
          {phones.map((phone, i) => (
            <div
              key={phone.id}
              onClick={() => router.push(ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone)))}
              style={{ flexShrink: 0, width: 148, scrollSnapAlign: 'start', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)', padding: 12, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: c.text3, marginBottom: 8 }}>#{i + 1}</div>
              <div style={{ width: 72, height: 72, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {phone.main_image_url
                  ? <img src={phone.main_image_url} alt={phone.model_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <Smartphone size={32} color={c.border} strokeWidth={1} />}
              </div>
              <div style={{ fontFamily: f.serif, fontSize: 12, color: c.text1, marginBottom: 4, lineHeight: 1.3 }}>{phone.model_name}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: c.text1 }}>{phone.price_usd ? `$${phone.price_usd.toLocaleString()}` : '—'}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}
          aria-label="Scroll right"
          style={{ position: 'absolute', top: '50%', right: -14, transform: 'translateY(-50%)', width: 36, height: 36, background: c.surface, border: `1px solid ${c.border}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text2, zIndex: z.badge, boxShadow: 'var(--shadow-sm)', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
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

      {/* ── Rankings strip ── */}
      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '52px var(--page-px) 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
          <span style={{ fontFamily: f.serif, fontSize: 20, color: c.text1 }}>Or jump straight to a ranking</span>
          <span style={{ fontSize: 12, color: c.text3 }}>— pre-decided, updated daily</span>
        </div>
        <div className="scrollbar-none" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {Object.entries(CATEGORY_META).map(([slug, meta], i) => (
            <Link
              key={slug} href={ROUTES.category(slug)}
              style={{
                flexShrink: 0, width: 168, padding: '16px 16px 14px', background: c.surface,
                border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', transition: 'all 0.15s', display: 'block',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.accent }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: c.text2, display: 'flex' }}>{CATEGORY_ICONS[slug]}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: c.text3 }}>{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: c.text1, marginBottom: 2 }}>{meta.title}</div>
              <div style={{ fontSize: 11, color: c.text3 }}>{meta.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px)' }}>
        <div style={{ marginTop: 48 }}>
          <TrendingScroll phones={trending} />
        </div>
      </div>

      {/* ── Catalog fallback — collapsed by default ── */}
      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px) 24px' }}>
        {!catalogOpen ? (
          <button
            onClick={openCatalog}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', background: c.primary, border: 'none',
              borderRadius: 'var(--r-lg)', color: '#fff', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
          >
            <span>Prefer to browse the full catalog yourself?</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              Open catalog <ChevronDown size={15} />
            </span>
          </button>
        ) : (
          <div style={{ height: 1, background: c.border, marginBottom: 8 }} />
        )}
      </div>

      {catalogOpen && (
        <div id="phone-grid" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px) 64px', display: 'grid', gridTemplateColumns: 'var(--sidebar-w) 1fr', gap: 32, alignItems: 'start' }}>
          <div className="filter-sidebar">
            <FilterPanel filters={filters} onChange={handleFiltersChange} onReset={handleReset} />
          </div>

          <div>
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
                  style={{ padding: '9px 22px', background: c.primary, color: '#fff', borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
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
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: c.surface, borderRadius: 'var(--r-xl) var(--r-xl) 0 0', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease' }}
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
        .hero-headline { font-size: clamp(40px, 4.6vw, 60px); }
        .phone-grid-layout { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        ${mq.xl} {
          .hero-grid { grid-template-columns: 1fr !important; }
        }
        ${mq.lg} {
          #phone-grid { grid-template-columns: 1fr !important; }
          .filter-sidebar { display: none !important; }
          .mobile-filter-btn { display: flex !important; }
          .phone-grid-layout { grid-template-columns: repeat(4, 1fr); gap: 12px; }
        }
        @media (max-width: 860px) { .phone-grid-layout { grid-template-columns: repeat(3, 1fr); gap: 10px; } }
        ${mq.sm} {
          .hero-headline { font-size: 34px !important; }
          .hero-steps { display: none !important; }
          .phone-grid-layout { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .tier-segmented { flex-wrap: wrap; }
          .tier-segmented > button { flex: 1 1 33%; }
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
