'use client'

import { c } from '@/lib/tokens'
import { specValueToString } from '@/lib/specs'
import type { FullSpecificationsResponse } from '@/lib/types'

export type FullSpecs = FullSpecificationsResponse['full_specifications']

export function formatStorage(gb: number | null | undefined): string {
  if (!gb) return ''
  if (gb >= 1000) {
    const tb = gb / 1024
    return Number.isInteger(tb) ? `${tb}TB` : `${tb.toFixed(1)}TB`
  }
  return `${gb}GB`
}

const SKIP_SPEC_KEYS = new Set([
  'metadata', 'media', 'benchmarks', 'price_info',
  'quick_specs', 'processed_at', 'source_url', 'specifications',
])

export function getFullSpecGroups(fullSpecs: FullSpecs): Array<[string, Record<string, string>]> {
  if (!fullSpecs || typeof fullSpecs !== 'object') return []
  const raw = fullSpecs as Record<string, unknown>
  const root: Record<string, unknown> =
    raw.specifications && typeof raw.specifications === 'object'
      ? (raw.specifications as Record<string, unknown>)
      : raw

  const groups: Array<[string, Record<string, string>]> = []
  for (const [groupName, groupVal] of Object.entries(root)) {
    if (SKIP_SPEC_KEYS.has(groupName)) continue
    if (!groupVal || typeof groupVal !== 'object' || Array.isArray(groupVal)) continue
    const rows: Record<string, string> = {}
    for (const [k, v] of Object.entries(groupVal as Record<string, unknown>)) {
      if (/url|price/i.test(k) && typeof v === 'string' && (v.startsWith('http') || /price/i.test(k))) continue
      const val = specValueToString(v)
      if (val && val !== '—') rows[k] = val
    }
    if (Object.keys(rows).length > 0) groups.push([groupName, rows])
  }
  return groups
}

const SPEC_GROUP_ORDER = [
  'launch', 'availability', 'status', 'network', 'sim', 'display', 'screen',
  'platform', 'performance', 'chipset', 'processor', 'memory', 'storage',
  'main camera', 'rear camera', 'camera', 'selfie', 'front camera', 'secondary camera',
  'sound', 'audio', 'comms', 'connectivity', 'wlan', 'bluetooth', 'nfc',
  'sensors', 'features', 'battery', 'body', 'build', 'design', 'dimensions',
  'tests', 'misc', 'other',
]

export function rankSpecGroup(name: string): number {
  const lower = name.toLowerCase()
  const idx = SPEC_GROUP_ORDER.findIndex(k => lower.includes(k))
  return idx === -1 ? 998 : idx
}

export function sortedSpecGroups(fullSpecs: FullSpecs): Array<[string, Record<string, string>]> {
  return [...getFullSpecGroups(fullSpecs)].sort(([a], [b]) => rankSpecGroup(a) - rankSpecGroup(b))
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
          : lines.map((line, i) => <div key={i} style={{ marginBottom: i < lines.length - 1 ? 3 : 0 }}>{line}</div>)}
      </div>
    </div>
  )
}

export function SpecGroup({ title, specs }: { title: string; specs: Record<string, string> }) {
  const entries = Object.entries(specs)
  if (!entries.length) return null
  return (
    <div style={{ marginBottom: 6, borderRadius: 'var(--r-md)', overflow: 'hidden', border: `1px solid ${c.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: c.bg, borderBottom: `1px solid ${c.border}` }}>
        <h3 style={{ flex: 1, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.6px', color: c.text1, margin: 0 }}>
          {title}
        </h3>
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
