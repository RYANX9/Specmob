'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Smartphone, Check, Zap } from 'lucide-react'
import { ROUTES, brandSlug, phoneSlug, valueScoreColor } from '@/lib/config'
import { c, f } from '@/lib/tokens'
import type { Phone } from '@/lib/types'

interface PhoneCardProps {
  phone: Phone
  compareIds: number[]
  onCompareToggle: (phone: Phone) => void
  compact?: boolean
}

export default function PhoneCard({ phone, compareIds, onCompareToggle, compact }: PhoneCardProps) {
  const [imgErr, setImgErr] = useState(false)
  const [hovered, setHovered] = useState(false)
  const inCompare = compareIds.includes(phone.id)

  const href = ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))

  // key specs for the badge row — pick up to 3 that exist
  const badges: string[] = []
  if (phone.main_camera_mp)                               badges.push(`${phone.main_camera_mp}MP`)
  if (phone.battery_capacity)                             badges.push(`${(phone.battery_capacity / 1000).toFixed(1).replace('.0','')}k mAh`)
  if (phone.ram_options?.length)                          badges.push(`${Math.max(...phone.ram_options!)}GB RAM`)
  if (badges.length < 3 && phone.screen_size)             badges.push(`${phone.screen_size}"`)
  if (badges.length < 3 && phone.fast_charging_w)         badges.push(`${phone.fast_charging_w}W`)

  const isNew = phone.release_year === new Date().getFullYear()

  return (
    <div
      style={{
        background: c.surface,
        border: `1px solid ${hovered ? 'var(--border-hover)' : c.border}`,
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        transition: 'all 0.15s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* New badge */}
      {isNew && (
        <div style={{
          position: 'absolute', top: 8, right: 8, zIndex: 3,
          background: 'var(--accent)', color: '#fff',
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
          padding: '2px 6px', borderRadius: 'var(--r-full)',
        }}>
          New
        </div>
      )}

      {/* Compare checkbox */}
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); onCompareToggle(phone) }}
        style={{
          position: 'absolute', top: 8, left: 8, zIndex: 3,
          width: 20, height: 20, borderRadius: 4,
          border: `1.5px solid ${inCompare ? 'var(--accent)' : c.border}`,
          background: inCompare ? 'var(--accent)' : 'rgba(255,255,255,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', cursor: 'pointer',
          backdropFilter: 'blur(4px)',
        }}
        title={inCompare ? 'Remove from compare' : 'Add to compare'}
      >
        {inCompare && <Check size={11} color="#fff" strokeWidth={2.5} />}
      </button>

      <Link href={href} style={{ display: 'block', textDecoration: 'none' }}>
        {/* Image — shorter aspect ratio for compact feel */}
        <div style={{
          width: '100%',
          aspectRatio: compact ? '4/3' : '1',
          background: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: compact ? 12 : 16,
          overflow: 'hidden',
        }}>
          {phone.main_image_url && !imgErr ? (
            <img
              src={phone.main_image_url}
              alt={phone.model_name}
              onError={() => setImgErr(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                transition: 'transform 0.2s ease',
                transform: hovered ? 'scale(1.05)' : 'scale(1)',
              }}
            />
          ) : (
            <Smartphone size={compact ? 28 : 36} color="var(--border)" strokeWidth={1.5} />
          )}
        </div>

        {/* Info */}
        <div style={{ padding: compact ? '8px 10px 10px' : '10px 12px 12px' }}>
          <div style={{
            fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
            color: c.text3, marginBottom: 2,
          }}>
            {phone.brand}
          </div>
          <div style={{
            fontFamily: f.serif,
            fontSize: compact ? 13 : 14,
            color: c.text1, lineHeight: 1.3, marginBottom: 4,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {phone.model_name}
          </div>

          <div style={{
            fontSize: compact ? 14 : 16, fontWeight: 700,
            color: phone.price_usd ? c.text1 : c.text3,
            marginBottom: compact ? 6 : 8,
          }}>
            {phone.price_usd ? `$${phone.price_usd.toLocaleString()}` : 'Price TBA'}
          </div>

          {/* Compact badge row */}
          {!compact && badges.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
              {badges.slice(0, 3).map(b => (
                <span key={b} style={{
                  fontSize: 10, fontWeight: 500, color: c.text3,
                  background: c.bg, borderRadius: 'var(--r-full)',
                  padding: '2px 6px', border: `1px solid ${c.border}`,
                }}>
                  {b}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          {!compact && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingTop: 7, borderTop: `1px solid ${c.border}`,
            }}>
              {phone.value_score != null ? (
                <span style={{ fontSize: 11, color: c.text3 }}>
                  Value: <span style={{ fontWeight: 600, color: valueScoreColor(phone.value_score) }}>
                    {phone.value_score.toFixed(1)}
                  </span>/10
                </span>
              ) : <span />}
              {phone.release_year && (
                <span style={{ fontSize: 10, color: c.text3 }}>{phone.release_year}</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}

export function PhoneCardSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div style={{
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
    }}>
      <div className="skeleton" style={{ width: '100%', aspectRatio: compact ? '4/3' : '1' }} />
      <div style={{ padding: compact ? '8px 10px 10px' : '10px 12px 12px' }}>
        <div className="skeleton" style={{ height: 9, width: '35%', marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 13, width: '88%', marginBottom: 3 }} />
        <div className="skeleton" style={{ height: 13, width: '65%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 8 }} />
        {!compact && (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 18, width: 52, borderRadius: 99 }} />)}
            </div>
            <div className="skeleton" style={{ height: 1, width: '100%', marginBottom: 6 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton" style={{ height: 11, width: 60 }} />
              <div className="skeleton" style={{ height: 11, width: 30 }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
