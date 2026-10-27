import Link from 'next/link'
import { Smartphone } from 'lucide-react'
import { SectionHeading } from './HomeSections'
import { formatUsd } from '@/lib/price'
import { valueScoreColor } from '@/lib/valueScore'
import { c, f, r } from '@/lib/tokens'
import type { Phone } from '@/lib/types'

function MiniCard({ phone, rank }: { phone: Phone; rank?: number }) {
  return (
    <Link
      href={phone.path}
      prefetch={false}
      className="home-card"
      style={{ position: 'relative', flexShrink: 0, width: 156, scrollSnapAlign: 'start', display: 'block', padding: '14px 12px', textAlign: 'center', background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md }}
    >
      {rank != null && (
        <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 700, color: c.text3 }}>#{rank}</span>
      )}
      <div style={{ width: 68, height: 68, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {phone.main_image_url
          ? <img src={phone.main_image_url} alt={phone.display_name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <Smartphone size={28} color={c.border} strokeWidth={1} />}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3, marginBottom: 2 }}>{phone.brand}</div>
      <div style={{ fontFamily: f.serif, fontSize: 14, color: c.text1, lineHeight: 1.25, marginBottom: 6, minHeight: 36, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {phone.name}
      </div>
      <div style={{ fontSize: 12, color: c.text3 }}>
        <strong style={{ color: c.text1, fontSize: 13 }}>{formatUsd(phone.price_usd)}</strong>
        {phone.overall_score != null && (
          <span style={{ marginLeft: 6, color: valueScoreColor(phone.overall_score), fontWeight: 700 }}>{phone.overall_score.toFixed(1)}</span>
        )}
      </div>
    </Link>
  )
}

const rail: React.CSSProperties = { display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 4 }
const wrap: React.CSSProperties = { maxWidth: 'var(--max-w)', margin: '0 auto', padding: '56px var(--page-px) 0' }

export function MostViewed({ phones }: { phones: Phone[] }) {
  if (!phones.length) return null
  return (
    <section aria-labelledby="most-viewed" style={wrap}>
      <SectionHeading id="most-viewed" title="Most viewed" sub="The phones people are opening most right now" />
      <div className="scrollbar-none" style={rail}>
        {phones.map((p, i) => <MiniCard key={p.id} phone={p} rank={i + 1} />)}
      </div>
    </section>
  )
}