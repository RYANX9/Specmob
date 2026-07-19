'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, ArrowRight, Camera, Battery, Zap, Tag, Feather,
  Smartphone, ChevronLeft, ChevronRight, Crosshair, GitCompare, SlidersHorizontal,
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
import type { Phone, SearchFilters } from '@/lib/types'
import { formatDisplayPrice } from '@/lib/price'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'camera-phones':  <Camera size={22} strokeWidth={1.5} />,
  'battery-life':   <Battery size={22} strokeWidth={1.5} />,
  'gaming-phones':  <Zap size={22} strokeWidth={1.5} />,
  'under-300':      <Tag size={22} strokeWidth={1.5} />,
  'under-500':      <Tag size={22} strokeWidth={1.5} />,
  'lightweight':    <Feather size={22} strokeWidth={1.5} />,
  'compact-phones': <Smartphone size={22} strokeWidth={1.5} />,
  'fast-charging':  <Zap size={22} strokeWidth={1.5} />,
}

const SORT_OPTIONS = [
  { label: 'Newest First',       sort_by: 'release_ts',       sort_order: 'desc' },
  { label: 'Price: Low to High', sort_by: 'price_usd',        sort_order: 'asc'  },
  { label: 'Price: High to Low', sort_by: 'price_usd',        sort_order: 'desc' },
  { label: 'Best Performance',   sort_by: 'antutu_score',     sort_order: 'desc' },
  { label: 'Best Battery',       sort_by: 'battery_capacity', sort_order: 'desc' },
  { label: 'Best Camera',        sort_by: 'main_camera_mp',   sort_order: 'desc' },
] as const

const POPULAR = ['Galaxy S26 Ultra', 'iPhone 17 Pro', 'Pixel 10 Pro', 'Xiaomi 17 Ultra', 'OnePlus 13']
const EMPTY_FILTERS: SearchFilters = {}

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

function FilterChips({ filters, onChange }: { filters: SearchFilters; onChange: (f: SearchFilters) => void }) {
  const chips: { label: string; clear: () => void }[] = []
  if (filters.q) chips.push({ label: `"${filters.q}"`, clear: () => onChange({ ...filters, q: undefined }) })
  if (filters.min_price || filters.max_price) {
    const lo = filters.min_price ? `$${filters.min_price}` : ''
    const hi = filters.max_price ? `$${filters.max_price}` : ''
    chips.push({ label: lo && hi ? `${lo} \u2013 ${hi}` : lo ? `From ${lo}` : `Up to ${hi}`, clear: () => onChange({ ...filters, min_price: undefined, max_price: undefined }) })
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

// ─── entry paths: the three ways a visitor arrives with an actual intent ─────
// Not a numbered sequence -- each card is a standalone route in, matched to
// how people actually think ("I know the name" / "I don't know what I want" /
// "deciding between two options"). Equal visual weight on purpose.

interface EntryPath {
  href: string
  icon: React.ReactNode
  title: string
  desc: string
  cta: string
  tone: 'primary' | 'accent' | 'outline'
}

function EntryCard({ path }: { path: EntryPath }) {
  const [hov, setHov] = useState(false)
  const isPrimary = path.tone === 'primary'
  const isAccent = path.tone === 'accent'

  const bg = isPrimary ? c.primary : c.surface
  const border = isPrimary ? c.primary : hov ? 'var(--border-hover)' : c.border
  const iconColor = isPrimary ? '#fff' : isAccent ? c.accent : c.text2
  const titleColor = isPrimary ? '#fff' : c.text1
  const descColor = isPrimary ? 'rgba(255,255,255,0.62)' : c.text3
  const ctaColor = isPrimary ? '#fff' : isAccent ? c.accent : c.text1

  return (
    <Link
      href={path.href}
      style={{
        display: 'block', padding: '28px 26px', borderRadius: 'var(--r-xl)',
        background: bg, border: `1px solid ${border}`,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        transform: hov ? 'translateY(-3px)' : 'none',
        boxShadow: hov ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        textDecoration: 'none', height: '100%',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--r-md)',
        background: isPrimary ? 'rgba(255,255,255,0.1)' : isAccent ? 'var(--accent-light)' : c.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, color: iconColor,
      }}>
        {path.icon}
      </div>
      <div style={{ fontFamily: f.serif, fontSize: 21, color: titleColor, marginBottom: 6, letterSpacing: '-0.2px' }}>
        {path.title}
      </div>
      <p style={{ fontSize: 14, color: descColor, lineHeight: 1.55, marginBottom: 18, minHeight: 42 }}>
        {path.desc}
      </p>
      <span style={{ fontSize: 13, fontWeight: 600, color: ctaColor, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {path.cta} <ArrowRight size={14} strokeWidth={2.2} style={{ transition: 'transform 0.15s', transform: hov ? 'translateX(2px)' : 'none' }} />
      </span>
    </Link>
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
              <div style={{ fontSize: 12, fontWeight: 600, color: c.text1 }}>{phone.price_usd ? `$${phone.price_usd.toLocaleString()}` : '\u2014'}</div>
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
  const [heroQuery, setHeroQuery]         = useState(searchParams.get('q') ?? '')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const ownUpdate = useRef(false)
  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '').length
  const hasActiveSearch = activeFilterCount > 0

  const spString = searchParams.toString()
  useEffect(() => {
    if (ownUpdate.current) { ownUpdate.current = false; return }
    const parsed = parseFiltersFromParams(new URLSearchParams(spString))
    setFilters(parsed)
    setHeroQuery(parsed.q ?? '')
    setPage(parseInt(searchParams.get('page') ?? '1', 10))
    setSortIdx(parseInt(searchParams.get('sort') ?? '0', 10))
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
    const controller = new AbortController()
    fetchPhones(filters, page, sortIdx, controller.signal)
    return () => controller.abort()
  }, [filters, page, sortIdx, fetchPhones])

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
  const handleReset = () => { setFilters(EMPTY_FILTERS); setPage(1); setHeroQuery(''); commit(EMPTY_FILTERS, 1, sortIdx) }
  const handleSortChange = (idx: number) => { setSortIdx(idx); setPage(1); commit(filters, 1, idx) }
  const handlePageChange = (p: number) => {
    setPage(p)
    commit(filters, p, sortIdx)
    document.getElementById('phone-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!heroQuery.trim()) return
    const f = { ...filters, q: heroQuery.trim() }
    setFilters(f); setPage(1); commit(f, 1, sortIdx)
    document.getElementById('phone-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handlePopularTag = (tag: string) => {
    const f = { q: tag }
    setFilters(f); setHeroQuery(tag); setPage(1); commit(f, 1, sortIdx)
    document.getElementById('phone-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  // Guided pick always starts at step 1 -- never deep-link into a later
  // step from here. Step 1 initializes cleanly on every load; skipping
  // ahead is what left the pick flow stuck on a permanent loading state.
  const ENTRY_PATHS: EntryPath[] = [
    {
      href: ROUTES.pick,
      icon: <Crosshair size={20} strokeWidth={1.5} />,
      title: "Don't know what to get?",
      desc: 'Answer two quick questions about budget and priorities. Get your top 5 matches.',
      cta: 'Find my phone',
      tone: 'primary',
    },
    {
      href: '#phone-grid',
      icon: <Search size={20} strokeWidth={1.5} />,
      title: 'Know the name?',
      desc: 'Search or browse the full catalog with filters for price, camera, battery, and more.',
      cta: 'Browse phones',
      tone: 'outline',
    },
    {
      href: ROUTES.compare(),
      icon: <GitCompare size={20} strokeWidth={1.5} />,
      title: 'Deciding between two?',
      desc: 'Put up to 4 phones side by side. Specs, scores, and an honest verdict.',
      cta: 'Compare phones',
      tone: 'accent',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar
        compareCount={comparePhones.length}
        onOpenCompare={() => comparePhones.length >= 2 && router.push(ROUTES.compare(...comparePhones.map(p => phoneSlug(p))))}
      />

      {/* ── Hero: one line, one search bar, no forced choice ─────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '64px var(--page-px) 40px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(32px, 4.6vw, 48px)', color: c.text1, letterSpacing: '-0.7px', lineHeight: 1.12, marginBottom: 14 }}>
          Find a phone you'll actually be happy with.
        </h1>
        <p style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: c.text2, lineHeight: 1.65, marginBottom: 30, maxWidth: 480, margin: '0 auto 30px' }}>
          Real specs, honest comparisons, only what's in stock today.
        </p>

        <form onSubmit={handleHeroSearch} style={{ position: 'relative', maxWidth: 540, margin: '0 auto 14px' }}>
          <input
            value={heroQuery}
            onChange={e => setHeroQuery(e.target.value)}
            placeholder="Search any phone..."
            aria-label="Search phones"
            style={{
              width: '100%', height: 54, padding: '0 54px 0 22px',
              background: c.surface, border: `1px solid ${c.border}`,
              borderRadius: 'var(--r-full)', fontSize: 16, color: c.text1,
              boxShadow: 'var(--shadow-sm)', transition: 'all 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = c.primary; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(26,26,46,0.07)' }}
            onBlur={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
          />
          {heroQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => { setHeroQuery(''); handleFiltersChange({ ...filters, q: undefined }) }}
              style={{ position: 'absolute', right: 52, top: '50%', transform: 'translateY(-50%)', color: c.text3, display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
          <button
            type="submit"
            aria-label="Search"
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 42, height: 42, background: c.primary, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
          >
            <Search size={18} strokeWidth={2} />
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: c.text3 }}>Popular:</span>
          {POPULAR.map(tag => (
            <button
              key={tag}
              onClick={() => handlePopularTag(tag)}
              style={{
                fontSize: 13,
                color: filters.q === tag ? c.primary : c.text2,
                padding: '4px 12px',
                background: filters.q === tag ? 'rgba(26,26,46,0.06)' : c.surface,
                border: `1px solid ${filters.q === tag ? c.primary : c.border}`,
                borderRadius: 'var(--r-full)',
                transition: 'all 0.15s',
                fontWeight: filters.q === tag ? 600 : 400,
              }}
              onMouseEnter={e => {
                if (filters.q !== tag) {
                  (e.currentTarget as HTMLElement).style.borderColor = c.primary
                  ;(e.currentTarget as HTMLElement).style.color = c.text1
                }
              }}
              onMouseLeave={e => {
                if (filters.q !== tag) {
                  (e.currentTarget as HTMLElement).style.borderColor = c.border
                  ;(e.currentTarget as HTMLElement).style.color = c.text2
                }
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* ── Three equal entry paths -- matched to how visitors actually arrive ── */}
      <section style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px)', marginBottom: 56 }}>
        <div className="entry-path-grid">
          {ENTRY_PATHS.map(path => <EntryCard key={path.title} path={path} />)}
        </div>
      </section>

      {/* ── Category rail ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px)', marginBottom: 48 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.text3, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>
          Browse by what matters to you
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

      <div id="phone-grid" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px) 64px', display: 'grid', gridTemplateColumns: 'var(--sidebar-w) 1fr', gap: 32, alignItems: 'start' }}>
        <div className="filter-sidebar">
          <FilterPanel filters={filters} onChange={handleFiltersChange} onReset={handleReset} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontFamily: f.serif, fontSize: 22, color: c.text1 }}>
              {hasActiveSearch ? 'Matching phones' : 'All phones'}
            </h2>
          </div>

          <FilterChips filters={filters} onChange={handleFiltersChange} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => setMobileFiltersOpen(true)}
                style={{ display: 'none', alignItems: 'center', gap: 6, padding: '7px 14px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500, color: c.text1 }}
                className="mobile-filter-btn"
                aria-label="Open filters"
              >
                <SlidersHorizontal size={14} />
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
              <p style={{ fontSize: 14, color: c.text3, marginBottom: 20 }}>Try adjusting your filters, or let us suggest matches instead.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={handleReset}
                  style={{ padding: '9px 22px', background: c.primary, color: '#fff', borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
                >
                  Clear all filters
                </button>
                <Link
                  href={ROUTES.pick}
                  style={{ padding: '9px 22px', border: `1px solid var(--accent-border)`, color: c.accent, borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 500, background: 'var(--accent-light)' }}
                >
                  Help me choose instead
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px)' }}>
        <TrendingScroll phones={trending} />
      </div>

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
        .entry-path-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .phone-grid-layout { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        ${mq.lg} {
          #phone-grid { grid-template-columns: 1fr !important; }
          .filter-sidebar { display: none !important; }
          .mobile-filter-btn { display: flex !important; }
          .phone-grid-layout { grid-template-columns: repeat(4, 1fr); gap: 12px; }
        }
        ${mq.md} {
          .entry-path-grid { grid-template-columns: 1fr; gap: 12px; }
        }
        @media (max-width: 860px) { .phone-grid-layout { grid-template-columns: repeat(3, 1fr); gap: 10px; } }
        ${mq.sm} {
          .phone-grid-layout { grid-template-columns: repeat(2, 1fr); gap: 8px; }
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
