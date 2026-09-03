'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronRight, ChevronLeft, Share2, ShoppingCart,
  Check, Camera, Battery, Cpu, Monitor,
  Weight, Zap, Smartphone, ArrowRight, ExternalLink, Link2,  Scale,
} from 'lucide-react'
import { api, type PricePointRow } from '@/lib/api'
import { ROUTES, brandSlug, phoneSlug } from '@/lib/config'
import { getTierStyle } from '@/lib/tiers'
import { resolveDisplayPrice, withLaunchPrice } from '@/lib/price'
import { getPanelType, getFrontCamera, specValueToString } from '@/lib/specs'
import { c, f, z } from '@/lib/tokens'
import type { Phone, FullSpecifications } from '@/lib/types'
import Navbar from '@/app/components/Navbar'
import { useToast } from '@/app/components/Toast'
import CompareBar from '@/app/components/CompareBar'
import Footer from '@/app/components/Footer'
import { WhyThisPhone, PriceHistoryChart, SimilarCard } from '@/app/components/phone-detail/PhoneOverview'
import { formatStorage, isSameVariant, type PhoneVariant } from '@/app/components/phone-detail/PhoneSpecs'
import { valueScoreColor } from '@/lib/valueScore'
import AdSlot from '@/app/components/ads/AdSlot'

import { useRegion } from '@/lib/regionStore'
import { resolveOffersForVariant, buyButtonLabel, inferRetailerLabelFromUrl, inferRegionTagFromUrl, type RetailerOffer } from '@/lib/retailer'
import AlternateOfferPicker from '@/app/components/phone-detail/AlternateOfferPicker'

const SKIP_SPEC_KEYS = new Set([
  'metadata', 'media', 'benchmarks', 'price_info',
  'quick_specs', 'processed_at', 'source_url', 'specifications',
])

function getFullSpecGroups(fullSpecs: FullSpecifications | null): Array<[string, Record<string, string>]> {
  if (!fullSpecs || typeof fullSpecs !== 'object') return []
  const root: Record<string, unknown> =
    (fullSpecs as any).specifications && typeof (fullSpecs as any).specifications === 'object'
      ? (fullSpecs as any).specifications
      : (fullSpecs as any)

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

function VariantPicker({
  variants, loading, selected, onSelect,
}: {
  variants: PhoneVariant[]
  loading: boolean
  selected: PhoneVariant | null
  onSelect: (v: PhoneVariant) => void
}) {
  if (loading) return <div className="skeleton" style={{ height: 92, borderRadius: 'var(--r-lg)', marginBottom: 18 }} />
  if (!variants.length) return null

  const hasRam = variants.some(v => v.ram_gb != null)
  const cheapest = Math.min(...variants.map(v => v.price))

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)', padding: '18px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: c.text1 }}>Choose a configuration</span>
        <span style={{ fontSize: 11, color: c.text3 }}>{variants.length} option{variants.length > 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
        {variants.map((v, i) => {
          const isSelected = isSameVariant(selected, v)
          const isCheapest = v.price === cheapest
          return (
            <button
              key={`${v.ram_gb ?? 'x'}-${v.storage_gb}-${i}`}
              onClick={() => onSelect(v)}
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column', gap: 3,
                padding: '10px 12px', textAlign: 'left',
                borderRadius: 'var(--r-md)', cursor: 'pointer',
                border: `1.5px solid ${isSelected ? c.accent : c.border}`,
                background: isSelected ? `${c.accent}12` : c.bg,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = c.borderHover }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = c.border }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? c.accent : c.text1 }}>
                {hasRam && v.ram_gb ? `${v.ram_gb}/${formatStorage(v.storage_gb)}` : formatStorage(v.storage_gb)}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.text1 }}>${v.price.toLocaleString()}</span>
              {isCheapest && variants.length > 1 && (
                <span style={{ position: 'absolute', top: -7, right: 8, fontSize: 9, fontWeight: 700, letterSpacing: '0.3px', color: 'var(--green)', background: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 'var(--r-full)', padding: '1px 6px' }}>
                  BEST PRICE
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p style={{ fontSize: 11, color: c.text3, marginTop: 10, lineHeight: 1.5 }}>
        Prices reflect the selected storage{hasRam ? ' and RAM' : ''} configuration and may differ from the base listing above.
      </p>
    </div>
  )
}

function buildGalleryUrls(phone: Phone): string[] {
  const extra = (phone.images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(img => img.image_url)
    .filter(url => url !== phone.main_image_url)

  const urls = phone.main_image_url ? [phone.main_image_url, ...extra] : extra
  return urls.filter(Boolean)
}

function PhoneGallery({ phone }: { phone: Phone }) {
  const gallery = buildGalleryUrls(phone)
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState<Record<number, boolean>>({})

  const current = gallery[index]
  const hasMultiple = gallery.length > 1
  const goTo = (i: number) => setIndex((i + gallery.length) % gallery.length)

  return (
    <div style={{
      background: c.surface,
      border: `1px solid ${c.border}`,
      borderRadius: 'var(--r-xl)',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <div style={{ position: 'relative', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {current && !failed[index]
          ? (
            <img
              src={current}
              alt={`${phone.brand} ${phone.model_name}`}
              onError={() => setFailed(prev => ({ ...prev, [index]: true }))}
              style={{ maxWidth: '76%', maxHeight: '76%', objectFit: 'contain' }}
            />
          )
          : <Smartphone size={100} color={c.border} strokeWidth={0.8} />
        }

        {hasMultiple && (
          <>
            <button
              onClick={() => goTo(index - 1)}
              aria-label="Previous image"
              style={{
                position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
                width: 32, height: 32, borderRadius: '50%',
                background: c.surface, border: `1px solid ${c.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: c.text2, cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => goTo(index + 1)}
              aria-label="Next image"
              style={{
                position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                width: 32, height: 32, borderRadius: '50%',
                background: c.surface, border: `1px solid ${c.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: c.text2, cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="scrollbar-none" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {gallery.map((url, i) => (
            <button
              key={`${url}-${i}`}
              onClick={() => setIndex(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === index}
              style={{
                flexShrink: 0, width: 56, height: 56, padding: 0,
                borderRadius: 'var(--r-sm)',
                border: `2px solid ${i === index ? c.accent : c.border}`,
                background: c.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s',
              }}
            >
              {!failed[i]
                ? (
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(prev => ({ ...prev, [i]: true }))}
                    style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                  />
                )
                : <Smartphone size={20} color={c.border} strokeWidth={1} />
              }
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface PhoneDetailClientProps {
  phone: Phone
  similar: Phone[]
  initialFullSpecs: FullSpecifications | null
}

function PhoneDetailInner({ phone, similar, initialFullSpecs }: PhoneDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { region } = useRegion()


  const [tab, setTab] = useState<TabType>(() => {
    const t = searchParams.get('tab')
    return (t === 'specs' || t === 'compare') ? t : 'overview'
  })
  const [copied, setCopied] = useState(false)
  const [comparePhones, setComparePhones] = useState<Phone[]>([])
  const [priceHistoryPoints, setPriceHistoryPoints] = useState<PricePointRow[]>([])
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false)
  const [variants, setVariants] = useState<PhoneVariant[]>([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<PhoneVariant | null>(null)
  const [offers, setOffers] = useState<RetailerOffer[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleTabChange = (newTab: TabType) => {
    setTab(newTab)
    const p = new URLSearchParams(searchParams.toString())
    if (newTab === 'overview') p.delete('tab')
    else p.set('tab', newTab)
    const str = p.toString()
    router.replace(str ? `?${str}` : window.location.pathname, { scroll: false })
  }

  useEffect(() => {
    const controller = new AbortController()
    setPriceHistoryLoading(true)
    api.phones.priceHistory(phone.id, { scope: 'global' }, controller.signal)
      .then(res => { if (!controller.signal.aborted) setPriceHistoryPoints(res.price_points ?? []) })
      .catch(() => { if (!controller.signal.aborted) setPriceHistoryPoints([]) })
      .finally(() => { if (!controller.signal.aborted) setPriceHistoryLoading(false) })
    return () => controller.abort()
  }, [phone.id])

  useEffect(() => {
    const controller = new AbortController()
    setVariantsLoading(true)
    api.phones.variants(phone.id, controller.signal)
      .then(res => {
        if (controller.signal.aborted) return
        const vs = (res?.variants ?? []) as PhoneVariant[]
        setVariants(vs)
        setSelectedVariant(vs[0] ?? null)
      })
      .catch(() => { if (!controller.signal.aborted) { setVariants([]); setSelectedVariant(null) } })
      .finally(() => { if (!controller.signal.aborted) setVariantsLoading(false) })
    return () => controller.abort()
  }, [phone.id])

  useEffect(() => {
    let cancelled = false
    api.phones.offers(phone.id, region)
      .then(res => { if (!cancelled) setOffers(res.offers) })
      .catch(() => { if (!cancelled) setOffers([]) })
    return () => { cancelled = true }
  }, [phone.id, region])

  const inCompare = comparePhones.some(p => p.id === phone.id)

  const handleCompareToggle = () => {
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

  const displayPrice = resolveDisplayPrice(phone, priceHistoryPoints)
  const effectivePrice = selectedVariant ? selectedVariant.price : displayPrice

  const hasScopedOffers = offers.length > 0
  const { primary: resolvedOffer, alternates } = useMemo(
    () => resolveOffersForVariant(offers, selectedVariant),
    [offers, selectedVariant],
  )
  const badgeRegion = resolvedOffer?.region ?? region

  const legacyBuyUrl = selectedVariant?.url || phone.amazon_link
  const buyUrl = hasScopedOffers ? (resolvedOffer?.url ?? null) : legacyBuyUrl
  const isAmazon = !!buyUrl && buyUrl.includes('amazon.')

  const legacyLabel = legacyBuyUrl
    ? (() => {
        const inferred = inferRetailerLabelFromUrl(legacyBuyUrl)
        if (inferred) return `Buy on ${inferred}`
        return isAmazon ? 'Buy on Amazon' : 'View This Price'
      })()
    : null

  const buyLabel = hasScopedOffers
    ? (resolvedOffer ? buyButtonLabel(resolvedOffer.retailer) : null)
    : legacyLabel

  const badgeRegionTag = resolvedOffer?.region ?? (buyUrl ? inferRegionTagFromUrl(buyUrl) : null)

  const quickSpecs = [
    phone.screen_size ? { icon: <Monitor size={20} strokeWidth={1.5} />, value: `${phone.screen_size}"`, label: 'Display' } : null,
    phone.main_camera_mp ? { icon: <Camera size={20} strokeWidth={1.5} />, value: `${phone.main_camera_mp}MP`, label: 'Camera' } : null,
    phone.battery_capacity ? { icon: <Battery size={20} strokeWidth={1.5} />, value: `${phone.battery_capacity.toLocaleString()}`, label: 'mAh' } : null,
    phone.ram_options?.length ? { icon: <Cpu size={20} strokeWidth={1.5} />, value: `${Math.max(...phone.ram_options!)}GB`, label: 'Max RAM' } : null,
    phone.fast_charging_w ? { icon: <Zap size={20} strokeWidth={1.5} />, value: `${phone.fast_charging_w}W`, label: 'Charging' } : null,
    phone.weight_g ? { icon: <Weight size={20} strokeWidth={1.5} />, value: `${phone.weight_g}g`, label: 'Weight' } : null,
  ].filter(Boolean) as { icon: React.ReactNode; value: string; label: string }[]

  const specGroups = getFullSpecGroups(initialFullSpecs)
  const sortedSpecGroups = withLaunchPrice(
    [...specGroups].sort(([a], [b]) => rankSpecGroup(a) - rankSpecGroup(b)),
    phone,
  )
  const valueScore = (phone as any).value_score as number | null
  const tier = getTierStyle(phone.chipset_tier)

  const overviewSections = [
    {
      title: 'Display',
      headline: phone.screen_size ? `${phone.screen_size}" Screen` : 'Display',
      specs: [
        phone.screen_size ? { label: 'Screen Size', value: `${phone.screen_size}"` } : null,
        phone.screen_resolution ? { label: 'Resolution', value: phone.screen_resolution } : null,
        getPanelType(phone) !== '—' ? { label: 'Type', value: getPanelType(phone) } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Camera',
      headline: phone.main_camera_mp ? `${phone.main_camera_mp}MP Main Camera` : 'Camera System',
      specs: [
        phone.main_camera_mp ? { label: 'Main Camera', value: `${phone.main_camera_mp} MP` } : null,
        getFrontCamera(phone) !== '—' ? { label: 'Front Camera', value: getFrontCamera(phone) } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Performance',
      headline: phone.chipset || 'Processor',
      specs: [
        phone.chipset ? { label: 'Chipset', value: phone.chipset } : null,
        phone.ram_options?.length ? { label: 'RAM', value: phone.ram_options!.map(r => `${r}GB`).join(' / ') } : null,
        phone.storage_options?.length
          ? { label: 'Storage', value: phone.storage_options!.map(formatStorage).join(' / ') }
          : null,
        phone.antutu_score ? { label: 'AnTuTu Score', value: phone.antutu_score.toLocaleString() } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Battery & Charging',
      headline: phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()} mAh` : 'Battery',
      specs: [
        phone.battery_capacity ? { label: 'Capacity', value: `${phone.battery_capacity.toLocaleString()} mAh` } : null,
        phone.fast_charging_w ? { label: 'Fast Charging', value: `${phone.fast_charging_w}W wired` } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Build & Design',
      headline: phone.weight_g ? `${phone.weight_g}g` : 'Build',
      specs: [
        phone.weight_g ? { label: 'Weight', value: `${phone.weight_g}g` } : null,
        phone.thickness_mm ? { label: 'Thickness', value: `${phone.thickness_mm}mm` } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
  ].filter(s => s.specs.length > 0)

  return (

    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar
        compareCount={comparePhones.length}
        onOpenCompare={() => {
          if (comparePhones.length >= 2) router.push(ROUTES.compare(...comparePhones.map(p => phoneSlug(p))))
        }}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--page-px)' }}>

        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <nav style={{
          padding: '14px 0',
          fontSize: 13,
          color: c.text3,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
        }}>
          <Link href={ROUTES.home} style={{ color: c.text2 }}>Home</Link>
          <ChevronRight size={12} />
          <Link href={ROUTES.brand(brandSlug(phone.brand))} style={{ color: c.text2 }}>{phone.brand}</Link>
          <ChevronRight size={12} />
          <span style={{ color: c.text3 }}>{phone.model_name}</span>
        </nav>

        {/* ── Hero grid ──────────────────────────────────────────────────── */}
        <div className="phone-hero-grid">

          {/* Left: gallery */}
          <PhoneGallery phone={phone} />

          {/* Right: info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Brand (clickable) + meta row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Link
                href={ROUTES.brand(brandSlug(phone.brand))}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  color: c.accent,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
              >
                {phone.brand}
              </Link>

              {/* Share button — top-right of info panel */}
              <button
                onClick={handleShare}
                title="Copy link"
                aria-label={copied ? 'Link copied' : 'Copy link to this phone'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 11px',
                  background: copied ? 'var(--green-light)' : c.surface,
                  border: `1px solid ${copied ? 'var(--green-border)' : c.border}`,
                  borderRadius: 'var(--r-full)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: copied ? 'var(--green)' : c.text3,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!copied) {
                    (e.currentTarget as HTMLElement).style.borderColor = c.borderHover
                    ;(e.currentTarget as HTMLElement).style.color = c.text2
                  }
                }}
                onMouseLeave={e => {
                  if (!copied) {
                    (e.currentTarget as HTMLElement).style.borderColor = c.border
                    ;(e.currentTarget as HTMLElement).style.color = c.text3
                  }
                }}
              >
                {copied ? <Check size={12} strokeWidth={2.5} /> : <Link2 size={12} strokeWidth={2} />}
                {copied ? 'Copied' : 'Share'}
              </button>
            </div>

            {/* Model name */}
            <h1 style={{
              fontFamily: f.serif,
              fontSize: 'clamp(24px,3vw,34px)',
              color: c.text1,
              letterSpacing: '-0.4px',
              lineHeight: 1.15,
              marginBottom: 14,
            }}>
              {phone.model_name}
            </h1>

            {/* Price + tier badge row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              <span style={{
                fontSize: 'clamp(22px,2.5vw,30px)',
                fontWeight: 700,
                color: c.text1,
                letterSpacing: '-0.5px',
              }}>
                {effectivePrice != null ? `$${Math.round(effectivePrice).toLocaleString()}` : 'Price TBA'}
              </span>

              {effectivePrice != null && (
                <span style={{ fontSize: 13, color: c.text3 }}>
                  {selectedVariant
                    ? `${selectedVariant.ram_gb ? `${selectedVariant.ram_gb}GB + ` : ''}${formatStorage(selectedVariant.storage_gb)}${badgeRegionTag ? ` · ${badgeRegionTag}` : ''}`
                    : `Starting price${badgeRegionTag ? ` · ${badgeRegionTag}` : ''}`}
                </span>
              )}

              {tier && (
                <span style={{
                  padding: '3px 10px',
                  background: tier.bg,
                  color: tier.color,
                  border: `1px solid ${tier.color}25`,
                  borderRadius: 'var(--r-full)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                }}>
                  {tier.label}
                </span>
              )}

              {phone.release_year && (
                <span style={{
                  padding: '3px 10px',
                  background: c.bg,
                  color: c.text3,
                  border: `1px solid ${c.border}`,
                  borderRadius: 'var(--r-full)',
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {phone.release_year}
                </span>
              )}
            </div>

            {/* Overall score card */}
            {valueScore != null && (
              <div style={{
                padding: '14px 18px',
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: 'var(--r-md)',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    fontSize: 30,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: valueScoreColor(valueScore),
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {valueScore.toFixed(1)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.text2, marginBottom: 6 }}>Overall Score</div>
                    <div style={{ height: 5, background: c.bg, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${valueScore * 10}%`,
                        background: valueScoreColor(valueScore),
                        borderRadius: 3,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 10.5, color: c.text3, whiteSpace: 'nowrap' }}>vs peers</div>
                </div>
                <p style={{ fontSize: 11, color: c.text3, marginTop: 10, lineHeight: 1.5 }}>
                  Average of camera, performance, battery, display, build, and value — see the full breakdown below.
                </p>
              </div>
            )}

            {/* Variant picker */}
            <VariantPicker
              variants={variants}
              loading={variantsLoading}
              selected={selectedVariant}
              onSelect={setSelectedVariant}
            />

            {/* CTA buttons */}
            <div className="hero-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={handleCompareToggle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  flex: 1,
                  color: inCompare ? '#fff' : c.primary,
                  background: inCompare ? c.primary : 'transparent',
                  border: `1.5px solid ${c.primary}`,
                  borderRadius: 'var(--r-full)',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                  justifyContent: 'center',
                }}
                onMouseEnter={e => {
                  if (!inCompare) (e.currentTarget as HTMLElement).style.background = 'rgba(21,21,31,0.05)'
                }}
                onMouseLeave={e => {
                  if (!inCompare) (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <Scale size={15} strokeWidth={2} />
                {inCompare ? 'In Compare' : 'Add to Compare'}
              </button>

              {buyUrl && buyLabel && (
                <>
                  <a
                    href={buyUrl}
                    target="_blank"
                    rel={isAmazon ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px 20px',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#fff',
                      background: c.primary,
                      borderRadius: 'var(--r-full)',
                      textDecoration: 'none',
                      justifyContent: 'center',
                      flex: 1,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
                  >
                    {isAmazon ? <ShoppingCart size={15} strokeWidth={2} /> : <ExternalLink size={15} strokeWidth={2} />}
                    {buyLabel}
                  </a>
                  {hasScopedOffers && alternates.length > 0 && (
                    <AlternateOfferPicker offers={alternates} />
                  )}
                </>
              )}
            </div>

            {/* Affiliate disclaimer */}
            {buyUrl && (
              <span style={{ fontSize: 10, color: c.text3, display: 'block', marginTop: 8 }}>
                {isAmazon
                  ? 'Affiliate link — we may earn a commission at no extra cost to you'
                  : 'Price shown by third-party retailer and may change'}
              </span>
            )}
          </div>
        </div>

        {/* ── Quick specs grid ────────────────────────────────────────────── */}
        <div className="quick-specs-grid" style={{ marginBottom: 40 }}>
          {quickSpecs.map((spec, i) => <QuickSpecCard key={i} {...spec} />)}
        </div>

        {/* ── Sticky tab bar ──────────────────────────────────────────────── */}
        <div style={{
          position: 'sticky',
          top: 'var(--nav-h)',
          zIndex: z.sticky,
          background: 'rgba(248,248,245,0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${c.border}`,
          marginBottom: 28,
          display: 'flex',
          overflowX: 'auto',
        }}>
          <TabButton active={tab === 'overview'} onClick={() => handleTabChange('overview')}>Overview</TabButton>
          <TabButton active={tab === 'specs'} onClick={() => handleTabChange('specs')}>Full Specs</TabButton>
          <TabButton active={tab === 'compare'} onClick={() => handleTabChange('compare')}>Compare</TabButton>
        </div>

        {/* ── Overview tab ────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 48 }}>
            <WhyThisPhone phone={phone} fallbackSections={overviewSections} />
            <PriceHistoryChart points={priceHistoryPoints} loading={priceHistoryLoading} />
          </div>
        )}

        {/* ── Specs tab ───────────────────────────────────────────────────── */}
        {tab === 'specs' && (
          <div style={{ marginBottom: 48 }}>
            {sortedSpecGroups.length > 0
              ? sortedSpecGroups.map(([name, specs]) => <SpecGroup key={name} title={name} specs={specs} />)
              : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: c.text3 }}>
                  <Smartphone size={48} color={c.border} strokeWidth={1} style={{ margin: '0 auto 12px' }} />
                  <p>Detailed specifications not available for this model.</p>
                </div>
              )
            }
          </div>
        )}

        {/* ── Compare tab ─────────────────────────────────────────────────── */}
        {tab === 'compare' && (
          <div style={{ maxWidth: 600, marginBottom: 48 }}>
            <div style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, marginBottom: 6 }}>
              Compare {phone.model_name}
            </div>
            <p style={{ fontSize: 14, color: c.text3, marginBottom: 22 }}>
              Pick any phone below for a full side-by-side spec comparison.
            </p>

            {similar.length === 0 ? (
              <div style={{
                padding: '32px 20px',
                textAlign: 'center',
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: 'var(--r-md)',
                color: c.text3,
              }}>
                <Smartphone size={36} color={c.border} strokeWidth={1} style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: 14 }}>No similar phones found at this price range.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {similar.slice(0, 8).map(p => (
                  <Link
                    key={p.id}
                    href={ROUTES.compare(phoneSlug(phone), phoneSlug(p))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px',
                      background: c.surface,
                      border: `1px solid ${c.border}`,
                      borderRadius: 'var(--r-md)',
                      transition: 'all 0.15s',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = c.primary
                      ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = c.border
                      ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ width: 44, height: 44, background: c.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {p.main_image_url
                        ? <img src={p.main_image_url} alt="" loading="lazy" decoding="async" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                        : <Smartphone size={20} color={c.border} strokeWidth={1} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: c.text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.model_name}
                      </div>
                      <div style={{ fontSize: 12, color: c.text3, marginTop: 2 }}>
                        {(() => { const dp = resolveDisplayPrice(p); return dp != null ? `$${Math.round(dp).toLocaleString()}` : '—' })()}
                        {p.main_camera_mp ? ` · ${p.main_camera_mp}MP` : ''}
                        {p.battery_capacity ? ` · ${p.battery_capacity.toLocaleString()}mAh` : ''}
                        {p.antutu_score ? ` · ${(p.antutu_score / 1_000_000).toFixed(1)}M AnTuTu` : ''}
                      </div>
                    </div>
                    <ArrowRight size={15} color={c.text3} strokeWidth={2} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <AdSlot placement="rectangle" />

        {/* ── Similar phones ──────────────────────────────────────────────── */}
        <section style={{ marginTop: 8, marginBottom: 64 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1 }}>Similar Phones</h2>
            <span style={{ fontSize: 13, color: c.text3 }}>Price · Size · Performance</span>
          </div>

          {similar.length === 0 ? (
            <div style={{
              padding: '32px 20px',
              textAlign: 'center',
              background: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: 'var(--r-md)',
              color: c.text3,
            }}>
              <p style={{ fontSize: 14 }}>No similar phones found at a comparable price range.</p>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div
                ref={scrollRef}
                className="scrollbar-none"
                style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 4 }}
              >
                {similar.map(p => <SimilarCard key={p.id} phone={p} />)}
              </div>
              <div style={{
                position: 'absolute', right: 0, top: 0, bottom: 0, width: 56,
                background: 'linear-gradient(-90deg,var(--bg) 0%,transparent 100%)',
                pointerEvents: 'none',
              }} />
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
        .phone-hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          padding-bottom: 40px;
          align-items: start;
        }
        .quick-specs-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }
        .specs-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 4px;
        }
        .hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }

        @media (max-width: 1023px) {
          .phone-hero-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }
          .phone-hero-grid > div:first-child {
            max-width: 420px;
            margin: 0 auto;
            width: 100%;
          }
          .quick-specs-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 640px) {
          .quick-specs-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .specs-2col { grid-template-columns: 1fr; }
          .hero-actions { flex-direction: column; }
          .hero-actions a,
          .hero-actions button { justify-content: center; }
        }
      `}</style>
    </div>
  )
}

export default function PhoneDetailClient(props: PhoneDetailClientProps) {
  return (
    <Suspense fallback={null}>
      <PhoneDetailInner {...props} />
    </Suspense>
  )
}