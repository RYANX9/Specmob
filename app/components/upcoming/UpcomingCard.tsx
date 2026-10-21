import Link from 'next/link'
import { Smartphone } from 'lucide-react'
import { formatUsd } from '@/lib/price'
import { UPCOMING_STAGES, releaseLabel } from '@/lib/upcoming'
import { c, f, r } from '@/lib/tokens'
import type { Phone } from '@/lib/types'

export default function UpcomingCard({ phone, showStage = false, prefetch }: { phone: Phone; showStage?: boolean; prefetch?: boolean }) {
  const stage = UPCOMING_STAGES.find(s => s.id === phone.stage)
  const hot = phone.stage === 'launching_soon'
  const showPrice = phone.stage !== 'rumored' && phone.price_usd != null

  return (
    <Link
      href={phone.path}
      prefetch={prefetch}
      className="home-card"
      style={{ flexShrink: 0, width: 168, scrollSnapAlign: 'start', display: 'block', padding: '14px 12px', textAlign: 'center', background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md }}
    >
      <div style={{ width: 68, height: 68, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {phone.main_image_url
          ? <img src={phone.main_image_url} alt={phone.display_name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <Smartphone size={28} color={c.border} strokeWidth={1} />}
      </div>
      {showStage && stage && (
        <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: hot ? c.accent : c.text3, marginBottom: 3 }}>{stage.label}</div>
      )}
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3, marginBottom: 2 }}>{phone.brand}</div>
      <div style={{ fontFamily: f.serif, fontSize: 14, color: c.text1, lineHeight: 1.25, marginBottom: 8, minHeight: 36, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {phone.name}
      </div>
      <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, borderRadius: r.full, padding: '3px 10px', color: hot ? c.accent : c.text2, background: hot ? 'var(--accent-light)' : c.bg }}>
        {releaseLabel(phone)}
      </span>
      {showPrice && <div style={{ fontSize: 12.5, fontWeight: 700, color: c.text1, marginTop: 8 }}>{formatUsd(phone.price_usd)}</div>}
    </Link>
  )
}
