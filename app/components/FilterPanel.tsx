'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'
import { c } from '@/lib/tokens'
import type { SearchFilters, FilterStats } from '@/lib/types'

interface FilterPanelProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  onReset: () => void
  showBrandFilter?: boolean
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3, marginBottom: 10 }}>
      {children}
    </div>
  )
}

function CheckItem({ label, count, checked, onChange }: {
  label: string; count?: number; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 'var(--r-sm)', cursor: 'pointer', transition: 'background 0.1s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = c.bg }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <div
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        style={{
          width: 18, height: 18, borderRadius: 4,
          border: `1.5px solid ${checked ? c.primary : c.border}`,
          background: checked ? c.primary : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.12s', cursor: 'pointer',
        }}
        onClick={() => onChange(!checked)}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(!checked) } }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 13, color: c.text1, flex: 1 }}>{label}</span>
      {count !== undefined && <span style={{ fontSize: 11, color: c.text3 }}>{count}</span>}
    </label>
  )
}

function RangeSelect({ value, options, onChange, label }: {
  value: string | number | undefined
  options: { label: string; value: string | number }[]
  onChange: (v: string | number | undefined) => void
  label: string
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ''}
      onChange={e => onChange(e.target.value === '' ? undefined : e.target.value)}
      style={{
        width: '100%', padding: '8px 10px', borderRadius: 'var(--r-sm)',
        border: `1px solid ${c.border}`, background: c.surface,
        fontSize: 13, color: c.text1, cursor: 'pointer', appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239A9A9A' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30,
      }}
    >
      <option value="">Any</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

const DIVIDER = <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - i).map(y => ({ label: String(y), value: y }))

const PRICE_DEBOUNCE_MS = 400

// Boolean device-feature filters. Each key maps directly to a FilterParams
// field the backend already supports (query.py's _BOOL list) but the UI
// never exposed — these are exactly the "hard filter" priorities /pick
// treats specially (HARD_FILTER_PRIORITIES in scoring.py), now available
// directly on the catalog instead of only through the guided flow.
const FEATURE_FILTERS: { key: keyof SearchFilters; label: string }[] = [
  { key: 'is_foldable', label: 'Foldable' },
  { key: 'water_resistant', label: 'Water/Dust Resistant' },
  { key: 'has_headphone_jack', label: 'Headphone Jack' },
  { key: 'has_nfc', label: 'NFC' },
  { key: 'has_wireless_charging', label: 'Wireless Charging' },
  { key: 'has_ois', label: 'Optical Image Stabilization' },
]

export default function FilterPanel({ filters, onChange, onReset, showBrandFilter = true }: FilterPanelProps) {
  const [mode, setMode] = useState<'simple' | 'expert'>('simple')
  const [stats, setStats] = useState<FilterStats | null>(null)
  const [brandsExpanded, setBrandsExpanded] = useState(false)
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => {
    if (filters.brands) return filters.brands.split(',').filter(Boolean)
    if (filters.brand) return [filters.brand]
    return []
  })

  // Local state for price inputs — debounced before propagating up
  const [localMin, setLocalMin] = useState(filters.min_price != null ? String(filters.min_price) : '')
  const [localMax, setLocalMax] = useState(filters.max_price != null ? String(filters.max_price) : '')
  const priceTimer = useRef<ReturnType<typeof setTimeout>>()

  // Restore persisted mode on mount (after hydration)
  useEffect(() => {
    const saved = localStorage.getItem('Specmob-filter-mode') as 'simple' | 'expert' | null
    if (saved === 'expert') setMode('expert')
  }, [])

  useEffect(() => {
    api.filters.stats().then(setStats).catch(() => {})
  }, [])

  useEffect(() => () => clearTimeout(priceTimer.current), [])

  // Sync selectedBrands when parent resets filters externally
  useEffect(() => {
    if (filters.brands) { setSelectedBrands(filters.brands.split(',').filter(Boolean)); return }
    setSelectedBrands(filters.brand ? [filters.brand] : [])
  }, [filters.brand, filters.brands])

  // Sync price locals when parent resets filters externally
  useEffect(() => {
    setLocalMin(filters.min_price != null ? String(filters.min_price) : '')
  }, [filters.min_price])

  useEffect(() => {
    setLocalMax(filters.max_price != null ? String(filters.max_price) : '')
  }, [filters.max_price])

  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch })

  const handleModeChange = (m: 'simple' | 'expert') => {
    setMode(m)
    localStorage.setItem('Specmob-filter-mode', m)
  }

  const handlePriceChange = (key: 'min_price' | 'max_price', raw: string) => {
    if (key === 'min_price') setLocalMin(raw)
    else setLocalMax(raw)

    clearTimeout(priceTimer.current)
    priceTimer.current = setTimeout(() => {
      set({ [key]: raw === '' ? undefined : Number(raw) })
    }, PRICE_DEBOUNCE_MS)
  }

  // Multi-brand: >1 selected sends `brands` (comma string, matches the
  // backend's FilterParams.brands), exactly 1 sends `brand` (unchanged
  // single-brand path), 0 clears both. Previously this collapsed to
  // `next.length === 1 ? next[0] : undefined` — checking a second box
  // silently discarded the whole selection.
  const toggleBrand = (brand: string) => {
    const next = selectedBrands.includes(brand)
      ? selectedBrands.filter(b => b !== brand)
      : [...selectedBrands, brand]
    setSelectedBrands(next)
    set({
      brand: next.length === 1 ? next[0] : undefined,
      brands: next.length > 1 ? next.join(',') : undefined,
    })
  }

  const toggleFeature = (key: keyof SearchFilters, current: boolean | undefined) => {
    set({ [key]: current === true ? undefined : true } as Partial<SearchFilters>)
  }

  const visibleBrands = stats
    ? (brandsExpanded ? stats.brands : stats.brands.slice(0, 8))
    : []

  return (
    <div style={{
      position: 'sticky', top: 'calc(var(--nav-h) + 16px)',
      maxHeight: 'calc(100vh - var(--nav-h) - 32px)', overflowY: 'auto',
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: 'var(--r-xl)', padding: 20,
      scrollbarWidth: 'thin', scrollbarColor: `${c.border} transparent`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: c.text1 }}>Filters</span>
        <button
          onClick={onReset}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: c.text3, transition: 'color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.accent }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text3 }}
        >
          <RotateCcw size={12} /> Reset all
        </button>
      </div>

      <div style={{ display: 'flex', background: c.bg, borderRadius: 'var(--r-sm)', padding: 3, marginBottom: 20 }}>
        {(['simple', 'expert'] as const).map(m => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            style={{
              flex: 1, padding: '7px 0', fontSize: 13, fontWeight: 500,
              borderRadius: 5, textTransform: 'capitalize',
              color: mode === m ? '#fff' : c.text3,
              background: mode === m ? c.primary : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <div>
        <SectionTitle>Price Range</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {(['min_price', 'max_price'] as const).map((key, i) => (
            <input
              key={key}
              type="number"
              min={0}
              aria-label={i === 0 ? 'Minimum price' : 'Maximum price'}
              placeholder={i === 0 ? 'Min $' : 'Max $'}
              value={i === 0 ? localMin : localMax}
              onChange={e => handlePriceChange(key, e.target.value)}
              style={{
                padding: '8px 10px', borderRadius: 'var(--r-sm)',
                border: `1px solid ${c.border}`, fontSize: 13,
                color: c.text1, background: c.surface, width: '100%',
              }}
            />
          ))}
        </div>
      </div>

      {showBrandFilter && (
        <>
          {DIVIDER}
          <div>
            <SectionTitle>Brand</SectionTitle>
            {visibleBrands.map(b => (
              <CheckItem
                key={b.brand} label={b.brand} count={b.count}
                checked={selectedBrands.includes(b.brand)}
                onChange={() => toggleBrand(b.brand)}
              />
            ))}
            {stats && stats.brands.length > 8 && (
              <button
                onClick={() => setBrandsExpanded(e => !e)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: c.text3, padding: '6px 8px', marginTop: 2, transition: 'color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.text2 }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text3 }}
              >
                {brandsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {brandsExpanded ? 'Show less' : `Show ${stats.brands.length - 8} more`}
              </button>
            )}
          </div>
        </>
      )}

      {DIVIDER}
      <div>
        <SectionTitle>Release Year</SectionTitle>
        <RangeSelect
          label="Minimum release year"
          value={filters.min_year}
          options={YEAR_OPTIONS}
          onChange={v => set({ min_year: v ? Number(v) : undefined })}
        />
      </div>

      {DIVIDER}
      <div>
        <SectionTitle>Min RAM</SectionTitle>
        <RangeSelect
          label="Minimum RAM"
          value={filters.min_ram}
          options={[4, 6, 8, 12, 16].map(r => ({ label: `${r} GB`, value: r }))}
          onChange={v => set({ min_ram: v ? Number(v) : undefined })}
        />
      </div>

      {DIVIDER}
      <div>
        <SectionTitle>Min Storage</SectionTitle>
        <RangeSelect
          label="Minimum storage"
          value={filters.min_storage}
          options={[64, 128, 256, 512, 1024].map(s => ({ label: s >= 1000 ? `${s / 1000}TB` : `${s} GB`, value: s }))}
          onChange={v => set({ min_storage: v ? Number(v) : undefined })}
        />
      </div>

      {DIVIDER}
      <div>
        <SectionTitle>Min Battery</SectionTitle>
        <RangeSelect
          label="Minimum battery capacity"
          value={filters.min_battery}
          options={[3000, 4000, 4500, 5000, 6000].map(b => ({ label: `${b.toLocaleString()} mAh`, value: b }))}
          onChange={v => set({ min_battery: v ? Number(v) : undefined })}
        />
      </div>

      {DIVIDER}
      <div>
        <SectionTitle>Main Camera</SectionTitle>
        <RangeSelect
          label="Minimum camera megapixels"
          value={filters.min_camera_mp}
          options={[12, 48, 50, 64, 108, 200].map(m => ({ label: `${m}+ MP`, value: m }))}
          onChange={v => set({ min_camera_mp: v ? Number(v) : undefined })}
        />
      </div>

      {DIVIDER}
      <div>
        <SectionTitle>Device Features</SectionTitle>
        {FEATURE_FILTERS.map(({ key, label }) => (
          <CheckItem
            key={key}
            label={label}
            checked={filters[key] === true}
            onChange={() => toggleFeature(key, filters[key] as boolean | undefined)}
          />
        ))}
      </div>

      {mode === 'expert' && (
        <>
          {DIVIDER}
          <div>
            <SectionTitle>
              Screen Size{' '}
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: c.accent, background: 'var(--accent-light)', padding: '1px 6px', borderRadius: 'var(--r-full)' }}>Expert</span>
            </SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {(['min_screen_size', 'max_screen_size'] as const).map((key, i) => (
                <input
                  key={key}
                  type="number" step="0.1"
                  aria-label={i === 0 ? 'Minimum screen size' : 'Maximum screen size'}
                  placeholder={i === 0 ? 'Min "' : 'Max "'}
                  value={filters[key] ?? ''}
                  onChange={e => set({ [key]: e.target.value ? Number(e.target.value) : undefined })}
                  style={{ padding: '8px 10px', borderRadius: 'var(--r-sm)', border: `1px solid ${c.border}`, fontSize: 13, color: c.text1, background: c.surface, width: '100%' }}
                />
              ))}
            </div>
          </div>

          {DIVIDER}
          <div>
            <SectionTitle>
              Chipset Tier{' '}
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: c.accent, background: 'var(--accent-light)', padding: '1px 6px', borderRadius: 'var(--r-full)' }}>Expert</span>
            </SectionTitle>
            {([
              { id: 'flagship', label: 'Flagship (SD 8 Elite, Dimensity 9xxx)' },
              { id: 'mid',      label: 'Upper Mid (SD 7xxx, Dimensity 8xxx)' },
              { id: 'entry',    label: 'Entry / Budget' },
            ] as const).map(({ id, label }) => (
              <CheckItem
                key={id} label={label}
                checked={filters.chipset_tier === id}
                onChange={checked => set({ chipset_tier: checked ? id : undefined })}
              />
            ))}
          </div>

          {DIVIDER}
          <div>
            <SectionTitle>
              Fast Charging{' '}
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: c.accent, background: 'var(--accent-light)', padding: '1px 6px', borderRadius: 'var(--r-full)' }}>Expert</span>
            </SectionTitle>
            <RangeSelect
              label="Minimum fast charging wattage"
              value={filters.min_charging_w}
              options={[18, 33, 45, 65, 100, 120].map(w => ({ label: `${w}W+`, value: w }))}
              onChange={v => set({ min_charging_w: v ? Number(v) : undefined })}
            />
          </div>

          {DIVIDER}
          <div>
            <SectionTitle>
              Refresh Rate{' '}
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: c.accent, background: 'var(--accent-light)', padding: '1px 6px', borderRadius: 'var(--r-full)' }}>Expert</span>
            </SectionTitle>
            <RangeSelect
              label="Minimum refresh rate"
              value={filters.min_refresh_rate}
              options={[90, 120, 144, 165].map(hz => ({ label: `${hz}Hz+`, value: hz }))}
              onChange={v => set({ min_refresh_rate: v ? Number(v) : undefined })}
            />
          </div>

          {DIVIDER}
          <div>
            <SectionTitle>
              Performance (AnTuTu){' '}
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: c.accent, background: 'var(--accent-light)', padding: '1px 6px', borderRadius: 'var(--r-full)' }}>Expert</span>
            </SectionTitle>
            <RangeSelect
              label="Minimum AnTuTu score"
              value={filters.min_antutu}
              options={[500_000, 1_000_000, 1_500_000, 2_000_000].map(a => ({ label: `${(a / 1_000_000).toFixed(1)}M+`, value: a }))}
              onChange={v => set({ min_antutu: v ? Number(v) : undefined })}
            />
          </div>

          {DIVIDER}
          <div>
            <SectionTitle>
              Max Weight{' '}
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: c.accent, background: 'var(--accent-light)', padding: '1px 6px', borderRadius: 'var(--r-full)' }}>Expert</span>
            </SectionTitle>
            <RangeSelect
              label="Maximum weight in grams"
              value={filters.max_weight}
              options={[160, 170, 180, 190, 200, 220].map(w => ({ label: `Under ${w}g`, value: w }))}
              onChange={v => set({ max_weight: v ? Number(v) : undefined })}
            />
          </div>
        </>
      )}
    </div>
  )
}
