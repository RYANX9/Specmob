'use client'

import { c } from '@/lib/tokens'
import type { Phone } from '@/lib/types'

// ─── variant type ────────────────────────────────────────────────────────────
// Local shape returned by GET /phones/{id}/variants — narrower than the
// lib/types.ts PhoneVariant (which models the DB row with an id field).

export type PhoneVariant = {
  ram_gb: number | null
  storage_gb: number
  price: number
  url: string
}

export function formatStorage(gb: number): string {
  return gb >= 1000 ? `${gb / 1000}TB` : `${gb}GB`
}

export function isSameVariant(a: PhoneVariant | null, b: PhoneVariant): boolean {
  return !!a && a.storage_gb === b.storage_gb && a.ram_gb === b.ram_gb
}

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

export function getSpecGroups(phone: Phone): Array<[string, Record<string, string>]> {
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

export function rankSpecGroup(name: string): number {
  const lower = name.toLowerCase()
  const idx = SPEC_GROUP_ORDER.findIndex(k => lower.includes(k))
  return idx === -1 ? 998 : idx
}

// ─── tab button ───────────────────────────────────────────────────────────────

export function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

// ─── spec table ───────────────────────────────────────────────────────────────

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

export function SpecGroup({ title, specs }: { title: string; specs: Record<string, string> }) {
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

export function QuickSpecCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '16px 12px', textAlign: 'center' }}>
      <div style={{ color: c.text3, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: c.text1, marginBottom: 3, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 11, color: c.text3, textTransform: 'uppercase' as const, letterSpacing: '0.3px' }}>{label}</div>
    </div>
  )
}

// ─── variant picker ─────────────────────────────────────────────────────────

export function VariantPicker({
  variants,
  loading,
  selected,
  onSelect,
}: {
  variants: PhoneVariant[]
  loading: boolean
  selected: PhoneVariant | null
  onSelect: (v: PhoneVariant) => void
}) {
  if (loading) {
    return <div className="skeleton" style={{ height: 92, borderRadius: 'var(--r-lg)', marginBottom: 18 }} />
  }
  if (!variants.length) return null

  const hasRam = variants.some(v => v.ram_gb != null)
  const cheapest = Math.min(...variants.map(v => v.price))

  const formatSize = (s: number) => {
    if (s >= 1000) return `${Math.round(s / 1000)}TB`
    return `${s}GB`
  }

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)', padding: '18px 20px', marginBottom: 18 }}>
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
                {hasRam && v.ram_gb ? `${v.ram_gb}/${formatSize(v.storage_gb)}` : formatSize(v.storage_gb)}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.text1 }}>
                ${v.price.toLocaleString()}
              </span>
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
