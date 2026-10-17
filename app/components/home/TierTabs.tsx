'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Smartphone } from 'lucide-react'
import { formatUsd } from '@/lib/price'
import { TIER_ORDER, TIER_STYLE } from '@/lib/tiers'
import { c, f, r } from '@/lib/tokens'
import type { Phone, TierId } from '@/lib/types'

export default function TierTabs({ phones }: { phones: Phone[] }) {
  const byTier = TIER_ORDER.map(id => ({ id, label: TIER_STYLE[id].label, items: phones.filter(p => p.tier === id).slice(0, 3) })).filter(g => g.items.length > 0)
  const [active, setActive] = useState<TierId>(byTier[0]?.id ?? 'flagship')
  if (!byTier.length) return null

  return (
    <div>
      <div role="tablist" aria-label="Phone tiers" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {byTier.map(g => (
          <button
            key={g.id}
            role="tab"
            id={`tier-tab-${g.id}`}
            aria-selected={active === g.id}
            aria-controls={`tier-panel-${g.id}`}
            onClick={() => setActive(g.id)}
            style={{
              padding: '8px 16px', borderRadius: r.full, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${active === g.id ? c.primary : c.border}`,
              background: active === g.id ? c.primary : c.surface, color: active === g.id ? '#fff' : c.text2,
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {byTier.map(g => (
        <div key={g.id} role="tabpanel" id={`tier-panel-${g.id}`} aria-labelledby={`tier-tab-${g.id}`} hidden={active !== g.id} className="home-grid-3">
          {g.items.map((p, i) => (
            <Link key={p.id} href={p.path} className="home-phone-card" style={{ display: 'flex', alignItems: 'center', gap: 16, background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.lg, padding: 16, textDecoration: 'none' }}>
              <div style={{ width: 84, height: 84, flexShrink: 0, background: c.bg, borderRadius: r.md, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.main_image_url ? <img src={p.main_image_url} alt={p.display_name} loading="lazy" decoding="async" style={{ width: '82%', height: '82%', objectFit: 'contain' }} /> : <Smartphone size={26} color={c.border} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.accent, marginBottom: 3 }}>#{i + 1} in {g.label}</div>
                <div style={{ fontFamily: f.serif, fontSize: 17, color: c.text1, lineHeight: 1.2, marginBottom: 6 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: c.text3 }}>
                  <strong style={{ color: c.text1 }}>{formatUsd(p.price_usd)}</strong>
                  {p.overall_score != null ? ` · Score ${p.overall_score.toFixed(1)}` : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}
