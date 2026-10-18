'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Scale } from 'lucide-react'
import { api } from '@/lib/api'
import { ROUTES } from '@/lib/config'
import { formatUsd } from '@/lib/price'
import { trackBlockClick } from '@/lib/events'
import { c, r } from '@/lib/tokens'
import type { Phone } from '@/lib/types'

function PickerField({ label, value, onChange }: { label: string; value: Phone | null; onChange: (p: Phone | null) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Phone[]>([])
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(timer.current)
    if (query.trim().length < 2) { setResults([]); return }
    const controller = new AbortController()
    timer.current = setTimeout(() => {
      api.phones.search({ q: query.trim(), page_size: 6 }, controller.signal)
        .then(res => setResults(res.results))
        .catch(() => setResults([]))
    }, 220)
    return () => { clearTimeout(timer.current); controller.abort() }
  }, [query])

  if (value) {
    return (
      <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px', background: c.surface, border: `1.5px solid ${c.primary}`, borderRadius: r.md }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: c.text1 }}>{value.display_name}</span>
        <button onClick={() => { onChange(null); setQuery('') }} aria-label={`Remove ${value.display_name}`} style={{ background: 'none', border: 'none', color: c.text3, cursor: 'pointer', fontSize: 16 }}>×</button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={label}
        aria-label={label}
        style={{ width: '100%', padding: '12px 16px', fontSize: 14, border: `1px solid ${c.border}`, borderRadius: r.md, background: c.surface, color: c.text1 }}
      />
      {open && results.length > 0 && (
        <ul style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, margin: '4px 0 0', padding: 4, listStyle: 'none', background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md, boxShadow: 'var(--shadow-md)' }}>
          {results.map(p => (
            <li key={p.id}>
              <button
                onMouseDown={e => { e.preventDefault(); onChange(p); setOpen(false) }}
                style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, color: c.text1, borderRadius: r.sm }}
              >
                {p.display_name} <span style={{ color: c.text3, fontSize: 12 }}>{formatUsd(p.price_usd)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ComparePicker() {
  const [a, setA] = useState<Phone | null>(null)
  const [b, setB] = useState<Phone | null>(null)
  const href = a && b && a.id !== b.id ? ROUTES.comparePair(a.full_slug, b.full_slug) : null

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.lg, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <PickerField label="First phone" value={a} onChange={setA} />
        <span style={{ fontSize: 12, fontWeight: 700, color: c.accent }}>vs</span>
        <PickerField label="Second phone" value={b} onChange={setB} />
        {href ? (
          <Link
            href={href}
            onClick={() => trackBlockClick('home.compare_picker', href, 'home')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: c.primary, color: '#fff', borderRadius: r.full, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
          >
            <Scale size={15} /> Compare <ArrowRight size={14} />
          </Link>
        ) : (
          <span aria-disabled="true" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: '#E3E0D8', color: '#9B988E', borderRadius: r.full, fontSize: 14, fontWeight: 700 }}>
            <Scale size={15} /> Compare
          </span>
        )}
      </div>
    </div>
  )
}
