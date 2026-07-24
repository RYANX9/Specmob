// Single source of truth for value_score math and presentation on the
// frontend. Two jobs live here:
//
// 1. specComposite — the client-side fallback used only when a phone has
//    no value_score from the server at all. Must produce the exact same
//    0-10 scale as app/core/scoring.py:spec_composite, weight-for-weight,
//    or a phone renders a different "~7.x" depending which component
//    happened to draw it (this was bug #8 — the old CompareClient version
//    was missing the screen_size term entirely and under-weighted RAM,
//    capping out at 8.5 instead of 10).
// 2. valueScoreColor — the one color scale for value_score everywhere.
//    Previously lib/config.ts and app/pick/page.tsx each hand-rolled their
//    own thresholds and disagreed (a 7.5 read as "good" on one page and
//    "mediocre" on another). There is now exactly one scale.

interface SpecCompositeInput {
  antutu_score?: number | null
  main_camera_mp?: number | null
  battery_capacity?: number | null
  ram_options?: number[] | null
  fast_charging_w?: number | null
  screen_size?: number | null
}

export function specComposite(p: SpecCompositeInput): number {
  let s = 0
  if (p.antutu_score)              s += Math.min(p.antutu_score / 2_000_000, 1) * 3.0
  if (p.main_camera_mp)            s += Math.min(p.main_camera_mp / 200, 1) * 2.0
  if (p.battery_capacity)          s += Math.min(p.battery_capacity / 7_000, 1) * 2.0
  if (p.ram_options?.length)       s += Math.min(Math.max(...p.ram_options) / 16, 1) * 1.5
  if (p.fast_charging_w)           s += Math.min(p.fast_charging_w / 100, 1) * 1.0
  if (p.screen_size)               s += Math.min(p.screen_size / 7.0, 1) * 0.5
  return s
}

// One scale, four bands. Matches the richer of the two prior scales
// (pick/page.tsx's) since it gives more useful separation than a flat
// three-band split — applied identically wherever a value_score renders.
export function valueScoreColor(score: number | null | undefined): string {
  if (score == null)    return 'var(--text-3)'
  if (score >= 9)       return 'var(--green)'
  if (score >= 7.5)     return 'var(--blue)'
  if (score >= 6)       return 'var(--text-2)'
  return 'var(--orange)'
}

// Resolves the display score for a phone: server value_score wins outright,
// spec composite is the last-resort local estimate. Also reports which
// source it came from, since UI that shows an estimated (~) badge needs to
// know it's not the server-computed number.
export function resolveValueScore(p: SpecCompositeInput & { value_score?: number | null }): {
  score: number
  isEstimate: boolean
} {
  if (p.value_score != null) return { score: p.value_score, isEstimate: false }
  return { score: specComposite(p), isEstimate: true }
}
