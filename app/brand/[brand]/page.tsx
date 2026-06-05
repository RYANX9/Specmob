'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronRight, ChevronLeft, ArrowUpDown,
  LayoutGrid, List, GitCompare,
  Smartphone, ChevronDown,
} from 'lucide-react'
import { api } from '@/lib/api'
import { ROUTES, brandSlug, phoneSlug } from '@/lib/config'
import { c, f } from '@/lib/tokens'
import type { Phone } from '@/lib/types'
import { getBrandInfo, getBrandInitial, type BrandInfo } from '@/lib/brandData'
import Navbar from '@/app/components/Navbar'
import { ToastProvider, useToast } from '@/app/components/Toast'
import CompareBar from '@/app/components/CompareBar'
import PhoneCard, { PhoneCardSkeleton } from '@/app/components/PhoneCard'

// ─── types ────────────────────────────────────────────────────────────────────

interface BrandStats {
  brand: string
  total_phones: number
  price_range: { min: number | null; max: number | null; avg: number | null }
  avg_battery: number | null
  latest_year: number | null
  latest_phone: Phone | null
}

interface SortOption {
  label: string
  value: string
  order: 'asc' | 'desc'
}

const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest First',       value: 'release_year',     order: 'desc' },
  { label: 'Oldest First',       value: 'release_year',     order: 'asc'  },
  { label: 'Price: Low to High', value: 'price_usd',        order: 'asc'  },
  { label: 'Price: High to Low', value: 'price_usd',        order: 'desc' },
  { label: 'Best Camera',        value: 'main_camera_mp',   order: 'desc' },
  { label: 'Best Battery',       value: 'battery_capacity', order: 'desc' },
  { label: 'Best Performance',   value: 'antutu_score',     order: 'desc' },
]

const PAGE_SIZE = 24

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the phone was released within the last 60 days */
function isRecentRelease(phone: Phone): boolean {
  if (!phone.release_year) return false
  const now = new Date()
  const releaseDate = new Date(
    phone.release_year,
    (phone.release_month ?? 1) - 1,
    phone.release_day ?? 1,
  )
  const diffMs   = now.getTime() - releaseDate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 60
}

function fmt(n: number | null | undefined, prefix = '', suffix = '') {
  if (n == null) return '—'
  return `${prefix}${Math.round(n).toLocaleString()}${suffix}`
}

// ─── sub-components ───────────────────────────────────────────────────────────

function BrandLogoImg({ info, name }: { info: BrandInfo | null; name: string }) {
  const [err, setErr] = useState(false)

  const wrapStyle: React.CSSProperties = {
    flexShrink: 0,
    width: 72,
    height: 72,
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 'var(--r-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-sm)',
  }

  if (info?.logo && !err) {
    return (
      <div style={{ ...wrapStyle, padding: 10 }}>
        <img
          src={info.logo}
          alt={name}
          onError={() => setErr(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    )
  }

  return (
    <div style={{
      ...wrapStyle,
      fontFamily: f.serif,
      fontSize: 28,
      fontWeight: 700,
      color: c.primary,
      letterSpacing: -1,
    }}>
      {getBrandInitial(name)}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      style={{
        background: c.surface,
        border: `1px solid ${hov ? c.borderHover : c.border}`,
        borderRadius: 'var(--r-md)',
        padding: '18px 20px',
        boxShadow: hov ? 'var(--shadow-sm)' : 'none',
        transition: 'all 0.15s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, lineHeight: 1.1, marginBottom: 4, wordBreak: 'break-word' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: c.text3 }}>{sub}</div>}
    </div>
  )
}

/** Mini card for the Latest Releases horizontal scroll row */
function MiniPhoneCard({ phone }: { phone: Phone }) {
  const [imgErr, setImgErr] = useState(false)
  const isNew = isRecentRelease(phone)

  return (
    <Link
      href={ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}
      style={{
        flexShrink: 0,
        width: 158,
        scrollSnapAlign: 'start',
        background: c.surface,
        border: `1px solid ${c.border}`,
        borderRadius: 'var(--r-md)',
        padding: '16px 14px',
        transition: 'all 0.15s',
        position: 'relative',
        display: 'block',
        textDecoration: 'none',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = c.borderHover
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = 'var(--shadow-md)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = c.border
        el.style.transform = 'none'
        el.style.boxShadow = 'none'
      }}
    >
      {/* NEW badge — only for phones released in last 60 days */}
      {isNew && (
        <span style={{
          position: 'absolute', top: 8, right: 8,
          background: 'var(--accent)', color: 'white',
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.4px', padding: '2px 6px',
          borderRadius: 'var(--r-full)',
        }}>New</span>
      )}

      {/* image */}
      <div style={{
        width: '100%', aspectRatio: '1', background: c.bg,
        borderRadius: 'var(--r-sm)', marginBottom: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: c.border,
      }}>
        {phone.main_image_url && !imgErr
          ? (
            <img
              src={phone.main_image_url}
              alt={phone.model_name}
              onError={() => setImgErr(true)}
              style={{ width: '80%', height: '80%', objectFit: 'contain' }}
            />
          )
          : <Smartphone size={32} strokeWidth={1} />}
      </div>

      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: c.text3, marginBottom: 2 }}>
        {phone.brand}
      </div>
      <div style={{ fontFamily: f.serif, fontSize: 13, color: c.text1, lineHeight: 1.3, marginBottom: 6 }}>
        {phone.model_name}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: c.text1, marginBottom: 4 }}>
        {phone.price_usd ? `$${Math.round(phone.price_usd).toLocaleString()}` : '—'}
      </div>
      {(phone.main_camera_mp || phone.battery_capacity) && (
        <div style={{ fontSize: 11, color: c.text3 }}>
          {[
            phone.main_camera_mp   ? `${phone.main_camera_mp}MP`                         : null,
            phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh`      : null,
          ].filter(Boolean).join(' · ')}
        </div>
      )}
    </Link>
  )
}

/** List-view row — self-contained component so hooks are never called inside map() */
function PhoneListRow({
  phone,
  inCompare,
  onCompareToggle,
}: {
  phone: Phone
  inCompare: boolean
  onCompareToggle: (p: Phone) => void
}) {
  const [imgErr, setImgErr] = useState(false)
  const [hov, setHov]       = useState(false)
  const isNew               = isRecentRelease(phone)

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px',
        background: c.surface,
        border: `1px solid ${hov ? c.borderHover : c.border}`,
        borderRadius: 'var(--r-md)',
        boxShadow: hov ? 'var(--shadow-sm)' : 'none',
        transition: 'all 0.15s', position: 'relative',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* NEW badge */}
      {isNew && (
        <span style={{
          position: 'absolute', top: 10, right: 56,
          background: 'var(--accent)', color: 'white',
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.4px', padding: '2px 6px',
          borderRadius: 'var(--r-full)',
        }}>New</span>
      )}

      {/* image */}
      <div style={{
        width: 56, height: 56, flexShrink: 0,
        background: c.bg, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {phone.main_image_url && !imgErr
          ? (
            <img
              src={phone.main_image_url}
              alt=""
              onError={() => setImgErr(true)}
              style={{ width: 44, height: 44, objectFit: 'contain' }}
            />
          )
          : <Smartphone size={24} color={c.border} strokeWidth={1} />}
      </div>

      {/* info — whole row is a link */}
      <Link
        href={ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}
        style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: c.text1, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {phone.model_name}
        </div>
        <div style={{ fontSize: 13, color: c.text3 }}>
          {[
            phone.release_year                                             ? String(phone.release_year)                          : null,
            phone.screen_size                                              ? `${phone.screen_size}"`                             : null,
            phone.main_camera_mp                                           ? `${phone.main_camera_mp}MP`                         : null,
            phone.battery_capacity                                         ? `${phone.battery_capacity.toLocaleString()}mAh`      : null,
            phone.ram_options?.length                                      ? `${Math.max(...phone.ram_options)}GB RAM`           : null,
          ].filter(Boolean).join(' · ')}
        </div>
      </Link>

      {/* price */}
      <div style={{ fontSize: 16, fontWeight: 600, color: c.text1, flexShrink: 0 }}>
        {phone.price_usd ? `$${Math.round(phone.price_usd).toLocaleString()}` : '—'}
      </div>

      {/* compare button */}
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); onCompareToggle(phone) }}
        style={{
          width: 32, height: 32, borderRadius: 'var(--r-sm)', flexShrink: 0,
          border: `1px solid ${inCompare ? 'var(--accent)' : c.border}`,
          background: inCompare ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: inCompare ? 'white' : c.text3,
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        title={inCompare ? 'Remove from compare' : 'Add to compare'}
      >
        <GitCompare size={13} />
      </button>

      <ChevronRight size={16} color={c.text3} style={{ flexShrink: 0 }} />
    </div>
  )
}

function Pagination({
  page, total, pageSize, onChange,
}: {
  page: number
  total: number
  pageSize: number
  onChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const pages: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 64 }}>
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        style={{
          minWidth: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 'var(--r-sm)', border: 'none', cursor: page === 1 ? 'default' : 'pointer',
          color: page === 1 ? c.border : c.text2, background: 'transparent',
        }}
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p, i) =>
        p === '…'
          ? <span key={`e${i}`} style={{ width: 36, textAlign: 'center', color: c.text3, fontSize: 14 }}>…</span>
          : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              style={{
                minWidth: 36, height: 36, padding: '0 6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, borderRadius: 'var(--r-sm)', border: 'none',
                cursor: 'pointer', transition: 'all 0.15s',
                background: p === page ? c.primary : 'transparent',
                color: p === page ? '#fff' : c.text2,
                fontWeight: p === page ? 600 : 400,
              }}
            >
              {p}
            </button>
          )
      )}

      <button
        disabled={page === Math.ceil(total / pageSize)}
        onClick={() => onChange(page + 1)}
        style={{
          minWidth: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 'var(--r-sm)', border: 'none',
          cursor: page === totalPages ? 'default' : 'pointer',
          color: page === totalPages ? c.border : c.text2, background: 'transparent',
        }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

function BrandPageContent() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()

  const slug      = (params?.brand as string) ?? ''
  const brandName = slug.replace(/-/g, ' ')

  const [stats, setStats]               = useState<BrandStats | null>(null)
  const [phones, setPhones]             = useState<Phone[]>([])
  const [latest, setLatest]             = useState<Phone[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [phonesLoading, setPhonesLoading] = useState(false)
  const [notFound, setNotFound]         = useState(false)
  const [page, setPage]                 = useState(1)
  const [sortIdx, setSortIdx]           = useState(0)
  const [gridView, setGridView]         = useState(true)
  const [sortOpen, setSortOpen]         = useState(false)
  const [comparePhones, setComparePhones] = useState<Phone[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const gridRef   = useRef<HTMLDivElement>(null)

  const info = getBrandInfo(slug)

  // ── initial: brand stats + latest 12 phones ─────────────────────────────────
  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)

    Promise.all([
      api.brands.detail(slug),
      api.brands.phones(slug, { sort_by: 'release_year', sort_order: 'desc', page: 1, page_size: 12 }),
    ])
      .then(([statsData, latestData]) => {
        if (cancelled) return
        setStats(statsData as BrandStats)
        setLatest(latestData.results)
      })
      .catch(() => { if (!cancelled) setNotFound(true) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [slug])

  // ── paginated grid ─────────────────────────────────────────────────────────
  const loadPhones = useCallback(async () => {
    if (!slug) return
    setPhonesLoading(true)
    const sort = SORT_OPTIONS[sortIdx]
    try {
      const res = await api.brands.phones(slug, {
        sort_by:    sort.value,
        sort_order: sort.order,
        page,
        page_size:  PAGE_SIZE,
      })
      setPhones(res.results)
      setTotal(res.total)
    } catch {
      toast('Failed to load phones', 'error')
    } finally {
      setPhonesLoading(false)
    }
  }, [slug, page, sortIdx])

  useEffect(() => { loadPhones() }, [loadPhones])

  const handlePageChange = (p: number) => {
    setPage(p)
    setTimeout(() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const handleSortChange = (idx: number) => {
    setSortIdx(idx)
    setPage(1)
    setSortOpen(false)
  }

  const handleCompareToggle = (phone: Phone) => {
    setComparePhones(prev => {
      if (prev.find(p => p.id === phone.id)) {
        toast('Removed from compare', 'info')
        return prev.filter(p => p.id !== phone.id)
      }
      if (prev.length >= 4) { toast('Maximum 4 phones', 'error'); return prev }
      toast('Added to compare', 'success')
      return [...prev, phone]
    })
  }

  const compareIds = comparePhones.map(p => p.id)

  // ── loading skeleton ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar compareCount={0} />
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        <div className="skeleton" style={{ height: 14, width: '20%', marginBottom: 24 }} />
        <div style={{ display: 'flex', gap: 28, marginBottom: 40 }}>
          <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 'var(--r-md)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 44, width: '30%', marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 16, width: '50%' }} />
          </div>
        </div>
        <div className="brand-stats-grid" style={{ marginBottom: 40 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--r-md)' }} />
          ))}
        </div>
        <div className="brand-phone-grid">
          {Array.from({ length: 8 }).map((_, i) => <PhoneCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  )

  // ── not found ────────────────────────────────────────────────────────────────
  if (notFound || !stats) return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar compareCount={0} />
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <Smartphone size={64} color={c.border} strokeWidth={1} style={{ margin: '0 auto 20px' }} />
        <h1 style={{ fontFamily: f.serif, fontSize: 28, color: c.text1, marginBottom: 10 }}>Brand not found</h1>
        <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.6, marginBottom: 24 }}>
          We don't have <strong>{brandName}</strong> in our database yet.
        </p>
        <Link href={ROUTES.home} style={{
          padding: '10px 24px', background: c.primary, color: '#fff',
          borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 600,
        }}>
          Browse All Phones
        </Link>
      </div>
    </div>
  )

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar
        compareCount={comparePhones.length}
        onOpenCompare={() => {
          if (comparePhones.length >= 2)
            router.push(ROUTES.compare(...comparePhones.map(p => phoneSlug(p))))
        }}
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* breadcrumb */}
        <nav style={{
          padding: '16px 0 0', fontSize: 13, color: c.text3,
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        }}>
          <Link href={ROUTES.home} style={{ color: c.text2 }}>Home</Link>
          <ChevronRight size={12} />
          <span>{stats.brand}</span>
        </nav>

        {/* ── HERO ── */}
        <div style={{
          padding: '28px 0 36px',
          display: 'flex', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap',
        }}>
          <BrandLogoImg info={info} name={stats.brand} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{
              fontFamily: f.serif,
              fontSize: 'clamp(30px,4vw,48px)',
              color: c.text1, letterSpacing: -1,
              lineHeight: 1.1, marginBottom: 10,
            }}>
              {stats.brand}
            </h1>

            {/* meta */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              flexWrap: 'wrap', fontSize: 14, color: c.text2, marginBottom: 12,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Smartphone size={14} />
                {stats.total_phones} phones
              </span>
              {stats.latest_year && (
                <>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: c.borderHover, display: 'inline-block' }} />
                  <span>Latest: {stats.latest_year}</span>
                </>
              )}
              {info?.highlights[0] && (
                <>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: c.borderHover, display: 'inline-block' }} />
                  <span style={{ color: 'var(--green)' }}>✓ {info.highlights[0]}</span>
                </>
              )}
            </div>

            {info?.description && (
              <p style={{ fontSize: 15, color: c.text2, maxWidth: 620, lineHeight: 1.7, marginBottom: 16 }}>
                {info.description}
              </p>
            )}

            {info?.tags && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {info.tags.map(tag => (
                  <span key={tag} style={{
                    padding: '4px 12px',
                    background: c.surface, border: `1px solid ${c.border}`,
                    borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500, color: c.text2,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── STATS BAR ── */}
        <div className="brand-stats-grid" style={{ marginBottom: 40 }}>
          <StatCard
            label="Average Price"
            value={fmt(stats.price_range.avg, '$')}
            sub={`Across ${stats.total_phones} models`}
          />
          <StatCard
            label="Price Range"
            value={
              stats.price_range.min != null && stats.price_range.max != null
                ? `$${Math.round(stats.price_range.min).toLocaleString()} – $${Math.round(stats.price_range.max).toLocaleString()}`
                : '—'
            }
          />
          <StatCard
            label="Latest Model"
            value={stats.latest_phone?.model_name ?? '—'}
            sub={stats.latest_year ? `Released ${stats.latest_year}` : undefined}
          />
          <StatCard
            label="Avg Battery"
            value={fmt(stats.avg_battery, '', ' mAh')}
            sub="Across current lineup"
          />
        </div>

        {/* ── LATEST RELEASES SCROLL ROW ── */}
        {latest.length > 0 && (
          <div style={{ marginBottom: 52 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline',
              justifyContent: 'space-between', marginBottom: 20,
            }}>
              <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1 }}>Latest Releases</h2>
              <button
                onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                style={{
                  fontSize: 13, color: c.text3, background: 'none',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                View all {stats.total_phones} <ChevronRight size={13} />
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              {/* left arrow */}
              <button
                onClick={() => scrollRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}
                className="scroll-arrow-btn"
                style={{
                  position: 'absolute', left: -16, top: '50%',
                  transform: 'translateY(-50%)',
                  width: 36, height: 36, borderRadius: '50%',
                  background: c.surface, border: `1px solid ${c.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: c.text2, cursor: 'pointer', zIndex: 2,
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <div
                ref={scrollRef}
                className="scrollbar-none"
                style={{
                  display: 'flex', gap: 14, overflowX: 'auto',
                  scrollSnapType: 'x mandatory', paddingBottom: 4,
                }}
              >
                {latest.map(p => <MiniPhoneCard key={p.id} phone={p} />)}
              </div>

              {/* right arrow */}
              <button
                onClick={() => scrollRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}
                className="scroll-arrow-btn"
                style={{
                  position: 'absolute', right: -16, top: '50%',
                  transform: 'translateY(-50%)',
                  width: 36, height: 36, borderRadius: '50%',
                  background: c.surface, border: `1px solid ${c.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: c.text2, cursor: 'pointer', zIndex: 2,
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <ChevronRight size={16} />
              </button>

              {/* fade gradient */}
              <div style={{
                position: 'absolute', right: 0, top: 0, bottom: 0, width: 48,
                background: `linear-gradient(-90deg, ${c.bg} 0%, transparent 100%)`,
                pointerEvents: 'none',
              }} />
            </div>
          </div>
        )}

        {/* ── ALL PHONES GRID ── */}
        <div ref={gridRef}>

          {/* sort bar */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20, gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>

              {/* sort dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setSortOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', fontSize: 13, fontWeight: 500,
                    color: c.text1, background: c.surface,
                    border: `1px solid ${c.border}`, borderRadius: 'var(--r-sm)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <ArrowUpDown size={14} color={c.text3} />
                  {SORT_OPTIONS[sortIdx].label}
                  <ChevronDown
                    size={13} color={c.text3}
                    style={{ transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                  />
                </button>

                {sortOpen && (
                  <>
                    {/* backdrop to close */}
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 29 }}
                      onClick={() => setSortOpen(false)}
                    />
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, marginTop: 4,
                      background: c.surface, border: `1px solid ${c.border}`,
                      borderRadius: 'var(--r-md)', overflow: 'hidden',
                      boxShadow: 'var(--shadow-md)', zIndex: 30, minWidth: 190,
                    }}>
                      {SORT_OPTIONS.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSortChange(i)}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '10px 16px', fontSize: 13, fontFamily: 'inherit',
                            color: i === sortIdx ? c.primary : c.text2,
                            fontWeight: i === sortIdx ? 600 : 400,
                            background: i === sortIdx ? `rgba(26,26,46,0.04)` : 'transparent',
                            border: 'none', cursor: 'pointer',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <span style={{ fontSize: 13, color: c.text3 }}>
                <strong style={{ color: c.text1 }}>{total.toLocaleString()}</strong> phones
              </span>
            </div>

            {/* grid / list toggle */}
            <div style={{
              display: 'flex', gap: 2,
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 'var(--r-sm)', padding: 3,
            }}>
              {([
                { label: 'Grid', icon: <LayoutGrid size={14} />, isGrid: true  },
                { label: 'List', icon: <List        size={14} />, isGrid: false },
              ] as const).map(({ label, icon, isGrid }) => (
                <button
                  key={label}
                  onClick={() => setGridView(isGrid)}
                  title={`${label} view`}
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: gridView === isGrid ? c.text1 : c.text3,
                    background: gridView === isGrid ? c.surface : 'transparent',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: gridView === isGrid ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* ── PHONE GRID ── */}
          {phonesLoading ? (
            <div className={gridView ? 'brand-phone-grid' : ''} style={!gridView ? { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 } : { marginBottom: 40 }}>
              {Array.from({ length: gridView ? 8 : 6 }).map((_, i) =>
                gridView
                  ? <PhoneCardSkeleton key={i} />
                  : <div key={i} className="skeleton" style={{ height: 84, borderRadius: 'var(--r-md)' }} />
              )}
            </div>
          ) : phones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: c.text3 }}>
              <Smartphone size={48} color={c.border} strokeWidth={1} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15 }}>No phones found for this brand.</p>
            </div>
          ) : gridView ? (
            /* GRID VIEW — uses the shared PhoneCard component */
            <div className="brand-phone-grid" style={{ marginBottom: 40 }}>
              {phones.map(p => (
                <PhoneCard
                  key={p.id}
                  phone={p}
                  compareIds={compareIds}
                  onCompareToggle={handleCompareToggle}
                />
              ))}
            </div>
          ) : (
            /* LIST VIEW — each row is its own component so hooks work correctly */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
              {phones.map(p => (
                <PhoneListRow
                  key={p.id}
                  phone={p}
                  inCompare={compareIds.includes(p.id)}
                  onCompareToggle={handleCompareToggle}
                />
              ))}
            </div>
          )}

          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={handlePageChange}
          />
        </div>
      </div>

      <CompareBar
        phones={comparePhones}
        onRemove={id => setComparePhones(prev => prev.filter(p => p.id !== id))}
        onClear={() => setComparePhones([])}
      />

      <style>{`
        /* ── scroll row ── */
        .scrollbar-none { scrollbar-width: none; }
        .scrollbar-none::-webkit-scrollbar { display: none; }

        /* ── stats grid ── */
        .brand-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        /* ── phone grid: 4 cols desktop, 3 tablet, 2 mobile ── */
        .brand-phone-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        /* hide scroll arrows on small screens */
        @media (max-width: 768px) {
          .scroll-arrow-btn { display: none !important; }
        }

        @media (max-width: 1280px) {
          .brand-phone-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 1023px) {
          .brand-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 767px) {
          .brand-phone-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .brand-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }
      `}</style>
    </div>
  )
}

export default function BrandPage() {
  return (
    <ToastProvider>
      <BrandPageContent />
    </ToastProvider>
  )
}
