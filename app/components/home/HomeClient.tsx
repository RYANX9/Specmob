// app/components/home/HomeClient.tsx
'use client'

import { useState, useEffect, useCallback, useRef, Suspense, Fragment } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import {
  Search, ArrowRight, ArrowUpRight, Camera, Battery, Zap, Tag, Feather,
  Smartphone, ChevronLeft, ChevronRight, ChevronDown,
  Gamepad2, Monitor, Bolt, BadgeDollarSign, X,
  Layers, Droplets, Waves, Star, RotateCcw, Scale,
} from 'lucide-react'

import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import FilterPanel from '@/app/components/FilterPanel'
import CompareBar from '@/app/components/CompareBar'
import { useToast } from '@/app/components/Toast'
import { api } from '@/lib/api'
import { useCompare } from '@/lib/compareStore'
import { ROUTES, brandSlug, phoneSlug, PAGE_SIZE, MAX_COMPARE, TRENDING_LIMIT, CATEGORY_META } from '@/lib/config'
import { c, f, z, mq } from '@/lib/tokens'
import { getTierStyle } from '@/lib/tiers'
import type { Phone, SearchFilters, FilterStats } from '@/lib/types'
import { parseFilterParams, serializeFilterParams, hasAnyFilterParam } from '@/lib/filterParams'
import { featureTagLabel } from '@/lib/featureTags'
import { formatDisplayPrice } from '@/lib/price'

import AdSlot from '@/app/components/ads/AdSlot'
import AdCard from '@/app/components/ads/AdCard'
import { pointPriceBounds } from '@/lib/priceTiers'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'camera-phones':  <Camera size={15} strokeWidth={1.5} />,
  'battery-life':   <Battery size={15} strokeWidth={1.5} />,
  'gaming-phones':  <Gamepad2 size={15} strokeWidth={1.5} />,
  'under-300':      <Tag size={15} strokeWidth={1.5} />,
  'under-500':      <Tag size={15} strokeWidth={1.5} />,
  'lightweight':    <Feather size={15} strokeWidth={1.5} />,
  'foldables':      <Layers size={16} strokeWidth={1.5} />,
  'compact-phones': <Smartphone size={15} strokeWidth={1.5} />,
  'fast-charging':  <Bolt size={15} strokeWidth={1.5} />,
}

const CATEGORY_PALETTE: { bg: string; iconBg: string; iconColor: string }[] = [
  { bg: '#FCEAEA', iconBg: '#F6C9CC', iconColor: '#B32A38' },
  { bg: '#EAF3ED', iconBg: '#C9E3D2', iconColor: '#1F7A56' },
  { bg: '#EEEAF7', iconBg: '#D6CCEF', iconColor: '#5B3FA6' },
  { bg: '#F6EEE0', iconBg: '#EAD8B4', iconColor: '#A97A2F' },
  { bg: '#EAEDFA', iconBg: '#C9D2F2', iconColor: '#3457C7' },
  { bg: '#EAF6F5', iconBg: '#C6E8E5', iconColor: '#1F7A75' },
  { bg: '#F7EFEA', iconBg: '#EED9C9', iconColor: '#B0562E' },
  { bg: '#F0EEE7', iconBg: '#DAD5C6', iconColor: '#5C574A' },
  { bg: '#EDF2F7', iconBg: '#CADAE8', iconColor: '#2E6390' },
]

const QUICK_PRIORITIES: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'camera',             label: 'Camera',            icon: <Camera size={14} strokeWidth={2} /> },
  { id: 'battery',            label: 'Battery',           icon: <Battery size={14} strokeWidth={2} /> },
  { id: 'performance',        label: 'Performance',       icon: <Zap size={14} strokeWidth={2} /> },
  { id: 'gaming',             label: 'Gaming',            icon: <Gamepad2 size={14} strokeWidth={2} /> },
  { id: 'display',            label: 'Display',           icon: <Monitor size={14} strokeWidth={2} /> },
  { id: 'smooth_display',     label: 'High Refresh Rate', icon: <Waves size={14} strokeWidth={2} /> },
  { id: 'fast_charging',      label: 'Fast Charging',     icon: <Bolt size={14} strokeWidth={2} /> },
  { id: 'wireless_charging',  label: 'Wireless Charging', icon: <Zap size={14} strokeWidth={2} /> },
  { id: 'compact',            label: 'Compact',           icon: <Smartphone size={14} strokeWidth={2} /> },
  { id: 'lightweight',        label: 'Lightweight',       icon: <Feather size={14} strokeWidth={2} /> },
  { id: 'foldable',           label: 'Foldable',          icon: <Layers size={14} strokeWidth={2} /> },
  { id: 'durability',         label: 'Water Resistant',   icon: <Droplets size={14} strokeWidth={2} /> },
  { id: 'value',              label: 'Best Value',        icon: <BadgeDollarSign size={14} strokeWidth={2} /> },
]

const SORT_OPTIONS = [
  { label: 'Newest First',       sort_by: 'release_ts',       sort_order: 'desc' },
  { label: 'Price: Low to High', sort_by: 'price_usd',        sort_order: 'asc'  },
  { label: 'Price: High to Low', sort_by: 'price_usd',        sort_order: 'desc' },
  { label: 'Best Performance',   sort_by: 'antutu_score',     sort_order: 'desc' },
  { label: 'Best Battery',       sort_by: 'battery_capacity', sort_order: 'desc' },
  { label: 'Best Camera',        sort_by: 'main_camera_mp',   sort_order: 'desc' },
] as const

const EMPTY_FILTERS: SearchFilters = {}

const DIAL_MIN = 0
const DIAL_MAX = 2000
const DIAL_STEP = 10

function tierForDialValue(v: number): { id: string; min: number; max: number | undefined } {
  if (v >= 1000) return { id: 's', min: 1000, max: undefined }
  if (v >= 700)  return { id: 'a', min: 700, max: 999 }
  if (v >= 400)  return { id: 'b', min: 400, max: 699 }
  if (v >= 200)  return { id: 'c', min: 200, max: 399 }
  return { id: 'd', min: 0, max: 199 }
}

function parseFiltersFromParams(sp: URLSearchParams): SearchFilters {
  return {
    q: sp.get('q') || undefined,
    brand: sp.get('brand') || undefined,
    ...parseFilterParams(sp),
  }
}

function buildSearchUrl(f: SearchFilters, p: number, sIdx: number): string {
  const params = new URLSearchParams()
  if (f.q) params.set('q', f.q)
  if (f.brand) params.set('brand', f.brand)
  serializeFilterParams(params, f)
  if (p > 1) params.set('page', String(p))
  if (sIdx > 0) params.set('sort', String(sIdx))
  const str = params.toString()
  return str ? `/?${str}` : '/'
}

function hasActiveUrlState(sp: URLSearchParams): boolean {
  if (sp.get('q') || sp.get('brand') || sp.get('page') || sp.get('sort')) return true
  return hasAnyFilterParam(sp)
}

// ─── Best match card ─────────────────────────────────────────────────────

function BestMatchCard({
  phones, loading, priorityCount,
}: {
  phones: Phone[]
  loading: boolean
  priorityCount: number
}) {
  const cardStyle: React.CSSProperties = {
    background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-xl)',
    padding: 22, boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
  }

  if (loading) {
    return (
      <div style={cardStyle}>
        <div className="skeleton" style={{ height: 11, width: 150, marginBottom: 16 }} />
        <div className="skeleton" style={{ aspectRatio: '1.3', borderRadius: 'var(--r-lg)', marginBottom: 18 }} />
        <div className="skeleton" style={{ height: 10, width: 60, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 22, width: '75%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 24, width: 100, marginBottom: 18 }} />
        <div className="skeleton" style={{ height: 56, marginBottom: 16 }} />
      </div>
    )
  }

  const phone = phones[0]

  if (!phone) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: c.text3, lineHeight: 1.6 }}>
          Not enough phones in this range yet — widen your budget to see a match.
        </p>
      </div>
    )
  }

  const tier = getTierStyle(phone.chipset_tier)
  const priceLabel = formatDisplayPrice(phone)

  const kicker = priorityCount > 0 ? 'Leading your priorities' : 'Your budget, narrowed to one'

  const whyText =
    priorityCount === 0
      ? 'Strongest phone in this range. Pick priorities below to re-rank it.'
      : priorityCount < 3
        ? `Ranked by the ${priorityCount} ${priorityCount === 1 ? 'priority' : 'priorities'} you've picked so far.`
        : 'Ranked by all three priorities you picked.'

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: c.text3 }}>
          {kicker}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px',
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
          color: c.accent, background: 'var(--accent-light)', borderRadius: 'var(--r-full)',
        }}>
          <Star size={10} fill={c.accent} color={c.accent} />
          Best Match
        </span>
      </div>

      <div style={{
        position: 'relative', aspectRatio: '1.6', borderRadius: 'var(--r-lg)',
        background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', marginBottom: 14,
      }}>
        {phone.main_image_url ? (
          <img
            src={phone.main_image_url}
            alt={`${phone.brand} ${phone.model_name}`}
            style={{ width: '50%', height: '72%', objectFit: 'contain' }}
          />
        ) : (
          <Smartphone size={40} color={c.border} strokeWidth={1} />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: c.text3, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>
        {tier && <span style={{ width: 6, height: 6, borderRadius: '50%', background: tier.color, flexShrink: 0 }} />}
        {phone.brand}{tier ? ` · ${tier.label}` : ''}
      </div>
      <div style={{ fontFamily: f.serif, fontSize: 21, color: c.text1, lineHeight: 1.2, marginBottom: 10 }}>
        {phone.model_name}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 23, fontWeight: 700, color: c.text1 }}>{priceLabel}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: c.text3 }}>
          {phone.main_camera_mp && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Camera size={11} />{phone.main_camera_mp}MP</span>}
          {phone.battery_capacity && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Battery size={11} />{Math.round(phone.battery_capacity / 100) / 10}k</span>}
        </span>
      </div>

      <p style={{ fontSize: 12, color: c.text3, lineHeight: 1.5, marginBottom: 14 }}>
        {whyText}
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <Link
          href={ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}
          style={{
            flex: 1, textAlign: 'center', padding: '11px 0', borderRadius: 'var(--r-full)',
            fontSize: 13, fontWeight: 700, background: c.primary, color: '#fff', transition: 'background 150ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
        >
          View full specs
        </Link>
        <Link
          href={`${ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}?tab=compare`}
          style={{
            padding: '11px 16px', borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 600,
            color: c.text2, border: `1px solid ${c.border}`, transition: 'all 150ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
        >
          Compare
        </Link>
      </div>
    </div>
  )
}

// ─── Price dial ───────────────────────────────────────────────────────────

function PriceDial() {
  const router = useRouter()
  const [value, setValue] = useState(500)
  const [touched, setTouched] = useState(false)
  const [priorities, setPriorities] = useState<Set<string>>(new Set())
  const [previewPhones, setPreviewPhones] = useState<Phone[]>([])
  const [previewLoading, setPreviewLoading] = useState(true)
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const tier = tierForDialValue(value)
  const pct = ((value - DIAL_MIN) / (DIAL_MAX - DIAL_MIN)) * 100
  const priorityKey = Array.from(priorities).sort().join(',')

  const setFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const raw = DIAL_MIN + ratio * (DIAL_MAX - DIAL_MIN)
    const stepped = Math.round(raw / DIAL_STEP) * DIAL_STEP
    setValue(stepped)
    setTouched(true)
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => { if (draggingRef.current) setFromClientX(e.clientX) }
    const onUp = () => { draggingRef.current = false }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [setFromClientX])

  useEffect(() => {
    const controller = new AbortController()
    setPreviewLoading(true)

    const { min: dialMin, max: dialMax } = pointPriceBounds(value)

    const request = priorityKey
      ? api.phones.recommend({ min_price: dialMin, max_price: dialMax, priorities: priorityKey, limit: 1 }, controller.signal)
          .then(d => d.phones)
      : api.phones.search({ min_price: dialMin, max_price: dialMax, sort_by: 'antutu_score', sort_order: 'desc', page_size: 1 }, controller.signal)
          .then(d => d.results)

    request
      .then(list => setPreviewPhones(list))
      .catch(err => { if (!controller.signal.aborted && !(err instanceof Error && err.name === 'AbortError')) setPreviewPhones([]) })
      .finally(() => { if (!controller.signal.aborted) setPreviewLoading(false) })

    return () => controller.abort()
  }, [value, priorityKey])

  const togglePriority = (id: string) => {
    setPriorities(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 3) next.add(id)
      return next
    })
  }

  const ready = touched && priorities.size >= 2

  const handleGo = () => {
    const { min, max } = pointPriceBounds(value)
    const params = new URLSearchParams()
    params.set('step', '3')
    params.set('tier', 'custom')
    params.set('min', String(min))
    params.set('max', String(max))
    params.set('p', Array.from(priorities).join(','))
    router.push(`/pick?${params.toString()}`)
  }

  const displayValue = value >= DIAL_MAX ? `${DIAL_MAX.toLocaleString()}+` : value.toLocaleString()

  return (
    <section style={{ background: c.bg, position: 'relative' }}>
      <div className="pricedial-grid" style={{ maxWidth: 1060, margin: '0 auto', padding: '64px var(--page-px) 60px' }}>
        <div className="pricedial-controls">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px',
            background: c.surface, border: `1px solid ${c.border}`,
            borderRadius: 'var(--r-full)', marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.accent, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: c.text2, textTransform: 'uppercase', letterSpacing: '1.4px' }}>
              No sponsored picks — ranked on specs only
            </span>
          </div>

          <p style={{ fontSize: 15, color: c.text3, marginBottom: 6, fontWeight: 500 }}>
            How much do you want to spend?
          </p>

          <div
            style={{
              fontFamily: f.serif, fontSize: 'clamp(56px, 9vw, 112px)', lineHeight: 1, color: c.text1,
              letterSpacing: '-3px', marginBottom: 8, fontVariantNumeric: 'tabular-nums',
              userSelect: 'none', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', gap: 4,
            }}
          >
            <span style={{ fontSize: '0.42em', color: c.text3, fontFamily: 'var(--font-sans)', fontWeight: 300 }}>$</span>
            {displayValue}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.accent, marginBottom: 34, minHeight: 18 }}>
            {touched ? `That's ${tier.id === 's' ? 'ultra-flagship' : tier.id === 'a' ? 'flagship' : tier.id === 'b' ? 'upper mid-range' : tier.id === 'c' ? 'mid-range' : 'budget'} territory` : 'Drag to set your budget'}
          </div>

          <div
            ref={trackRef}
            onPointerDown={e => { draggingRef.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setFromClientX(e.clientX) }}
            role="slider"
            aria-label="Budget"
            aria-valuemin={DIAL_MIN}
            aria-valuemax={DIAL_MAX}
            aria-valuenow={value}
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'ArrowRight') { setValue(v => Math.min(DIAL_MAX, v + 50)); setTouched(true) }
              if (e.key === 'ArrowLeft')  { setValue(v => Math.max(DIAL_MIN, v - 50)); setTouched(true) }
            }}
            style={{
              position: 'relative', height: 56, cursor: 'pointer', touchAction: 'none',
              marginBottom: 30,
            }}
          >
            <div style={{ position: 'absolute', left: 0, right: 0, top: 8, height: 16, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
              {Array.from({ length: 41 }).map((_, i) => (
                <div key={i} style={{ width: 1, height: i % 5 === 0 ? 14 : 7, background: c.border, alignSelf: 'flex-start' }} />
              ))}
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 24, height: 6, borderRadius: 3, background: c.border, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: c.primary, borderRadius: 3, transition: draggingRef.current ? 'none' : 'width 150ms ease' }} />
            </div>
            <div
              style={{
                position: 'absolute', top: 27, left: `${pct}%`, transform: 'translate(-50%, -50%)',
                width: 26, height: 26, borderRadius: '50%', background: c.surface,
                border: `3px solid ${c.primary}`, boxShadow: 'var(--shadow-md)',
                transition: draggingRef.current ? 'none' : 'left 150ms ease',
              }}
            />
            <div style={{ position: 'absolute', left: 0, top: 40, fontSize: 11, color: c.text3 }}>$0</div>
            <div style={{ position: 'absolute', right: 0, top: 40, fontSize: 11, color: c.text3 }}>$2,000+</div>
          </div>

          <div style={{
            maxHeight: touched ? 300 : 0, opacity: touched ? 1 : 0,
            overflow: 'hidden', transition: 'max-height 320ms ease, opacity 280ms ease',
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: c.text2, marginBottom: 12 }}>
              What matters most? <span style={{ color: priorities.size >= 2 ? c.accent : c.text3 }}>({priorities.size}/3)</span>
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {QUICK_PRIORITIES.map(p => {
                const active = priorities.has(p.id)
                const dimmed = priorities.size >= 3 && !active
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePriority(p.id)}
                    disabled={dimmed}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                      borderRadius: 'var(--r-full)', cursor: dimmed ? 'not-allowed' : 'pointer',
                      border: `1.5px solid ${active ? c.primary : c.border}`,
                      background: active ? c.primary : c.surface,
                      opacity: dimmed ? 0.4 : 1, transition: 'all 120ms ease',
                    }}
                  >
                    <span style={{ color: active ? '#fff' : c.text3, display: 'flex' }}>{p.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: active ? '#fff' : c.text2 }}>{p.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={handleGo}
            disabled={!ready}
            style={{
              padding: '17px 40px', borderRadius: 'var(--r-full)',
              fontSize: 15, fontWeight: 700, border: 'none',
              background: ready ? c.accent : c.border,
              color: ready ? '#fff' : c.text3,
              cursor: ready ? 'pointer' : 'not-allowed',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: ready ? '0 10px 28px rgba(230,57,70,0.28)' : 'none',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { if (ready) (e.currentTarget as HTMLElement).style.background = '#D32F3E' }}
            onMouseLeave={e => { if (ready) (e.currentTarget as HTMLElement).style.background = c.accent }}
          >
            {!touched ? 'Set your budget above' : priorities.size < 2 ? `Pick ${2 - priorities.size} more priorities` : 'Show my top 5 matches'}
            {ready && <ArrowRight size={17} strokeWidth={2.4} />}
          </button>

          <div style={{ marginTop: 22 }}>
            <Link href="#catalog" style={{ fontSize: 13, color: c.text3, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              Already know the model? Search the catalog directly <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        <div className="pricedial-preview">
          <BestMatchCard phones={previewPhones} loading={previewLoading} priorityCount={priorities.size} />
        </div>
      </div>
    </section>
  )
}

// ─── Stats strip ──────────────────────────────────────────────────────────

function StatsStrip({ stats }: { stats: FilterStats | null }) {
  const items = stats ? [
    { label: 'PHONES TRACKED', value: stats.total_phones.toLocaleString() },
    { label: 'BRANDS',         value: String(stats.total_brands) },
    { label: 'PRICE RANGE',    value: `$${Math.round(stats.price_range.min)}–${Math.round(stats.price_range.max).toLocaleString()}` },
    { label: 'SPONSORED PICKS', value: 'Zero' },
  ] : null

  return (
    <div style={{ background: c.primary }}>
      <div style={{
        maxWidth: 'var(--max-w)', margin: '0 auto', padding: '18px var(--page-px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap',
      }}>
        {(items ?? Array.from({ length: 4 })).map((item, i) => (
          <div
            key={i}
            className="ticker-item"
            style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 26px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.12)' : 'none' }}
          >
            {item ? (
              <>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>{item.value}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '1px', fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</span>
              </>
            ) : (
              <span className="skeleton" style={{ height: 13, width: 90, background: 'rgba(255,255,255,0.1)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Category rail ────────────────────────────────────────────────────────

function CategoryRail() {
  const entries = Object.entries(CATEGORY_META)
  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '44px var(--page-px) 0' }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: c.text3, marginBottom: 14 }}>
        Or skip straight to a category
      </div>
      <div className="scrollbar-none category-chip-row" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {entries.map(([slug, meta], i) => {
          const pal = CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]
          return (
            <Link
              key={slug}
              href={ROUTES.category(slug)}
              className="category-chip"
              style={{
                flexShrink: 0, width: 168, padding: '18px 16px', borderRadius: 'var(--r-lg)',
                border: `1px solid ${c.border}`, background: pal.bg, textDecoration: 'none',
                display: 'flex', flexDirection: 'column', gap: 28, transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(-3px)'
                el.style.boxShadow = 'var(--shadow-md)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'none'
                el.style.boxShadow = 'none'
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 'var(--r-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: pal.iconBg, color: pal.iconColor,
              }}>
                {CATEGORY_ICONS[slug]}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text1 }}>{meta.title}</div>
                <div style={{ fontSize: 11.5, color: c.text3, marginTop: 2 }}>{meta.desc}</div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Trending ─────────────────────────────────────────────────────────────

function TrendingScroll({ phones }: { phones: Phone[] }) {
  const router = useRouter()
  if (phones.length === 0) return null
  return (
    <section style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '48px var(--page-px) 0' }}>
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

// ─── Trade-in banner ──────────────────────────────────────────────────────

function TradeInBanner() {
  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '52px var(--page-px) 0' }}>
      <div style={{
        position: 'relative', overflow: 'hidden', background: c.primary,
        borderRadius: 'var(--r-xl)', padding: '44px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 32, flexWrap: 'wrap',
      }}>
        <div style={{
          position: 'absolute', right: -60, top: -60, width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(230,57,70,0.16), transparent 70%)', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
            Trade-in estimator
          </div>
          <div style={{ fontFamily: f.serif, fontSize: 32, color: '#fff', marginBottom: 8, maxWidth: 420, lineHeight: 1.15 }}>
            Got an old phone? See what it's worth.
          </div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', maxWidth: 400, lineHeight: 1.6 }}>
            Condition, battery health, functional issues — get an estimated value in under a minute.
          </p>
        </div>
        <Link
          href="/trade-in"
          style={{
            position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', background: '#fff', color: c.primary, borderRadius: 'var(--r-full)',
            fontSize: 14, fontWeight: 700, flexShrink: 0, transition: 'transform 150ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none' }}
        >
          <RotateCcw size={15} strokeWidth={2} />
          Get my estimate
        </Link>
      </div>
    </div>
  )
}

// ─── Phone card ───────────────────────────────────────────────────────────

function PhoneCard({
  phone, compareIds, onCompareToggle,
}: {
  phone: Phone
  compareIds: number[]
  onCompareToggle: (phone: Phone) => void
}) {
  const tier = getTierStyle(phone.chipset_tier)
  const inCompare = compareIds.includes(phone.id)
  const href = ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))

  return (
    <div
      style={{
        position: 'relative', background: c.surface, border: `1px solid ${c.border}`,
        borderRadius: 'var(--r-md)', overflow: 'hidden', transition: 'all 150ms ease',
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = c.borderHover; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = c.border; el.style.transform = 'none'; el.style.boxShadow = 'none' }}
    >
      <button
        onClick={e => { e.preventDefault(); onCompareToggle(phone) }}
        aria-label={inCompare ? 'Remove from compare' : 'Add to compare'}
        aria-pressed={inCompare}
        style={{
          position: 'absolute', top: 7, right: 7, zIndex: 1,
          width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: inCompare ? c.primary : 'rgba(255,255,255,0.92)',
          border: `1px solid ${inCompare ? c.primary : c.border}`,
          color: inCompare ? '#fff' : c.text3, transition: 'all 120ms ease',
        }}
      >
        <Scale size={11} strokeWidth={2} />
      </button>

      <Link href={href} style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{ aspectRatio: '1', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          {phone.main_image_url
            ? <img src={phone.main_image_url} alt={phone.model_name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <Smartphone size={22} color={c.border} strokeWidth={1} />}
        </div>

        <div style={{ padding: '8px 9px 9px' }}>
          <div style={{
            fontFamily: f.serif, fontSize: 13, color: c.text1, lineHeight: 1.25, marginBottom: 3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {phone.model_name}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: c.text1, marginBottom: 6 }}>
            {formatDisplayPrice(phone)}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, paddingTop: 6, borderTop: `1px solid ${c.border}`,
            fontSize: 10.5, color: c.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {tier && <span style={{ width: 6, height: 6, borderRadius: '50%', background: tier.color, flexShrink: 0 }} />}
            {phone.brand}{tier ? ` · ${tier.label}` : ''}
          </div>
        </div>
      </Link>
    </div>
  )
}

function PhoneCardSkeleton() {
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <div className="skeleton" style={{ aspectRatio: '1' }} />
      <div style={{ padding: '8px 9px 9px' }}>
        <div className="skeleton" style={{ height: 12, marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 13, width: '55%', marginBottom: 7 }} />
        <div className="skeleton" style={{ height: 9, width: '75%' }} />
      </div>
    </div>
  )
}

// ─── Catalog filter chips / pagination ────────────────────────────────────

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
  if (filters.min_storage)      chips.push({ label: `${filters.min_storage >= 1000 ? filters.min_storage / 1000 + 'TB' : filters.min_storage + 'GB'}+ Storage`, clear: () => onChange({ ...filters, min_storage: undefined }) })
  if (filters.min_refresh_rate) chips.push({ label: `${filters.min_refresh_rate}Hz+`, clear: () => onChange({ ...filters, min_refresh_rate: undefined }) })
  if (filters.min_antutu)       chips.push({ label: `${(filters.min_antutu / 1_000_000).toFixed(1)}M+ AnTuTu`, clear: () => onChange({ ...filters, min_antutu: undefined }) })
  if (filters.max_year)         chips.push({ label: `Up to ${filters.max_year}`, clear: () => onChange({ ...filters, max_year: undefined }) })
  if (filters.camera_setup_type) chips.push({ label: `${filters.camera_setup_type[0].toUpperCase()}${filters.camera_setup_type.slice(1)} Camera`, clear: () => onChange({ ...filters, camera_setup_type: undefined }) })
  if (filters.is_premium_gaming) chips.push({ label: 'Gaming Optimized', clear: () => onChange({ ...filters, is_premium_gaming: undefined }) })
  if (filters.features) {
    for (const tag of filters.features.split(',').filter(Boolean)) {
      chips.push({
        label: featureTagLabel(tag),
        clear: () => onChange({
          ...filters,
          features: filters.features!.split(',').filter(t => t !== tag).join(',') || undefined,
        }),
      })
    }
  }
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

// ─── main content ─────────────────────────────────────────────────────────

interface HomeClientProps {
  initialTrending: Phone[]
  initialStats: FilterStats | null
}

function HomeContent({ initialTrending, initialStats }: HomeClientProps) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { toast }    = useToast()
  const { phones: comparePhones, add: addCompare, remove: removeCompare } = useCompare()

  const [filters, setFilters] = useState<SearchFilters>(() =>
    parseFiltersFromParams(new URLSearchParams(searchParams.toString()))
  )
  const [page, setPage]       = useState(() => parseInt(searchParams.get('page') ?? '1', 10))
  const [sortIdx, setSortIdx] = useState(() => parseInt(searchParams.get('sort') ?? '0', 10))
  const [phones, setPhones]               = useState<Phone[]>([])
  const [trending, setTrending]           = useState<Phone[]>(initialTrending)
  const [stats, setStats]                 = useState<FilterStats | null>(initialStats)
  const [total, setTotal]                 = useState(0)
  const [loading, setLoading]             = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const [catalogOpen, setCatalogOpen] = useState(true)

  const ownUpdate = useRef(false)
  const hydrated  = useRef(false)
  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '').length

  const spString = searchParams.toString()
  useEffect(() => {
    if (ownUpdate.current) { ownUpdate.current = false; return }
    const parsed = parseFiltersFromParams(new URLSearchParams(spString))
    setFilters(parsed)
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
    const effectiveSortBy = f.q && sIdx === 0 ? 'relevance' : sort_by
    try {
      const data = await api.phones.search(
        { ...f, sort_by: effectiveSortBy, sort_order: sort_order as 'asc' | 'desc', page: p, page_size: PAGE_SIZE },
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

  // SSR already supplied trending/stats — only fall back to a client fetch
  // if the server-side call failed or returned nothing.
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    if (initialTrending.length === 0) {
      api.phones.trending(TRENDING_LIMIT).then(d => setTrending(d.phones)).catch(() => {})
    }
    if (!initialStats) {
      api.filters.stats().then(setStats).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!mobileFiltersOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileFiltersOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileFiltersOpen])

  const handleFiltersChange = (f: SearchFilters) => { setFilters(f); setPage(1); commit(f, 1, sortIdx) }
  const handleReset = () => { setFilters(EMPTY_FILTERS); setPage(1); commit(EMPTY_FILTERS, 1, sortIdx) }
  const handleSortChange = (idx: number) => { setSortIdx(idx); setPage(1); commit(filters, 1, idx) }
  const handlePageChange = (p: number) => {
    setPage(p)
    commit(filters, p, sortIdx)
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleCompareToggle = (phone: Phone) => {
    if (comparePhones.find(p => p.id === phone.id)) {
      removeCompare(phone.id)
      toast('Removed from compare', 'info')
      return
    }
    if (comparePhones.length >= MAX_COMPARE) { toast(`Maximum ${MAX_COMPARE} phones in compare`, 'error'); return }
    addCompare(phone)
    toast('Added to compare', 'success')
  }

  const compareIds = comparePhones.map(p => p.id)

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar />

      <PriceDial />
      <StatsStrip stats={stats} />
      <CategoryRail />

      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px)' }}>
        <TrendingScroll phones={trending} />
      </div>

      <TradeInBanner />

      {!catalogOpen ? (
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '52px var(--page-px) 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setCatalogOpen(true); setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: c.text3,
                textTransform: 'uppercase', letterSpacing: '0.6px', padding: '6px 4px',
                transition: 'color 150ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.text1 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text3 }}
            >
              <Search size={13} /> Prefer to search the full catalog yourself
            </button>
          </div>
        </div>
      ) : (
        <div id="catalog" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '52px var(--page-px) 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 8 }}>
            <div style={{ flex: 1, height: 1, background: c.border }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: c.text3, textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>
              Full Catalog
            </span>
            <div style={{ flex: 1, height: 1, background: c.border }} />
          </div>
        </div>
      )}

      {catalogOpen && (
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '24px var(--page-px) 64px', display: 'grid', gridTemplateColumns: 'var(--sidebar-w) 1fr', gap: 32, alignItems: 'start' }}>
          <div className="filter-sidebar">
            <FilterPanel filters={filters} onChange={handleFiltersChange} onReset={handleReset} />
            <div style={{ marginTop: 20 }}>
              <AdSlot placement="skyscraper" />
            </div>
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

              <Link href={ROUTES.pick} style={{ fontSize: 13, fontWeight: 600, color: c.accent, display: 'flex', alignItems: 'center', gap: 4 }}>
                Back to the 30s picker <ArrowRight size={13} />
              </Link>
            </div>

            {loading ? (
              <div className="phone-grid-layout">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => <PhoneCardSkeleton key={i} />)}
              </div>
            ) : phones.length > 0 ? (
              <>
                <div className="phone-grid-layout">
                    {phones.map((phone, i) => (
                      <Fragment key={phone.id}>
                        <PhoneCard phone={phone} compareIds={compareIds} onCompareToggle={handleCompareToggle} />
                        {(i + 1) % 12 === 0 && <AdCard />}
                      </Fragment>
                    ))}

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

      <CompareBar />

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
        .phone-grid-layout { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }

        .pricedial-grid { display: grid; grid-template-columns: 1fr 340px; gap: 44px; align-items: start; }
        .pricedial-preview { position: sticky; top: calc(var(--nav-h) + 24px); }

        ${mq.lg} {
          div[style*="grid-template-columns: var(--sidebar-w) 1fr"] { grid-template-columns: 1fr !important; }
          .filter-sidebar { display: none !important; }
          .mobile-filter-btn { display: flex !important; }
          .phone-grid-layout { grid-template-columns: repeat(4, 1fr); gap: 10px; }
          .pricedial-grid { grid-template-columns: 1fr; gap: 32px; }
          .pricedial-preview { position: static; max-width: 460px; }
        }
        @media (max-width: 860px) { .phone-grid-layout { grid-template-columns: repeat(3, 1fr); gap: 9px; } }
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

export default function HomeClient(props: HomeClientProps) {
  return (
    <Suspense fallback={null}>
      <HomeContent {...props} />
    </Suspense>
  )
}
