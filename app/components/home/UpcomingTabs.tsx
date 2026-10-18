'use client'

import { useMemo, useState } from 'react'
import { SectionHeading } from './HomeSections'
import UpcomingCard from '@/app/components/upcoming/UpcomingCard'
import { UPCOMING_STAGES } from '@/lib/upcoming'
import { c, r } from '@/lib/tokens'
import type { Phone, UpcomingStage } from '@/lib/types'

export default function UpcomingTabs({ phones }: { phones: Phone[] }) {
  const groups = useMemo(
    () => UPCOMING_STAGES
      .map(s => ({ ...s, items: phones.filter(p => p.stage === s.id) }))
      .filter(g => g.items.length > 0),
    [phones],
  )
  const [active, setActive] = useState<UpcomingStage | undefined>(groups[0]?.id)
  if (!groups.length) return null
  const current = groups.find(g => g.id === active) ?? groups[0]

  return (
    <section aria-labelledby="upcoming" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '56px var(--page-px) 0' }}>
      <SectionHeading id="upcoming" title="Upcoming phones" sub={current.sub} />
      <div role="tablist" aria-label="Upcoming phone stages" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {groups.map(g => {
          const on = g.id === current.id
          return (
            <button
              key={g.id}
              role="tab"
              id={`up-tab-${g.id}`}
              aria-selected={on}
              aria-controls={`up-panel-${g.id}`}
              onClick={() => setActive(g.id)}
              style={{ padding: '8px 16px', borderRadius: r.full, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? c.primary : c.border}`, background: on ? c.primary : c.surface, color: on ? '#fff' : c.text2 }}
            >
              {g.label} <span style={{ opacity: 0.6, fontWeight: 500 }}>{g.items.length}</span>
            </button>
          )
        })}
      </div>
      <div
        role="tabpanel"
        id={`up-panel-${current.id}`}
        aria-labelledby={`up-tab-${current.id}`}
        className="scrollbar-none"
        style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 4 }}
      >
        {current.items.map(p => <UpcomingCard key={p.id} phone={p} />)}
      </div>
    </section>
  )
}
