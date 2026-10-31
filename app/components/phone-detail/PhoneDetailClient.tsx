// app/components/phone-detail/PhoneDetailClient.tsx
'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, Share2, ShoppingCart, Check, Camera, Battery, Cpu, Monitor,
  Weight, Zap, Smartphone, ArrowRight, ExternalLink, Link2, Scale,
} from 'lucide-react'
import { api } from '@/lib/api'
import { ROUTES } from '@/lib/config'
import { tierStyle } from '@/lib/tiers'
import { formatLocal, formatUsd } from '@/lib/price'
import { isRealOffer, lowestVariantPrice, variantLabel } from '@/lib/phone'
import { getPanelType, getFrontCamera } from '@/lib/specs'
import { c, f, z } from '@/lib/tokens'
import { valueScoreColor } from '@/lib/valueScore'
import { analytics } from '@/lib/analytics'
import { trackNextStep, trackPageView } from '@/lib/events'
import { isLikelyBot } from '@/lib/bot'
import { useRegion } from '@/lib/regionStore'
import type { ComparePair, NextStep, Phone, PhoneDetail, PhoneOffer, PhoneVariant } from '@/lib/types'
import Navbar from '@/app/components/Navbar'
import { useToast } from '@/app/components/Toast'
import CompareBar from '@/app/components/CompareBar'
import Footer from '@/app/components/Footer'
import AdSlot from '@/app/components/ads/AdSlot'
import AlternateOfferPicker from '@/app/components/phone-detail/AlternateOfferPicker'
import PhoneGallery from '@/app/components/phone-detail/PhoneGallery'
import { ReviewSection, PriceHistoryChart, SimilarCard, CompareWithCard } from '@/app/components/phone-detail/PhoneOverview'
import { QuickSpecCard, SpecGroup, formatStorage, sortedSpecGroups, type FullSpecs } from '@/app/components/phone-detail/PhoneSpecs'

type SectionId = 'review' | 'specs' | 'compare'

const SECTION_OFFSET = 'calc(var(--nav-h) + 64px)'

function VariantPicker({
  variants, selected, onSelect, viewerRegion,
}: {
  variants: PhoneVariant[]
  selected: PhoneVariant | null
  onSelect: (v: PhoneVariant) => void
  viewerRegion: string
}) {
  const priced = variants.filter(v => v.price_usd != null)
  if (!variants.length) return null

  const hasRam = variants.some(v => v.ram_gb != null)
  const cheapest = priced.length ? Math.min(...priced.map(v => v.price_usd as number)) : null

  return (
    <div className="variant-card" style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)', padding: '18px 20px', marginBottom: 20, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: c.text1 }}>Choose a configuration</span>
        <span style={{ fontSize: 11, color: c.text3 }}>{variants.length} option{variants.length > 1 ? 's' : ''}</span>
      </div>

      <div className="variant-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
        {variants.map(v => {
          const isSelected = selected?.id === v.id
          const isCheapest = cheapest != null && v.price_usd === cheapest
          const local = viewerRegion && v.region && viewerRegion.toUpperCase() === v.region.toUpperCase() ? formatLocal(v.local) : null
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v)}
              style={{
                position: 'relative', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0,
                padding: '10px 12px', textAlign: 'left', borderRadius: 'var(--r-md)', cursor: 'pointer',
                border: `1.5px solid ${isSelected ? c.accent : c.border}`,
                background: isSelected ? `${c.accent}12` : c.bg, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = c.borderHover }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = c.border }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? c.accent : c.text1 }}>
                {hasRam && v.ram_gb ? `${v.ram_gb}/${formatStorage(v.storage_gb)}` : formatStorage(v.storage_gb) || variantLabel(v)}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.text1 }}>{formatUsd(v.price_usd)}</span>
              {local && <span style={{ fontSize: 11, color: c.text3 }}>{local}</span>}
              {isCheapest && variants.length > 1 && (
                <span style={{ position: 'absolute', top: -7, right: 8, fontSize: 9, fontWeight: 700, letterSpacing: '0.3px', color: 'var(--green)', background: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 'var(--r-full)', padding: '1px 6px' }}>
                  LOWEST PRICE
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p style={{ fontSize: 11, color: c.text3, marginTop: 10, lineHeight: 1.5 }}>
        Prices reflect the selected storage{hasRam ? ' and RAM' : ''} configuration.
      </p>
    </div>
  )
}

interface PhoneDetailClientProps {
  phone: PhoneDetail
  similar: Phone[]
  compareWith: ComparePair[]
  nextSteps: NextStep[]
  fullSpecs: FullSpecs
}

function PhoneDetailInner({ phone, similar, compareWith, nextSteps, fullSpecs }: PhoneDetailClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { region } = useRegion()

  const [copied, setCopied] = useState(false)
  const [comparePhones, setComparePhones] = useState<Phone[]>([])
  const [history, setHistory] = useState<{ date: string; usd: number }[]>([])
  const [historyLoading, setHistoryLoading] = useState(phone.price_history_points >= 2)
  const [offers, setOffers] = useState<PhoneOffer[]>(phone.offers?.offers ?? [])
  const [active, setActive] = useState<SectionId>('review')
  const scrollRef = useRef<HTMLDivElement>(null)

  const variants = phone.variants ?? []
  const defaultVariant = useMemo(() => {
    const priced = variants.filter(v => v.price_usd != null)
    if (!priced.length) return variants[0] ?? null
    return priced.reduce((a, b) => ((a.price_usd as number) <= (b.price_usd as number) ? a : b))
  }, [variants])
  const [selectedVariant, setSelectedVariant] = useState<PhoneVariant | null>(defaultVariant)

  useEffect(() => {
    if (phone.price_history_points < 2 || isLikelyBot()) return
    const controller = new AbortController()
    api.phones.priceHistory(phone.id, controller.signal)
      .then(res => { if (!controller.signal.aborted) setHistory(res.lowest ?? []) })
      .catch(() => { if (!controller.signal.aborted) setHistory([]) })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false) })
    return () => controller.abort()
  }, [phone.id, phone.price_history_points])

  useEffect(() => {
    if (isLikelyBot()) return
    let cancelled = false
    api.phones.offers(phone.id, region)
      .then(res => { if (!cancelled) setOffers(res.offers) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [phone.id, region])

  useEffect(() => {
    analytics.phoneView({ id: phone.id, brand: phone.brand, display_name: phone.display_name, price_usd: phone.price_usd })
    trackPageView('phone', phone.path, phone.id, region)
  }, [phone.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => sortedSpecGroups(fullSpecs), [fullSpecs])
  const hasSpecs = groups.length > 0
  const hasCompareSection = compareWith.length > 0 || similar.length > 0

  const compareCards = useMemo(() => {
    if (compareWith.length > 0) return compareWith.slice(0, 3)
    return similar.slice(0, 3).map(p => ({
      path: ROUTES.comparePair(phone.full_slug, p.full_slug),
      phones: [phone, p],
      source: 'rival',
    }))
  }, [phone, similar, compareWith])

  const similarList = useMemo(() => {
    const used = new Set<number>(
      compareCards.flatMap(pair => pair.phones.map(p => p.id)),
    )
    return similar.filter(p => !used.has(p.id)).slice(0, 8)
  }, [similar, compareCards])

  useEffect(() => {
    const ids: SectionId[] = ['review', ...(hasSpecs ? ['specs' as const] : []), ...(hasCompareSection ? ['compare' as const] : [])]
    const els = ids.map(id => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id as SectionId)
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 },
    )
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [hasSpecs, hasCompareSection])

  const inCompare = comparePhones.some(p => p.id === phone.id)

  const handleCompareToggle = () => {
    setComparePhones(prev => {
      if (prev.find(p => p.id === phone.id)) {
        toast('Removed from compare', 'info')
        return prev.filter(p => p.id !== phone.id)
      }
      if (prev.length >= 4) { toast('Maximum 4 phones', 'error'); return prev }
      toast('Added to compare', 'success')
      analytics.compareAddPhone(phone, prev.length + 1)
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
      toast('Could not copy link. Copy it from the address bar instead.', 'error')
    }
  }

  const effectivePrice = selectedVariant?.price_usd ?? lowestVariantPrice(variants, phone.price_usd)
  const localPrice =
    selectedVariant && region && selectedVariant.region && region.toUpperCase() === selectedVariant.region.toUpperCase()
      ? formatLocal(selectedVariant.local)
      : !selectedVariant && region && phone.price_region && region.toUpperCase() === phone.price_region.toUpperCase()
        ? formatLocal(phone.price_local)
        : null

  const variantOffers = offers.filter(o => !selectedVariant || o.variant_id === selectedVariant.id)
  const isSearchOffer = (o: PhoneOffer) => !!o.url && !!o.is_placeholder && !!o.is_available
  const realOffers = variantOffers.filter(isRealOffer)
  const primaryOffer = realOffers[0] ?? null
  const searchOffer = !primaryOffer ? variantOffers.find(isSearchOffer) ?? null : null
  // Everything else goes in the dropdown (real offers AND search/placeholder
  // offers), in the exact order the API returned them (regional order).
  const alternateOffers = variantOffers.filter(
    o => o !== primaryOffer && o !== searchOffer && (isRealOffer(o) || isSearchOffer(o)),
  )

  const buyUrl = primaryOffer?.url ?? null
  const isAmazon = !!buyUrl && buyUrl.includes('amazon.')
  const tier = tierStyle(phone.tier)
  const overall = phone.overall_score

  const quickSpecs = [
    phone.screen_size ? { icon: <Monitor size={20} strokeWidth={1.5} />, value: `${phone.screen_size}"`, label: 'Display' } : null,
    phone.main_camera_mp ? { icon: <Camera size={20} strokeWidth={1.5} />, value: `${phone.main_camera_mp}MP`, label: 'Camera' } : null,
    phone.battery_capacity ? { icon: <Battery size={20} strokeWidth={1.5} />, value: `${phone.battery_capacity.toLocaleString()}`, label: 'mAh' } : null,
    phone.ram_max_gb ? { icon: <Cpu size={20} strokeWidth={1.5} />, value: `${phone.ram_max_gb}GB`, label: 'Max RAM' } : null,
    phone.fast_charging_w ? { icon: <Zap size={20} strokeWidth={1.5} />, value: `${phone.fast_charging_w}W`, label: 'Charging' } : null,
    phone.weight_g ? { icon: <Weight size={20} strokeWidth={1.5} />, value: `${phone.weight_g}g`, label: 'Weight' } : null,
  ].filter(Boolean) as { icon: React.ReactNode; value: string; label: string }[]

  const specSource = { full_specifications: fullSpecs }
  const panelFromSpecs = getPanelType(specSource)
  const panelType = phone.display_type ?? (panelFromSpecs !== '—' ? panelFromSpecs : null)
  const frontFromSpecs = getFrontCamera(specSource)
  const frontCamera = phone.selfie_mp ? `${phone.selfie_mp} MP` : frontFromSpecs !== '—' ? frontFromSpecs : null

  const overviewSections = [
    {
      title: 'Display',
      headline: phone.screen_size ? `${phone.screen_size}" Screen` : 'Display',
      specs: [
        phone.screen_size ? { label: 'Screen Size', value: `${phone.screen_size}"` } : null,
        phone.screen_resolution ? { label: 'Resolution', value: phone.screen_resolution } : null,
        panelType ? { label: 'Type', value: panelType } : null,
        phone.refresh_rate_hz ? { label: 'Refresh Rate', value: `${phone.refresh_rate_hz}Hz` } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Camera',
      headline: phone.main_camera_mp ? `${phone.main_camera_mp}MP Main Camera` : 'Camera System',
      specs: [
        phone.main_camera_mp ? { label: 'Main Camera', value: `${phone.main_camera_mp} MP` } : null,
        phone.camera_summary ? { label: 'Setup', value: phone.camera_summary } : null,
        phone.has_ois != null ? { label: 'OIS', value: phone.has_ois ? 'Yes' : 'No' } : null,
        frontCamera ? { label: 'Front Camera', value: frontCamera } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Performance',
      headline: phone.chipset || 'Processor',
      specs: [
        phone.chipset ? { label: 'Chipset', value: phone.chipset } : null,
        phone.ram_options?.length ? { label: 'RAM', value: phone.ram_options.map(r => `${r}GB`).join(' / ') } : null,
        phone.storage_options?.length ? { label: 'Storage', value: phone.storage_options.map(formatStorage).join(' / ') } : null,
        phone.antutu_score ? { label: 'AnTuTu Score', value: phone.antutu_score.toLocaleString() } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Battery & Charging',
      headline: phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()} mAh` : 'Battery',
      specs: [
        phone.battery_capacity ? { label: 'Capacity', value: `${phone.battery_capacity.toLocaleString()} mAh` } : null,
        phone.fast_charging_w ? { label: 'Fast Charging', value: `${phone.fast_charging_w}W wired` } : null,
        phone.wireless_charging_w ? { label: 'Wireless Charging', value: `${phone.wireless_charging_w}W` } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Build & Design',
      headline: phone.weight_g ? `${phone.weight_g}g` : 'Build',
      specs: [
        phone.weight_g ? { label: 'Weight', value: `${phone.weight_g}g` } : null,
        phone.thickness_mm ? { label: 'Thickness', value: `${phone.thickness_mm}mm` } : null,
        phone.build_material ? { label: 'Materials', value: phone.build_material } : null,
        phone.water_resistance ? { label: 'Water Resistance', value: phone.water_resistance } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
  ].filter(s => s.specs.length > 0)

  const anchors: { id: SectionId; label: string }[] = [
    { id: 'review', label: 'Review' },
    ...(hasSpecs ? [{ id: 'specs' as const, label: 'Full specs' }] : []),
    ...(hasCompareSection ? [{ id: 'compare' as const, label: 'Compare' }] : []),
  ]

  const chipBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px',
    background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)',
    fontSize: 13, fontWeight: 600, color: c.text1, textDecoration: 'none', transition: 'all 0.15s',
  }

  return (
    // overflowX: 'clip' (not 'hidden') contains any stray horizontal overflow
    // without creating a scroll container, so the sticky section nav keeps working.
    <div style={{ minHeight: '100vh', background: c.bg, overflowX: 'clip', maxWidth: '100%' }}>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--page-px)', minWidth: 0 }}>

        <nav aria-label="Breadcrumb" style={{ padding: '14px 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Link href={ROUTES.home} style={{ color: c.text2 }}>Home</Link>
          <ChevronRight size={12} />
          <Link href={phone.brand_path} style={{ color: c.text2 }}>{phone.brand}</Link>
          <ChevronRight size={12} />
          <span style={{ color: c.text3 }}>{phone.name}</span>
        </nav>

        <div className="phone-hero-grid">
          <PhoneGallery phone={phone} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 }}>
              <button
                onClick={handleShare}
                title="Copy link"
                aria-label={copied ? 'Link copied' : 'Copy link to this phone'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
                  background: copied ? 'var(--green-light)' : c.surface,
                  border: `1px solid ${copied ? 'var(--green-border)' : c.border}`,
                  borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500,
                  color: copied ? 'var(--green)' : c.text3, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {copied ? <Check size={12} strokeWidth={2.5} /> : <Link2 size={12} strokeWidth={2} />}
                {copied ? 'Copied' : 'Share'}
              </button>
            </div>

            <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(24px,3vw,34px)', color: c.text1, letterSpacing: '-0.4px', lineHeight: 1.15, marginBottom: 14, fontWeight: 400, overflowWrap: 'anywhere' }}>
              {phone.display_name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              <span style={{ fontSize: 'clamp(22px,2.5vw,30px)', fontWeight: 700, color: c.text1, letterSpacing: '-0.5px' }}>
                {formatUsd(effectivePrice)}
              </span>
              {localPrice && <span style={{ fontSize: 15, fontWeight: 600, color: c.text3 }}>{localPrice}</span>}

              {effectivePrice != null && (
                <span style={{ fontSize: 13, color: c.text3 }}>
                  {selectedVariant && variants.length > 1 ? variantLabel(selectedVariant) : variants.length > 1 ? 'Starting price' : ''}
                </span>
              )}

              {tier && (
                <span style={{ padding: '3px 10px', background: tier.bg, color: tier.color, border: `1px solid ${tier.color}25`, borderRadius: 'var(--r-full)', fontSize: 11, fontWeight: 700, letterSpacing: '0.3px' }}>
                  {tier.label}
                </span>
              )}

              {phone.release_year && (
                <span style={{ padding: '3px 10px', background: c.bg, color: c.text3, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', fontSize: 11, fontWeight: 600 }}>
                  {phone.release_year}
                </span>
              )}
            </div>

            {overall != null && (
              <div className="score-card" style={{ padding: '14px 18px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: valueScoreColor(overall), fontVariantNumeric: 'tabular-nums' }}>
                    {overall.toFixed(1)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.text2, marginBottom: 6 }}>Overall Score</div>
                    <div style={{ height: 5, background: c.bg, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${overall * 10}%`, background: valueScoreColor(overall), borderRadius: 3 }} />
                    </div>
                  </div>
                  {tier && <div className="score-tier-note" style={{ fontSize: 10.5, color: c.text3, whiteSpace: 'nowrap' }}>within {tier.label}</div>}
                </div>
                <p style={{ fontSize: 11, color: c.text3, marginTop: 10, lineHeight: 1.5 }}>
                  Average of camera, performance, battery, display, build and value. Scores are rated within the phone&apos;s tier.
                </p>
              </div>
            )}

            <VariantPicker variants={variants} selected={selectedVariant} onSelect={setSelectedVariant} viewerRegion={region} />

            <div className="hero-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={handleCompareToggle}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, flex: 1,
                  color: inCompare ? '#fff' : c.primary, background: inCompare ? c.primary : 'transparent',
                  border: `1.5px solid ${c.primary}`, borderRadius: 'var(--r-full)', transition: 'all 0.15s', cursor: 'pointer', justifyContent: 'center',
                }}
              >
                <Scale size={15} strokeWidth={2} />
                {inCompare ? 'In Compare' : 'Add to Compare'}
              </button>

              {buyUrl && primaryOffer && (
                <>
                  <a
                    href={buyUrl}
                    onClick={() => analytics.affiliateClick({
                      phone_id: phone.id, phone_name: phone.display_name,
                      retailer: primaryOffer.retailer_name, price: primaryOffer.usd ?? undefined, location: 'detail_primary',
                    })}
                    target="_blank"
                    rel={isAmazon ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', fontSize: 14, fontWeight: 700,
                      color: '#fff', background: c.primary, borderRadius: 'var(--r-full)', textDecoration: 'none',
                      justifyContent: 'center', flex: 1, transition: 'background 0.15s',
                    }}
                  >
                    {isAmazon ? <ShoppingCart size={15} strokeWidth={2} /> : <ExternalLink size={15} strokeWidth={2} />}
                    Buy on {primaryOffer.retailer_name}
                  </a>
                  {alternateOffers.length > 0 && (
                    <AlternateOfferPicker offers={alternateOffers} phone={{ id: phone.id, display_name: phone.display_name }} />
                  )}
                </>
              )}

              {!buyUrl && searchOffer && (
                <a
                  href={searchOffer.url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600,
                    color: c.primary, background: 'transparent', border: `1.5px solid ${c.border}`, borderRadius: 'var(--r-full)',
                    textDecoration: 'none', justifyContent: 'center', flex: 1,
                  }}
                >
                  <ExternalLink size={15} strokeWidth={2} />
                  Find on {searchOffer.retailer_name}
                </a>
              )}

              {!buyUrl && searchOffer && alternateOffers.length > 0 && (
                <AlternateOfferPicker offers={alternateOffers} phone={{ id: phone.id, display_name: phone.display_name }} />
              )}
            </div>

            {buyUrl && (
              <span style={{ fontSize: 10, color: c.text3, display: 'block', marginTop: 8 }}>
                {isAmazon ? 'Affiliate link. We may earn a commission at no extra cost to you.' : 'Price shown by a third-party retailer and may change.'}
              </span>
            )}
          </div>
        </div>

        <div className="quick-specs-grid" style={{ marginBottom: 40 }}>
          {quickSpecs.map((spec, i) => <QuickSpecCard key={i} {...spec} />)}
        </div>

        <nav
          className="section-nav"
          aria-label="Page sections"
          style={{
            position: 'sticky', top: 'var(--nav-h)', zIndex: z.sticky,
            background: 'rgba(248,248,245,0.95)', backdropFilter: 'blur(16px)',
            borderBottom: `1px solid ${c.border}`, marginBottom: 28, display: 'flex', overflowX: 'auto',
          }}
        >
          {anchors.map(a => (
            <a
              key={a.id}
              href={`#${a.id}`}
              aria-current={active === a.id ? 'true' : undefined}
              style={{
                fontSize: 14, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap',
                color: active === a.id ? c.text1 : c.text3,
                borderStyle: 'solid', borderWidth: '0 0 2px 0',
                borderColor: `transparent transparent ${active === a.id ? c.accent : 'transparent'} transparent`,
              }}
            >
              {a.label}
            </a>
          ))}
        </nav>

        <section id="review" style={{ scrollMarginTop: SECTION_OFFSET, marginBottom: 14, minWidth: 0 }}>
          <ReviewSection phone={phone} analysis={phone.analysis ?? null} fallbackSections={overviewSections} />
        </section>

        {hasSpecs && (
          <section id="specs" style={{ scrollMarginTop: SECTION_OFFSET, margin: '40px 0 48px', minWidth: 0 }}>
            <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, fontWeight: 400, marginBottom: 16 }}>
              {phone.display_name} full specifications
            </h2>
            {groups.map(([name, specs]) => <SpecGroup key={name} title={name} specs={specs} />)}
          </section>
        )}

        {hasCompareSection && (
          <section id="compare" style={{ scrollMarginTop: SECTION_OFFSET, maxWidth: 680, marginBottom: 40, minWidth: 0 }}>
            <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, fontWeight: 400, marginBottom: 6 }}>
              Compare the {phone.name} with
            </h2>
            <p style={{ fontSize: 14, color: c.text3, marginBottom: 18 }}>
              Side-by-side specs and scores against phones in the same price range.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {compareCards.map(pair => <CompareWithCard key={pair.path} pair={pair} selfId={phone.id} />)}
            </div>
          </section>
        )}

        <div style={{ marginBottom: 40, minWidth: 0 }}>
          <PriceHistoryChart points={history} loading={historyLoading} />
        </div>

        <AdSlot placement="rectangle" />

        {similarList.length > 0 && (
          <section style={{ marginTop: 8, marginBottom: 40, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20, gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, fontWeight: 400 }}>Similar phones</h2>
              <span style={{ fontSize: 13, color: c.text3 }}>Price, size and performance</span>
            </div>
            <div style={{ position: 'relative' }}>
              <div ref={scrollRef} className="scrollbar-none" style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 4 }}>
                {similarList.map(p => <SimilarCard key={p.id} phone={p} />)}
              </div>
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 56, background: 'linear-gradient(-90deg,var(--bg) 0%,transparent 100%)', pointerEvents: 'none' }} />
            </div>
          </section>
        )}

        {nextSteps.length > 0 && (
          <section aria-label="Next steps" style={{ marginBottom: 64 }}>
            <h2 style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, fontWeight: 400, marginBottom: 14 }}>Where to next</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {nextSteps.map(step => (
                <Link
                  key={step.slot + step.href}
                  href={step.href}
                  onClick={() => trackNextStep(step.slot, step.href, 'phone', phone.id)}
                  style={chipBase}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border }}
                >
                  {step.label}
                  <ArrowRight size={14} strokeWidth={2} color={c.text3} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />

      <CompareBar
        phones={comparePhones}
        onRemove={id => setComparePhones(prev => prev.filter(p => p.id !== id))}
        onClear={() => setComparePhones([])}
      />

      <style>{`
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

        /* minmax(0, 1fr) everywhere: a bare 1fr has min-width:auto and grows to
           its widest child (the thumbnail strip), which pushed the page wider
           than the phone screen. */
        .phone-hero-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; padding-bottom: 40px; align-items: start; }
        .phone-hero-grid > * { min-width: 0; }
        .quick-specs-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
        .specs-2col { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; margin-bottom: 4px; }
        .hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .section-nav a { padding: 14px 20px; }

        @media (max-width: 1023px) {
          .phone-hero-grid { grid-template-columns: minmax(0, 1fr); gap: 20px; padding-bottom: 28px; }
          .phone-hero-grid > div:first-child { max-width: 420px; margin: 0 auto; width: 100%; }
          .quick-specs-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 640px) {
          .quick-specs-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 28px !important; }
          .specs-2col { grid-template-columns: minmax(0, 1fr); }
          .hero-actions { flex-direction: column; }
          .hero-actions > a, .hero-actions > button { width: 100%; flex: none !important; justify-content: center; }
          .variant-card { padding: 14px 14px !important; }
          .variant-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .score-card { padding: 12px 14px !important; }
          .section-nav a { padding: 12px 14px; font-size: 13.5px; }
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
