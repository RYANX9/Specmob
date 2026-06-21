'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Star, Clock, Smartphone,
  TrendingUp, Info, ArrowRight, ChevronDown,
  Camera, Battery, Zap, Tag, Feather, Bolt, Crosshair, BarChart3,
} from 'lucide-react'
import Navbar from '../../components/Navbar'
import CompareBar from '../../components/CompareBar'
import Footer from '../../components/Footer'
import { ToastProvider, useToast } from '../../components/Toast'
import { api } from '@/lib/api'
import { ROUTES, brandSlug, phoneSlug, MAX_COMPARE } from '@/lib/config'
import { c } from '@/lib/tokens'
import type { Phone, CategoryResult } from '@/lib/types'
import { Suspense } from 'react'

// ─── category config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, {
  title: string
  desc: string
  scoring: string
  icon: React.ReactNode
  weights: { label: string; pct: number }[]
}> = {
  'camera-phones': {
    title: 'Best Camera Phones 2025',
    desc: 'Ranked by main sensor resolution, sensor size, OIS, lens versatility, and video capabilities. Updated automatically from live spec data.',
    scoring: 'How we rank camera phones: main sensor (30%), sensor size (25%), OIS (15%), lens count (15%), telephoto (10%), video (5%)',
    icon: <Camera size={22} strokeWidth={1.5} />,
    weights: [
      { label: 'Main Camera MP', pct: 30 },
      { label: 'Sensor Size',    pct: 25 },
      { label: 'OIS Presence',   pct: 15 },
      { label: 'Number of Lenses', pct: 15 },
      { label: 'Telephoto Zoom', pct: 10 },
      { label: 'Video Resolution', pct: 5 },
    ],
  },
  'battery-life': {
    title: 'Best Battery Life 2025',
    desc: 'Highest battery capacity phones from 2022 and newer. Ranked purely by mAh.',
    scoring: 'How we rank battery phones: battery capacity (100%). Simple and honest.',
    icon: <Battery size={22} strokeWidth={1.5} />,
    weights: [{ label: 'Battery Capacity', pct: 100 }],
  },
  'gaming-phones': {
    title: 'Best Gaming Phones 2025',
    desc: 'Top AnTuTu benchmark scores from 2023 and newer. Raw processing power for demanding games.',
    scoring: 'How we rank gaming phones: AnTuTu score (100%). Scores from 2023+ devices only.',
    icon: <Zap size={22} strokeWidth={1.5} />,
    weights: [{ label: 'AnTuTu Score', pct: 100 }],
  },
  'under-300': {
    title: 'Best Phones Under $300 (2025)',
    desc: 'Maximum specs per dollar under $300. Scored on a composite of battery, camera MP, and performance relative to price.',
    scoring: 'Scoring: battery capacity (33%) + main camera MP (33%) + performance score (33%).',
    icon: <Tag size={22} strokeWidth={1.5} />,
    weights: [
      { label: 'Battery Capacity',   pct: 33 },
      { label: 'Main Camera MP',     pct: 33 },
      { label: 'Performance Score',  pct: 34 },
    ],
  },
  'under-500': {
    title: 'Best Phones Under $500 (2025)',
    desc: 'The mid-range sweet spot. Near-flagship specs at half the price. Scored by specs-per-dollar within the $0-$500 range.',
    scoring: 'Scoring: battery capacity (33%) + main camera MP (33%) + performance score (33%).',
    icon: <Tag size={22} strokeWidth={1.5} />,
    weights: [
      { label: 'Battery Capacity',   pct: 33 },
      { label: 'Main Camera MP',     pct: 33 },
      { label: 'Performance Score',  pct: 34 },
    ],
  },
  'lightweight': {
    title: 'Lightest Phones 2025',
    desc: 'Only phones under 200g. Sorted by weight ascending. All from 2022 or newer.',
    scoring: 'Ranking: weight ascending. Simple. Under 200g only.',
    icon: <Feather size={22} strokeWidth={1.5} />,
    weights: [{ label: 'Weight (ascending)', pct: 100 }],
  },
  'compact-phones': {
    title: 'Best Compact Phones 2025',
    desc: 'Screen size 6.3" or under. Ranked by performance (AnTuTu) within the compact category.',
    scoring: 'Filter: screen size <= 6.3". Ranking: AnTuTu score within that filtered set.',
    icon: <Smartphone size={22} strokeWidth={1.5} />,
    weights: [{ label: 'AnTuTu Score', pct: 100 }],
  },
  'fast-charging': {
    title: 'Fastest Charging Phones 2025',
    desc: 'Ranked by maximum wired charging wattage. From 0% to full as fast as physics allows.',
    scoring: 'Ranking: fast charging wattage (100%). Wired only.',
    icon: <Bolt size={22} strokeWidth={1.5} />,
    weights: [{ label: 'Charging Wattage', pct: 100 }],
  },
}

const ALL_CATEGORIES = [
  { slug: 'camera-phones',  icon: <Camera size={18} strokeWidth={1.5} />,    label: 'Best Camera'   },
  { slug: 'battery-life',   icon: <Battery size={18} strokeWidth={1.5} />,   label: 'Battery Life'  },
  { slug: 'gaming-phones',  icon: <Zap size={18} strokeWidth={1.5} />,       label: 'Gaming'        },
  { slug: 'under-300',      icon: <Tag size={18} strokeWidth={1.5} />,       label: 'Under $300'    },
  { slug: 'under-500',      icon: <Tag size={18} strokeWidth={1.5} />,       label: 'Under $500'    },
  { slug: 'lightweight',    icon: <Feather size={18} strokeWidth={1.5} />,   label: 'Lightweight'   },
  { slug: 'compact-phones', icon: <Smartphone size={18} strokeWidth={1.5} />, label: 'Compact'      },
  { slug: 'fast-charging',  icon: <Bolt size={18} strokeWidth={1.5} />,      label: 'Fast Charging' },
]

// ─── medal svgs ───────────────────────────────────────────────────────────────

function MedalGold() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" /><path d="M8.5 13.5L6 22l6-2 6 2-2.5-8.5" /><path d="M12 8v0" strokeWidth="2" />
    </svg>
  )
}
function MedalSilver() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8A9BB0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" /><path d="M8.5 13.5L6 22l6-2 6 2-2.5-8.5" /><path d="M12 8v0" strokeWidth="2" />
    </svg>
  )
}
function MedalBronze() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A0705A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" /><path d="M8.5 13.5L6 22l6-2 6 2-2.5-8.5" /><path d="M12 8v0" strokeWidth="2" />
    </svg>
  )
}

// ─── category-aware content generators ───────────────────────────────────────

interface WhyPoint {
  bold: string
  rest: string
}

function getCategoryWhyPoints(
  slug: string,
  phone: Phone & { category_score: number },
): WhyPoint[] {
  const pts: (WhyPoint | null)[] = []

  switch (slug) {
    case 'camera-phones':
      pts.push(
        phone.main_camera_mp
          ? { bold: `${phone.main_camera_mp}MP main sensor`, rest: 'with advanced computational photography and flagship-grade optics.' }
          : null,
        phone.chipset
          ? { bold: phone.chipset, rest: `— ${phone.chipset_tier ?? 'high-end'} tier SoC accelerates image processing and video encoding.` }
          : null,
        phone.battery_capacity
          ? { bold: `${phone.battery_capacity.toLocaleString()}mAh battery`, rest: 'sustains extended shooting sessions and continuous 4K recording.' }
          : null,
        phone.fast_charging_w
          ? { bold: `${phone.fast_charging_w}W fast charging`, rest: 'gets you back to shooting quickly between sessions.' }
          : null,
      )
      break

    case 'battery-life':
      pts.push(
        phone.battery_capacity
          ? { bold: `${phone.battery_capacity.toLocaleString()}mAh cell`, rest: '— one of the largest capacities in any current production device.' }
          : null,
        phone.chipset
          ? { bold: phone.chipset, rest: 'delivers efficient power management across light and heavy workloads.' }
          : null,
        phone.fast_charging_w
          ? { bold: `${phone.fast_charging_w}W fast charging`, rest: 'replenishes the large cell in a reasonable timeframe.' }
          : null,
        phone.screen_size
          ? { bold: `${phone.screen_size}" display`, rest: 'sized for practical use without the excess drain of oversized panels.' }
          : null,
      )
      break

    case 'gaming-phones':
      pts.push(
        phone.antutu_score
          ? { bold: `${phone.antutu_score.toLocaleString()} AnTuTu`, rest: '— top-tier raw performance for demanding titles at maximum settings.' }
          : null,
        phone.chipset
          ? { bold: phone.chipset, rest: `— ${phone.chipset_tier ?? 'flagship'} tier GPU handles any current game without thermal throttling.` }
          : null,
        phone.ram_options?.length
          ? { bold: `Up to ${Math.max(...phone.ram_options!)}GB RAM`, rest: 'keeps game assets resident and eliminates background eviction during sessions.' }
          : null,
        phone.fast_charging_w
          ? { bold: `${phone.fast_charging_w}W charging`, rest: 'gets you back in the game without lengthy waits.' }
          : null,
      )
      break

    case 'under-300':
    case 'under-500':
      pts.push(
        phone.price_usd
          ? { bold: `$${phone.price_usd.toLocaleString()}`, rest: 'delivers a spec package that competes well above its price tier.' }
          : null,
        phone.main_camera_mp
          ? { bold: `${phone.main_camera_mp}MP main camera`, rest: 'significantly outperforms what this price bracket used to offer.' }
          : null,
        phone.battery_capacity
          ? { bold: `${phone.battery_capacity.toLocaleString()}mAh battery`, rest: 'provides all-day endurance without compromise.' }
          : null,
        phone.chipset
          ? { bold: phone.chipset, rest: 'handles everyday tasks, streaming, and casual gaming without friction.' }
          : null,
      )
      break

    case 'lightweight':
      pts.push(
        phone.weight_g
          ? { bold: `${phone.weight_g}g`, rest: '— genuinely light without feeling cheap or structurally compromised.' }
          : null,
        phone.chipset
          ? { bold: phone.chipset, rest: 'solid performance in a chassis that does not weigh you down.' }
          : null,
        phone.battery_capacity
          ? { bold: `${phone.battery_capacity.toLocaleString()}mAh`, rest: 'respectable capacity given the constraints of the thin, light form factor.' }
          : null,
        phone.screen_size
          ? { bold: `${phone.screen_size}" display`, rest: 'keeps the overall footprint compact while remaining practical.' }
          : null,
      )
      break

    case 'compact-phones':
      pts.push(
        phone.screen_size
          ? { bold: `${phone.screen_size}" display`, rest: 'genuinely pocket-friendly and easy to use single-handed.' }
          : null,
        phone.antutu_score
          ? { bold: `${phone.antutu_score.toLocaleString()} AnTuTu`, rest: '— the highest performance score in the compact segment.' }
          : null,
        phone.weight_g
          ? { bold: `${phone.weight_g}g`, rest: 'light enough to carry all day without noticing it.' }
          : null,
        phone.battery_capacity
          ? { bold: `${phone.battery_capacity.toLocaleString()}mAh`, rest: 'solid runtime for the form factor.' }
          : null,
      )
      break

    case 'fast-charging':
      pts.push(
        phone.fast_charging_w
          ? { bold: `${phone.fast_charging_w}W wired charging`, rest: '— among the fastest charging speeds in any production device.' }
          : null,
        phone.battery_capacity
          ? { bold: `${phone.battery_capacity.toLocaleString()}mAh capacity`, rest: 'large enough that the fast charging genuinely matters for real use.' }
          : null,
        phone.chipset
          ? { bold: phone.chipset, rest: 'manages thermal limits during sustained charge without degrading the cell.' }
          : null,
        phone.main_camera_mp
          ? { bold: `${phone.main_camera_mp}MP camera`, rest: 'solid imaging rounds out an otherwise well-balanced package.' }
          : null,
      )
      break

    default:
      pts.push(
        phone.main_camera_mp
          ? { bold: `${phone.main_camera_mp}MP main camera`, rest: 'strong imaging credentials.' }
          : null,
        phone.battery_capacity
          ? { bold: `${phone.battery_capacity.toLocaleString()}mAh battery`, rest: 'solid all-day endurance.' }
          : null,
        phone.chipset
          ? { bold: phone.chipset, rest: `${phone.chipset_tier ?? 'capable'} tier performance.` }
          : null,
      )
  }

  return (pts.filter(Boolean) as WhyPoint[]).slice(0, 4)
}

function getCategoryTradeOff(
  slug: string,
  phone: Phone & { category_score: number },
): string {
  switch (slug) {
    case 'camera-phones':
      if (phone.weight_g && phone.weight_g > 200)
        return `Heavy at ${phone.weight_g}g — one of the heavier picks in this ranking. Consider lighter alternatives below if portability matters.`
      if (phone.fast_charging_w && phone.fast_charging_w < 30)
        return `Slow ${phone.fast_charging_w}W charging for the price — competitors at this tier offer 65W or faster.`
      return `Premium pricing at $${phone.price_usd?.toLocaleString() ?? '---'} — excellent hardware, but value seekers should check the mid-range options below.`

    case 'battery-life':
      if (phone.weight_g && phone.weight_g > 215)
        return `The large cell pushes weight to ${phone.weight_g}g — noticeably heavier than a standard phone in-pocket.`
      if (phone.main_camera_mp && phone.main_camera_mp < 50)
        return `Camera is not the priority here at ${phone.main_camera_mp}MP — check the camera category if imaging matters to you.`
      return `Battery-first engineering means other specs take a back seat; no major red flags, but set expectations accordingly.`

    case 'gaming-phones':
      if (phone.weight_g && phone.weight_g > 205)
        return `${phone.weight_g}g is heavy for extended gaming sessions — hand fatigue is a real consideration for marathon play.`
      if (phone.battery_capacity && phone.battery_capacity < 4500)
        return `${phone.battery_capacity.toLocaleString()}mAh may not survive a long gaming session at peak brightness and performance.`
      return `Gaming-segment pricing commands a premium — if you do not need the absolute peak, check the mid-range options below.`

    case 'under-300':
    case 'under-500':
      if (phone.chipset_tier === 'entry')
        return `Entry-tier chipset — adequate for daily tasks but will struggle under sustained gaming and video workloads.`
      if (!phone.fast_charging_w || phone.fast_charging_w < 18)
        return `Slow charging is the clearest budget compromise — expect 90 minutes or more for a full charge.`
      return `Budget hardware means some flagship features are absent — verify the specific trade-offs that matter before buying.`

    case 'lightweight':
      if (phone.battery_capacity && phone.battery_capacity < 4000)
        return `The slim chassis limits battery to ${phone.battery_capacity.toLocaleString()}mAh — heavy users may need a mid-day top-up.`
      return `Lightweight design can mean thinner materials and a smaller cell — check independent hands-on reviews for long-term build quality.`

    case 'compact-phones':
      if (phone.battery_capacity && phone.battery_capacity < 3800)
        return `Compact dimensions limit battery to ${phone.battery_capacity.toLocaleString()}mAh — not ideal for power users.`
      return `The small screen is the defining trade-off — if you consume a lot of video, consider whether 6.3" is sufficient.`

    case 'fast-charging':
      if (phone.battery_capacity && phone.battery_capacity < 4500)
        return `${phone.battery_capacity.toLocaleString()}mAh capacity means you will top up more frequently than peers with larger cells, despite the speed.`
      return `Fast charging standards typically require the bundled charger — third-party adapter compatibility is often limited.`

    default:
      return `$${phone.price_usd?.toLocaleString() ?? '---'} — verify competitors before committing.`
  }
}

function getCategoryReason(
  slug: string,
  phone: Phone & { category_score: number },
  rank: number,
): string {
  const prefix = rank === 2 ? 'Runner-up by a narrow margin.' : 'A strong contender in this category.'

  switch (slug) {
    case 'camera-phones':
      return `${prefix} ${phone.main_camera_mp ?? '---'}MP main with ${phone.chipset_tier ?? 'flagship'} tier processing. ${phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh lasts through a full day of heavy camera use.` : ''}`

    case 'battery-life':
      return `${prefix} ${phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh` : '---'} keeps you unplugged through even the longest days. ${phone.fast_charging_w ? `${phone.fast_charging_w}W charging tops it up quickly when needed.` : ''}`

    case 'gaming-phones':
      return `${prefix} ${phone.antutu_score ? `${phone.antutu_score.toLocaleString()} AnTuTu` : '---'} with ${phone.chipset ?? 'a capable SoC'}. ${phone.ram_options?.length ? `Up to ${Math.max(...phone.ram_options!)}GB RAM keeps sessions smooth.` : ''}`

    case 'under-300':
    case 'under-500':
      return `${prefix} $${phone.price_usd?.toLocaleString() ?? '---'} with ${phone.main_camera_mp ?? '---'}MP camera and ${phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh` : '---'} battery. Exceptional specs-per-dollar ratio.`

    case 'lightweight':
      return `${prefix} ${phone.weight_g ? `${phone.weight_g}g` : '---'} — barely noticeable in a pocket or bag. ${phone.chipset ? `${phone.chipset} keeps it responsive throughout.` : ''}`

    case 'compact-phones':
      return `${prefix} ${phone.screen_size ? `${phone.screen_size}"` : '---'} screen with ${phone.antutu_score ? `${(phone.antutu_score / 1_000_000).toFixed(1)}M AnTuTu` : 'solid performance'}. Fits in any pocket without compromise.`

    case 'fast-charging':
      return `${prefix} ${phone.fast_charging_w ? `${phone.fast_charging_w}W` : '---'} wired charging. ${phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh` : ''} — never waiting long for a top-up.`

    default:
      return `${prefix} ${phone.main_camera_mp ?? '---'}MP camera, ${phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh` : '---'} battery, and ${phone.chipset ?? 'capable hardware'}.`
  }
}

// ─── rank card: gold (#1) ─────────────────────────────────────────────────────

function RankCardGold({
  phone, score, rank, config, slug, onCompare, isCompared,
}: {
  phone: Phone & { category_score: number }
  score: number
  rank: number
  config: typeof CATEGORY_CONFIG[string]
  slug: string
  onCompare: (p: Phone) => void
  isCompared: boolean
}) {
  const router    = useRouter()
  const whyPoints = getCategoryWhyPoints(slug, phone)
  const tradeOff  = getCategoryTradeOff(slug, phone)

  return (
    <div className="rank-card-gold" style={{
      background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)',
      overflow: 'hidden', marginBottom: 16, transition: 'all 0.15s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none'
        ;(e.currentTarget as HTMLElement).style.borderColor = c.border
      }}
    >
      <div className="rank-card-gold-top" style={{
        background: 'linear-gradient(135deg, #1A1A2E 0%, #2A2A4E 100%)',
        padding: '28px 32px', display: 'grid', gridTemplateColumns: 'auto 1fr auto',
        gap: 28, alignItems: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(201,168,76,0.2)', border: '2px solid #C9A84C',
          }}>
            <MedalGold />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.4)' }}>
            #{rank}
          </span>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', background: 'rgba(230,57,70,0.2)',
            border: '1px solid rgba(230,57,70,0.3)', borderRadius: 'var(--r-full)',
            fontSize: 11, fontWeight: 700, color: '#FF8088', textTransform: 'uppercase', letterSpacing: '0.5px',
            marginBottom: 8,
          }}>
            <Star size={10} fill="#FF8088" color="#FF8088" />
            Best {config.title.split(' ')[1]} Phone
          </div>
          <div className="rank-gold-name" style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: '#fff', letterSpacing: '-0.5px', marginBottom: 4 }}>
            {phone.model_name}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
            {phone.brand} &middot; {phone.chipset_tier ?? 'Flagship'} &middot; {phone.release_year}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {phone.main_camera_mp && (
              <span style={{ padding: '4px 10px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                {phone.main_camera_mp}MP main
              </span>
            )}
            {phone.battery_capacity && (
              <span style={{ padding: '4px 10px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                {phone.battery_capacity.toLocaleString()}mAh
              </span>
            )}
            {phone.chipset && (
              <span style={{ padding: '4px 10px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500, background: 'rgba(230,57,70,0.2)', color: '#FF8088' }}>
                {phone.chipset}
              </span>
            )}
            {phone.fast_charging_w && (
              <span style={{ padding: '4px 10px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                {phone.fast_charging_w}W charging
              </span>
            )}
          </div>
        </div>

        <div className="rank-score-block" style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 52, color: '#C9A84C', lineHeight: 1, letterSpacing: '-2px' }}>
            {score.toFixed(1)}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {config.title.split(' ').slice(1, 3).join(' ')} Score
          </div>
          <div style={{ marginTop: 8, width: 60, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, background: '#C9A84C', width: `${(score / 10) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="rank-card-gold-body" style={{
        padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
        borderTop: `1px solid ${c.border}`,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3, marginBottom: 10 }}>
            Why #{rank}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {whyPoints.map((pt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: c.text2, lineHeight: 1.5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, marginTop: 7 }} />
                <span><strong>{pt.bold}</strong>{' '}{pt.rest}</span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 10, padding: '10px 12px', background: 'rgba(231,111,81,0.06)',
            border: '1px solid rgba(231,111,81,0.12)', borderRadius: 'var(--r-sm)',
            fontSize: 13, color: 'var(--orange)', display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Trade-off:</strong> {tradeOff}</span>
          </div>
        </div>

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Main Camera', val: phone.main_camera_mp ? `${phone.main_camera_mp} MP` : '---',              highlight: true  },
              { label: 'Battery',     val: phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()} mAh` : '---', highlight: true  },
              { label: 'Chipset',     val: phone.chipset ?? '---',                                                    highlight: false },
              { label: 'RAM',         val: phone.ram_options ? `${Math.max(...phone.ram_options)}GB max` : '---',     highlight: false },
              { label: 'Screen',      val: phone.screen_size ? `${phone.screen_size}"` : '---',                       highlight: true  },
              { label: 'Weight',      val: phone.weight_g ? `${phone.weight_g}g` : '---',                             highlight: false },
            ].map((spec, i) => (
              <div key={i} style={{ padding: '10px 12px', background: c.bg, borderRadius: 'var(--r-sm)' }}>
                <div style={{ fontSize: 11, color: c.text3, marginBottom: 3 }}>{spec.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: spec.highlight ? 'var(--accent)' : c.text1 }}>
                  {spec.val}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rank-card-gold-footer" style={{
        padding: '16px 32px', borderTop: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <button
          onClick={() => router.push(ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone)))}
          style={{
            padding: '9px 22px', background: c.primary, color: '#fff',
            borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 600,
            transition: 'all 0.15s', cursor: 'pointer', border: 'none',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
        >
          View Full Specs <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
        </button>
        <button
          onClick={() => onCompare(phone)}
          style={{
            padding: '9px 22px', border: `1px solid ${c.border}`,
            color: c.text2, borderRadius: 'var(--r-full)',
            fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
            cursor: 'pointer', background: 'transparent',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
        >
          {isCompared ? '✓ In Compare' : '+ Add to Compare'}
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 600, color: c.text1 }}>
          {phone.price_usd ? `$${phone.price_usd.toLocaleString()}` : 'Price TBA'}
        </span>
      </div>
    </div>
  )
}

// ─── rank card: silver/bronze (#2, #3) ────────────────────────────────────────

function RankCardMedium({
  phone, score, rank, medalColor, slug, onCompare, isCompared,
}: {
  phone: Phone & { category_score: number }
  score: number
  rank: number
  medalColor: string
  slug: string
  onCompare: (p: Phone) => void
  isCompared: boolean
}) {
  const router = useRouter()
  const reason = getCategoryReason(slug, phone, rank)

  return (
    <div className="rank-card-medium" style={{
      background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)',
      padding: '24px 28px', marginBottom: 16, transition: 'all 0.15s',
      display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24, alignItems: 'start',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none'
        ;(e.currentTarget as HTMLElement).style.borderColor = c.border
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, paddingTop: 2 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${medalColor}1E`, border: `2px solid ${medalColor}`,
        }}>
          {rank === 2 ? <MedalSilver /> : <MedalBronze />}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: c.text3 }}>#{rank}</span>
      </div>

      <div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: c.text1, marginBottom: 2, letterSpacing: '-0.3px' }}>
          {phone.model_name}
        </div>
        <div style={{ fontSize: 13, color: c.text3, marginBottom: 10 }}>
          {phone.brand} &middot; {phone.chipset_tier ?? 'Flagship'} &middot; {phone.release_year}
        </div>
        <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, marginBottom: 10, maxWidth: 520 }}>
          {reason}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {phone.main_camera_mp && (
            <span style={{ padding: '4px 10px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', fontSize: 12, color: c.text2 }}>
              {phone.main_camera_mp}MP main
            </span>
          )}
          {phone.battery_capacity && (
            <span style={{ padding: '4px 10px', background: 'var(--green-light)', border: '1px solid rgba(45,106,79,0.15)', borderRadius: 'var(--r-full)', fontSize: 12, color: 'var(--green)' }}>
              {phone.battery_capacity.toLocaleString()}mAh
            </span>
          )}
          {phone.chipset && (
            <span style={{ padding: '4px 10px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', fontSize: 12, color: c.text2 }}>
              {phone.chipset}
            </span>
          )}
          {phone.fast_charging_w && (
            <span style={{ padding: '4px 10px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', fontSize: 12, color: c.text2 }}>
              {phone.fast_charging_w}W charging
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => router.push(ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone)))}
            style={{
              padding: '7px 18px', background: c.primary, color: '#fff',
              borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
          >
            View Full Specs
          </button>
          <button
            onClick={() => onCompare(phone)}
            style={{
              padding: '7px 18px', border: `1px solid ${c.border}`,
              color: c.text2, borderRadius: 'var(--r-full)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: 'transparent', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
          >
            {isCompared ? '✓ In Compare' : '+ Compare'}
          </button>
        </div>
      </div>

      <div className="rank-med-right" style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 38, letterSpacing: '-1px', lineHeight: 1, color: medalColor }}>
          {score.toFixed(1)}
        </div>
        <div style={{ fontSize: 11, color: c.text3, marginBottom: 8 }}>Score</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: c.text1, marginTop: 8 }}>
          {phone.price_usd ? `$${phone.price_usd.toLocaleString()}` : '---'}
        </div>
      </div>
    </div>
  )
}

// ─── rank card: compact (#4–10) ───────────────────────────────────────────────

function RankCardCompact({
  phone, score, rank, onCompare, isCompared,
}: {
  phone: Phone & { category_score: number }
  score: number
  rank: number
  onCompare: (p: Phone) => void
  isCompared: boolean
}) {
  const router = useRouter()
  return (
    <div className="rank-card-compact"
      onClick={() => router.push(ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone)))}
      style={{
        background: c.surface, border: '1px solid var(--border)', borderTop: 'none',
        padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 20,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(26,26,46,0.02)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.surface }}
    >
      <div style={{ width: 28, flexShrink: 0, fontSize: 14, fontWeight: 700, color: c.text3, textAlign: 'center' }}>
        #{rank}
      </div>
      <div style={{
        width: 44, height: 44, background: c.bg, borderRadius: 'var(--r-sm)',
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {phone.main_image_url
          ? <img src={phone.main_image_url} alt={phone.model_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <Smartphone size={20} color={c.border} strokeWidth={1.2} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: c.text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {phone.model_name}
        </div>
        <div style={{ fontSize: 12, color: c.text3, marginTop: 2 }}>
          {phone.brand} &middot; {phone.main_camera_mp ? `${phone.main_camera_mp}MP` : '---'} &middot; {phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh` : '---'}
        </div>
      </div>
      <div className="compact-score" style={{ fontSize: 15, fontWeight: 700, color: c.text2, flexShrink: 0, minWidth: 40, textAlign: 'right' }}>
        {score.toFixed(1)}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: c.text1, flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
        {phone.price_usd ? `$${phone.price_usd.toLocaleString()}` : '---'}
      </div>
      <div style={{ flexShrink: 0, color: c.border }} className="compact-arrow">
        <ChevronRight size={16} />
      </div>
    </div>
  )
}

// ─── methodology box (props-driven — no internal open state) ──────────────────

function MethodologyBox({
  config,
  open,
  onToggle,
}: {
  config: typeof CATEGORY_CONFIG[string]
  open: boolean
  onToggle: () => void
}) {
  return (
    <div style={{
      marginTop: 48, background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
    }}>
      <div
        onClick={onToggle}
        style={{
          padding: '20px 28px', borderBottom: open ? `1px solid ${c.border}` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BarChart3 size={18} color={c.text2} />
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: c.text1 }}>
            How We Rank {config.title.split(' ').slice(1, 3).join(' ')}
          </span>
          <span style={{
            padding: '3px 10px', background: c.bg,
            border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)',
            fontSize: 11, fontWeight: 600, color: c.text3,
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            Transparent scoring
          </span>
        </div>
        <ChevronDown
          size={16}
          color={c.text3}
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        />
      </div>

      {open && (
        <div style={{ padding: 28 }}>
          <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.7, marginBottom: 24, maxWidth: 640 }}>
            Our {config.title.split(' ').slice(1, 3).join(' ').toLowerCase()} score is computed automatically from each phone's hardware specifications. We don't factor in real-world test results — this is a pure spec-based ranking. Scores are relative: the highest-scoring phone in each run gets normalised to 10, all others are scored against it.
          </p>
          <div className="methodology-weights" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {config.weights.map((w, i) => (
              <div key={i} style={{ padding: '14px 16px', background: c.bg, borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: c.text2, marginBottom: 6 }}>{w.label}</div>
                <div style={{ height: 4, background: c.border, borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: 'var(--accent)', width: `${w.pct}%`, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: c.text3 }}>{w.pct}% weight</div>
              </div>
            ))}
          </div>
          <div style={{
            padding: '12px 16px', background: 'var(--blue-light)',
            border: '1px solid rgba(69,123,157,0.12)', borderRadius: 'var(--r-sm)',
            fontSize: 13, color: c.text2, lineHeight: 1.6,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <Info size={16} style={{ flexShrink: 0, color: 'var(--blue)', marginTop: 1 }} />
            <span><strong>Important:</strong> This ranking reflects hardware specs only. Real-world performance doesn't always align with spec scores — especially for camera quality. We're transparent about this. No brand sponsors these rankings.</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── other categories ─────────────────────────────────────────────────────────

function OtherCategories({ currentSlug }: { currentSlug: string }) {
  const router = useRouter()
  const cats   = ALL_CATEGORIES.filter(c => c.slug !== currentSlug)

  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, color: c.text1, marginBottom: 6 }}>More Rankings</h2>
      <p style={{ fontSize: 14, color: c.text3, marginBottom: 20 }}>Every ranking auto-updates from live data.</p>
      <div className="other-cats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {cats.map(cat => (
          <div
            key={cat.slug}
            onClick={() => router.push(ROUTES.category(cat.slug))}
            style={{
              background: c.surface, border: `1px solid ${c.border}`,
              borderRadius: 'var(--r-md)', padding: '20px 18px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'
              ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = c.border
              ;(e.currentTarget as HTMLElement).style.transform = 'none'
              ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
            }}
          >
            <div style={{ color: c.text2, marginBottom: 10 }}>{cat.icon}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: c.text1, marginBottom: 4 }}>
              {CATEGORY_CONFIG[cat.slug]?.title.split(' ').slice(0, -1).join(' ') ?? cat.label}
            </div>
            <div style={{ fontSize: 12, color: c.text3, lineHeight: 1.5, marginBottom: 12 }}>
              {CATEGORY_CONFIG[cat.slug]?.desc.slice(0, 60) ?? ''}...
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
              View ranking &rarr;
            </div>
          </div>
        ))}

        <div
          onClick={() => router.push(ROUTES.pick)}
          style={{
            background: c.primary, border: `1px solid ${c.primary}`,
            borderRadius: 'var(--r-md)', padding: '20px 18px',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
            ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.transform = 'none'
            ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
            <Crosshair size={18} strokeWidth={1.5} />
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: '#fff', marginBottom: 4 }}>
            Help Me Choose
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 12 }}>
            Tell us your budget and priorities. We pick your top 5 in 30 seconds.
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
            Try it &rarr;
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── main content ─────────────────────────────────────────────────────────────

function CategoryPageContent() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const slug = params?.category as string

  const [data, setData]                 = useState<CategoryResult | null>(null)
  const [loading, setLoading]           = useState(true)
  const [comparePhones, setComparePhones] = useState<Phone[]>([])
  const [methodOpen, setMethodOpen]     = useState(false)

  const config = CATEGORY_CONFIG[slug] ?? CATEGORY_CONFIG['camera-phones']

  const fetchCategory = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const result = await api.categories.get(slug, 10)
      setData(result)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchCategory() }, [fetchCategory])

  const handleCompare = (phone: Phone) => {
    setComparePhones(prev => {
      if (prev.find(p => p.id === phone.id)) {
        toast('Removed from compare', 'info')
        return prev.filter(p => p.id !== phone.id)
      }
      if (prev.length >= MAX_COMPARE) {
        toast(`Maximum ${MAX_COMPARE} phones in compare`, 'error')
        return prev
      }
      toast('Added to compare', 'success')
      return [...prev, phone]
    })
  }

  const compareIds = comparePhones.map(p => p.id)
  const top3       = data?.phones.slice(0, 3) ?? []
  const rest       = data?.phones.slice(3) ?? []

  // Replace hardcoded year with the most recent release year in the fetched data
  const latestYear    = data?.phones.reduce((max, p) => Math.max(max, p.release_year ?? 0), 0) || new Date().getFullYear()
  const displayConfig = { ...config, title: config.title.replace(/\d{4}/, String(latestYear)) }

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar
        compareCount={comparePhones.length}
        onOpenCompare={() => comparePhones.length >= 2 && router.push(ROUTES.compare(...comparePhones.map(p => phoneSlug(p))))}
      />

      <div className="category-container" style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 80px' }}>
        {/* Breadcrumb */}
        <nav style={{ padding: '16px 0 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: c.text2, transition: 'color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.text1 }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text2 }}
          >
            Home
          </Link>
          <ChevronRight size={12} color={c.text3} />
          <Link href="/best" style={{ color: c.text2, transition: 'color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.text1 }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text2 }}
          >
            Best Of
          </Link>
          <ChevronRight size={12} color={c.text3} />
          <span>{displayConfig.title}</span>
        </nav>

        {/* Category tabs */}
        <div className="category-tabs" style={{ marginTop: 24, overflowX: 'auto', scrollbarWidth: 'none', borderBottom: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', gap: 0, minWidth: 'max-content' }}>
            {ALL_CATEGORIES.map(cat => {
              const active = cat.slug === slug
              return (
                <Link
                  key={cat.slug}
                  href={ROUTES.category(cat.slug)}
                  style={{
                    padding: '12px 18px', fontSize: 13, fontWeight: 500,
                    color: active ? c.text1 : c.text3, whiteSpace: 'nowrap',
                    borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 7,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = c.text1 }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = c.text3 }}
                >
                  <span style={{ color: active ? 'var(--accent)' : 'inherit', display: 'flex', alignItems: 'center' }}>
                    {cat.icon}
                  </span>
                  {cat.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Hero */}
        <div className="hero-section" style={{ padding: '36px 0 32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', background: 'var(--accent-light)',
              border: '1px solid var(--accent-border)', borderRadius: 'var(--r-full)',
              fontSize: 12, fontWeight: 600, color: 'var(--accent)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14,
            }}>
              <TrendingUp size={12} />
              Category Ranking
            </div>
            <h1 className="category-hero-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 44, color: c.text1, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 10 }}>
              {displayConfig.title}
            </h1>
            <p style={{ fontSize: 16, color: c.text2, lineHeight: 1.7, maxWidth: 560, marginBottom: 16 }}>
              {displayConfig.desc}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: c.text3 }}>
                <Clock size={14} color={c.text3} />
                Updated daily
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: c.text3 }}>
                <Smartphone size={14} color={c.text3} />
                <strong style={{ color: c.text2, fontWeight: 600 }}>10</strong>&nbsp;phones ranked
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: c.text3 }}>
                <Star size={14} color={c.text3} />
                2022+ releases only
              </span>
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
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 22px', background: c.primary,
                color: '#fff', borderRadius: 'var(--r-full)',
                fontSize: 14, fontWeight: 600, transition: 'all 0.15s',
                whiteSpace: 'nowrap', border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="8" height="18" rx="1"/><rect x="14" y="3" width="8" height="18" rx="1"/></svg>
              Compare Top 3
            </button>
          </div>
        </div>

        {/* Scoring pill — toggles the MethodologyBox below */}
        <div
          onClick={() => setMethodOpen(v => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', background: c.surface,
            border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)',
            fontSize: 13, color: c.text2, marginBottom: 32,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
        >
          <Info size={14} color={c.text3} />
          {displayConfig.scoring}
          <ChevronDown size={14} color={c.text3} style={{ transform: methodOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </div>

        {/* Rankings */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${c.border}`, borderTopColor: c.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14, color: c.text3 }}>Loading rankings...</p>
          </div>
        ) : !data || data.phones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Smartphone size={56} color={c.border} strokeWidth={1.5} style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: c.text1, marginBottom: 8 }}>No phones found</h3>
            <p style={{ fontSize: 14, color: c.text3 }}>This category doesn't have any ranked phones yet.</p>
          </div>
        ) : (
          <>
            {top3[0] && (
              <RankCardGold
                phone={top3[0]}
                score={top3[0].category_score}
                rank={1}
                config={displayConfig}
                slug={slug}
                onCompare={handleCompare}
                isCompared={compareIds.includes(top3[0].id)}
              />
            )}
            {top3[1] && (
              <RankCardMedium
                phone={top3[1]}
                score={top3[1].category_score}
                rank={2}
                medalColor="#8A9BB0"
                slug={slug}
                onCompare={handleCompare}
                isCompared={compareIds.includes(top3[1].id)}
              />
            )}
            {top3[2] && (
              <RankCardMedium
                phone={top3[2]}
                score={top3[2].category_score}
                rank={3}
                medalColor="#A0705A"
                slug={slug}
                onCompare={handleCompare}
                isCompared={compareIds.includes(top3[2].id)}
              />
            )}

            {rest.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 16px' }}>
                  <div style={{ flex: 1, height: 1, background: c.border }} />
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.text3, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                    Also worth considering
                  </div>
                  <div style={{ flex: 1, height: 1, background: c.border }} />
                </div>
                <div>
                  {rest.map((phone, i) => (
                    <RankCardCompact
                      key={phone.id}
                      phone={phone}
                      score={phone.category_score}
                      rank={i + 4}
                      onCompare={handleCompare}
                      isCompared={compareIds.includes(phone.id)}
                    />
                  ))}
                  <style>{`
                    .rank-card-compact:first-child { border-top: 1px solid var(--border) !important; border-radius: var(--r-md) var(--r-md) 0 0 !important; }
                    .rank-card-compact:last-child  { border-radius: 0 0 var(--r-md) var(--r-md) !important; }
                  `}</style>
                </div>
              </>
            )}
          </>
        )}

        {/* Methodology — controlled by scoring pill above */}
        <MethodologyBox
          config={displayConfig}
          open={methodOpen}
          onToggle={() => setMethodOpen(v => !v)}
        />

        <OtherCategories currentSlug={slug} />
      </div>

      <Footer />

      <CompareBar
        phones={comparePhones}
        onRemove={id => setComparePhones(prev => prev.filter(p => p.id !== id))}
        onClear={() => setComparePhones([])}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .category-container { max-width: 1400px; margin: 0 auto; padding: 0 24px 80px; }
        .category-hero-title { font-size: 44px; }
        .hero-section { padding: 36px 0 32px; display: flex; align-items: flex-start; justify-content: space-between; gap: 32px; }
        .rank-card-gold-top { padding: 28px 32px; grid-template-columns: auto 1fr auto; gap: 28px; }
        .rank-card-gold-body { padding: 24px 32px; grid-template-columns: 1fr 1fr; gap: 24px; }
        .rank-card-gold-footer { padding: 16px 32px; }
        .rank-card-medium { padding: 24px 28px; grid-template-columns: auto 1fr auto; gap: 24px; }
        .rank-card-compact { padding: 16px 24px; gap: 20px; }
        .other-cats-grid { grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .methodology-weights { grid-template-columns: repeat(3, 1fr); }

        @media (max-width: 1023px) {
          .category-container { padding: 0 20px 60px; }
          .category-hero-title { font-size: 36px; }
          .hero-section { padding: 28px 0 24px; gap: 24px; }
          .rank-card-gold-top { padding: 24px; grid-template-columns: auto 1fr; gap: 20px; }
          .rank-score-block { display: none !important; }
          .rank-card-gold-body { padding: 20px; grid-template-columns: 1fr; gap: 20px; }
          .rank-card-gold-footer { padding: 14px 24px; flex-wrap: wrap; }
          .rank-card-medium { padding: 20px; grid-template-columns: auto 1fr; gap: 20px; }
          .rank-med-right { display: none !important; }
          .rank-card-compact { padding: 14px 20px; gap: 16px; }
          .compact-score { display: none !important; }
          .other-cats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .methodology-weights { grid-template-columns: repeat(2, 1fr) !important; }
        }

        @media (max-width: 767px) {
          .category-container { padding: 0 16px 40px; }
          .category-hero-title { font-size: 28px !important; }
          .hero-section { padding: 20px 0 16px; flex-direction: column; gap: 16px; }
          .rank-card-gold-top { padding: 20px 16px; grid-template-columns: 1fr !important; text-align: center; }
          .rank-card-gold-top > div:first-child { align-items: center; margin: 0 auto 12px; }
          .rank-card-gold-top > div:nth-child(2) { text-align: center; }
          .rank-card-gold-body { padding: 16px; grid-template-columns: 1fr !important; }
          .rank-card-gold-footer { padding: 12px 16px; flex-direction: column; align-items: stretch; }
          .rank-card-gold-footer > span { margin-left: 0 !important; margin-top: 4px; text-align: center; }
          .rank-card-medium { padding: 16px; grid-template-columns: 1fr !important; text-align: center; }
          .rank-card-medium > div:first-child { margin: 0 auto 12px; align-items: center; }
          .rank-card-medium > div:nth-child(2) { display: flex; flex-direction: column; align-items: center; }
          .rank-card-compact { padding: 12px 14px; gap: 12px; flex-wrap: wrap; }
          .compact-arrow { display: none; }
          .other-cats-grid { grid-template-columns: 1fr !important; gap: 8px !important; }
          .methodology-weights { grid-template-columns: 1fr !important; }
          .category-tabs { margin-top: 16px; }
        }
      `}</style>
    </div>
  )
}

export default function CategoryPage() {
  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <CategoryPageContent />
      </Suspense>
    </ToastProvider>
  )
}
