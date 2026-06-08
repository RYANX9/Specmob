'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search, X, Plus, ChevronDown, Star, Share2, RotateCcw,
  Loader2, AlertCircle, Smartphone, Camera, Battery, Zap,
  Monitor, Trophy, BadgeDollarSign, HardHat, ArrowRight,
} from 'lucide-react'
import { c, f, r } from '@/lib/tokens'
import { ROUTES, brandSlug, phoneSlug, MAX_COMPARE } from '@/lib/config'
import { api } from '@/lib/api'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { useToast } from '@/app/components/Toast'
import type { Phone } from '@/lib/types'

/* ─── helpers ─── */
function fmt(v: number | null, suffix = ''): string {
  if (v == null) return '—'
  return `${v.toLocaleString()}${suffix}`
}
function fmtPrice(v: number | null): string {
  return v == null ? 'Price TBA' : `$${v.toLocaleString()}`
}
function scoreComposite(p: Phone): number {
  let s = 0
  if (p.antutu_score)      s += Math.min(p.antutu_score / 2_000_000, 1) * 3
  if (p.main_camera_mp)    s += Math.min(p.main_camera_mp / 200, 1) * 2
  if (p.battery_capacity)  s += Math.min(p.battery_capacity / 7000, 1) * 2
  if (p.fast_charging_w)   s += Math.min(p.fast_charging_w / 100, 1)
  if (p.ram_options?.length) s += Math.min(Math.max(...p.ram_options) / 16, 1) * 0.5
  return s
}
function getBestIdx(phones: Phone[], getter: (p: Phone) => number | null, lower = false): number {
  let bestIdx = -1, bestVal = lower ? Infinity : -Infinity
  phones.forEach((p, i) => {
    const v = getter(p); if (v == null) return
    if (lower ? v < bestVal : v > bestVal) { bestVal = v; bestIdx = i }
  })
  return bestIdx
}
function buildCompareSlug(phones: Phone[]): string {
  return phones.map(p => phoneSlug(p)).filter(Boolean).join('-vs-')
}

/* ─── verdict config ─── */
const VERDICTS = [
  { icon: <Camera size={16} strokeWidth={1.5} />,       label: 'Camera',      unit: ' MP',   getter: (p: Phone) => p.main_camera_mp,     desc: 'Main sensor resolution' },
  { icon: <Battery size={16} strokeWidth={1.5} />,      label: 'Battery',     unit: ' mAh',  getter: (p: Phone) => p.battery_capacity,    desc: 'Battery capacity' },
  { icon: <Zap size={16} strokeWidth={1.5} />,          label: 'Charging',    unit: 'W',     getter: (p: Phone) => p.fast_charging_w,     desc: 'Wired charging speed' },
  { icon: <Zap size={16} strokeWidth={1.5} />,          label: 'Performance', unit: ' pts',  getter: (p: Phone) => p.antutu_score,        desc: 'AnTuTu benchmark' },
  { icon: <Monitor size={16} strokeWidth={1.5} />,      label: 'Display',     unit: '"',     getter: (p: Phone) => p.screen_size,         desc: 'Screen size' },
  { icon: <Smartphone size={16} strokeWidth={1.5} />,   label: 'Weight',      unit: 'g',     getter: (p: Phone) => p.weight_g,            desc: 'Total weight', lower: true },
  { icon: <BadgeDollarSign size={16} strokeWidth={1.5} />, label: 'Value',    unit: '/10',   getter: (p: Phone) => p.value_score ?? scoreComposite(p), desc: 'Specs-per-dollar' },
] as const

/* ─── spec table ─── */
const SPEC_SECTIONS = [
  {
    title: 'Display', icon: <Monitor size={15} strokeWidth={1.5} />,
    rows: [
      { label: 'Screen Size',  getValue: (p: Phone) => fmt(p.screen_size, '"'),    getRaw: (p: Phone) => p.screen_size },
      { label: 'Resolution',  getValue: (p: Phone) => p.screen_resolution || '—' },
      { label: 'Panel Type',  getValue: (p: Phone) => (p.full_specifications as any)?.quick_specs?.displaytype || '—' },
    ],
  },
  {
    title: 'Camera', icon: <Camera size={15} strokeWidth={1.5} />,
    rows: [
      { label: 'Main Camera',  getValue: (p: Phone) => fmt(p.main_camera_mp, ' MP'), getRaw: (p: Phone) => p.main_camera_mp },
      { label: 'Front Camera', getValue: (p: Phone) => (p.full_specifications as any)?.quick_specs?.cam2modules || '—' },
      { label: 'Features',     getValue: (p: Phone) => p.features?.join(', ') || '—' },
    ],
  },
  {
    title: 'Performance', icon: <Zap size={15} strokeWidth={1.5} />,
    rows: [
      { label: 'Chipset',    getValue: (p: Phone) => p.chipset || '—' },
      { label: 'AnTuTu',    getValue: (p: Phone) => fmt(p.antutu_score),       getRaw: (p: Phone) => p.antutu_score },
      { label: 'RAM',        getValue: (p: Phone) => p.ram_options?.length ? `${Math.max(...p.ram_options)} GB` : '—', getRaw: (p: Phone) => p.ram_options?.length ? Math.max(...p.ram_options) : null },
      { label: 'Storage',   getValue: (p: Phone) => p.storage_options?.length ? `${Math.max(...p.storage_options)} GB` : '—', getRaw: (p: Phone) => p.storage_options?.length ? Math.max(...p.storage_options) : null },
    ],
  },
  {
    title: 'Battery', icon: <Battery size={15} strokeWidth={1.5} />,
    rows: [
      { label: 'Capacity',     getValue: (p: Phone) => fmt(p.battery_capacity, ' mAh'), getRaw: (p: Phone) => p.battery_capacity },
      { label: 'Fast Charge',  getValue: (p: Phone) => fmt(p.fast_charging_w, 'W'),     getRaw: (p: Phone) => p.fast_charging_w },
    ],
  },
  {
    title: 'Build', icon: <HardHat size={15} strokeWidth={1.5} />,
    rows: [
      { label: 'Weight',       getValue: (p: Phone) => fmt(p.weight_g, 'g'),       getRaw: (p: Phone) => p.weight_g,       lower: true },
      { label: 'Thickness',   getValue: (p: Phone) => fmt(p.thickness_mm, 'mm'),   getRaw: (p: Phone) => p.thickness_mm,   lower: true },
      { label: 'Chipset Tier', getValue: (p: Phone) => p.chipset_tier ? p.chipset_tier[0].toUpperCase() + p.chipset_tier.slice(1) : '—' },
    ],
  },
]

/* ─── phone column ─── */
function PhoneColumn({ phone, onRemove, isWinner }: { phone: Phone; onRemove: () => void; isWinner: boolean }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div style={{
      position: 'relative',
      background: isWinner ? 'linear-gradient(180deg,rgba(230,57,70,0.04) 0%,var(--surface) 100%)' : c.surface,
      border: `2px solid ${isWinner ? 'var(--accent)' : c.border}`,
      borderRadius: r.lg, padding: '20px 14px', textAlign: 'center',
      transition: 'all 0.15s',
    }}>
      {isWinner && (
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.5px',
          padding: '3px 10px', borderRadius: r.full,
          display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        }}>
          <Star size={9} fill="white" /> Overall Best
        </div>
      )}

      <button onClick={onRemove} style={{
        position: 'absolute', top: 8, right: 8, width: 26, height: 26,
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: c.text3, transition: 'all 0.15s', background: 'transparent', border: 'none', cursor: 'pointer',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(230,57,70,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = c.text3 }}
      >
        <X size={13} />
      </button>

      <Link href={ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}>
        <div style={{
          width: 88, height: 88, margin: '6px auto 14px',
          background: 'var(--bg)', borderRadius: r.md,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          {phone.main_image_url && !imgErr
            ? <img src={phone.main_image_url} alt={phone.model_name} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <Smartphone size={32} color={c.border} />}
        </div>
        <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3, marginBottom: 3 }}>
          {phone.brand}
        </p>
        <p style={{ fontFamily: f.serif, fontSize: 15, color: c.text1, marginBottom: 5, lineHeight: 1.3 }}>
          {phone.model_name}
        </p>
      </Link>

      <p style={{ fontSize: 18, fontWeight: 700, color: c.text1, marginBottom: 6 }}>
        {fmtPrice(phone.price_usd)}
      </p>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, color: c.text3, padding: '3px 8px',
        background: 'var(--bg)', borderRadius: r.full,
      }}>
        Value: <span style={{
          fontWeight: 600,
          color: (phone.value_score ?? 0) >= 8 ? 'var(--green)' : (phone.value_score ?? 0) >= 6 ? c.text2 : 'var(--orange)',
        }}>{phone.value_score?.toFixed(1) ?? '—'}</span>/10
      </div>

      <Link href={ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}
        style={{ display: 'block', marginTop: 10, fontSize: 11, fontWeight: 500, color: c.text3, transition: 'color 0.15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text3 }}
      >
        Full specs →
      </Link>
    </div>
  )
}

/* ─── add phone slot ─── */
function AddPhoneSlot({ onSelect, excludeIds }: { onSelect: (p: Phone) => void; excludeIds: number[] }) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<Phone[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef              = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (query.length < 2) { setResults([]); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await api.phones.search({ q: query, page_size: 8 })
        setResults(res.results.filter(p => !excludeIds.includes(p.id)))
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 300)
  }, [query, excludeIds.join(',')])

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      width: '100%', minHeight: 240, borderRadius: r.lg,
      border: `2px dashed ${c.border}`, background: 'transparent',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 8, color: c.text3, transition: 'all 0.15s', cursor: 'pointer',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text3 }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '50%', background: c.surface,
        border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Plus size={18} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Add phone</span>
      <span style={{ fontSize: 11, color: c.text3 }}>Up to {MAX_COMPARE} total</span>
    </button>
  )

  return (
    <div style={{
      width: '100%', minHeight: 240, borderRadius: r.lg,
      border: `1px solid ${c.primary}`, background: 'rgba(26,26,46,0.02)',
      padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: c.primary }}>Search phone</span>
        <button onClick={() => { setOpen(false); setQuery('') }} style={{ color: c.text3, display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={13} />
        </button>
      </div>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.text3, pointerEvents: 'none' }} />
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Type phone name…" autoFocus
          style={{
            width: '100%', padding: '9px 10px 9px 32px',
            background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.sm,
            fontSize: 13, color: c.text1,
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {results.map(p => (
          <button key={p.id} onClick={() => { onSelect(p); setOpen(false); setQuery('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px',
              textAlign: 'left', borderRadius: r.sm, transition: 'background 0.1s', cursor: 'pointer',
              background: 'transparent', border: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <div style={{ width: 32, height: 32, background: 'var(--bg)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {p.main_image_url && <img src={p.main_image_url} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: c.text1 }}>{p.model_name}</p>
              <p style={{ fontSize: 10, color: c.text3 }}>{p.brand}{p.price_usd && ` · $${p.price_usd.toLocaleString()}`}</p>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, color: c.primary,
              border: `1px solid ${c.border}`, borderRadius: r.full, padding: '3px 10px', flexShrink: 0,
            }}>+ Add</span>
          </button>
        ))}
        {query.length >= 2 && !loading && results.length === 0 && (
          <p style={{ fontSize: 12, color: c.text3, textAlign: 'center', padding: '12px 0' }}>No phones found</p>
        )}
      </div>
    </div>
  )
}

/* ─── quick verdict ─── */
function QuickVerdict({ phones }: { phones: Phone[] }) {
  const wins = new Map<number, number>()
  const items = VERDICTS.map(v => {
    const bestIdx = getBestIdx(phones, v.getter, (v as any).lower)
    if (bestIdx >= 0) wins.set(bestIdx, (wins.get(bestIdx) || 0) + 1)
    const bestVal = bestIdx >= 0 ? v.getter(phones[bestIdx]) : null
    const isTie = bestVal != null && phones.filter((p, i) => i !== bestIdx && v.getter(p) === bestVal).length > 0
    return { ...v, bestIdx, isTie }
  })
  const overallWinner = Array.from(wins.entries()).sort((a, b) => b[1] - a[1])[0]

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, marginBottom: 18 }}>Quick Verdict</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }} className="verdict-grid">
        {items.map(item => {
          const winner = item.bestIdx >= 0 ? phones[item.bestIdx] : null
          const val    = winner ? item.getter(winner) : null
          return (
            <div key={item.label} style={{
              background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md, padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color: c.text2, display: 'flex' }}>{item.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3 }}>{item.label}</span>
              </div>
              <div style={{ fontFamily: f.serif, fontSize: 15, color: c.text1, marginBottom: 3 }}>
                {winner ? winner.model_name : '—'}
              </div>
              <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.4, marginBottom: 7 }}>
                {item.desc}{val != null && ` (${fmt(val, item.unit)})`}
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 8px', borderRadius: r.full, fontSize: 10, fontWeight: 600,
                ...(item.isTie
                  ? { background: 'var(--blue-light)', color: 'var(--blue)' }
                  : item.bestIdx >= 0
                    ? { background: 'var(--accent-light)', color: 'var(--accent)' }
                    : { background: 'rgba(0,0,0,0.04)', color: c.text3 }),
              }}>
                {item.isTie ? '≈ Tie' : item.bestIdx >= 0 ? <><Star size={9} fill="var(--accent)" color="var(--accent)" /> Winner</> : '—'}
              </span>
            </div>
          )
        })}

        {overallWinner && (
          <div style={{
            gridColumn: '1 / -1', background: c.primary, borderRadius: r.md, padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Trophy size={18} color="#C9A84C" />
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)' }}>Overall</span>
            </div>
            <div style={{ fontFamily: f.serif, fontSize: 20, color: '#fff', marginBottom: 4 }}>
              {phones[overallWinner[0]].model_name} wins {overallWinner[1]} of {VERDICTS.length} categories
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              Based on the categories above. The best phone still depends on what matters most to you.
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ─── spec table — fixed UI ─── */
function SpecTable({ phones }: { phones: Phone[] }) {
  const colW = Math.max(120, Math.floor(500 / phones.length))

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, marginBottom: 18 }}>Full Spec Comparison</h2>

      {/* Scrollable wrapper with visible scrollbar hint on mobile */}
      <div style={{
        overflowX: 'auto',
        borderRadius: r.md,
        border: `1px solid ${c.border}`,
        WebkitOverflowScrolling: 'touch',
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: `${150 + phones.length * colW}px`,
          tableLayout: 'fixed',
        }}>
          {SPEC_SECTIONS.map(section => (
            <tbody key={section.title}>
              {/* Section header */}
              <tr>
                <td colSpan={phones.length + 1} style={{
                  padding: '10px 14px 8px',
                  background: c.bg,
                  borderBottom: `2px solid ${c.border}`,
                  borderTop: `1px solid ${c.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: c.text2, display: 'flex', alignItems: 'center' }}>{section.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: c.text1 }}>
                      {section.title}
                    </span>
                  </div>
                </td>
              </tr>

              {section.rows.map((row, rowIdx) => {
                const winIdx = (row as any).getRaw ? getBestIdx(phones, (row as any).getRaw, (row as any).lower) : -1
                const isAlt  = rowIdx % 2 === 1
                return (
                  <tr key={row.label} style={{ background: isAlt ? 'rgba(248,248,245,0.5)' : 'transparent' }}>
                    {/* Label column — sticky */}
                    <td style={{
                      width: 150, padding: '10px 14px',
                      borderBottom: `1px solid ${c.border}`,
                      fontSize: 12, fontWeight: 500, color: c.text3,
                      position: 'sticky', left: 0, zIndex: 2,
                      background: isAlt ? '#f5f5f2' : c.surface,
                      whiteSpace: 'nowrap',
                      boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
                    }}>
                      {row.label}
                    </td>

                    {/* Value cells */}
                    {phones.map((p, i) => {
                      const isWinner = winIdx === i && winIdx >= 0
                      const val      = row.getValue(p)
                      return (
                        <td key={p.id} style={{
                          padding: '10px 14px',
                          borderBottom: `1px solid ${c.border}`,
                          borderLeft: `1px solid ${c.border}`,
                          textAlign: 'center',
                          fontSize: 13,
                          fontWeight: isWinner ? 700 : 400,
                          color: isWinner ? c.text1 : c.text3,
                          background: isWinner
                            ? (isAlt ? 'rgba(230,57,70,0.06)' : 'rgba(230,57,70,0.04)')
                            : 'transparent',
                          position: 'relative',
                          transition: 'background 0.15s',
                        }}>
                          {/* Winner accent bar */}
                          {isWinner && (
                            <span style={{
                              position: 'absolute', left: 0, top: 4, bottom: 4,
                              width: 3, background: 'var(--accent)', borderRadius: 2,
                            }} />
                          )}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, paddingLeft: isWinner ? 6 : 0 }}>
                            {val === '—'
                              ? <span style={{ color: c.border }}>—</span>
                              : val
                            }
                            {isWinner && <Star size={11} fill="var(--accent)" color="var(--accent)" />}
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

/* ─── bar chart verdicts ─── */
function DetailedVerdicts({ phones }: { phones: Phone[] }) {
  const cats = [
    { icon: <Camera size={18} strokeWidth={1.5} />,  label: 'Camera',      getter: (p: Phone) => p.main_camera_mp,   max: 200 },
    { icon: <Zap size={18} strokeWidth={1.5} />,     label: 'Performance', getter: (p: Phone) => p.antutu_score,     max: 2_000_000 },
    { icon: <Battery size={18} strokeWidth={1.5} />, label: 'Battery',     getter: (p: Phone) => p.battery_capacity, max: 7000 },
  ]
  const colors = ['var(--accent)', c.primary, 'var(--green)']

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, marginBottom: 18 }}>Detailed Verdicts</h2>
      {cats.map(cat => {
        const maxVal = Math.max(...phones.map(cat.getter).filter(Boolean) as number[], 1)
        return (
          <div key={cat.label} style={{
            background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md,
            padding: '18px 20px', marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ color: c.text2, display: 'flex' }}>{cat.icon}</span>
              <span style={{ fontFamily: f.serif, fontSize: 18, color: c.text1 }}>{cat.label}</span>
            </div>
            {phones.map((p, i) => {
              const val = cat.getter(p) || 0
              const pct = Math.min((val / cat.max) * 100, 100)
              const winIdx = getBestIdx(phones, cat.getter)
              const isWinner = winIdx === i
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{
                    width: 130, fontSize: 12, fontWeight: isWinner ? 600 : 400,
                    color: isWinner ? c.text1 : c.text2, textAlign: 'right', flexShrink: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {p.model_name}
                  </span>
                  <div style={{ flex: 1, height: 7, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 4,
                      background: colors[i % colors.length],
                      transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
                    }} />
                  </div>
                  <span style={{ width: 60, fontSize: 12, fontWeight: isWinner ? 700 : 400, color: isWinner ? c.text1 : c.text2, flexShrink: 0, textAlign: 'right' }}>
                    {val ? val.toLocaleString() : '—'}
                    {isWinner && <Star size={10} fill="var(--accent)" color="var(--accent)" style={{ display: 'inline', marginLeft: 4, verticalAlign: 'middle' }} />}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
    </section>
  )
}

/* ─── bottom line ─── */
function BottomLine({ phones }: { phones: Phone[] }) {
  if (phones.length < 2) return null
  const bestValue  = phones.reduce((a, b) => ((a.value_score ?? scoreComposite(a)) > (b.value_score ?? scoreComposite(b)) ? a : b))
  const cheapest   = phones.reduce((a, b) => ((a.price_usd ?? Infinity) < (b.price_usd ?? Infinity) ? a : b))
  const bestCamera = phones.reduce((a, b) => ((a.main_camera_mp || 0) > (b.main_camera_mp || 0) ? a : b))
  const recs = [
    { for: 'Best overall value', phone: bestValue,  reason: 'Highest value score — most specs per dollar.' },
    { for: 'Budget pick',        phone: cheapest,   reason: 'Lowest price while still competitive.' },
    { for: 'Photography',        phone: bestCamera, reason: 'Highest resolution main camera.' },
  ]
  return (
    <div style={{
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: r.lg, padding: '28px 32px', textAlign: 'center', marginBottom: 40,
    }}>
      <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, marginBottom: 6 }}>The Bottom Line</h2>
      <p style={{ fontSize: 13, color: c.text3, marginBottom: 24 }}>Different phones for different people.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }} className="bottom-recs">
        {recs.map(rec => (
          <div key={rec.for} style={{ padding: 16, background: 'var(--bg)', borderRadius: r.md, textAlign: 'left' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: 6 }}>{rec.for}</div>
            <div style={{ fontFamily: f.serif, fontSize: 15, color: c.text1, marginBottom: 4 }}>{rec.phone.model_name}</div>
            <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.5 }}>{rec.reason}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── main content ─── */
interface CompareContentProps { initialPhones: Phone[] }

function CompareContent({ initialPhones }: CompareContentProps) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { toast }    = useToast()

  const [phones, setPhones]   = useState<Phone[]>(initialPhones)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [copied, setCopied]   = useState(false)

  const didInitRef       = useRef(false)
  const userModifiedRef  = useRef(false)
  const lastSyncedSlugRef = useRef<string>('')

  useEffect(() => {
    if (initialPhones.length > 0) {
      didInitRef.current      = true
      lastSyncedSlugRef.current = buildCompareSlug(initialPhones)
      return
    }
    const idsParam = searchParams.get('ids')
    if (!idsParam) { didInitRef.current = true; return }
    const idList = idsParam.split(',').map(Number).filter(id => !isNaN(id) && id > 0)
    if (!idList.length) { didInitRef.current = true; return }
    setLoading(true)
    api.phones.compare(idList)
      .then(data => {
        if (data.phones?.length) { setPhones(data.phones); lastSyncedSlugRef.current = buildCompareSlug(data.phones) }
        else setError('Could not find the requested phones')
      })
      .catch(() => setError('Failed to load phones. Please try again.'))
      .finally(() => { setLoading(false); didInitRef.current = true })
  }, [searchParams, initialPhones.length])

  useEffect(() => {
    if (!didInitRef.current || !userModifiedRef.current) return
    const currentSlug = buildCompareSlug(phones)
    if (currentSlug === lastSyncedSlugRef.current) return
    if (!phones.length) { lastSyncedSlugRef.current = ''; router.replace('/compare', { scroll: false }); return }
    const newPath = `/compare/${currentSlug}`
    if (window.location.pathname !== newPath) { lastSyncedSlugRef.current = currentSlug; router.replace(newPath, { scroll: false }) }
  }, [phones, router])

  const handleAdd = useCallback((phone: Phone) => {
    if (phones.some(p => p.id === phone.id)) { toast('Already in comparison', 'info'); return }
    if (phones.length >= MAX_COMPARE) { toast(`Max ${MAX_COMPARE} phones`, 'error'); return }
    userModifiedRef.current = true
    const updated = [...phones, phone]
    setPhones(updated)
    router.replace(`/compare/${buildCompareSlug(updated)}`, { scroll: false })
    toast('Phone added', 'success')
  }, [phones, router, toast])

  const handleRemove = useCallback((id: number) => {
    userModifiedRef.current = true
    const updated = phones.filter(p => p.id !== id)
    setPhones(updated)
    router.replace(updated.length ? `/compare/${buildCompareSlug(updated)}` : '/compare', { scroll: false })
    toast('Phone removed', 'info')
  }, [phones, router, toast])

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true); toast('Link copied!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch { toast('Failed to copy link', 'error') }
  }

  const handleClear = () => {
    userModifiedRef.current = true
    setPhones([])
    router.replace('/compare', { scroll: false })
    toast('Comparison cleared', 'info')
  }

  const scores   = phones.map(p => p.value_score ?? scoreComposite(p))
  const bestIdx  = scores.length >= 1 ? scores.indexOf(Math.max(...scores)) : -1
  const hasPhones = phones.length > 0
  const canCompare = phones.length >= 2

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar compareCount={phones.length} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 80px' }}>
        {/* Breadcrumb */}
        <div style={{ padding: '14px 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/" style={{ color: c.text2 }}>Home</Link>
          <span style={{ color: c.text3 }}>/</span>
          <span>Compare</span>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', padding: '24px 0 36px' }}>
          <h1 style={{ fontFamily: f.serif, fontSize: 36, color: c.text1, letterSpacing: '-0.4px', marginBottom: 8 }}>
            Phone Comparison
          </h1>
          <p style={{ fontSize: 15, color: c.text3 }}>
            {hasPhones
              ? canCompare ? 'Side-by-side specs, winners highlighted, honest verdicts.' : 'Add one more phone to unlock comparisons.'
              : 'Add 2–4 phones to compare.'}
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex', gap: 10, padding: '12px 16px', background: 'rgba(230,57,70,0.06)',
            border: '1px solid var(--accent-border)', borderRadius: r.md, marginBottom: 20, alignItems: 'center',
          }}>
            <AlertCircle size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: 'var(--accent)' }}>{error}</p>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: c.primary }} />
            <p style={{ fontSize: 13, color: c.text3 }}>Loading phones…</p>
          </div>
        )}

        {!loading && !hasPhones && !error && (
          <div style={{ textAlign: 'center', padding: '32px 20px 56px' }}>
            <div style={{ width: 56, height: 56, margin: '0 auto 16px', background: 'var(--bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={24} color={c.text3} />
            </div>
            <h2 style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, marginBottom: 10 }}>Compare Phones</h2>
            <p style={{ fontSize: 13, color: c.text3, marginBottom: 28, maxWidth: 360, margin: '0 auto 28px' }}>
              Add 2–4 phones to see a detailed comparison with winners highlighted.
            </p>
            <div style={{ maxWidth: 360, margin: '0 auto' }}>
              <AddPhoneSlot onSelect={handleAdd} excludeIds={[]} />
            </div>
          </div>
        )}

        {hasPhones && !loading && (
          <>
            {/* Phone columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(phones.length + (phones.length < MAX_COMPARE ? 1 : 0), MAX_COMPARE)}, 1fr)`,
              gap: 14, marginBottom: 28,
            }} className="phone-cols">
              {phones.map((p, i) => (
                <PhoneColumn key={p.id} phone={p} onRemove={() => handleRemove(p.id)} isWinner={i === bestIdx} />
              ))}
              {phones.length < MAX_COMPARE && (
                <AddPhoneSlot onSelect={handleAdd} excludeIds={phones.map(p => p.id)} />
              )}
            </div>

            {/* Action bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 40, flexWrap: 'wrap' }}>
              <button onClick={handleShare} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                fontSize: 13, fontWeight: 500, border: `1px solid ${c.border}`,
                borderRadius: r.full, color: c.text2, transition: 'all 0.15s', background: 'transparent', cursor: 'pointer',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
              >
                <Share2 size={13} /> {copied ? 'Copied!' : 'Share link'}
              </button>
              <button onClick={handleClear} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                fontSize: 13, fontWeight: 500, border: `1px solid ${c.border}`,
                borderRadius: r.full, color: c.text2, transition: 'all 0.15s', background: 'transparent', cursor: 'pointer',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
              >
                <RotateCcw size={13} /> Clear all
              </button>
            </div>

            {!canCompare && (
              <div style={{
                padding: '14px 18px', background: 'rgba(26,26,46,0.03)',
                border: `1px solid ${c.border}`, borderRadius: r.md,
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28,
              }}>
                <Plus size={13} color={c.primary} />
                <p style={{ fontSize: 13, color: c.primary }}>Add another phone to unlock comparisons</p>
              </div>
            )}

            {canCompare && (
              <>
                <QuickVerdict phones={phones} />
                <SpecTable phones={phones} />
                <DetailedVerdicts phones={phones} />
                <BottomLine phones={phones} />
              </>
            )}

            {/* Bottom actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 56, flexWrap: 'wrap' }}>
              {phones.length < MAX_COMPARE && (
                <button onClick={() => { document.querySelector('.phone-cols')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px',
                    background: c.primary, color: '#fff', borderRadius: r.full,
                    fontSize: 14, fontWeight: 600, transition: 'all 0.15s', border: 'none', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
                >
                  <Plus size={15} /> Add Another Phone
                </button>
              )}
              <Link href="/" style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px',
                border: `1px solid ${c.border}`, color: c.text2, borderRadius: r.full,
                fontSize: 14, fontWeight: 500, transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
              >
                <Search size={15} /> Browse All Phones
              </Link>
              <Link href="/pick" style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px',
                border: '1px solid var(--accent-border)', color: 'var(--accent)',
                borderRadius: r.full, fontSize: 14, fontWeight: 500, transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-light)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                Not sure? Help Me Choose →
              </Link>
            </div>
          </>
        )}
      </div>

      <Footer />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1023px) {
          .phone-cols { grid-template-columns: repeat(2,1fr) !important; }
          .verdict-grid { grid-template-columns: repeat(2,1fr) !important; }
          .bottom-recs { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .phone-cols { grid-template-columns: repeat(2,1fr) !important; gap: 8px !important; }
          .verdict-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function CompareSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${c.border}`, borderTopColor: c.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: 13, color: c.text3 }}>Loading comparison…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function CompareClient({ initialPhones = [] }: { initialPhones?: Phone[] }) {
  return (
    <Suspense fallback={<CompareSkeleton />}>
      <CompareContent initialPhones={initialPhones} />
    </Suspense>
  )
}
