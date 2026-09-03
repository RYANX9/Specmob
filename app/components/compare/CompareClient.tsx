// app/components/compare/CompareClient.tsx
'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search, X, Plus, Star, Share2, RotateCcw, ArrowRight, Check,
  Loader2, AlertCircle, Smartphone, Camera, Battery, Zap,
  Monitor, Trophy, BadgeDollarSign, HardHat,
} from 'lucide-react'
import { c, f, r, z } from '@/lib/tokens'
import { ROUTES, brandSlug, phoneSlug, MAX_COMPARE } from '@/lib/config'
import { api } from '@/lib/api'
import { getChipsetTierLabel, getTierStyle } from '@/lib/tiers'
import Navbar from '../Navbar'
import Footer from '../Footer'
import { useToast } from '../Toast'
import type { Phone, CompareVerdict } from '@/lib/types'
import { formatDisplayPrice } from '@/lib/price'
import { specComposite, resolveValueScore } from '@/lib/valueScore'

import { fmt, SPEC_SECTIONS, type SpecSectionDef } from '@/lib/compare/specSections'
import { VERDICTS, getBestIdx, type VerdictItem } from '@/lib/compare/verdictConfig'

import AdSlot from '@/app/components/ads/AdSlot'

const VERDICT_ICONS: Record<VerdictItem['iconKey'], React.ReactNode> = {
  camera:      <Camera size={16} strokeWidth={1.5} />,
  battery:     <Battery size={16} strokeWidth={1.5} />,
  charging:    <Zap size={16} strokeWidth={1.5} />,
  performance: <Zap size={16} strokeWidth={1.5} />,
  display:     <Monitor size={16} strokeWidth={1.5} />,
  weight:      <Smartphone size={16} strokeWidth={1.5} />,
  value:       <BadgeDollarSign size={16} strokeWidth={1.5} />,
}

const SECTION_ICONS: Record<SpecSectionDef['iconKey'], React.ReactNode> = {
  display:     <Monitor size={15} strokeWidth={1.5} />,
  camera:      <Camera size={15} strokeWidth={1.5} />,
  performance: <Zap size={15} strokeWidth={1.5} />,
  battery:     <Battery size={15} strokeWidth={1.5} />,
  build:       <HardHat size={15} strokeWidth={1.5} />,
}

function shortModelName(p: Phone): string {
  const brand = (p.brand || '').trim()
  const name  = (p.model_name || '').trim()
  if (!brand || !name) return name || '—'
  const re = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i')
  const stripped = name.replace(re, '').trim()
  return stripped || name
}

const MATCH_BORDER = '#C9D2F2'

function ScoreBadge({ score, label }: { score: number; label: string }) {
  return (
    <div
      title={label}
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        background: c.blueLight,
        border: `1px solid ${MATCH_BORDER}`,
        borderRadius: r.sm,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: c.blue, lineHeight: 1 }}>
        {score.toFixed(1)}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: c.blue, lineHeight: 1 }}>
        {label}
      </span>
    </div>
  )
}

// ─── phone column ────────────────────────────────────────────────────────

function PhoneColumn({ phone, onRemove, isWinner }: { phone: Phone; onRemove: () => void; isWinner: boolean }) {
  const [imgErr, setImgErr] = useState(false)
  const tier = getTierStyle(phone.chipset_tier)
  const { score: displayScore, isEstimate } = resolveValueScore(phone)
  const isAmazon = !!phone.amazon_link && phone.amazon_link.includes('amazon.')

  return (
    <div style={{
      position: 'relative',
      minWidth: 0,
      boxSizing: 'border-box',
      background: isWinner ? 'linear-gradient(180deg,rgba(230,57,70,0.04) 0%,var(--surface) 100%)' : c.surface,
      border: `2px solid ${isWinner ? c.accent : c.border}`,
      borderRadius: r.lg, padding: '20px 14px', textAlign: 'center',
      transition: 'all 0.15s',
    }}>
      {isWinner && (
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          background: c.accent, color: '#fff', fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.5px',
          padding: '3px 10px', borderRadius: r.full,
          display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        }}>
          <Star size={9} fill="white" /> Our Pick
        </div>
      )}

      <button
        onClick={onRemove}
        aria-label={`Remove ${phone.model_name}`}
        style={{
          position: 'absolute', top: 8, right: 8, width: 26, height: 26,
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: c.text3, transition: 'all 0.15s', background: 'transparent', border: 'none', cursor: 'pointer',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(230,57,70,0.08)'; (e.currentTarget as HTMLElement).style.color = c.accent }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = c.text3 }}
      >
        <X size={13} />
      </button>

      <Link href={ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}>
        <div style={{ width: 88, height: 88, margin: '6px auto 14px', background: c.bg, borderRadius: r.md, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {phone.main_image_url && !imgErr
            ? <img src={phone.main_image_url} alt={phone.model_name} loading="lazy" decoding="async" onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <Smartphone size={32} color={c.border} />}
        </div>
        <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3, marginBottom: 3 }}>
          {phone.brand}
        </p>
        <p style={{ fontFamily: f.serif, fontSize: 15, color: c.text1, marginBottom: 8, lineHeight: 1.3 }}>
          {phone.model_name}
        </p>
      </Link>

      <p style={{ fontSize: 18, fontWeight: 700, color: c.text1, marginBottom: 12 }}>{formatDisplayPrice(phone)}</p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <ScoreBadge score={displayScore} label={isEstimate ? '~ Value' : 'Value'} />
        {tier && (
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: r.full, color: tier.color, background: tier.bg, whiteSpace: 'nowrap' }}>
            {tier.label}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
        {phone.amazon_link && (
          <a
            href={phone.amazon_link}
            target="_blank"
            rel={isAmazon ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
            style={{ flex: 1, minWidth: 0, padding: '9px 0', borderRadius: r.full, fontSize: 12, fontWeight: 700, background: c.primary, color: '#fff', textDecoration: 'none', transition: 'background 0.15s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
          >
            Buy Now
          </a>
        )}
        <Link
          href={ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}
          style={{ flex: 1, minWidth: 0, padding: '9px 0', borderRadius: r.full, fontSize: 12, fontWeight: 600, color: c.text2, border: `1px solid ${c.border}`, transition: 'all 0.15s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
        >
          Details
        </Link>
      </div>
    </div>
  )
}

// ─── shared search box ─────────────────────────────────────────────────────
// One search implementation, two call sites: the always-visible empty-state
// search and the click-to-reveal grid slot (AddPhoneSlot). Extracted so the
// query/debounce/result-rendering logic exists exactly once — previously
// this whole block was duplicated inline inside AddPhoneSlot with no way to
// reuse it for the empty state without a second copy.

function PhoneSearchBox({
  onSelect, excludeIds, autoFocus, placeholder = 'Search for a phone...',
}: {
  onSelect: (p: Phone) => void
  excludeIds: number[]
  autoFocus?: boolean
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Phone[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (query.length < 2) { setResults([]); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await api.phones.search({ q: query, page_size: 8 })
        setResults(res.results.filter(p => !excludeIds.includes(p.id)))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [query, excludeIds.join(',')])

  const showDropdown = loading || results.length > 0 || query.length >= 2

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: c.text3, pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label="Search for a phone to add"
          style={{ width: '100%', height: 46, padding: '0 14px 0 38px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.full, fontSize: 14, color: c.text1 }}
        />
      </div>

      {showDropdown && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2, background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md, overflow: 'hidden', textAlign: 'left' }}>
          {loading && results.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0', gap: 8, color: c.text3, fontSize: 13 }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Searching...
            </div>
          )}

          {!loading && results.length === 0 && query.length >= 2 && (
            <p style={{ fontSize: 12, color: c.text3, textAlign: 'center', padding: '14px 0' }}>No phones found for "{query}"</p>
          )}

          {results.map(p => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); setQuery(''); setResults([]) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', textAlign: 'left', transition: 'background 0.1s', cursor: 'pointer', background: 'transparent', border: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = c.bg }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div style={{ width: 34, height: 34, background: c.bg, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {p.main_image_url && <img src={p.main_image_url} alt="" loading="lazy" decoding="async" style={{ width: 26, height: 26, objectFit: 'contain' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: c.text1 }}>{p.model_name}</p>
                <p style={{ fontSize: 11, color: c.text3 }}>
                  {p.brand}{formatDisplayPrice(p) !== 'Price TBA' ? ` · ${formatDisplayPrice(p)}` : ''}
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: c.primary, border: `1px solid ${c.border}`, borderRadius: r.full, padding: '3px 10px', flexShrink: 0 }}>+ Add</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── add phone slot ────────────────────────────────────────────────────────
// Click-to-reveal is correct here specifically: this card sits inside a
// populated grid of phone columns and must render as a matching dashed
// placeholder until touched. That constraint doesn't apply to the empty
// page state, which has no siblings to visually match — see
// PhoneSearchBox usage in the empty-state block below.

function AddPhoneSlot({ onSelect, excludeIds }: { onSelect: (p: Phone) => void; excludeIds: number[] }) {
  const [open, setOpen] = useState(false)

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={{
        width: '100%', minWidth: 0, boxSizing: 'border-box', minHeight: 240, borderRadius: r.lg,
        border: `2px dashed ${c.border}`, background: 'transparent',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 8, color: c.text3, transition: 'all 0.15s', cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text3 }}
    >
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: c.surface, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Plus size={18} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Add phone</span>
      <span style={{ fontSize: 11, color: c.text3 }}>Up to {MAX_COMPARE} total</span>
    </button>
  )

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', minHeight: 240, borderRadius: r.lg, border: `1px solid ${c.primary}`, background: 'rgba(26,26,46,0.02)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: c.primary }}>Search phone</span>
        <button onClick={() => setOpen(false)} aria-label="Close search" style={{ color: c.text3, display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={13} />
        </button>
      </div>
      <PhoneSearchBox
        onSelect={p => { onSelect(p); setOpen(false) }}
        excludeIds={excludeIds}
        autoFocus
        placeholder="Type phone name..."
      />
    </div>
  )
}

// ─── suggested comparisons — empty-state discovery for people who don't have
// two specific phones in mind yet. Pairs come from page.tsx (trending-derived). ──

function SuggestedComparisons({ pairs }: { pairs: Phone[][] }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: c.border }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: c.text3, textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>
          Or jump into a popular comparison
        </span>
        <div style={{ flex: 1, height: 1, background: c.border }} />
      </div>
      <div className="suggested-pairs-grid" style={{ display: 'grid', gap: 12 }}>
        {pairs.map(pair => (
          <Link
            key={pair.map(p => p.id).join('-')}
            href={ROUTES.compare(...pair.map(phoneSlug))}
            style={{
              display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 16px',
              background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.lg,
              textDecoration: 'none', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = c.primary
              el.style.transform = 'translateY(-2px)'
              el.style.boxShadow = 'var(--shadow-sm)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = c.border
              el.style.transform = 'none'
              el.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {pair.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 44, height: 44, background: c.bg, borderRadius: r.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {p.main_image_url
                      ? <img src={p.main_image_url} alt="" loading="lazy" decoding="async" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                      : <Smartphone size={18} color={c.border} />}
                  </div>
                  {i < pair.length - 1 && <span style={{ fontSize: 11, fontWeight: 700, color: c.accent }}>vs</span>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: c.text1, textAlign: 'center', lineHeight: 1.4 }}>
              {pair.map(p => p.model_name).join(' vs ')}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── verdict hero — the answer, stated once, up front ────────────────────────

function VerdictHero({ phones, verdict }: { phones: Phone[]; verdict: CompareVerdict | null }) {
  const scored  = phones.map(p => ({ phone: p, score: resolveValueScore(p).score }))
  const ranked  = [...scored].sort((a, b) => b.score - a.score)
  const winner  = ranked[0].phone
  const gap     = ranked.length > 1 ? ranked[0].score - ranked[1].score : 0
  const isClose = gap < 0.3

  const cheapest = phones.reduce((a, b) => (a.price_usd ?? Infinity) < (b.price_usd ?? Infinity) ? a : b)
  const others    = phones.filter(p => p.id !== winner.id)
  const priceDiff = cheapest.id !== winner.id && winner.price_usd != null && cheapest.price_usd != null
    ? winner.price_usd - cheapest.price_usd
    : 0

  const wonCategories = VERDICTS.filter(v => {
    const idx = getBestIdx(phones, v.getter, v.lower)
    return idx >= 0 && phones[idx].id === winner.id
  })

  const isAmazon = !!winner.amazon_link && winner.amazon_link.includes('amazon.')

  return (
    <section style={{
      position: 'relative', overflow: 'hidden', background: c.primary,
      borderRadius: r.xl, padding: '32px 32px 28px', marginBottom: 28,
    }}>
      <div style={{
        position: 'absolute', right: -70, top: -80, width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(230,57,70,0.18), transparent 70%)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Trophy size={15} color="#F0A8AC" />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)' }}>
          {isClose ? "It's close, but here's our pick" : 'Our verdict'}
        </span>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ fontFamily: f.serif, fontSize: 'clamp(24px, 3.2vw, 32px)', color: '#fff', lineHeight: 1.15, letterSpacing: '-0.5px', marginBottom: 14, maxWidth: 520 }}>
            Get the <span style={{ color: '#F0A8AC' }}>{winner.model_name}</span>
            {others.length === 1 ? ` over the ${others[0].model_name}` : ''}.
          </h2>

          {verdict?.verdict ? (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, marginBottom: 16, maxWidth: 480 }}>
              {verdict.verdict}
            </p>
          ) : wonCategories.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxWidth: 480 }}>
              {wonCategories.slice(0, 3).map(v => {
                const idx = phones.findIndex(p => p.id === winner.id)
                const val = v.getter(phones[idx])
                return (
                  <div key={v.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Check size={15} color="#8FD9B0" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                      <strong style={{ color: '#fff' }}>Wins on {v.label.toLowerCase()}</strong> — {fmt(val, v.unit)}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, marginBottom: 16, maxWidth: 480 }}>
              Best overall specs-per-dollar of the phones you're comparing.
            </p>
          )}

          {priceDiff > 0 && (
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
              Costs {formatDisplayPrice({ ...winner, price_usd: priceDiff } as Phone)} more than the {cheapest.model_name} — worth it for what it wins on above.
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {winner.amazon_link ? (
              <a
                href={winner.amazon_link}
                target="_blank"
                rel={isAmazon ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 26px',
                  background: '#fff', color: c.primary, borderRadius: r.full, fontSize: 14, fontWeight: 700,
                  textDecoration: 'none', transition: 'transform 150ms ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none' }}
              >
                Buy the {winner.brand} {winner.model_name} <ArrowRight size={15} />
              </a>
            ) : (
              <Link
                href={ROUTES.phone(brandSlug(winner.brand), phoneSlug(winner))}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 26px',
                  background: '#fff', color: c.primary, borderRadius: r.full, fontSize: 14, fontWeight: 700,
                  textDecoration: 'none', transition: 'transform 150ms ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none' }}
              >
                View the {winner.model_name} <ArrowRight size={15} />
              </Link>
            )}
            <a
              href="#spec-table"
              onClick={e => {
                e.preventDefault()
                document.getElementById('spec-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                history.replaceState(null, '', '#spec-table')
              }}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '13px 20px', borderRadius: r.full, fontSize: 13.5, fontWeight: 600,
                color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.25)',
                background: 'transparent', cursor: 'pointer', transition: 'border-color 150ms ease',
                textDecoration: 'none',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)' }}
            >
              See the full comparison ↓
            </a>
          </div>
        </div>

        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{ width: 96, height: 96, margin: '0 auto 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: r.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {winner.main_image_url
              ? <img src={winner.main_image_url} alt={winner.model_name} style={{ width: '75%', height: '75%', objectFit: 'contain' }} />
              : <Smartphone size={34} color="rgba(255,255,255,0.3)" strokeWidth={1} />}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{formatDisplayPrice(winner)}</div>
        </div>
      </div>
    </section>
  )
}

// ─── category breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ phones }: { phones: Phone[] }) {
  const items = VERDICTS.map(v => {
    const bestIdx = getBestIdx(phones, v.getter, v.lower)
    const bestVal = bestIdx >= 0 ? v.getter(phones[bestIdx]) : null
    const isTie   = bestIdx === -1 && phones.some(p => v.getter(p) != null)
    return { ...v, bestIdx, bestVal, isTie }
  })

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, marginBottom: 18 }}>Category Breakdown</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }} className="verdict-grid">
        {items.map(item => {
          const winnerPhone = item.bestIdx >= 0 ? phones[item.bestIdx] : null
          return (
            <div key={item.label} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color: c.text2, display: 'flex' }}>{VERDICT_ICONS[item.iconKey]}</span>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3 }}>{item.label}</span>
              </div>
              <div style={{ fontFamily: f.serif, fontSize: 15, color: c.text1, marginBottom: 3 }}>
                {winnerPhone ? winnerPhone.model_name : item.isTie ? '≈ Tie' : '—'}
              </div>
              <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.4, marginBottom: 7 }}>
                {item.desc}{item.bestVal != null && ` (${fmt(item.bestVal, item.unit)})`}
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 8px', borderRadius: r.full, fontSize: 10, fontWeight: 600,
                ...(item.isTie
                  ? { background: 'var(--blue-light)', color: 'var(--blue)' }
                  : item.bestIdx >= 0
                    ? { background: 'var(--green-bg)', color: 'var(--green)' }
                    : { background: 'rgba(0,0,0,0.04)', color: c.text3 }),
              }}>
                {item.isTie ? '≈ Tie' : item.bestIdx >= 0 ? <><Check size={10} strokeWidth={3} /> Wins</> : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── spec table ───────────────────────────────────────────────────────────────

function SpecTable({ phones }: { phones: Phone[] }) {
  const LABEL_W = 100
  return (
    <section id="spec-table" style={{ marginBottom: 40, scrollMarginTop: 90 }}>
      <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, marginBottom: 18 }}>Full Spec Comparison</h2>
      <div style={{ overflowX: 'auto', borderRadius: r.md, border: `1px solid ${c.border}`, WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${LABEL_W + phones.length * 120}px`, tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th
                style={{
                  width: LABEL_W, minWidth: LABEL_W, maxWidth: LABEL_W,
                  padding: '12px 10px 12px 12px',
                  borderBottom: `2px solid ${c.border}`,
                  fontSize: 11, fontWeight: 600, color: c.text3, textAlign: 'left',
                  position: 'sticky', left: 0, zIndex: z.base + 2,
                  background: c.bg,
                  boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
                }}
              >
                Spec
              </th>
              {phones.map(p => (
                <th
                  key={p.id}
                  style={{
                    padding: '12px 12px',
                    borderBottom: `2px solid ${c.border}`,
                    borderLeft: `1px solid ${c.border}`,
                    textAlign: 'center',
                    fontFamily: f.serif,
                    fontSize: 13,
                    fontWeight: 600,
                    color: c.text1,
                    background: c.bg,
                    lineHeight: 1.3,
                  }}
                >
                  {shortModelName(p)}
                </th>
              ))}
            </tr>
          </thead>
          {SPEC_SECTIONS.map(section => (
            <tbody key={section.title}>
              <tr>
                <td colSpan={phones.length + 1} style={{ padding: '10px 12px 8px', background: c.bg, borderBottom: `2px solid ${c.border}`, borderTop: `1px solid ${c.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: c.text2, display: 'flex', alignItems: 'center' }}>{SECTION_ICONS[section.iconKey]}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: c.text1 }}>{section.title}</span>
                  </div>
                </td>
              </tr>
              {section.rows.map((row, rowIdx) => {
                const winIdx = row.getRaw ? getBestIdx(phones, row.getRaw, row.lower) : -1
                const isAlt  = rowIdx % 2 === 1
                return (
                  <tr key={row.label} style={{ background: isAlt ? 'rgba(248,248,245,0.5)' : 'transparent' }}>
                    <td style={{ width: LABEL_W, minWidth: LABEL_W, maxWidth: LABEL_W, padding: '10px 10px 10px 12px', borderBottom: `1px solid ${c.border}`, fontSize: 11, fontWeight: 500, color: c.text3, position: 'sticky', left: 0, zIndex: z.base + 1, background: isAlt ? '#f5f5f2' : c.surface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxShadow: '2px 0 4px rgba(0,0,0,0.04)' }}>
                      {row.label}
                    </td>
                    {phones.map((p, i) => {
                      const isWinner = winIdx === i && winIdx >= 0
                      const val      = row.getValue(p)
                      return (
                        <td key={p.id} style={{ padding: '10px 12px', borderBottom: `1px solid ${c.border}`, borderLeft: `1px solid ${c.border}`, textAlign: 'center', fontSize: 13, fontWeight: isWinner ? 700 : 400, color: isWinner ? c.text1 : c.text3, background: isWinner ? (isAlt ? 'rgba(31,122,86,0.07)' : 'rgba(31,122,86,0.05)') : 'transparent', position: 'relative', transition: 'background 0.15s', wordBreak: 'break-word' }}>
                          {isWinner && <span style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 3, background: 'var(--green)', borderRadius: 2 }} />}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, paddingLeft: isWinner ? 6 : 0 }}>
                            {val === '—' ? <span style={{ color: c.border }}>—</span> : val}
                            {isWinner && <Check size={12} color="var(--green)" strokeWidth={3} />}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  )
}

// ─── bottom line ──────────────────────────────────────────────────────────────

function BottomLine({ phones, verdict }: { phones: Phone[]; verdict: CompareVerdict | null }) {
  if (phones.length < 2) return null

  if (verdict?.picks?.length) {
    const byId = new Map(phones.map(p => [p.id, p]))
    const recs = verdict.picks
      .map(pick => ({ for: pick.for_label, phone: byId.get(pick.id), reason: pick.reason }))
      .filter((rec): rec is { for: string; phone: Phone; reason: string } => !!rec.phone)

    if (recs.length > 0) {
      return (
        <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.lg, padding: '28px 32px', textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, marginBottom: 6 }}>Who Each Phone Is Really For</h2>
          <p style={{ fontSize: 13, color: c.text3, marginBottom: 24 }}>If your priorities differ from the verdict above, start here.</p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(recs.length, 3)},1fr)`, gap: 12 }} className="bottom-recs">
            {recs.map(rec => (
              <div key={rec.for} style={{ padding: 16, background: c.bg, borderRadius: r.md, textAlign: 'left' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3, marginBottom: 6 }}>{rec.for}</div>
                <div style={{ fontFamily: f.serif, fontSize: 15, color: c.text1, marginBottom: 4 }}>{rec.phone.model_name}</div>
                <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.5 }}>{rec.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  const getScore = (p: Phone) => resolveValueScore(p).score
  const bestValue  = phones.reduce((a, b) => getScore(a) > getScore(b) ? a : b)
  const cheapest   = phones.reduce((a, b) => (a.price_usd ?? Infinity) < (b.price_usd ?? Infinity) ? a : b)
  const bestCamera = phones.reduce((a, b) => (a.main_camera_mp ?? 0) > (b.main_camera_mp ?? 0) ? a : b)
  const recs = [
    { for: 'Best overall value', phone: bestValue,  reason: 'Highest value score — most specs per dollar.' },
    { for: 'Budget pick',        phone: cheapest,   reason: 'Lowest price while still competitive.' },
    { for: 'Photography',        phone: bestCamera, reason: 'Highest resolution main camera.' },
  ]
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.lg, padding: '28px 32px', textAlign: 'center', marginBottom: 40 }}>
      <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, marginBottom: 6 }}>Who Each Phone Is Really For</h2>
      <p style={{ fontSize: 13, color: c.text3, marginBottom: 24 }}>If your priorities differ from the verdict above, start here.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }} className="bottom-recs">
        {recs.map(rec => (
          <div key={rec.for} style={{ padding: 16, background: c.bg, borderRadius: r.md, textAlign: 'left' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3, marginBottom: 6 }}>{rec.for}</div>
            <div style={{ fontFamily: f.serif, fontSize: 15, color: c.text1, marginBottom: 4 }}>{rec.phone.model_name}</div>
            <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.5 }}>{rec.reason}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── main content ─────────────────────────────────────────────────────────────

function CompareContent({
  initialPhones, initialVerdict, suggestedPairs,
}: {
  initialPhones: Phone[]
  initialVerdict: CompareVerdict | null
  suggestedPairs: Phone[][]
}) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { toast }    = useToast()

  const [phones, setPhones]   = useState<Phone[]>(initialPhones)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [copied, setCopied]   = useState(false)
  const [verdict, setVerdict] = useState<CompareVerdict | null>(initialVerdict)

  const ownUpdate = useRef(false)
  const spString  = searchParams.toString()

  const hydratedKey = useRef<string | null>(
    initialPhones.length > 0 ? initialPhones.map(p => p.id).join(',') : null,
  )

  const initialKey = initialPhones.map(p => p.id).join(',')
  useEffect(() => {
    if (initialPhones.length === 0) return
    setPhones(initialPhones)
    setError(null)
  }, [initialKey])

  useEffect(() => {
    if (ownUpdate.current) { ownUpdate.current = false; return }
    if (initialPhones.length > 0) return

    const idsParam = searchParams.get('ids')
    if (!idsParam) { setPhones([]); setError(null); return }

    const idList = Array.from(new Set(
      idsParam.split(',').map(Number).filter(id => Number.isFinite(id) && id > 0)
    ))
    if (idList.length === 0) { setPhones([]); return }

    let cancelled = false
    setLoading(true)
    setError(null)

    api.phones.compare(idList)
      .then(data => {
        if (cancelled) return
        if (data.phones?.length) {
          const byId    = new Map(data.phones.map(p => [p.id, p]))
          const ordered = idList.map(id => byId.get(id)).filter((p): p is Phone => Boolean(p))
          setPhones(ordered.length ? ordered : data.phones)
          setVerdict(data.verdict ?? null)
          hydratedKey.current = ordered.map(p => p.id).join(',')
        } else {
          setError('Could not find the requested phones.')
          setPhones([])
        }
      })
      .catch(() => {
        if (cancelled) return
        setError('Failed to load phones. Please try again.')
        setPhones([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [spString, initialPhones.length])

  const phoneIdsKey = phones.map(p => p.id).join(',')
  useEffect(() => {
    if (phones.length < 2) { setVerdict(null); return }
    if (hydratedKey.current === phoneIdsKey) return

    const ids = phones.map(p => p.id)
    let cancelled = false

    api.phones.compare(ids)
      .then(data => {
        if (cancelled) return
        if (data.phones?.length) {
          const byId = new Map(data.phones.map(p => [p.id, p]))
          setPhones(prev => prev.map(p => byId.get(p.id) ?? p))
        }
        setVerdict(data.verdict ?? null)
        hydratedKey.current = phoneIdsKey
      })
      .catch(() => { if (!cancelled) setVerdict(null) })

    return () => { cancelled = true }
  }, [phoneIdsKey])

  const navigateToSlugs = useCallback((updated: Phone[]) => {
    ownUpdate.current = true
    router.replace(updated.length ? ROUTES.compare(...updated.map(phoneSlug)) : '/compare', { scroll: false })
  }, [router])

  const handleAdd = useCallback((phone: Phone) => {
    if (phones.some(p => p.id === phone.id)) { toast('Already in comparison', 'info'); return }
    if (phones.length >= MAX_COMPARE) { toast(`Max ${MAX_COMPARE} phones`, 'error'); return }
    const updated = [...phones, phone]
    setPhones(updated)
    navigateToSlugs(updated)
    toast('Phone added', 'success')
  }, [phones, navigateToSlugs, toast])

  const handleRemove = useCallback((id: number) => {
    const updated = phones.filter(p => p.id !== id)
    setPhones(updated)
    navigateToSlugs(updated)
    toast('Phone removed', 'info')
  }, [phones, navigateToSlugs, toast])

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast('Link copied!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Failed to copy link', 'error')
    }
  }

  const handleClear = () => {
    setPhones([])
    navigateToSlugs([])
    toast('Comparison cleared', 'info')
  }

  const getDisplayScore = (p: Phone) => resolveValueScore(p).score
  const scores    = phones.map(getDisplayScore)
  const bestIdx   = phones.length >= 2 ? scores.indexOf(Math.max(...scores)) : -1
  const hasPhones  = phones.length > 0
  const canCompare = phones.length >= 2

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar compareCount={phones.length} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 80px' }}>
        <div style={{ padding: '14px 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/" style={{ color: c.text2 }}>Home</Link>
          <span style={{ color: c.text3 }}>/</span>
          <span>Compare</span>
        </div>

        {error && (
          <div style={{ display: 'flex', gap: 10, padding: '12px 16px', background: 'rgba(230,57,70,0.06)', border: '1px solid var(--accent-border)', borderRadius: r.md, marginBottom: 20, alignItems: 'center' }}>
            <AlertCircle size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: c.accent }}>{error}</p>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: c.primary }} />
            <p style={{ fontSize: 13, color: c.text3 }}>Loading phones...</p>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────────
            One heading, one search box, autofocused, no button gating it.
            Suggested pairs sit below as a secondary path for people
            browsing rather than searching for a specific phone. */}
        {!loading && !hasPhones && !error && (
          <div style={{ padding: '8px 20px 56px' }}>
            <div style={{ maxWidth: 440, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, margin: '0 auto 18px', background: c.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={22} color={c.text3} />
              </div>
              <h1 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, marginBottom: 8 }}>Compare Phones</h1>
              <p style={{ fontSize: 13.5, color: c.text3, marginBottom: 24 }}>
                Search for a phone to start. Add up to {MAX_COMPARE} for a full side-by-side breakdown.
              </p>
              <PhoneSearchBox onSelect={handleAdd} excludeIds={[]} autoFocus />
            </div>

            {suggestedPairs.length > 0 && (
              <div style={{ marginTop: 48 }}>
                <SuggestedComparisons pairs={suggestedPairs} />
              </div>
            )}
          </div>
        )}

        {hasPhones && !loading && (
          <>
            <div
              style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(phones.length + (phones.length < MAX_COMPARE ? 1 : 0), MAX_COMPARE)}, minmax(0, 1fr))`, gap: 14, marginBottom: 20 }}
              className="phone-cols"
            >
              {phones.map((p, i) => (
                <PhoneColumn key={p.id} phone={p} onRemove={() => handleRemove(p.id)} isWinner={i === bestIdx} />
              ))}
              {phones.length < MAX_COMPARE && (
                <AddPhoneSlot onSelect={handleAdd} excludeIds={phones.map(p => p.id)} />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
              <button
                onClick={handleShare}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 500, border: `1px solid ${c.border}`, borderRadius: r.full, color: c.text2, transition: 'all 0.15s', background: 'transparent', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
              >
                <Share2 size={13} /> {copied ? 'Copied!' : 'Share link'}
              </button>
              <button
                onClick={handleClear}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 500, border: `1px solid ${c.border}`, borderRadius: r.full, color: c.text2, transition: 'all 0.15s', background: 'transparent', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.accent; (e.currentTarget as HTMLElement).style.color = c.accent }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
              >
                <RotateCcw size={13} /> Clear all
              </button>
            </div>

            {!canCompare && (
              <div style={{ padding: '14px 18px', background: 'rgba(26,26,46,0.03)', border: `1px solid ${c.border}`, borderRadius: r.md, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <Plus size={13} color={c.primary} />
                <p style={{ fontSize: 13, color: c.primary }}>Add another phone to unlock comparisons</p>
              </div>
            )}

            {canCompare && (
              <>
                <VerdictHero phones={phones} verdict={verdict} />
                <CategoryBreakdown phones={phones} />
                <SpecTable phones={phones} />
                <AdSlot placement="inline" />
                <BottomLine phones={phones} verdict={verdict} />
              </>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 56, flexWrap: 'wrap' }}>
              {phones.length < MAX_COMPARE && (
                <button
                  onClick={() => { document.querySelector('.phone-cols')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', background: c.primary, color: '#fff', borderRadius: r.full, fontSize: 14, fontWeight: 600, transition: 'all 0.15s', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
                >
                  <Plus size={15} /> Add Another Phone
                </button>
              )}
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', border: `1px solid ${c.border}`, color: c.text2, borderRadius: r.full, fontSize: 14, fontWeight: 500, transition: 'all 0.15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}>
                <Search size={15} /> Browse All Phones
              </Link>
              <Link href="/pick" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', border: '1px solid var(--accent-border)', color: c.accent, borderRadius: r.full, fontSize: 14, fontWeight: 500, transition: 'all 0.15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-light)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                Not sure? Help Me Choose →
              </Link>
            </div>
          </>
        )}
      </div>

      <Footer />

      <style>{`
        @media (max-width: 1023px) {
          .phone-cols { grid-template-columns: repeat(2,1fr) !important; }
          .verdict-grid { grid-template-columns: repeat(2,1fr) !important; }
          .bottom-recs { grid-template-columns: 1fr !important; }
          .suggested-pairs-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 640px) {
          .phone-cols { grid-template-columns: repeat(2,1fr) !important; gap: 8px !important; }
          .verdict-grid { grid-template-columns: 1fr !important; }
          .suggested-pairs-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 1024px) {
          .suggested-pairs-grid { grid-template-columns: repeat(3,1fr); }
        }
      `}</style>
    </div>
  )
}

function CompareSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${c.border}`, borderTopColor: c.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: 13, color: c.text3 }}>Loading comparison...</p>
    </div>
  )
}

export default function CompareClient({
  initialPhones = [],
  initialVerdict = null,
  suggestedPairs = [],
}: {
  initialPhones?: Phone[]
  initialVerdict?: CompareVerdict | null
  suggestedPairs?: Phone[][]
}) {
  return (
    <Suspense fallback={<CompareSkeleton />}>
      <CompareContent initialPhones={initialPhones} initialVerdict={initialVerdict} suggestedPairs={suggestedPairs} />
    </Suspense>
  )
}
