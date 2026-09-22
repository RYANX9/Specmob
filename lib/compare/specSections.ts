// lib/compare/specSections.ts
// Pure spec-table logic: section/row config + the per-row value parsers.
// No JSX, no React — CompareClient just imports SPEC_SECTIONS and renders it.

import type { Phone } from '@/lib/types'
import {
  getPanelType, getFrontCamera, getBuildMaterial, getWaterResistance,
  getThicknessMm, getPeakBrightnessNits, getGeekbenchSingle, getFeaturesText,
} from '@/lib/specs'
import { getChipsetTierLabel } from '@/lib/tiers'

export function fmt(v: number | null, suffix = ''): string {
  if (v == null) return '—'
  return `${v.toLocaleString()}${suffix}`
}

// ─── Resolution: strip "pixels", render as a × equation, rank by pixel count ──

export function parseResolution(res: string | null): { text: string; pixels: number | null } {
  if (!res) return { text: '—', pixels: null }
  const match = res.match(/(\d+)\s*x\s*(\d+)/i)
  if (!match) return { text: res, pixels: null } // fall back to raw string if it doesn't parse
  const w = parseInt(match[1], 10)
  const h = parseInt(match[2], 10)
  return { text: `${w.toLocaleString()} × ${h.toLocaleString()}`, pixels: w * h }
}

// ─── Wireless charging: give it a getRaw so getBestIdx can actually run ──────
// Phones without wireless charging return null (excluded from comparison),
// not 0 — that keeps "no wireless charging vs 15W" from reading as a real
// numeric spread with a highlighted "winner" at 15W.

export function wirelessChargingText(p: Phone): string {
  if (p.has_wireless_charging == null) return '—'
  if (!p.has_wireless_charging) return 'No'
  return p.wireless_charging_w ? `${p.wireless_charging_w}W` : 'Yes'
}

export function wirelessChargingRaw(p: Phone): number | null {
  if (!p.has_wireless_charging) return null
  return p.wireless_charging_w ?? 1 // has it, wattage just isn't published
}

// ─── Table config ──────────────────────────────────────────────────────────

export interface SpecRowDef {
  label: string
  getValue: (p: Phone) => string
  getRaw?: (p: Phone) => number | null
  lower?: boolean
}

export interface SpecSectionDef {
  title: string
  iconKey: 'display' | 'camera' | 'performance' | 'battery' | 'build'
  rows: SpecRowDef[]
}

// iconKey instead of a JSX icon here — keeps this file icon-library-free.
// CompareClient maps iconKey -> lucide icon when it renders the section header.

export const SPEC_SECTIONS: SpecSectionDef[] = [
  {
    title: 'Display', iconKey: 'display',
    rows: [
      { label: 'Screen Size',     getValue: p => fmt(p.screen_size, '"'), getRaw: p => p.screen_size },
      { label: 'Resolution',      getValue: p => parseResolution(p.screen_resolution).text, getRaw: p => parseResolution(p.screen_resolution).pixels },
      { label: 'Panel Type',      getValue: p => p.display_type ?? getPanelType(p) },
      { label: 'Refresh Rate',    getValue: p => fmt(p.refresh_rate_hz, 'Hz'), getRaw: p => p.refresh_rate_hz },
      { label: 'Peak Brightness', getValue: p => fmt(getPeakBrightnessNits(p), ' nits'), getRaw: getPeakBrightnessNits },
    ],
  },
  {
    title: 'Camera', iconKey: 'camera',
    rows: [
      { label: 'Main Camera',  getValue: p => fmt(p.main_camera_mp, ' MP'), getRaw: p => p.main_camera_mp },
      { label: 'Camera Setup', getValue: p => p.camera_setup_type ? p.camera_setup_type[0].toUpperCase() + p.camera_setup_type.slice(1) : '—' },
      { label: 'Optical Zoom', getValue: p => p.optical_zoom ?? '—' },
      { label: 'OIS',          getValue: p => p.has_ois == null ? '—' : p.has_ois ? 'Yes' : 'No' },
      { label: 'Front Camera', getValue: getFrontCamera },
      { label: 'Features',     getValue: getFeaturesText },
    ],
  },
  {
    title: 'Performance', iconKey: 'performance',
    rows: [
      { label: 'Chipset',   getValue: p => p.chipset ?? '—' },
      { label: 'AnTuTu',    getValue: p => fmt(p.antutu_score), getRaw: p => p.antutu_score },
      { label: 'Geekbench', getValue: p => fmt(getGeekbenchSingle(p)), getRaw: getGeekbenchSingle },
      { label: 'GPU Score', getValue: p => fmt(p.gpu_score), getRaw: p => p.gpu_score },
      { label: 'RAM',       getValue: p => p.ram_options?.length ? `${Math.max(...p.ram_options)} GB` : '—', getRaw: p => p.ram_options?.length ? Math.max(...p.ram_options) : null },
      { label: 'Storage',   getValue: p => p.storage_options?.length ? `${Math.max(...p.storage_options)} GB` : '—', getRaw: p => p.storage_options?.length ? Math.max(...p.storage_options) : null },
    ],
  },
  {
    title: 'Battery', iconKey: 'battery',
    rows: [
      { label: 'Capacity',        getValue: p => fmt(p.battery_capacity, ' mAh'), getRaw: p => p.battery_capacity },
      { label: 'Fast Charge',     getValue: p => fmt(p.fast_charging_w, 'W'),     getRaw: p => p.fast_charging_w },
      { label: 'Wireless Charge', getValue: wirelessChargingText, getRaw: wirelessChargingRaw },
    ],
  },
  {
    title: 'Build', iconKey: 'build',
    rows: [
      { label: 'Weight',           getValue: p => fmt(p.weight_g, 'g'), getRaw: p => p.weight_g, lower: true },
      { label: 'Thickness',        getValue: p => fmt(getThicknessMm(p), 'mm'), getRaw: getThicknessMm, lower: true },
      { label: 'Build Material',   getValue: getBuildMaterial },
      { label: 'Water Resistance', getValue: getWaterResistance },
      { label: 'Chipset Tier',     getValue: p => getChipsetTierLabel(p.chipset_tier) },
    ],
  },
]
