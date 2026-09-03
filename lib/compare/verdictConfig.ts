// lib/compare/verdictConfig.ts
// Pure "which phone wins this category" logic. No JSX.

import type { Phone } from '@/lib/types'

export interface VerdictItem {
  iconKey: 'camera' | 'battery' | 'charging' | 'performance' | 'display' | 'weight' | 'value'
  label: string
  unit: string
  getter: (p: Phone) => number | null
  desc: string
  lower?: boolean
}

export const VERDICTS: VerdictItem[] = [
  { iconKey: 'camera',      label: 'Camera',      unit: ' MP',  getter: p => p.main_camera_mp,      desc: 'Main sensor resolution' },
  { iconKey: 'battery',     label: 'Battery',     unit: ' mAh', getter: p => p.battery_capacity,    desc: 'Battery capacity' },
  { iconKey: 'charging',    label: 'Charging',    unit: 'W',    getter: p => p.fast_charging_w,     desc: 'Wired charging speed' },
  { iconKey: 'performance', label: 'Performance', unit: ' pts', getter: p => p.antutu_score,        desc: 'AnTuTu benchmark' },
  { iconKey: 'display',     label: 'Display',     unit: '"',    getter: p => p.screen_size,         desc: 'Screen size' },
  { iconKey: 'weight',      label: 'Weight',      unit: 'g',    getter: p => p.weight_g,            desc: 'Total weight', lower: true },
  { iconKey: 'value',       label: 'Value',       unit: '/10',  getter: p => p.value_score ?? null, desc: 'Specs-per-dollar (server score)' },
]

/**
 * Returns the index of the single phone with the best value for `getter`,
 * or -1 if there's no valid data or a tie (ties are deliberately not
 * highlighted — see CategoryBreakdown / SpecTable, which render "≈ Tie").
 */
export function getBestIdx(phones: Phone[], getter: (p: Phone) => number | null, lower = false): number {
  const values = phones.map(getter)
  const valid  = values.filter((v): v is number => v != null)
  if (valid.length === 0) return -1
  const best = lower ? Math.min(...valid) : Math.max(...valid)
  const bestIndices = values.reduce<number[]>((acc, v, i) => {
    if (v === best) acc.push(i)
    return acc
  }, [])
  return bestIndices.length !== 1 ? -1 : bestIndices[0]
}

/**
 * Optional: require a minimum score gap before crowning a winner in the
 * hero verdict, so a 0.1-point AI value_score gap doesn't read as
 * definitive when the loser objectively won more raw-spec categories.
 * Wire this into VerdictHero if you want "too close to call" framing —
 * see the isClose check that already exists there.
 */
export function isCloseCall(topScore: number, secondScore: number, threshold = 0.3): boolean {
  return topScore - secondScore < threshold
}
