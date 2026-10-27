import type { Phone, UpcomingStage } from './types'

export const UPCOMING_STAGES: readonly { id: UpcomingStage; label: string; sub: string }[] = [
  { id: 'launching_soon', label: 'Launching soon', sub: 'Release date within 60 days' },
  { id: 'announced', label: 'Announced', sub: 'Confirmed, release still ahead' },
  { id: 'rumored', label: 'Rumored', sub: 'Not announced yet' },
]

const PREFIX = /^\s*(coming soon\.?\s*)?(exp(?:ected|\.)?\s*)?release[d]?\s*/i

export function releaseLabel(p: Pick<Phone, 'stage' | 'release_date_full' | 'release_ts'>): string {
  if (p.stage === 'rumored') return 'Rumored'
  const raw = p.release_date_full?.replace(PREFIX, '').trim()
  if (raw) return raw
  if (p.release_ts) {
    return new Date(p.release_ts * 1000).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    })
  }
  return 'Date TBA'
}