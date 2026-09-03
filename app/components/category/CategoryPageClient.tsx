// app/components/category/CategoryPageClient.tsx
'use client'

import { useState, useEffect, useRef, useCallback, Suspense, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, Star, Clock, Smartphone,
  TrendingUp, Info, ArrowRight, ChevronDown,
  Camera, Battery, Zap, Tag, Feather, Bolt, Crosshair, BarChart3,
  Layers, Scale, Check, Sparkles, RotateCcw,
} from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import CompareBar from '@/app/components/CompareBar'
import Footer from '@/app/components/Footer'
import { useToast } from '@/app/components/Toast'
import { api } from '@/lib/api'
import { ROUTES, brandSlug, phoneSlug, MAX_COMPARE } from '@/lib/config'
import { getTierStyle } from '@/lib/tiers'
import { c, f, r, z, mq } from '@/lib/tokens'
import type { Phone, CategoryResult } from '@/lib/types'
import { formatDisplayPrice } from '@/lib/price'

import AdSlot from '@/app/components/ads/AdSlot'

const CATEGORY_CONFIG: Record<string, {
  title: string
  scoreLabel: string
  minYear: number
  desc: string
  scoring: string
  icon: React.ReactNode
  weights: { label: string; pct: number }[]
}> = {
  'camera-phones': {
    title: 'Best Camera Phones',
    scoreLabel: 'Camera Score',
    minYear: 2023,
    desc: 'Ranked by main sensor resolution, sensor size, OIS, lens versatility, and video capabilities. Updated automatically from live spec data.',
    scoring: 'Main sensor (30%) · Sensor size (25%) · OIS (15%) · Lens count (15%) · Telephoto (10%) · Video (5%)',
    icon: <Camera size={22} strokeWidth={1.5} />,
    weights: [
      { label: 'Main Camera MP',   pct: 30 },
      { label: 'Sensor Size',      pct: 25 },
      { label: 'OIS Presence',     pct: 15 },
      { label: 'Number of Lenses', pct: 15 },
      { label: 'Telephoto Zoom',   pct: 10 },
      { label: 'Video Resolution', pct: 5  },
    ],
  },
  'battery-life': {
    title: 'Best Battery Life',
    scoreLabel: 'Battery Score',
    minYear: 2023,
    desc: 'Highest battery capacity phones from 2023 and newer. Ranked purely by mAh.',
    scoring: 'Battery capacity (100%). Simple and honest.',
    icon: <Battery size={22} strokeWidth={1.5} />,
    weights: [{ label: 'Battery Capacity', pct: 100 }],
  },
  'gaming-phones': {
    title: 'Best Gaming Phones',
    scoreLabel: 'Performance Score',
    minYear: 2024,
    desc: 'Top AnTuTu benchmark scores from 2024 and newer. Raw processing power for demanding games at maximum settings.',
    scoring: 'AnTuTu score (100%). 2024+ devices only.',
    icon: <Zap size={22} strokeWidth={1.5} />,
    weights: [{ label: 'AnTuTu Score', pct: 100 }],
  },
  'under-300': {
    title: 'Best Phones Under $300',
    scoreLabel: 'Value Score',
    minYear: 2022,
    desc: 'Maximum specs per dollar under $300. Composite of battery, camera MP, and performance relative to price.',
    scoring: 'Battery capacity (33%) · Main camera MP (33%) · Performance score (34%).',
    icon: <Tag size={22} strokeWidth={1.5} />,
    weights: [
      { label: 'Battery Capacity',  pct: 33 },
      { label: 'Main Camera MP',    pct: 33 },
      { label: 'Performance Score', pct: 34 },
    ],
  },
  'under-500': {
    title: 'Best Phones Under $500',
    scoreLabel: 'Value Score',
    minYear: 2022,
    desc: 'The mid-range sweet spot. Near-flagship specs at half the price. Scored by specs composite within the $0–$500 range.',
    scoring: 'Battery capacity (33%) · Main camera MP (33%) · Performance score (34%).',
    icon: <Tag size={22} strokeWidth={1.5} />,
    weights: [
      { label: 'Battery Capacity',  pct: 33 },
      { label: 'Main Camera MP',    pct: 33 },
      { label: 'Performance Score', pct: 34 },
    ],
  },
  'lightweight': {
    title: 'Lightest Smartphones',
    scoreLabel: 'Lightness Score',
    minYear: 2023,
    desc: 'Modern smartphones (5.5"+ screen) between 100g–185g. Feature phones excluded. Sorted by weight ascending.',
    scoring: 'Weight ascending (100%). Under 185g only, 2023+ releases.',
    icon: <Feather size={22} strokeWidth={1.5} />,
    weights: [{ label: 'Weight (ascending)', pct: 100 }],
  },
  'foldables': {
    title: 'Best Foldable Phones',
    scoreLabel: 'Overall Score',
    minYear: 2015,
    desc: 'Every foldable currently tracked, ranked by our smart overall score where available, falling back to raw AnTuTu for unscored phones.',
    scoring: 'Overall score (100%). Foldable form factor required.',
    icon: <Layers size={22} strokeWidth={1.5} />,
    weights: [{ label: 'Overall Score', pct: 100 }],
  },
  'compact-phones': {
    title: 'Best Compact Phones',
    scoreLabel: 'Performance Score',
    minYear: 2023,
    desc: 'Smartphones with screens between 5.0"–6.3". Ranked by AnTuTu performance within the compact segment.',
    scoring: 'Filter: screen ≤ 6.3". Ranking: AnTuTu score within that set.',
    icon: <Smartphone size={22} strokeWidth={1.5} />,
    weights: [{ label: 'AnTuTu Score', pct: 100 }],
  },
  'fast-charging': {
    title: 'Fastest Charging Phones',
    scoreLabel: 'Charging Score',
    minYear: 2023,
    desc: 'Ranked by maximum wired charging wattage. 30W minimum to qualify. 90W+ is the 2026 premium benchmark.',
    scoring: 'Fast charging wattage (100%). Wired only. 30W minimum.',
    icon: <Bolt size={22} strokeWidth={1.5} />,
    weights: [{ label: 'Charging Wattage', pct: 100 }],
  },
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'camera-phones':  <Camera size={16} strokeWidth={1.5} />,
  'battery-life':   <Battery size={16} strokeWidth={1.5} />,
  'gaming-phones':  <Zap size={16} strokeWidth={1.5} />,
  'under-300':      <Tag size={16} strokeWidth={1.5} />,
  'under-500':      <Tag size={16} strokeWidth={1.5} />,
  'lightweight':    <Feather size={16} strokeWidth={1.5} />,
  'foldables':      <Layers size={16} strokeWidth={1.5} />,
  'compact-phones': <Smartphone size={16} strokeWidth={1.5} />,
  'fast-charging':  <Bolt size={16} strokeWidth={1.5} />,
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

const ALL_CATEGORIES = [
  { slug: 'camera-phones',  label: 'Best Camera'   },
  { slug: 'battery-life',   label: 'Battery Life'  },
  { slug: 'gaming-phones',  label: 'Gaming'        },
  { slug: 'under-300',      label: 'Under $300'    },
  { slug: 'under-500',      label: 'Under $500'    },
  { slug: 'lightweight',    label: 'Lightweight'   },
  { slug: 'foldables',      label: 'Foldables'     },
  { slug: 'compact-phones', label: 'Compact'       },
  { slug: 'fast-charging',  label: 'Fast Charging' },
]

const CATEGORY_SLUG_ORDER = Object.keys(CATEGORY_CONFIG)

function paletteFor(slug: string) {
  const idx = CATEGORY_SLUG_ORDER.indexOf(slug)
  return CATEGORY_PALETTE[(idx === -1 ? 0 : idx) % CATEGORY_PALETTE.length]
}

const AMBER = '#B0651B'
const AMBER_BG = '#FBF0E4'
const AMBER_BORDER = '#EFD3AE'
const MATCH_BORDER = '#C9D2F2'

function truncateWords(str: string, maxChars: number): string {
  if (str.length <= maxChars) return str
  const cut = str.slice(0, maxChars)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut) + '...'
}

interface WhyPoint { bold: string; rest: string }

function getCategoryWhyPointsFallback(slug: string, phone: Phone & { category_score: number }): WhyPoint[] {
  const pts: (WhyPoint | null)[] = []
  switch (slug) {
    case 'camera-phones':
      pts.push(
        phone.main_camera_mp ? { bold: `${phone.main_camera_mp}MP main sensor`, rest: 'with advanced computational photography and flagship-grade optics.' } : null,
        phone.chipset ? { bold: phone.chipset, rest: `— ${phone.chipset_tier?.label ?? 'high-end'} tier SoC accelerates image processing and video encoding.` } : null,
        phone.fast_charging_w ? { bold: `${phone.fast_charging_w}W fast charging`, rest: 'gets you back to shooting quickly between sessions.' } : null,
      )
      break
    case 'battery-life':
      pts.push(
        phone.battery_capacity ? { bold: `${phone.battery_capacity.toLocaleString()}mAh cell`, rest: '— one of the largest capacities in any current production device.' } : null,
        phone.chipset ? { bold: phone.chipset, rest: 'delivers efficient power management across light and heavy workloads.' } : null,
        phone.fast_charging_w ? { bold: `${phone.fast_charging_w}W fast charging`, rest: 'replenishes the large cell in a reasonable timeframe.' } : null,
      )
      break
    case 'gaming-phones':
      pts.push(
        phone.antutu_score ? { bold: `${phone.antutu_score.toLocaleString()} AnTuTu`, rest: '— top-tier raw performance for demanding titles at maximum settings.' } : null,
        phone.chipset ? { bold: phone.chipset, rest: `— ${phone.chipset_tier?.label ?? 'flagship'} GPU handles any current game without thermal throttling.` } : null,
        phone.ram_options?.length ? { bold: `Up to ${Math.max(...phone.ram_options!)}GB RAM`, rest: 'keeps game assets resident and eliminates background eviction.' } : null,
      )
      break
    case 'under-300':
    case 'under-500':
      pts.push(
        phone.price_usd ? { bold: `$${phone.price_usd.toLocaleString()}`, rest: 'delivers a spec package that competes well above its price tier.' } : null,
        phone.main_camera_mp ? { bold: `${phone.main_camera_mp}MP main camera`, rest: 'significantly outperforms what this price bracket used to offer.' } : null,
        phone.battery_capacity ? { bold: `${phone.battery_capacity.toLocaleString()}mAh battery`, rest: 'provides all-day endurance without compromise.' } : null,
      )
      break
    case 'lightweight':
      pts.push(
        phone.weight_g ? { bold: `${phone.weight_g}g`, rest: '— genuinely light without feeling cheap or structurally compromised.' } : null,
        phone.chipset ? { bold: phone.chipset, rest: 'solid performance in a chassis that does not weigh you down.' } : null,
        phone.battery_capacity ? { bold: `${phone.battery_capacity.toLocaleString()}mAh`, rest: 'respectable capacity given the constraints of the thin, light form factor.' } : null,
      )
      break
    case 'compact-phones':
      pts.push(
        phone.screen_size ? { bold: `${phone.screen_size}" display`, rest: 'genuinely pocket-friendly and easy to use single-handed.' } : null,
        phone.antutu_score ? { bold: `${phone.antutu_score.toLocaleString()} AnTuTu`, rest: '— the highest performance score in the compact segment.' } : null,
        phone.weight_g ? { bold: `${phone.weight_g}g`, rest: 'light enough to carry all day without noticing it.' } : null,
      )
      break
    case 'fast-charging':
      pts.push(
        phone.fast_charging_w ? { bold: `${phone.fast_charging_w}W wired charging`, rest: '— among the fastest charging speeds in any production device.' } : null,
        phone.battery_capacity ? { bold: `${phone.battery_capacity.toLocaleString()}mAh capacity`, rest: 'large enough that fast charging genuinely matters for real use.' } : null,
        phone.chipset ? { bold: phone.chipset, rest: 'manages thermal limits during sustained charge without degrading the cell.' } : null,
      )
      break
    default:
      pts.push(
        phone.main_camera_mp ? { bold: `${phone.main_camera_mp}MP camera`, rest: 'strong imaging credentials.' } : null,
        phone.battery_capacity ? { bold: `${phone.battery_capacity.toLocaleString()}mAh battery`, rest: 'solid all-day endurance.' } : null,
        phone.chipset ? { bold: phone.chipset, rest: `${phone.chipset_tier?.label ?? 'capable'} tier performance.` } : null,
      )
  }
  return (pts.filter(Boolean) as WhyPoint[]).slice(0, 3)
}

function getCategoryTradeOffFallback(slug: string, phone: Phone & { category_score: number }): string {
  switch (slug) {
    case 'camera-phones':
      if (phone.weight_g && phone.weight_g > 200)
        return `Heavy at ${phone.weight_g}g — check the lightweight ranking if portability matters more.`
      if (phone.fast_charging_w && phone.fast_charging_w < 30)
        return `Slow ${phone.fast_charging_w}W charging — competitors at this tier offer 65W or faster.`
      return `Premium pricing at $${phone.price_usd?.toLocaleString() ?? '---'} — check the mid-range picks below for better value.`
    case 'battery-life':
      if (phone.weight_g && phone.weight_g > 215)
        return `The large cell pushes weight to ${phone.weight_g}g — noticeably heavier in-pocket.`
      return `Battery-first engineering means other specs take a back seat.`
    case 'gaming-phones':
      if (phone.weight_g && phone.weight_g > 205)
        return `${phone.weight_g}g is heavy for extended sessions — hand fatigue is a real consideration.`
      return `Gaming-segment pricing commands a premium over the mid-range options below.`
    case 'under-300':
    case 'under-500':
      if (!phone.fast_charging_w || phone.fast_charging_w < 18)
        return `Slow charging is the clearest budget compromise — expect 90 minutes or more for a full charge.`
      return `Budget hardware means some flagship features are absent.`
    case 'lightweight':
      return `Lightweight design can mean thinner materials and a smaller cell.`
    case 'compact-phones':
      return `The small screen is the defining trade-off here.`
    case 'fast-charging':
      return `Fast charging standards typically require the bundled charger.`
    default:
      return `Verify competitors before committing.`
  }
}

function getCategoryReasonFallback(slug: string, phone: Phone & { category_score: number }, rank: number): string {
  const prefix = rank === 2 ? 'Runner-up by a narrow margin.' : 'A strong contender in this category.'
  switch (slug) {
    case 'camera-phones':
      return `${prefix} ${phone.main_camera_mp ?? '---'}MP main with ${phone.chipset_tier?.label ?? 'flagship'} tier processing.`
    case 'battery-life':
      return `${prefix} ${phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh` : '---'} keeps you unplugged through the longest days.`
    case 'gaming-phones':
      return `${prefix} ${phone.antutu_score ? `${phone.antutu_score.toLocaleString()} AnTuTu` : '---'} with ${phone.chipset ?? 'a capable SoC'}.`
    case 'under-300':
    case 'under-500':
      return `${prefix} $${phone.price_usd?.toLocaleString() ?? '---'} with ${phone.main_camera_mp ?? '---'}MP camera and ${phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh` : '---'} battery.`
    case 'lightweight':
      return `${prefix} ${phone.weight_g ? `${phone.weight_g}g` : '---'} — barely noticeable in a pocket.`
    case 'compact-phones':
      return `${prefix} ${phone.screen_size ? `${phone.screen_size}"` : '---'} with ${phone.antutu_score ? `${(phone.antutu_score / 1_000_000).toFixed(1)}M AnTuTu` : 'solid performance'}.`
    case 'fast-charging':
      return `${prefix} ${phone.fast_charging_w ? `${phone.fast_charging_w}W` : '---'} wired, ${phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh` : '---'} capacity.`
    default:
      return `${prefix} ${phone.main_camera_mp ?? '---'}MP · ${phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh` : '---'}.`
  }
}

function getWhyPoints(slug: string, phone: Phone & { category_score: number }): WhyPoint[] {
  if (phone.smart_score?.strengths?.length) {
    return phone.smart_score.strengths.slice(0, 3).map(s => ({ bold: '', rest: s }))
  }
  return getCategoryWhyPointsFallback(slug, phone)
}

function getTradeOff(slug: string, phone: Phone & { category_score: number }): string {
  if (phone.smart_score?.weaknesses?.length) {
    return phone.smart_score.weaknesses[0]
  }
  return getCategoryTradeOffFallback(slug, phone)
}

function getReason(slug: string, phone: Phone & { category_score: number }, rank: number): string {
  if (phone.smart_score?.reasoning) {
    return truncateWords(phone.smart_score.reasoning, 160)
  }
  return getCategoryReasonFallback(slug, phone, rank)
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  return (
    <div
      title={label}
      style={{
        flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
        padding: '6px 13px', background: c.blueLight, border: `1px solid ${MATCH_BORDER}`, borderRadius: r.md,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 800, color: c.blue, lineHeight: 1 }}>{score.toFixed(1)}</span>
      <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' as const, color: c.blue, opacity: 0.7, whiteSpace: 'nowrap' }}>
        {label.replace(' Score', '')}
      </span>
    </div>
  )
}

function RankCard({
  phone, rank, score, scoreLabel, isBest, config, slug, onCompare, isCompared,
}: {
  phone: Phone & { category_score: number }
  rank: number
  score: number
  scoreLabel: string
  isBest: boolean
  config: typeof CATEGORY_CONFIG[string]
  slug: string
  onCompare: (p: Phone) => void
  isCompared: boolean
}) {
  const router = useRouter()
  const tier = getTierStyle(phone.chipset_tier)
  const whyPoints = isBest ? getWhyPoints(slug, phone) : []
  const tradeOff = isBest ? getTradeOff(slug, phone) : ''
  const reason = isBest ? '' : getReason(slug, phone, rank)
  const categoryLabel = config.title.split(' ').slice(1, 3).join(' ')
  const aiScored = !!phone.smart_score?.reasoning

  return (
    <div
      className="rank-card"
      style={{
        position: 'relative',
        background: isBest ? `linear-gradient(180deg, var(--accent-light) 0%, ${c.surface} 140px)` : c.surface,
        border: `1px solid ${isBest ? 'var(--accent-border)' : c.border}`,
        borderRadius: r.lg, padding: '22px 24px', marginBottom: 14,
        transition: 'all 150ms ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'
        ;(e.currentTarget as HTMLElement).style.borderColor = isBest ? 'var(--accent-border)' : c.borderHover
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none'
        ;(e.currentTarget as HTMLElement).style.borderColor = isBest ? 'var(--accent-border)' : c.border
      }}
    >
      {isBest && (
        <div style={{
          position: 'absolute', top: -11, left: 22, display: 'flex', alignItems: 'center', gap: 5,
          background: c.accent, color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px',
          textTransform: 'uppercase' as const, padding: '4px 12px', borderRadius: r.full, boxShadow: 'var(--shadow-sm)',
        }}>
          <Star size={10} fill="#fff" color="#fff" /> Best {categoryLabel}
        </div>
      )}

      <div className="rank-card-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <div style={{
            width: isBest ? 76 : 64, height: isBest ? 76 : 64, flexShrink: 0, background: c.bg,
            borderRadius: r.md, display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', transition: 'width 0.2s, height 0.2s',
          }}>
            {phone.main_image_url
              ? <img src={phone.main_image_url} alt={phone.model_name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: isBest ? 8 : 5 }} />
              : <Smartphone size={26} color={c.borderHover} strokeWidth={1} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: f.serif, fontSize: isBest ? 23 : 19, color: c.text1, lineHeight: 1.2, marginBottom: 4 }}>
              {isBest ? phone.model_name : `#${rank} ${phone.model_name}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: c.text3, flexWrap: 'wrap' }}>
              <span>{phone.brand} · {phone.release_year}</span>
              {tier && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: r.full, color: tier.color, background: tier.bg }}>
                  {tier.label}
                </span>
              )}
              {aiScored && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: r.full, color: c.text3, background: c.bg, border: `1px solid ${c.border}` }}>
                  Reviewed
                </span>
              )}
            </div>
          </div>
        </div>

        <ScoreBadge score={score} label={scoreLabel} />
      </div>

      {isBest ? (
        <>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', color: c.text3, marginBottom: 10 }}>
            <Sparkles size={10} /> Why it leads {categoryLabel}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, paddingLeft: 2 }}>
            {whyPoints.map((pt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <Check size={14} color="var(--green)" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 14.5, color: c.text2, lineHeight: 1.55 }}>
                  {pt.bold && <strong>{pt.bold}</strong>}{pt.bold ? ' ' : ''}{pt.rest}
                </p>
              </div>
            ))}
          </div>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 9, background: AMBER_BG, border: `1px solid ${AMBER_BORDER}`,
            borderRadius: r.sm, padding: '10px 13px', marginBottom: 16, fontSize: 12.5, color: c.text2, lineHeight: 1.5,
          }}>
            <Info size={14} color={AMBER} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><b style={{ color: AMBER }}>Trade-off</b> — {tradeOff}</span>
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, marginBottom: 14 }}>{reason}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {phone.amazon_link && (
          <a
            href={phone.amazon_link}
            target="_blank"
            rel="noopener noreferrer sponsored"
            style={{
              padding: '9px 20px', borderRadius: r.full, fontSize: 13, fontWeight: 700,
              background: c.primary, color: '#fff', textDecoration: 'none', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
          >
            Buy Now
          </a>
        )}
        <button
          onClick={() => router.push(ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone)))}
          style={{
            padding: '9px 16px', borderRadius: r.full, fontSize: 13, fontWeight: 600,
            color: c.text2, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
        >
          Details
        </button>
        <button
          onClick={() => onCompare(phone)}
          style={{
            padding: '9px 16px', borderRadius: r.full, fontSize: 13, fontWeight: 600,
            color: c.text2, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
        >
          {isCompared ? '✓ In Compare' : '+ Compare'}
        </button>
        <div style={{ marginLeft: 'auto', fontSize: isBest ? 21 : 18, fontWeight: 800, color: c.text1 }}>
          {formatDisplayPrice(phone)}
        </div>
      </div>
    </div>
  )
}

function MethodologyBox({ config, pal, open, onToggle }: {
  config: typeof CATEGORY_CONFIG[string]
  pal: { bg: string; iconBg: string; iconColor: string }
  open: boolean
  onToggle: () => void
}) {
  const categoryLabel = config.title.split(' ').slice(1, 3).join(' ')
  return (
    <div style={{ marginTop: 40, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: open ? `1px solid ${c.border}` : 'none', cursor: 'pointer', userSelect: 'none', background: 'none', border: 'none', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 size={17} color={c.text2} />
          <span style={{ fontFamily: f.serif, fontSize: 18, color: c.text1 }}>How we rank {categoryLabel}</span>
        </div>
        <ChevronDown size={15} color={c.text3} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }} />
      </button>

      {open && (
        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 13.5, color: c.text2, lineHeight: 1.65, marginBottom: 20, maxWidth: 620 }}>
            The <strong>{config.scoreLabel}</strong> is specific to this category — it measures {categoryLabel.toLowerCase()} fit,
            not general phone quality, and is computed automatically from hardware specs. Scores are relative: the top phone in each run is normalised to 10.
          </p>
          <div className="methodology-weights" style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
            {config.weights.map((w, i) => (
              <div key={i} style={{ padding: '12px 14px', background: c.bg, borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: c.text2, marginBottom: 5 }}>{w.label}</div>
                <div style={{ height: 4, background: c.border, borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: pal.iconColor, width: `${w.pct}%`, transition: 'width 600ms ease' }} />
                </div>
                <div style={{ fontSize: 10.5, color: c.text3 }}>{w.pct}% weight</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '11px 14px', background: pal.bg, borderRadius: 'var(--r-sm)', fontSize: 12.5, color: c.text2, lineHeight: 1.55, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <Info size={14} style={{ flexShrink: 0, color: pal.iconColor, marginTop: 1 }} />
            <span>Real-world performance — especially camera quality — doesn't always match spec scores. No brand sponsors these rankings.</span>
          </div>
        </div>
      )}
    </div>
  )
}

function OtherCategories({ currentSlug }: { currentSlug: string }) {
  const router = useRouter()
  const cats   = ALL_CATEGORIES.filter(cat => cat.slug !== currentSlug)

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: c.text3, marginBottom: 14 }}>
        More rankings
      </div>
      <div className="other-cats-grid" style={{ display: 'grid', gap: 12 }}>
        {cats.map(cat => {
          const pal = paletteFor(cat.slug)
          return (
            <div
              key={cat.slug}
              onClick={() => router.push(ROUTES.category(cat.slug))}
              style={{ background: pal.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '18px 16px', cursor: 'pointer', transition: 'all 150ms ease' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
            >
              <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: pal.iconBg, color: pal.iconColor, marginBottom: 12 }}>
                {CATEGORY_ICONS[cat.slug]}
              </div>
              <div style={{ fontFamily: f.serif, fontSize: 15, color: c.text1, marginBottom: 10 }}>
                {CATEGORY_CONFIG[cat.slug]?.title ?? cat.label}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: c.text1, display: 'flex', alignItems: 'center', gap: 4 }}>
                View ranking <ArrowRight size={11} />
              </div>
            </div>
          )
        })}

        <div
          onClick={() => router.push(ROUTES.pick)}
          style={{ background: c.primary, borderRadius: 'var(--r-md)', padding: '18px 16px', cursor: 'pointer', transition: 'all 150ms ease' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
        >
          <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', color: '#fff', marginBottom: 12 }}>
            <Crosshair size={16} strokeWidth={1.5} />
          </div>
          <div style={{ fontFamily: f.serif, fontSize: 15, color: '#fff', marginBottom: 10 }}>Help me choose</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
            Try it <ArrowRight size={11} />
          </div>
        </div>
        <div
          onClick={() => router.push(ROUTES.tradein)}
          style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '18px 16px', cursor: 'pointer', transition: 'all 150ms ease' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
        >
          <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.bg, color: c.text1, marginBottom: 12 }}>
            <RotateCcw size={16} strokeWidth={1.5} />
          </div>
          <div style={{ fontFamily: f.serif, fontSize: 15, color: c.text1, marginBottom: 10 }}>Trade-in calculator</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: c.text1, display: 'flex', alignItems: 'center', gap: 4 }}>
            Check value <ArrowRight size={11} />
          </div>
        </div>
      </div>
    </div>
  )
}

interface CategoryPageClientProps {
  slug: string
  initialData: CategoryResult | null
}

function CategoryPageContent({ slug, initialData }: CategoryPageClientProps) {
  const router     = useRouter()
  const { toast }  = useToast()

  const [data, setData]                     = useState<CategoryResult | null>(initialData)
  const [loading, setLoading]               = useState(false)
  const [comparePhones, setComparePhones]   = useState<Phone[]>([])
  const [methodOpen, setMethodOpen]         = useState(false)

  const config = CATEGORY_CONFIG[slug] ?? CATEGORY_CONFIG['camera-phones']
  const pal    = paletteFor(slug)

  const fetchCategory = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.categories.get(slug, 10)
      setData(result)
    } catch {
      setData(null)
      toast('Failed to load rankings', 'error')
    } finally {
      setLoading(false)
    }
  }, [slug, toast])

  // SSR already provided the data for the initial slug — only fall back to
  // a client fetch when the server pass failed or came back empty.
  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    if (initialData) return
    fetchCategory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCompare = (phone: Phone) => {
    setComparePhones(prev => {
      if (prev.find(p => p.id === phone.id)) { toast('Removed from compare', 'info'); return prev.filter(p => p.id !== phone.id) }
      if (prev.length >= MAX_COMPARE) { toast(`Maximum ${MAX_COMPARE} phones in compare`, 'error'); return prev }
      toast('Added to compare', 'success')
      return [...prev, phone]
    })
  }

  const compareIds = comparePhones.map(p => p.id)
  const top3       = data?.phones.slice(0, 3) ?? []

  const latestYear  = data?.phones.reduce((max, p) => Math.max(max, p.release_year ?? 0), 0) || new Date().getFullYear()
  const displayTitle = `${config.title} ${latestYear}`

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar
        compareCount={comparePhones.length}
        onOpenCompare={() => comparePhones.length >= 2 && router.push(ROUTES.compare(...comparePhones.map(p => phoneSlug(p))))}
      />

      <div className="category-container" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 var(--page-px) 72px' }}>
        <nav style={{ padding: '16px 0 0', fontSize: 12.5, color: c.text3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: c.text2 }}>Home</Link>
          <ChevronRight size={11} color={c.text3} />
          <Link href="/best" style={{ color: c.text2 }}>Best Of</Link>
          <ChevronRight size={11} color={c.text3} />
          <span>{displayTitle}</span>
        </nav>

        <div className="category-tabs" style={{ marginTop: 20, overflowX: 'auto', scrollbarWidth: 'none', borderBottom: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', gap: 0, minWidth: 'max-content' }}>
            {ALL_CATEGORIES.map(cat => {
              const active = cat.slug === slug
              const catPal = paletteFor(cat.slug)
              return (
                <Link
                  key={cat.slug}
                  href={ROUTES.category(cat.slug)}
                  style={{ padding: '11px 16px', fontSize: 12.5, fontWeight: 500, color: active ? c.text1 : c.text3, whiteSpace: 'nowrap', borderBottom: `2px solid ${active ? catPal.iconColor : 'transparent'}`, transition: 'color 150ms ease', display: 'flex', alignItems: 'center', gap: 6 }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = c.text1 }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = c.text3 }}
                >
                  <span style={{ color: active ? catPal.iconColor : 'inherit', display: 'flex', alignItems: 'center' }}>{CATEGORY_ICONS[cat.slug]}</span>
                  {cat.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="hero-section" style={{ padding: '32px 0 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 28, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: pal.bg, borderRadius: 'var(--r-full)', fontSize: 11.5, fontWeight: 600, color: pal.iconColor, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
              <TrendingUp size={12} />
              Category ranking
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <div className="category-hero-icon" style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: pal.iconBg, color: pal.iconColor }}>
                {config.icon}
              </div>
              <h1 className="category-hero-title" style={{ fontFamily: f.serif, fontSize: 40, color: c.text1, letterSpacing: '-1px', lineHeight: 1.1 }}>
                {displayTitle}
              </h1>
            </div>
            <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.65, maxWidth: 560, marginBottom: 16 }}>{config.desc}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: c.text3 }}><Clock size={13} color={c.text3} />Updated daily</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: c.text3 }}><Smartphone size={13} color={c.text3} /><strong style={{ color: c.text2, fontWeight: 600 }}>10</strong>&nbsp;phones ranked</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: c.text3 }}><Star size={13} color={c.text3} />{config.minYear}+ releases only</span>
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <button
              onClick={() => {
                if (top3.length >= 2) {
                  router.push(ROUTES.compare(...top3.slice(0, 3).map(p => phoneSlug(p))))
                } else {
                  toast('Need at least 2 phones to compare', 'error')
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: c.primary, color: '#fff', borderRadius: 'var(--r-full)', fontSize: 13.5, fontWeight: 600, transition: 'background 150ms ease', whiteSpace: 'nowrap', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
            >
              <Scale size={15} strokeWidth={2} />
              Compare top 3
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${c.border}`, borderTopColor: c.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 13.5, color: c.text3 }}>Loading rankings...</p>
          </div>
        ) : !data || data.phones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Smartphone size={52} color={c.border} strokeWidth={1.5} style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontFamily: f.serif, fontSize: 20, color: c.text1, marginBottom: 8 }}>No phones found</h3>
            <p style={{ fontSize: 13.5, color: c.text3 }}>This category has no ranked phones yet.</p>
          </div>
        ) : (
          <>
            {data.phones.map((phone, i) => (
              <Fragment key={phone.id}>
                <RankCard
                  phone={phone}
                  rank={i + 1}
                  score={phone.category_score}
                  scoreLabel={config.scoreLabel}
                  isBest={i === 0}
                  config={config}
                  slug={slug}
                  onCompare={handleCompare}
                  isCompared={compareIds.includes(phone.id)}
                />
                {i === 2 && (
                  <div style={{ margin: '20px 0' }}>
                    <AdSlot placement="inline" />
                  </div>
                )}
              </Fragment>
            ))}
          </>
        )}

        <button
          onClick={() => setMethodOpen(v => !v)}
          aria-expanded={methodOpen}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', fontSize: 12.5, color: c.text2, marginTop: 16, cursor: 'pointer', transition: 'all 150ms ease' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
        >
          <Info size={13} color={c.text3} />
          How this ranking is scored
          <ChevronDown size={13} color={c.text3} style={{ transform: methodOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }} />
        </button>

        <MethodologyBox config={config} pal={pal} open={methodOpen} onToggle={() => setMethodOpen(v => !v)} />

        <div style={{ marginTop: 40 }}>
          <AdSlot placement="inline" />
        </div>

        <OtherCategories currentSlug={slug} />
      </div>

      <Footer />

      <CompareBar
        phones={comparePhones}
        onRemove={id => setComparePhones(prev => prev.filter(p => p.id !== id))}
        onClear={() => setComparePhones([])}
      />

      <style>{`
        .other-cats-grid { grid-template-columns: repeat(4, 1fr); }
        .methodology-weights { grid-template-columns: repeat(3, 1fr); }

        ${mq.lg} {
          .category-hero-title { font-size: 32px !important; }
          .category-hero-icon { width: 38px !important; height: 38px !important; }
          .hero-section { padding: 24px 0 20px; gap: 20px; }
          .rank-card { padding: 18px !important; }
          .other-cats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .methodology-weights { grid-template-columns: repeat(2, 1fr) !important; }
        }

        ${mq.md} {
          .category-hero-title { font-size: 24px !important; }
          .hero-section { flex-direction: column; gap: 14px; }
          .rank-card-header { flex-wrap: wrap; }
          .other-cats-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .methodology-weights { grid-template-columns: 1fr !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  )
}

export default function CategoryPageClient(props: CategoryPageClientProps) {
  return (
    <Suspense fallback={null}>
      <CategoryPageContent {...props} />
    </Suspense>
  )
}
