'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, ArrowRight, ArrowUpRight, Camera, Battery, Zap, Tag, Feather,
  Smartphone, ChevronRight, Gamepad2, Monitor, Bolt, BadgeDollarSign,
  SlidersHorizontal, Compass, Database,
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
import type { Phone, SearchFilters, FilterStats } from '@/lib/types'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'camera-phones':  <Camera size={15} strokeWidth={1.5} />,
  'battery-life':   <Battery size={15} strokeWidth={1.5} />,
  'gaming-phones':  <Gamepad2 size={15} strokeWidth={1.5} />,
  'under-300':      <Tag size={15} strokeWidth={1.5} />,
  'under-500':      <Tag size={15} strokeWidth={1.5} />,
  'lightweight':    <Feather size={15} strokeWidth={1.5} />,
  'compact-phones': <Smartphone size={15} strokeWidth={1.5} />,
  'fast-charging':  <Bolt size={15} strokeWidth={1.5} />,
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

// ─── Hero — states the job in one line, one obvious action ─────────────────

function Hero({ query, setQuery, onSubmit }: {
  query: string
  setQuery: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <section style={{ background: c.primary, position: 'relative', overflow: 'hidden' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 90%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{
        position: 'absolute', top: '-30%', right: '-8%', width: 560, height: 560,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(230,57,70,0.16) 0%, transparent 68%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '88px var(--page-px) 56px', position: 'relative', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 'var(--r-full)', marginBottom: 26,
        }}>
          <Database size={12} color="rgba(255,255,255,0.6)" />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1.6px' }}>
            A phone spec database, not a shop
          </span>
        </div>

        <h1 style={{
          fontFamily: f.serif, fontSize: 'clamp(34px, 5vw, 54px)', color: '#fff',
          letterSpacing: '-1.2px', lineHeight: 1.08, marginBottom: 18,
        }}>
          Every phone's real specs.<br />No sponsored ranking.
        </h1>

        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, maxWidth: 480, margin: '0 auto 34px' }}>
          Search any model, or tell us your budget and we'll narrow the field for you.
          Every number on this site comes from the manufacturer spec sheet.
        </p>

        <form onSubmit={onSubmit} style={{ position: 'relative', maxWidth: 480, margin: '0 auto' }}>
          <Search size={16} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} aria-hidden="true" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search a phone — “iPhone 17 Pro”, “Galaxy S26”..."
            aria-label="Search phones"
            style={{
              width: '100%', height: 52, padding: '0 110px 0 46px',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 'var(--r-full)', fontSize: 15, color: '#fff',
            }}
          />
          <button
            type="submit"
            style={{
              position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
              padding: '11px 22px', background: c.accent, color: '#fff',
              borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#D32F3E' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.accent }}
          >
            Search
          </button>
        </form>
      </div>
    </section>
  )
}

// ─── Stats ticker — the signature element: a live monospace readout instead
// of a marketing stat chip, since this site's whole identity is "real data" ──

function StatsTicker({ stats }: { stats: FilterStats | null }) {
  const items = stats ? [
    { label: 'PHONES TRACKED', value: stats.total_phones.toLocaleString() },
    { label: 'BRANDS',         value: String(stats.total_brands) },
    { label: 'PRICE RANGE',    value: `$${Math.round(stats.price_range.min)}–${Math.round(stats.price_range.max).toLocaleString()}` },
    { label: 'NEWEST MODEL',   value: String(stats.year_range.max) },
  ] : null

  return (
    <div style={{ background: '#12121F', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{
        maxWidth: 'var(--max-w)', margin: '0 auto', padding: '14px var(--page-px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
        flexWrap: 'wrap', fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
      }}>
        {(items ?? Array.from({ length: 4 })).map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 8,
              padding: '2px 20px',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}
            className="ticker-item"
          >
            {item ? (
              <>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{item.value}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.6px' }}>{item.label}</span>
              </>
            ) : (
              <span className="skeleton" style={{ height: 14, width: 90, background: 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Two paths — the only two ways to start, named by what they do ─────────

function PathCard({ icon, eyebrow, title, desc, meta, href, tone }: {
  icon: React.ReactNode
  eyebrow: string
  title: string
  desc: string
  meta: string
  href: string
  tone: 'accent' | 'neutral'
}) {
  const [hov, setHov] = useState(false)
  return (
    <Link
      href={href}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'block', padding: '30px 28px', borderRadius: 'var(--r-xl)',
        border: `1px solid ${hov ? (tone === 'accent' ? c.accent : c.borderHover) : c.border}`,
        background: c.surface, textDecoration: 'none', transition: 'all 150ms ease',
        boxShadow: hov ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hov ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--r-md)', marginBottom: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: tone === 'accent' ? 'var(--accent-light)' : c.bg,
        color: tone === 'accent' ? c.accent : c.text2,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: tone === 'accent' ? c.accent : c.text3, marginBottom: 8 }}>
        {eyebrow}
      </div>
      <div style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, marginBottom: 8, letterSpacing: '-0.3px' }}>
        {title}
      </div>
      <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, marginBottom: 18 }}>{desc}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: c.text3 }}>{meta}</span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600,
          color: tone === 'accent' ? c.accent : c.text1,
        }}>
          {tone === 'accent' ? 'Start' : 'Browse'}
          <ArrowRight size={14} style={{ transform: hov ? 'translateX(3px)' : 'none', transition: 'transform 150ms ease' }} />
        </span>
      </div>
    </Link>
  )
}

function TwoPaths() {
  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '48px var(--page-px) 8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="paths-grid">
        <PathCard
          icon={<SlidersHorizontal size={20} strokeWidth={1.5} />}
          eyebrow="30 seconds · guided"
          title="Tell us your budget and priorities"
          desc="Pick a price tier and up to 3 things that matter — camera, battery, gaming, whatever. We rank the whole catalog against exactly that."
          meta="Best if you don't know where to start"
          href={ROUTES.pick}
          tone="accent"
        />
        <PathCard
          icon={<Compass size={20} strokeWidth={1.5} />}
          eyebrow="self-directed"
          title="Browse and filter the full catalog"
          desc="Every tracked phone, with every filter — RAM, screen size, chipset tier, water resistance. Sort however you want."
          meta="Best if you already know what you're looking for"
          href="#catalog"
          tone="neutral"
        />
      </div>
    </div>
  )
}

// ─── Category rail — clearly secondary, labeled as pre-computed rankings ────

function CategoryRail() {
  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '52px var(--page-px) 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: c.text3 }}>
          Or jump to a pre-ranked list
        </span>
        <span style={{ fontSize: 12, color: c.text3 }}>Recomputed nightly</span>
      </div>
      <div className="category-chip-row" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
        {Object.entries(CATEGORY_META).map(([slug, meta]) => (
          <Link
            key={slug}
            href={ROUTES.category(slug)}
            className="category-chip"
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', background: c.surface, border: `1px solid ${c.border}`,
              borderRadius: 'var(--r-full)', textDecoration: 'none', transition: 'all 150ms ease',
            }}
          >
            <span style={{ color: c.accent, display: 'flex' }}>{CATEGORY_ICONS[slug]}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: c.text1, whiteSpace: 'nowrap' }}>{meta.title}</span>
            <ArrowUpRight size={12} color={c.text3} />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Trending ────────────────────────────────────────────────────────────────

function TrendingScroll({ phones }: { phones: Phone[] }) {
  const router = useRouter()
  if (phones.length === 0) return null
  return (
    <section style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '52px var(--page-px) 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <span style={{ fontFamily: f.serif, fontSize: 22, color: c.text1 }}>Most viewed this week</span>
      </div>
      <div className="scrollbar-none" style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 4 }}>
        {phones.map(phone => (
          <div
            key={phone.id}
            onClick={() => router.push(ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone)))}
            style={{
              flexShrink: 0, width: 164, scrollSnapAlign: 'start', padding: '16px 14px', cursor: 'pointer',
              background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', textAlign: 'center',
              transition: 'border-color 150ms ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.borderHover }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border }}
          >
            <div style={{ width: 68, height: 68, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {phone.main_image_url
                ? <img src={phone.main_image_url} alt={phone.model_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <Smartphone size={28} color={c.border} strokeWidth={1} />}
            </div>
            <div style={{ fontFamily: f.serif, fontSize: 13, color: c.text1, marginBottom: 4, lineHeight: 1.3 }}>{phone.model_name}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.text2 }}>{phone.price_usd ? `$${phone.price_usd.toLocaleString()}` : 'Price TBA'}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Catalog filter chips / pagination (unchanged behavior) ─────────────────

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
        style={{ fontSize: 12, fontWeight: 500, color: c.accent, padding: '4px 8px', borderRadius: 'var(--r-full)', transition: 'background 100ms ease' }}
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
      <button style={btn(false, page === 1)} onClick={() => page > 1 && onChange(page - 1)} disabled={page === 1} aria-label="Previous page">‹</button>
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
      <button style={btn(false, page === totalPages)} onClick={() => page < totalPages && onChange(page + 1)} disabled={page === totalPages} aria-label="Next page">›</button>
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
  const [stats, setStats]                 = useState<FilterStats | null>(null)
  const [total, setTotal]                 = useState(0)
  const [loading, setLoading]             = useState(true)
  const [comparePhones, setComparePhones] = useState<Phone[]>([])
  const [searchQuery, setSearchQuery]     = useState(searchParams.get('q') ?? '')
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
    api.filters.stats().then(setStats).catch(() => {})
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
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const f = { ...filters, q: searchQuery.trim() }
    setFilters(f); setPage(1); setCatalogOpen(true); commit(f, 1, sortIdx)
    setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
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

      <Hero query={searchQuery} setQuery={setSearchQuery} onSubmit={handleSearchSubmit} />
      <StatsTicker stats={stats} />
      <TwoPaths />
      <CategoryRail />

      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px)' }}>
        <TrendingScroll phones={trending} />
      </div>

      <div id="catalog" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '56px var(--page-px) 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 8 }}>
          <div style={{ flex: 1, height: 1, background: c.border }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: c.text3, textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>
            Full Catalog
          </span>
          <div style={{ flex: 1, height: 1, background: c.border }} />
        </div>
      </div>

      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '24px var(--page-px) 64px', display: 'grid', gridTemplateColumns: 'var(--sidebar-w) 1fr', gap: 32, alignItems: 'start' }}>
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

            <Link href={ROUTES.pick} style={{ fontSize: 13, fontWeight: 600, color: c.accent, display: 'flex', alignItems: 'center', gap: 4 }}>
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
        .phone-grid-layout { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }

        ${mq.lg} {
          .paths-grid { grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: var(--sidebar-w) 1fr"] { grid-template-columns: 1fr !important; }
          .filter-sidebar { display: none !important; }
          .mobile-filter-btn { display: flex !important; }
          .phone-grid-layout { grid-template-columns: repeat(4, 1fr); gap: 12px; }
        }
        @media (max-width: 860px) { .phone-grid-layout { grid-template-columns: repeat(3, 1fr); gap: 10px; } }
        ${mq.sm} {
          .phone-grid-layout { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .ticker-item { padding: 2px 12px !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
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
