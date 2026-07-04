'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import {
  ChevronRight, Share2, GitCompare, ShoppingCart,
  Check, Camera, Battery, Cpu, Monitor,
  Weight, Zap, Smartphone, ArrowRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import { ROUTES, brandSlug, phoneSlug, valueScoreColor } from '@/lib/config'
import { c, f, z } from '@/lib/tokens'
import type { Phone } from '@/lib/types'
import Navbar from '@/app/components/Navbar'
import { useToast } from '@/app/components/Toast'
import CompareBar from '@/app/components/CompareBar'
import Footer from '@/app/components/Footer'

// ─── HTML / text helpers ──────────────────────────────────────────────────────

function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&times;/g, '×')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function specValueToString(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') {
    const stripped = stripHtml(v)
    return stripped || '—'
  }
  if (Array.isArray(v)) {
    return v.map(specValueToString).filter(s => s !== '—').join(', ') || '—'
  }
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .filter(([, val]) => {
        const s = String(val ?? '')
        return !s.startsWith('http') && s !== 'null' && s !== ''
      })
      .map(([k, val]) => `${k}: ${specValueToString(val)}`)
      .join(' · ') || '—'
  }
  return String(v)
}

const SKIP_SPEC_KEYS = new Set([
  'metadata', 'media', 'benchmarks', 'price_info',
  'quick_specs', 'processed_at', 'source_url', 'specifications',
])

function getSpecGroups(phone: Phone): Array<[string, Record<string, string>]> {
  const fs = phone.full_specifications
  if (!fs || typeof fs !== 'object') return []
  const root: Record<string, unknown> =
    (fs as any).specifications && typeof (fs as any).specifications === 'object'
      ? (fs as any).specifications
      : (fs as any)

  const groups: Array<[string, Record<string, string>]> = []
  for (const [groupName, groupVal] of Object.entries(root)) {
    if (SKIP_SPEC_KEYS.has(groupName)) continue
    if (!groupVal || typeof groupVal !== 'object' || Array.isArray(groupVal)) continue
    const rows: Record<string, string> = {}
    for (const [k, v] of Object.entries(groupVal as Record<string, unknown>)) {
      if (k.toLowerCase().includes('url') && typeof v === 'string' && v.startsWith('http')) continue
      const val = specValueToString(v)
      if (val && val !== '—') rows[k] = val
    }
    if (Object.keys(rows).length > 0) groups.push([groupName, rows])
  }
  return groups
}

// ─── spec group ordering ──────────────────────────────────────────────────────

// Lower index = rendered first. Partial substring match against lowercased group name.
const SPEC_GROUP_ORDER = [
  'launch', 'availability', 'status',
  'network', 'sim',
  'display', 'screen',
  'platform', 'performance', 'chipset', 'processor',
  'memory', 'storage',
  'main camera', 'rear camera', 'camera',
  'selfie', 'front camera', 'secondary camera',
  'sound', 'audio',
  'comms', 'connectivity', 'wlan', 'bluetooth', 'nfc',
  'sensors', 'features',
  'battery',
  'body', 'build', 'design', 'dimensions',
  'tests', 'misc', 'other',
]

function rankSpecGroup(name: string): number {
  const lower = name.toLowerCase()
  const idx = SPEC_GROUP_ORDER.findIndex(k => lower.includes(k))
  return idx === -1 ? 998 : idx
}

// ─── slug resolution — first two searches run in parallel ─────────────────────

function pickBest(phones: Phone[], targetSlug: string): Phone | null {
  if (!phones.length) return null
  const target = targetSlug.toLowerCase()
  let best: Phone | null = null
  let bestScore = -1
  for (const p of phones) {
    const ps = phoneSlug(p).toLowerCase()
    if (ps === target) return p
    let score = 0; let ti = 0
    for (let pi = 0; pi < ps.length && ti < target.length; pi++) {
      if (ps[pi] === target[ti]) { score++; ti++ }
    }
    if (score > bestScore) { bestScore = score; best = p }
  }
  return bestScore > target.length * 0.45 ? best : null
}

async function resolvePhone(brand: string, model: string, signal: AbortSignal): Promise<Phone | null> {
  const brandName  = brand.replace(/-/g, ' ')
  const modelWords = model.replace(/-/g, ' ')

  const [withBrand, withoutBrand] = await Promise.allSettled([
    api.phones.search({ q: modelWords, brand: brandName, page_size: 10 }, signal),
    api.phones.search({ q: modelWords, page_size: 10 }, signal),
  ])

  if (withBrand.status === 'fulfilled') {
    const match = pickBest(withBrand.value.results, model)
    if (match) return api.phones.detail(match.id, signal)
  }

  if (withoutBrand.status === 'fulfilled') {
    const match = pickBest(withoutBrand.value.results, model)
    if (match) return api.phones.detail(match.id, signal)
  }

  const brandTokens = brandName.toLowerCase().split(' ')
  let queryTokens = modelWords.toLowerCase().split(' ')
  for (const bt of brandTokens) {
    if (queryTokens[0] === bt) queryTokens = queryTokens.slice(1)
  }
  const stripped = queryTokens.join(' ')

  if (stripped && stripped !== modelWords.toLowerCase()) {
    try {
      const res = await api.phones.search({ q: stripped, brand: brandName, page_size: 10 }, signal)
      const match = pickBest(res.results, model)
      if (match) return api.phones.detail(match.id, signal)
    } catch { /* continue */ }
  }

  try {
    const res = await api.phones.search({ brand: brandName, page_size: 50 }, signal)
    const match = pickBest(res.results, model)
    if (match) return api.phones.detail(match.id, signal)
  } catch { /* ignore */ }

  return null
}

// ─── sub-components ───────────────────────────────────────────────────────────

type TabType = 'overview' | 'specs' | 'compare'

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '14px 20px', fontSize: 14, fontWeight: 500,
      color: active ? c.text1 : c.text3,
      borderBottom: `2px solid ${active ? c.accent : 'transparent'}`,
      transition: 'all 0.15s', whiteSpace: 'nowrap',
      background: 'none', border: 'none', cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}

function SpecRow({ label, value, alt }: { label: string; value: string; alt: boolean }) {
  const lines = value.split('\n').filter(Boolean)
  return (
    <div style={{
      display: 'flex', gap: 0, padding: '7px 14px',
      borderBottom: `1px solid ${c.border}`,
      background: alt ? 'rgba(248,248,245,0.6)' : 'transparent',
      alignItems: 'flex-start',
    }}>
      <div style={{ width: 130, minWidth: 130, flexShrink: 0, fontSize: 12, color: c.text3, fontWeight: 500, paddingTop: 1, paddingRight: 12, lineHeight: 1.4 }}>
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: c.text1, lineHeight: 1.5 }}>
        {lines.length <= 1
          ? value
          : lines.map((line, i) => <div key={i} style={{ marginBottom: i < lines.length - 1 ? 3 : 0 }}>{line}</div>)
        }
      </div>
    </div>
  )
}

// Always open — no collapse toggle
function SpecGroup({ title, specs }: { title: string; specs: Record<string, string> }) {
  const entries = Object.entries(specs)
  if (!entries.length) return null
  return (
    <div style={{ marginBottom: 6, borderRadius: 'var(--r-md)', overflow: 'hidden', border: `1px solid ${c.border}` }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', background: c.bg,
        borderBottom: `1px solid ${c.border}`,
      }}>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.6px', color: c.text1 }}>
          {title}
        </span>
        <span style={{ fontSize: 11, color: c.text3 }}>{entries.length} specs</span>
      </div>
      <div style={{ background: c.surface }}>
        {entries.map(([k, v], i) => <SpecRow key={k} label={k} value={v} alt={i % 2 === 1} />)}
      </div>
    </div>
  )
}

function QuickSpecCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '16px 12px', textAlign: 'center' }}>
      <div style={{ color: c.text3, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: c.text1, marginBottom: 3, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 11, color: c.text3, textTransform: 'uppercase' as const, letterSpacing: '0.3px' }}>{label}</div>
    </div>
  )
}

function OverviewSection({ title, headline, specs }: { title: string; headline: string; specs: { label: string; value: string }[] }) {
  if (!specs.length) return null
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '22px 24px' }}>
      <div style={{ fontFamily: f.serif, fontSize: 20, color: c.text1, marginBottom: 10 }}>{title}</div>
      <div style={{ fontWeight: 600, fontSize: 15, color: c.text1, marginBottom: 14 }}>{headline}</div>
      <div className="specs-2col">
        {specs.map(s => (
          <div key={s.label} style={{ padding: '9px 12px', background: c.bg, borderRadius: 'var(--r-sm)' }}>
            <div style={{ fontSize: 11, color: c.text3, marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.text1, lineHeight: 1.4 }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SimilarCard({ phone }: { phone: Phone }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <Link
      href={ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}
      style={{ flexShrink: 0, width: 156, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '14px 12px', textAlign: 'center', transition: 'all 0.15s', scrollSnapAlign: 'start', display: 'block', textDecoration: 'none' }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = 'var(--shadow-md)'; el.style.borderColor = c.borderHover }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = 'none'; el.style.borderColor = c.border }}
    >
      <div style={{ width: 72, height: 72, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {phone.main_image_url && !imgErr
          ? <img src={phone.main_image_url} alt={phone.model_name} loading="lazy" decoding="async" onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <Smartphone size={32} color={c.border} strokeWidth={1} />}
      </div>
      <div style={{ fontSize: 10, color: c.text3, textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 2 }}>{phone.brand}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: c.text1, lineHeight: 1.3, marginBottom: 6, fontFamily: f.serif }}>{phone.model_name}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: c.text1 }}>
        {phone.price_usd ? `$${Math.round(phone.price_usd).toLocaleString()}` : '—'}
      </div>
      {phone.main_camera_mp && (
        <div style={{ fontSize: 11, color: c.text3, marginTop: 3 }}>{phone.main_camera_mp}MP · {phone.battery_capacity ? `${phone.battery_capacity}mAh` : ''}</div>
      )}
    </Link>
  )
}

// ─── JSON-LD builders ─────────────────────────────────────────────────────────

function buildProductJsonLd(phone: Phone, brand: string, model: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${phone.brand} ${phone.model_name}`,
    brand: { '@type': 'Brand', name: phone.brand },
    description: [
      phone.main_camera_mp ? `${phone.main_camera_mp}MP main camera` : null,
      phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh battery` : null,
      phone.chipset ? phone.chipset : null,
      phone.screen_size ? `${phone.screen_size}" display` : null,
    ].filter(Boolean).join(', '),
    ...(phone.price_usd != null && {
      offers: {
        '@type': 'Offer',
        price: phone.price_usd,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `https://Specmob.vercel.app/brand/${brandSlug(phone.brand)}/${phoneSlug(phone)}`,
      },
    }),
    ...(phone.main_image_url && { image: phone.main_image_url }),
  }
}

function buildBreadcrumbJsonLd(phone: Phone): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://Specmob.vercel.app' },
      { '@type': 'ListItem', position: 2, name: phone.brand, item: `https://Specmob.vercel.app/brand/${brandSlug(phone.brand)}` },
      { '@type': 'ListItem', position: 3, name: phone.model_name, item: `https://Specmob.vercel.app/brand/${brandSlug(phone.brand)}/${phoneSlug(phone)}` },
    ],
  }
}

// ─── main page component ──────────────────────────────────────────────────────

function PhoneDetailContent() {
  const params       = useParams()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { toast }    = useToast()

  const brand = (params?.brand as string) ?? ''
  const model = (params?.model as string) ?? ''

  const [phone, setPhone]                   = useState<Phone | null>(null)
  const [similar, setSimilar]               = useState<Phone[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)
  const [loading, setLoading]               = useState(true)
  const [notFound, setNotFound]             = useState(false)
  const [tab, setTab]                       = useState<TabType>(() => {
    const t = searchParams.get('tab')
    return (t === 'specs' || t === 'compare') ? t : 'overview'
  })
  const [imgErr, setImgErr]               = useState(false)
  const [copied, setCopied]               = useState(false)
  const [comparePhones, setComparePhones] = useState<Phone[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleTabChange = (newTab: TabType) => {
    setTab(newTab)
    const p = new URLSearchParams(searchParams.toString())
    if (newTab === 'overview') {
      p.delete('tab')
    } else {
      p.set('tab', newTab)
    }
    const str = p.toString()
    router.replace(str ? `?${str}` : window.location.pathname, { scroll: false })
  }

  useEffect(() => {
    if (!brand || !model) return
    const controller = new AbortController()

    setLoading(true)
    setNotFound(false)
    setPhone(null)
    setSimilar([])

    resolvePhone(brand, model, controller.signal)
      .then(async found => {
        if (controller.signal.aborted) return
        if (!found) { setNotFound(true); return }
        setPhone(found)

        setSimilarLoading(true)
        api.phones.similar(found.id, 12)
          .then(res => { if (!controller.signal.aborted) setSimilar(res?.phones ?? []) })
          .catch(() => {})
          .finally(() => { if (!controller.signal.aborted) setSimilarLoading(false) })
      })
      .catch(() => { if (!controller.signal.aborted) setNotFound(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })

    return () => controller.abort()
  }, [brand, model])

  const inCompare = phone ? comparePhones.some(p => p.id === phone.id) : false

  const handleCompareToggle = () => {
    if (!phone) return
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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast('Link copied!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Could not copy link — try copying from the address bar', 'error')
    }
  }

  // ── loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar compareCount={0} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px var(--page-px)' }}>
        <div className="phone-hero-grid" style={{ gap: 40, paddingBottom: 48 }}>
          <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 'var(--r-xl)' }} />
          <div style={{ paddingTop: 8 }}>
            {([['30%', 12], ['85%', 36], ['40%', 28], ['100%', 72]] as const).map(([w, h], i) => (
              <div key={i} className="skeleton" style={{ height: h, width: w, marginBottom: 16, borderRadius: 8 }} />
            ))}
          </div>
        </div>
        <div className="quick-specs-grid" style={{ marginBottom: 48 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--r-md)' }} />)}
        </div>
      </div>
    </div>
  )

  // ── not found ────────────────────────────────────────────────────────────────
  if (notFound || !phone) return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar compareCount={0} />
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 var(--page-px)', textAlign: 'center' }}>
        <Smartphone size={64} color={c.border} strokeWidth={1} style={{ margin: '0 auto 20px' }} />
        <h1 style={{ fontFamily: f.serif, fontSize: 28, color: c.text1, marginBottom: 10 }}>Phone not found</h1>
        <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.6, marginBottom: 24 }}>
          We don't have this phone in our database. We only track phones currently available for purchase.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={ROUTES.home} style={{ padding: '10px 24px', background: c.primary, color: '#fff', borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 600 }}>
            Browse All Phones
          </Link>
          <Link href={ROUTES.brand(brand)} style={{ padding: '10px 24px', border: `1px solid ${c.border}`, color: c.text2, borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 500 }}>
            Browse {brand.replace(/-/g, ' ')} phones
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )

  // ── derived ──────────────────────────────────────────────────────────────────
  const quickSpecs = [
    phone.screen_size         ? { icon: <Monitor size={20} strokeWidth={1.5} />, value: `${phone.screen_size}"`,                label: 'Display'  } : null,
    phone.main_camera_mp      ? { icon: <Camera  size={20} strokeWidth={1.5} />, value: `${phone.main_camera_mp}MP`,            label: 'Camera'   } : null,
    phone.battery_capacity    ? { icon: <Battery size={20} strokeWidth={1.5} />, value: `${phone.battery_capacity.toLocaleString()}`, label: 'mAh' } : null,
    phone.ram_options?.length ? { icon: <Cpu     size={20} strokeWidth={1.5} />, value: `${Math.max(...phone.ram_options!)}GB`, label: 'Max RAM'  } : null,
    phone.fast_charging_w     ? { icon: <Zap     size={20} strokeWidth={1.5} />, value: `${phone.fast_charging_w}W`,            label: 'Charging' } : null,
    phone.weight_g            ? { icon: <Weight  size={20} strokeWidth={1.5} />, value: `${phone.weight_g}g`,                  label: 'Weight'   } : null,
  ].filter(Boolean) as { icon: React.ReactNode; value: string; label: string }[]

  const specGroups  = getSpecGroups(phone)
  const sortedSpecGroups = [...specGroups].sort(([a], [b]) => rankSpecGroup(a) - rankSpecGroup(b))
  const valueScore  = (phone as any).value_score as number | null
  const fs          = phone.full_specifications as any

  const str = (v: unknown) => v ? String(v) : null

  const overviewSections = [
    {
      title: 'Display', headline: phone.screen_size ? `${phone.screen_size}" Screen` : 'Display',
      specs: [
        phone.screen_size       ? { label: 'Screen Size', value: `${phone.screen_size}"` } : null,
        phone.screen_resolution ? { label: 'Resolution',  value: phone.screen_resolution } : null,
        str(fs?.quick_specs?.displaytype) ? { label: 'Type', value: stripHtml(String(fs.quick_specs.displaytype)) } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Camera', headline: phone.main_camera_mp ? `${phone.main_camera_mp}MP Main Camera` : 'Camera System',
      specs: [
        phone.main_camera_mp ? { label: 'Main Camera', value: `${phone.main_camera_mp} MP` } : null,
        str(fs?.quick_specs?.cam1modules) ? { label: 'Rear System',  value: stripHtml(String(fs.quick_specs.cam1modules)) } : null,
        str(fs?.quick_specs?.cam2modules) ? { label: 'Front Camera', value: stripHtml(String(fs.quick_specs.cam2modules)) } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Performance', headline: phone.chipset || 'Processor',
      specs: [
        phone.chipset             ? { label: 'Chipset', value: phone.chipset } : null,
        phone.ram_options?.length ? { label: 'RAM', value: phone.ram_options!.map(r => `${r}GB`).join(' / ') } : null,
        phone.storage_options?.length
          ? { label: 'Storage', value: phone.storage_options!.map(s => s >= 1000 ? `${s/1000}TB` : `${s}GB`).join(' / ') } : null,
        phone.antutu_score ? { label: 'AnTuTu Score', value: phone.antutu_score.toLocaleString() } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Battery & Charging', headline: phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()} mAh` : 'Battery',
      specs: [
        phone.battery_capacity ? { label: 'Capacity',      value: `${phone.battery_capacity.toLocaleString()} mAh` } : null,
        phone.fast_charging_w  ? { label: 'Fast Charging', value: `${phone.fast_charging_w}W wired` }               : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Build & Design', headline: phone.weight_g ? `${phone.weight_g}g` : 'Build',
      specs: [
        phone.weight_g     ? { label: 'Weight',    value: `${phone.weight_g}g` }      : null,
        phone.thickness_mm ? { label: 'Thickness', value: `${phone.thickness_mm}mm` } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
  ].filter(s => s.specs.length > 0)

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(phone, brand, model)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(phone)) }}
      />

      <Navbar
        compareCount={comparePhones.length}
        onOpenCompare={() => {
          if (comparePhones.length >= 2)
            router.push(ROUTES.compare(...comparePhones.map(p => phoneSlug(p))))
        }}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--page-px)' }}>

        <nav style={{ padding: '14px 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Link href={ROUTES.home} style={{ color: c.text2 }}>Home</Link>
          <ChevronRight size={12} />
          <Link href={ROUTES.brand(brandSlug(phone.brand))} style={{ color: c.text2 }}>{phone.brand}</Link>
          <ChevronRight size={12} />
          <span style={{ color: c.text3 }}>{phone.model_name}</span>
        </nav>

        <div className="phone-hero-grid">
          <div style={{
            background: c.surface, border: `1px solid ${c.border}`,
            borderRadius: 'var(--r-xl)', padding: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            aspectRatio: '1', position: 'relative',
          }}>
            {phone.main_image_url && !imgErr
              ? <img src={phone.main_image_url} alt={`${phone.brand} ${phone.model_name}`} onError={() => setImgErr(true)} style={{ maxWidth: '72%', maxHeight: '72%', objectFit: 'contain' }} />
              : <Smartphone size={100} color={c.border} strokeWidth={0.8} />}
            {phone.release_year && (
              <div style={{ position: 'absolute', top: 14, right: 14, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', padding: '4px 10px', fontSize: 11, fontWeight: 600, color: c.text3 }}>
                {phone.release_year}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.6px', color: c.text3, marginBottom: 6 }}>
              {phone.brand}
            </div>
            <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(24px,3vw,36px)', color: c.text1, letterSpacing: '-0.4px', lineHeight: 1.15, marginBottom: 10 }}>
              {phone.model_name}
            </h1>
            <div style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 600, color: c.text1, marginBottom: 4 }}>
              {phone.price_usd ? `$${Math.round(phone.price_usd).toLocaleString()}` : 'Price TBA'}
            </div>
            {phone.price_usd && <div style={{ fontSize: 13, color: c.text3, marginBottom: 18 }}>Starting price · US</div>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              <span style={{ padding: '4px 12px', background: 'var(--green-light)', color: 'var(--green)', border: '1px solid var(--green-border)', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600 }}>
                Available
              </span>
              {phone.chipset_tier === 'flagship' && (
                <span style={{ padding: '4px 12px', background: 'var(--accent-light)', color: c.accent, border: '1px solid var(--accent-border)', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600 }}>
                  Flagship
                </span>
              )}
            </div>

            {valueScore != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', marginBottom: 18 }}>
                <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: valueScoreColor(valueScore) }}>
                  {valueScore.toFixed(1)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.text2, marginBottom: 5 }}>Value Score</div>
                  <div style={{ height: 5, background: c.bg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${valueScore * 10}%`, background: valueScoreColor(valueScore), borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: c.text3 }}>vs peers</div>
              </div>
            )}

            <div className="hero-actions">
              <button
                onClick={handleCompareToggle}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px',
                  fontSize: 14, fontWeight: 600, flex: 1,
                  color: inCompare ? '#fff' : c.primary,
                  background: inCompare ? c.primary : 'transparent',
                  border: `1px solid ${c.primary}`, borderRadius: 'var(--r-full)',
                  transition: 'all 0.15s', cursor: 'pointer',
                }}
              >
                <GitCompare size={15} strokeWidth={2} />
                {inCompare ? 'In Compare' : 'Add to Compare'}
              </button>

              {phone.amazon_link && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <a
                    href={phone.amazon_link}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', fontSize: 14, fontWeight: 600, color: '#fff', background: c.primary, borderRadius: 'var(--r-full)', textDecoration: 'none', justifyContent: 'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
                  >
                    <ShoppingCart size={15} strokeWidth={2} />
                    Buy on Amazon
                  </a>
                  <span style={{ fontSize: 10, color: c.text3, textAlign: 'center' }}>
                    Affiliate link — we may earn a commission
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleShare}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: copied ? 'var(--green)' : c.text3, transition: 'color 0.15s', marginTop: 14, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {copied ? <Check size={13} /> : <Share2 size={13} />}
              {copied ? 'Link copied!' : 'Copy link'}
            </button>
          </div>
        </div>

        <div className="quick-specs-grid" style={{ marginBottom: 40 }}>
          {quickSpecs.map((spec, i) => <QuickSpecCard key={i} {...spec} />)}
        </div>

        <div style={{
          position: 'sticky', top: 'var(--nav-h)', zIndex: z.sticky,
          background: 'rgba(248,248,245,0.95)', backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${c.border}`, marginBottom: 28,
          display: 'flex', overflowX: 'auto',
        }}>
          <TabButton active={tab === 'overview'} onClick={() => handleTabChange('overview')}>Overview</TabButton>
          <TabButton active={tab === 'specs'}    onClick={() => handleTabChange('specs')}>Full Specs</TabButton>
          <TabButton active={tab === 'compare'}  onClick={() => handleTabChange('compare')}>Compare</TabButton>
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 48 }}>
            {overviewSections.map(s => <OverviewSection key={s.title} {...s} />)}
          </div>
        )}

        {tab === 'specs' && (
          <div style={{ marginBottom: 48 }}>
            {sortedSpecGroups.length > 0
              ? sortedSpecGroups.map(([name, specs]) => (
                  <SpecGroup key={name} title={name} specs={specs} />
                ))
              : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: c.text3 }}>
                  <Smartphone size={48} color={c.border} strokeWidth={1} style={{ margin: '0 auto 12px' }} />
                  <p>Detailed specifications not available for this model.</p>
                </div>
              )
            }
          </div>
        )}

        {tab === 'compare' && (
          <div style={{ maxWidth: 600, marginBottom: 48 }}>
            <div style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, marginBottom: 6 }}>
              Compare {phone.model_name}
            </div>
            <p style={{ fontSize: 14, color: c.text3, marginBottom: 22 }}>
              Pick any phone below for a full side-by-side spec comparison.
            </p>

            {similarLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 68, borderRadius: 'var(--r-md)' }} />)}
              </div>
            ) : similar.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', color: c.text3 }}>
                <Smartphone size={36} color={c.border} strokeWidth={1} style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: 14 }}>No similar phones found at this price range.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {similar.slice(0, 8).map(p => (
                  <Link
                    key={p.id}
                    href={ROUTES.compare(phoneSlug(phone), phoneSlug(p))}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', transition: 'all 0.15s', textDecoration: 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                  >
                    <div style={{ width: 44, height: 44, background: c.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {p.main_image_url
                        ? <img src={p.main_image_url} alt="" loading="lazy" decoding="async" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                        : <Smartphone size={20} color={c.border} strokeWidth={1} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: c.text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.model_name}</div>
                      <div style={{ fontSize: 12, color: c.text3, marginTop: 2 }}>
                        {p.price_usd ? `$${Math.round(p.price_usd).toLocaleString()}` : '—'}
                        {p.main_camera_mp   ? ` · ${p.main_camera_mp}MP`                             : ''}
                        {p.battery_capacity ? ` · ${p.battery_capacity.toLocaleString()}mAh`          : ''}
                        {p.antutu_score     ? ` · ${(p.antutu_score/1_000_000).toFixed(1)}M AnTuTu`  : ''}
                      </div>
                    </div>
                    <ArrowRight size={15} color={c.text3} strokeWidth={2} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <section style={{ marginTop: 8, marginBottom: 64 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1 }}>Similar Phones</h2>
            <span style={{ fontSize: 13, color: c.text3 }}>Price · Size · Performance</span>
          </div>

          {similarLoading ? (
            <div style={{ display: 'flex', gap: 14 }}>
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ width: 156, height: 200, flexShrink: 0, borderRadius: 'var(--r-md)' }} />)}
            </div>
          ) : similar.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', color: c.text3 }}>
              <p style={{ fontSize: 14 }}>No similar phones found at a comparable price range.</p>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div ref={scrollRef} className="scrollbar-none" style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 4 }}>
                {similar.map(p => <SimilarCard key={p.id} phone={p} />)}
              </div>
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 56, background: 'linear-gradient(-90deg,var(--bg) 0%,transparent 100%)', pointerEvents: 'none' }} />
            </div>
          )}
        </section>
      </div>

      <Footer />

      <CompareBar
        phones={comparePhones}
        onRemove={id => setComparePhones(prev => prev.filter(p => p.id !== id))}
        onClear={() => setComparePhones([])}
      />

      <style>{`
        .phone-hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; padding-bottom: 40px; align-items: start; }
        .quick-specs-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 12px; }
        .specs-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px; }
        .hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        @media (max-width: 1023px) {
          .phone-hero-grid { grid-template-columns: 1fr; gap: 28px; }
          .phone-hero-grid > div:first-child { max-width: 400px; margin: 0 auto; width: 100%; }
          .quick-specs-grid { grid-template-columns: repeat(3,1fr); }
        }
        @media (max-width: 640px) {
          .quick-specs-grid { grid-template-columns: repeat(2,1fr); gap: 8px; }
          .specs-2col { grid-template-columns: 1fr; }
          .hero-actions { flex-direction: column; }
          .hero-actions a, .hero-actions button { justify-content: center; }
        }
      `}</style>
    </div>
  )
}

export default function PhoneDetailPage() {
  return (
    <Suspense fallback={null}>
      <PhoneDetailContent />
    </Suspense>
  )
}
