'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, ArrowRight, Camera, Battery, Zap, Tag, Feather,
  Smartphone, ChevronLeft, ChevronRight, ChevronDown,
  Gamepad2, Monitor, Bolt, BadgeDollarSign, Check, X, Sparkles,
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
import { formatDisplayPrice } from '@/lib/price'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'camera-phones':  <Camera size={20} strokeWidth={1.5} />,
  'battery-life':   <Battery size={20} strokeWidth={1.5} />,
  'gaming-phones':  <Zap size={20} strokeWidth={1.5} />,
  'under-300':      <Tag size={20} strokeWidth={1.5} />,
  'under-500':      <Tag size={20} strokeWidth={1.5} />,
  'lightweight':    <Feather size={20} strokeWidth={1.5} />,
  'compact-phones': <Smartphone size={20} strokeWidth={1.5} />,
  'fast-charging':  <Zap size={20} strokeWidth={1.5} />,
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

// Quick-pick priorities shown on the homepage launcher. Full 13-option list
// still lives in /pick step 2 — this is a deliberately trimmed subset so the
// hero card stays a single glance, not another form to fill out.
const QUICK_PRIORITIES: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'camera',        label: 'Camera',        icon: <Camera size={17} strokeWidth={1.5} /> },
  { id: 'battery',       label: 'Battery',       icon: <Battery size={17} strokeWidth={1.5} /> },
  { id: 'performance',   label: 'Performance',   icon: <Zap size={17} strokeWidth={1.5} /> },
  { id: 'gaming',        label: 'Gaming',        icon: <Gamepad2 size={17} strokeWidth={1.5} /> },
  { id: 'display',       label: 'Display',       icon: <Monitor size={17} strokeWidth={1.5} /> },
  { id: 'fast_charging', label: 'Fast Charging', icon: <Bolt size={17} strokeWidth={1.5} /> },
  { id: 'compact',       label: 'Compact',       icon: <Smartphone size={17} strokeWidth={1.5} /> },
  { id: 'lightweight',   label: 'Lightweight',   icon: <Feather size={17} strokeWidth={1.5} /> },
  { id: 'value',         label: 'Best Value',    icon: <BadgeDollarSign size={17} strokeWidth={1.5} /> },
]

const TIER_COLOR: Record<PriceTierId, string> = {
  s: '#C9A84C',
  a: 'var(--accent)',
  b: 'var(--blue)',
  c: 'var(--green)',
  d: 'var(--text-2)',
}

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

// ─── Pick launcher: the actual homepage. Budget + priorities in, straight to
// your 5 matches. This replaces "search bar + button" as the primary CTA. ───

function PickLauncher() {
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

  const handleGo = () => {
    if (!ready) return
    const params = new URLSearchParams()
    params.set('step', '3')
    params.set('tier', tierId as string)
    params.set('p', Array.from(priorities).join(','))
    router.push(`/pick?${params.toString()}`)
  }

  return (
    <div style={{
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: 'var(--r-xl)', padding: '32px', boxShadow: 'var(--shadow-lg)',
      maxWidth: 720, margin: '0 auto', textAlign: 'left',
    }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: c.accent, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
          Step 1 — Your budget
        </div>
        <div className="pick-tier-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRICE_TIERS.map(tier => {
            const active = tierId === tier.id
            const priceLabel = tier.max == null ? `$${tier.min.toLocaleString()}+` : `$${tier.min}–$${tier.max}`
            return (
              <button
                key={tier.id}
                onClick={() => setTierId(tier.id)}
                style={{
                  flex: '1 1 100px', padding: '10px 8px', textAlign: 'center',
                  borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'all 0.15s',
                  border: `2px solid ${active ? TIER_COLOR[tier.id] : c.border}`,
                  background: active ? `${TIER_COLOR[tier.id]}12` : 'transparent',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.4px', color: TIER_COLOR[tier.id], marginBottom: 3 }}>
                  {tier.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text1 }}>{priceLabel}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.accent, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Step 2 — What matters most
          </div>
          <span style={{ fontSize: 12, color: c.text3 }}>Pick 2–3 · {priorities.size} selected</span>
        </div>
        <div className="pick-priority-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {QUICK_PRIORITIES.map(p => {
            const active = priorities.has(p.id)
            const dimmed = priorities.size >= 3 && !active
            return (
              <button
                key={p.id}
                onClick={() => togglePriority(p.id)}
                disabled={dimmed}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '9px 10px',
                  borderRadius: 'var(--r-sm)', cursor: dimmed ? 'not-allowed' : 'pointer',
                  border: `1.5px solid ${active ? c.primary : c.border}`,
                  background: active ? 'rgba(26,26,46,0.05)' : 'transparent',
                  opacity: dimmed ? 0.4 : 1, transition: 'all 0.15s',
                }}
              >
                <span style={{ color: active ? c.primary : c.text3, display: 'flex', flexShrink: 0 }}>{p.icon}</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: c.text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
                {active && <Check size={12} color={c.primary} strokeWidth={3} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleGo}
        disabled={!ready}
        style={{
          width: '100%', padding: '15px 0', borderRadius: 'var(--r-full)',
          fontSize: 15, fontWeight: 700, border: 'none',
          background: ready ? c.accent : '#E0E0DC',
          color: ready ? '#fff' : c.text3,
          cursor: ready ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: ready ? '0 4px 16px rgba(230,57,70,0.28)' : 'none',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (ready) (e.currentTarget as HTMLElement).style.background = '#D32F3E' }}
        onMouseLeave={e => { if (ready) (e.currentTarget as HTMLElement).style.background = c.accent }}
      >
        {ready
          ? <>Show My 5 Matches <ArrowRight size={17} strokeWidth={2.4} /></>
          : `Select a budget and ${Math.max(2 - priorities.size, 0) > 0 ? `${2 - priorities.size} more priorit${2 - priorities.size === 1 ? 'y' : 'ies'}` : 'a budget'}`}
      </button>
    </div>
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

  // Catalog (grid + filter sidebar) is collapsed by default. It's the
  // "I already know what I want" escape hatch, not the landing experience —
  // opens automatically only if the URL already encodes a search/filter/page
  // state (e.g. someone bookmarked or shared a filtered link).
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

  // Only hits the search endpoint once the catalog is actually opened —
  // no point loading a full page grid nobody asked to see.
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

      {/* ── HERO: the Pick flow itself, not a link to it ─────────────────── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '56px var(--page-px) 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 700, color: c.accent, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 18 }}>
          <Sparkles size={12} /> 30 seconds to your phone
        </div>
        <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(34px, 5vw, 50px)', color: c.text1, letterSpacing: '-0.8px', lineHeight: 1.12, marginBottom: 14 }}>
          Stop comparing specs.<br />Start deciding.
        </h1>
        <p style={{ fontSize: 'clamp(15px, 2vw, 17px)', color: c.text2, lineHeight: 1.6, marginBottom: 36, maxWidth: 520, margin: '0 auto 36px' }}>
          Tell us your budget and what matters to you. We'll narrow the entire catalog down to 5 phones — no spec sheets, no tabs, no guessing.
        </p>

        <PickLauncher />

        <div style={{ marginTop: 22 }}>
          {!searchOpen ? (
            <button
              onClick={() => setSearchOpen(true)}
              style={{ fontSize: 13, color: c.text3, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.text1 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text3 }}
            >
              Already know the model you want? Search directly →
            </button>
          ) : (
            <form onSubmit={handleSearchSubmit} style={{ position: 'relative', maxWidth: 420, margin: '0 auto' }}>
              <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: c.text3, pointerEvents: 'none' }} />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="e.g. iPhone 17 Pro, Galaxy S26"
                aria-label="Search phones directly"
                style={{
                  width: '100%', height: 42, padding: '0 40px 0 36px',
                  background: c.surface, border: `1px solid ${c.border}`,
                  borderRadius: 'var(--r-full)', fontSize: 14, color: c.text1,
                }}
              />
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                aria-label="Close search"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: c.text3, display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
              >
                <X size={13} />
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── How it works — reinforces the decision framing, not another search tool ── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '20px var(--page-px) 56px' }}>
        <div className="how-it-works-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { n: '01', title: 'Set your budget', desc: 'Five clear tiers, from budget to ultra flagship. Or enter your own range.' },
            { n: '02', title: 'Pick what matters', desc: 'Camera, battery, gaming, whatever you actually care about — 2 or 3 max.' },
            { n: '03', title: 'Get your answer', desc: 'Five ranked phones with the reasoning and trade-offs spelled out. Done.' },
          ].map(step => (
            <div key={step.n} style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: f.serif, fontSize: 26, color: 'var(--border-hover)', marginBottom: 6 }}>{step.n}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: c.text1, marginBottom: 4 }}>{step.title}</div>
              <div style={{ fontSize: 13, color: c.text3, lineHeight: 1.55 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Rankings strip — secondary, for people who want to browse a verdict instead of taking the quiz ── */}
      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px)', marginBottom: 48 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.text3, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
          Or jump straight to a ranking
        </div>
        <div className="scrollbar-none" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {Object.entries(CATEGORY_META).map(([slug, meta]) => (
            <Link
              key={slug} href={ROUTES.category(slug)}
              style={{ flexShrink: 0, width: 138, padding: '18px 14px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)', textAlign: 'center', transition: 'all 0.15s', display: 'block' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
            >
              <div style={{ color: c.text2, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{CATEGORY_ICONS[slug]}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: c.text1, marginBottom: 2 }}>{meta.title}</div>
              <div style={{ fontSize: 11, color: c.text3 }}>{meta.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px)' }}>
        <TrendingScroll phones={trending} />
      </div>

      {/* ── Catalog — deliberately collapsed. This is the "more searching" path, not the front door. ── */}
      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px) 24px' }}>
        {!catalogOpen ? (
          <button
            onClick={openCatalog}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '16px 0', background: c.surface, border: `1px dashed ${c.border}`,
              borderRadius: 'var(--r-lg)', color: c.text2, fontSize: 14, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
          >
            Prefer to browse the full catalog yourself? <ChevronDown size={15} />
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
        .phone-grid-layout { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        ${mq.lg} {
          #phone-grid { grid-template-columns: 1fr !important; }
          .filter-sidebar { display: none !important; }
          .mobile-filter-btn { display: flex !important; }
          .phone-grid-layout { grid-template-columns: repeat(4, 1fr); gap: 12px; }
          .how-it-works-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
        @media (max-width: 860px) { .phone-grid-layout { grid-template-columns: repeat(3, 1fr); gap: 10px; } }
        ${mq.sm} {
          .phone-grid-layout { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .pick-priority-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .pick-tier-row > button { flex: 1 1 45% !important; }
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
