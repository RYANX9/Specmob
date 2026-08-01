'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import {
  ChevronRight, Share2, GitCompare, ShoppingCart,
  Check, Camera, Battery, Cpu, Monitor,
  Weight, Zap, Smartphone, ArrowRight,
} from 'lucide-react'
import { api, type PricePointRow } from '@/lib/api'
import { ROUTES, brandSlug, phoneSlug } from '@/lib/config'
import { getTierStyle } from '@/lib/tiers'
import { resolveDisplayPrice, withLaunchPrice } from '@/lib/price'
import { getPanelType, getFrontCamera, stripHtml } from '@/lib/specs'
import { c, f, z } from '@/lib/tokens'
import type { Phone, FullSpecifications } from '@/lib/types'
import Navbar from '@/app/components/Navbar'
import { useToast } from '@/app/components/Toast'
import CompareBar from '@/app/components/CompareBar'
import Footer from '@/app/components/Footer'
import { valueScoreColor } from '@/lib/valueScore'
import PhoneGallery from '@/app/components/phone-detail/PhoneGallery'
import {
  TabButton, SpecGroup, QuickSpecCard, VariantPicker,
  rankSpecGroup, formatStorage,
  type PhoneVariant,
} from '@/app/components/phone-detail/PhoneSpecs'
import {
  WhyThisPhone, PriceHistoryChart, SimilarCard,
} from '@/app/components/phone-detail/PhoneOverview'

// ─── id-anchored slug resolution ─────────────────────────────────────────────
// The [model] URL segment is "<slug>-<id>", e.g. "galaxy-a15-3421". The id
// is the only thing that ever resolves to a phone — the slug text is
// cosmetic and purely for readability/SEO. This replaces the old fuzzy
// character-overlap resolvePhone()/pickBest() flow, which re-searched the
// API by text on every load and could match the wrong phone whenever two
// model names shared enough characters (e.g. "galaxy-a15" vs
// "galaxy-a37" scored high enough on overlap to pass the old threshold).

const TRAILING_ID_RE = /-(\d+)$/

function parsePhoneIdFromSegment(segment: string): number | null {
  const match = segment.match(TRAILING_ID_RE)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) && id > 0 ? id : null
}

type TabType = 'overview' | 'specs' | 'compare'

// ─── JSON-LD builders ─────────────────────────────────────────────────────────

function buildProductJsonLd(phone: Phone, displayPrice: number | null): object {
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
    ...(displayPrice != null && {
      offers: {
        '@type': 'Offer',
        price: displayPrice,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `https://specmob.vercel.app/brand/${brandSlug(phone.brand)}/${phoneSlug(phone)}-${phone.id}`,
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
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://specmob.vercel.app' },
      { '@type': 'ListItem', position: 2, name: phone.brand, item: `https://specmob.vercel.app/brand/${brandSlug(phone.brand)}` },
      { '@type': 'ListItem', position: 3, name: phone.model_name, item: `https://specmob.vercel.app/brand/${brandSlug(phone.brand)}/${phoneSlug(phone)}-${phone.id}` },
    ],
  }
}

// ─── main page component ──────────────────────────────────────────────────────

function PhoneDetailContent() {
  const params       = useParams()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { toast }    = useToast()

  const brandParam = (params?.brand as string) ?? ''
  const modelParam = (params?.model as string) ?? ''
  const phoneId    = parsePhoneIdFromSegment(modelParam)

  const [phone, setPhone]                   = useState<Phone | null>(null)
  const [similar, setSimilar]               = useState<Phone[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)
  const [loading, setLoading]               = useState(true)
  const [notFound, setNotFound]             = useState(false)
  const [tab, setTab]                       = useState<TabType>(() => {
    const t = searchParams.get('tab')
    return (t === 'specs' || t === 'compare') ? t : 'overview'
  })
  const [copied, setCopied]               = useState(false)
  const [comparePhones, setComparePhones] = useState<Phone[]>([])
  const [priceHistoryPoints, setPriceHistoryPoints] = useState<PricePointRow[]>([])
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false)
  const [variants, setVariants]                 = useState<PhoneVariant[]>([])
  const [variantsLoading, setVariantsLoading]   = useState(false)
  const [selectedVariant, setSelectedVariant]   = useState<PhoneVariant | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Full specs: fetched only when the Specs tab is first opened, cached
  // per phone id so re-opening the tab doesn't refetch.
  const [fullSpecs, setFullSpecs] = useState<FullSpecifications | null>(null)
  const [fullSpecsLoading, setFullSpecsLoading] = useState(false)
  const [fullSpecsError, setFullSpecsError] = useState(false)
  const fullSpecsFetchedFor = useRef<number | null>(null)

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

  // Core resolution: one direct GET /phones/{id} call, no text search, no
  // fuzzy matching. If the id in the URL doesn't exist, show not-found.
  // If it exists but the slug text in the URL is stale (renamed model,
  // old bookmark), silently correct the URL to the canonical slug for
  // that id rather than 404ing on a perfectly valid id.
  useEffect(() => {
    if (phoneId == null) { setNotFound(true); setLoading(false); return }

    const controller = new AbortController()
    setLoading(true)
    setNotFound(false)
    setPhone(null)
    setSimilar([])
    setPriceHistoryPoints([])
    setVariants([])
    setSelectedVariant(null)

    api.phones.detail(phoneId, controller.signal)
      .then(found => {
        if (controller.signal.aborted) return
        setPhone(found)

        const canonicalBrandSlug = brandSlug(found.brand)
        const canonicalModelSlug = `${phoneSlug(found)}-${found.id}`
        if (brandParam !== canonicalBrandSlug || modelParam !== canonicalModelSlug) {
          router.replace(ROUTES.phone(canonicalBrandSlug, canonicalModelSlug), { scroll: false })
        }

        setSimilarLoading(true)
        api.phones.similar(found.id, 12)
          .then(res => { if (!controller.signal.aborted) setSimilar(res?.phones ?? []) })
          .catch(() => {})
          .finally(() => { if (!controller.signal.aborted) setSimilarLoading(false) })
      })
      .catch(() => { if (!controller.signal.aborted) setNotFound(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })

    return () => controller.abort()
  }, [phoneId])

  useEffect(() => {
    if (!phone?.id) return
    const controller = new AbortController()
    setPriceHistoryLoading(true)
    api.phones.priceHistory(phone.id, { scope: 'global' }, controller.signal)
      .then(res => { if (!controller.signal.aborted) setPriceHistoryPoints(res.price_points ?? []) })
      .catch(() => { if (!controller.signal.aborted) setPriceHistoryPoints([]) })
      .finally(() => { if (!controller.signal.aborted) setPriceHistoryLoading(false) })
    return () => controller.abort()
  }, [phone?.id])

  useEffect(() => {
    if (!phone?.id) return
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
  }, [phone?.id])

  useEffect(() => {
    setFullSpecs(null)
    setFullSpecsError(false)
    fullSpecsFetchedFor.current = null
  }, [phone?.id])

  useEffect(() => {
    if (tab !== 'specs' || !phone?.id) return
    if (fullSpecsFetchedFor.current === phone.id) return

    const controller = new AbortController()
    fullSpecsFetchedFor.current = phone.id
    setFullSpecsLoading(true)
    setFullSpecsError(false)

    api.phones.fullSpecs(phone.id, controller.signal)
      .then(res => { if (!controller.signal.aborted) setFullSpecs(res.full_specifications) })
      .catch(() => {
        if (controller.signal.aborted) return
        setFullSpecs(null)
        setFullSpecsError(true)
        fullSpecsFetchedFor.current = null
      })
      .finally(() => { if (!controller.signal.aborted) setFullSpecsLoading(false) })

    return () => controller.abort()
  }, [tab, phone?.id])

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
          <Link href={ROUTES.brand(brandParam)} style={{ padding: '10px 24px', border: `1px solid ${c.border}`, color: c.text2, borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 500 }}>
            Browse {brandParam.replace(/-/g, ' ')} phones
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )

  // ── derived ──────────────────────────────────────────────────────────────────
  const displayPrice = resolveDisplayPrice(phone, priceHistoryPoints)

  const effectivePrice = selectedVariant ? selectedVariant.price : displayPrice
  const buyUrl   = selectedVariant?.url || phone.amazon_link
  const isAmazon = !!buyUrl && buyUrl.includes('amazon.')

  const quickSpecs = [
    phone.screen_size         ? { icon: <Monitor size={20} strokeWidth={1.5} />, value: `${phone.screen_size}"`,                label: 'Display'  } : null,
    phone.main_camera_mp      ? { icon: <Camera  size={20} strokeWidth={1.5} />, value: `${phone.main_camera_mp}MP`,            label: 'Camera'   } : null,
    phone.battery_capacity    ? { icon: <Battery size={20} strokeWidth={1.5} />, value: `${phone.battery_capacity.toLocaleString()}`, label: 'mAh' } : null,
    phone.ram_options?.length ? { icon: <Cpu     size={20} strokeWidth={1.5} />, value: `${Math.max(...phone.ram_options!)}GB`, label: 'Max RAM'  } : null,
    phone.fast_charging_w     ? { icon: <Zap     size={20} strokeWidth={1.5} />, value: `${phone.fast_charging_w}W`,            label: 'Charging' } : null,
    phone.weight_g            ? { icon: <Weight  size={20} strokeWidth={1.5} />, value: `${phone.weight_g}g`,                  label: 'Weight'   } : null,
  ].filter(Boolean) as { icon: React.ReactNode; value: string; label: string }[]

  const sortedSpecGroups = withLaunchPrice(
    [...getFullSpecGroups(fullSpecs)].sort(([a], [b]) => rankSpecGroup(a) - rankSpecGroup(b)),
    phone,
  )
  const valueScore  = (phone as any).value_score as number | null
  const tier        = getTierStyle(phone.chipset_tier)

  const overviewSections = [
    {
      title: 'Display', headline: phone.screen_size ? `${phone.screen_size}" Screen` : 'Display',
      specs: [
        phone.screen_size       ? { label: 'Screen Size', value: `${phone.screen_size}"` } : null,
        phone.screen_resolution ? { label: 'Resolution',  value: phone.screen_resolution } : null,
        getPanelType(phone) !== '—' ? { label: 'Type', value: getPanelType(phone) } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Camera', headline: phone.main_camera_mp ? `${phone.main_camera_mp}MP Main Camera` : 'Camera System',
      specs: [
        phone.main_camera_mp ? { label: 'Main Camera', value: `${phone.main_camera_mp} MP` } : null,
        getFrontCamera(phone) !== '—' ? { label: 'Front Camera', value: getFrontCamera(phone) } : null,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(phone, displayPrice)) }}
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
          <PhoneGallery phone={phone} />

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.6px', color: c.text3, marginBottom: 6 }}>
              {phone.brand}
            </div>
            <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(24px,3vw,36px)', color: c.text1, letterSpacing: '-0.4px', lineHeight: 1.15, marginBottom: 10 }}>
              {phone.model_name}
            </h1>
            <div style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 600, color: c.text1, marginBottom: 4 }}>
              {effectivePrice != null ? `$${Math.round(effectivePrice).toLocaleString()}` : 'Price TBA'}
            </div>
            {effectivePrice != null && (
              <div style={{ fontSize: 13, color: c.text3, marginBottom: 18 }}>
                {selectedVariant
                  ? `${selectedVariant.ram_gb ? `${selectedVariant.ram_gb}GB + ` : ''}${formatStorage(selectedVariant.storage_gb)} · US`
                  : 'Starting price · US'}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              <span style={{ padding: '4px 12px', background: 'var(--green-light)', color: 'var(--green)', border: '1px solid var(--green-border)', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600 }}>
                Available
              </span>
              {tier && (
                <span style={{ padding: '4px 12px', background: tier.bg, color: tier.color, border: `1px solid ${tier.color}25`, borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600 }}>
                  {tier.label}
                </span>
              )}
              {phone.release_year && (
                <span style={{ padding: '4px 12px', background: c.bg, color: c.text3, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600 }}>
                  {phone.release_year}
                </span>
              )}
            </div>

            {valueScore != null && (
              <div style={{ padding: '14px 18px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: valueScoreColor(valueScore) }}>
                    {valueScore.toFixed(1)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.text2, marginBottom: 5 }}>Overall Score</div>
                    <div style={{ height: 5, background: c.bg, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${valueScore * 10}%`, background: valueScoreColor(valueScore), borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: c.text3 }}>vs peers</div>
                </div>
                <p style={{ fontSize: 11, color: c.text3, marginTop: 10, lineHeight: 1.5 }}>
                  Average of camera, performance, battery, display, build, and value — see the full breakdown below.
                </p>
              </div>
            )}

            <VariantPicker
              variants={variants}
              loading={variantsLoading}
              selected={selectedVariant}
              onSelect={setSelectedVariant}
            />

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

              {buyUrl && (
                <a
                  href={buyUrl}
                  target="_blank"
                  rel={isAmazon ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', fontSize: 14, fontWeight: 600, color: '#fff', background: c.primary, borderRadius: 'var(--r-full)', textDecoration: 'none', justifyContent: 'center', flex: 1 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
                >
                  {isAmazon ? <ShoppingCart size={15} strokeWidth={2} /> : <ArrowRight size={15} strokeWidth={2} />}
                  {isAmazon ? 'Buy on Amazon' : 'View This Price'}
                </a>
              )}
            </div>
            {buyUrl && (
              <span style={{ fontSize: 10, color: c.text3, display: 'block', marginTop: 6 }}>
                {isAmazon ? 'Affiliate link — we may earn a commission' : 'Price shown by third-party retailer, may change'}
              </span>
            )}

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
            <WhyThisPhone phone={phone} fallbackSections={overviewSections} />
            <PriceHistoryChart points={priceHistoryPoints} loading={priceHistoryLoading} />
          </div>
        )}

        {tab === 'specs' && (
          fullSpecsLoading ? (
            <div style={{ marginBottom: 48 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--r-md)', marginBottom: 6 }} />
              ))}
            </div>
          ) : fullSpecsError ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: c.text3 }}>
              <p style={{ marginBottom: 12 }}>Couldn't load full specifications.</p>
              <button
                onClick={() => { fullSpecsFetchedFor.current = null; setTab('overview'); setTimeout(() => setTab('specs'), 0) }}
                style={{ padding: '8px 18px', background: c.primary, color: '#fff', borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          ) : (
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
          )
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
                        {(() => { const dp = resolveDisplayPrice(p); return dp != null ? `$${Math.round(dp).toLocaleString()}` : '—' })()}
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

// Local replacement for the old PhoneSpecs.getSpecGroups(phone), which read
// phone.full_specifications directly. That field no longer arrives on the
// detail payload — this reads the lazily-fetched full-specs response instead.
const SKIP_SPEC_KEYS = new Set([
  'metadata', 'media', 'benchmarks', 'price_info',
  'quick_specs', 'processed_at', 'source_url', 'specifications',
])

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

export default function PhoneDetailPage() {
  return (
    <Suspense fallback={null}>
      <PhoneDetailContent />
    </Suspense>
  )
}
