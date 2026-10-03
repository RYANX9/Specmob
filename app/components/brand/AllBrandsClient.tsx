'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, ChevronRight, ArrowRight, Smartphone, X } from 'lucide-react'
import { ROUTES, phoneSlug, brandSlug, stripBrandFromDisplayName } from '@/lib/config'
import { getBrandInfo, getBrandInitial } from '@/lib/brandData'
import { formatDisplayPrice } from '@/lib/price'
import { c, f, r, sh, z, mq } from '@/lib/tokens'
import type { Phone } from '@/lib/types'

export interface BrandSummary {
  brand: string
  slug: string
  count: number
}

export interface FeaturedBrand extends BrandSummary {
  phones: Phone[]
}

function letterOf(name: string): string {
  const ch = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().charAt(0).toUpperCase()
  return /[A-Z]/.test(ch) ? ch : '#'
}

function BrandLogo({ name, slug, size = 48 }: { name: string; slug: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const logo = getBrandInfo(slug)?.logo

  return (
    <div
      style={{
        width: size, height: size, flexShrink: 0, padding: Math.round(size * 0.15), background: c.bg,
        border: `1px solid ${c.border}`, borderRadius: size > 36 ? r.md : r.sm,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {logo && !failed ? (
        <img
          src={logo}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        <span style={{ fontFamily: f.serif, fontSize: size * 0.45, color: c.primary }}>{getBrandInitial(name)}</span>
      )}
    </div>
  )
}

function PhoneTile({ phone }: { phone: Phone }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <Link href={ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))} className="ab-phone">
      <div className="ab-phone-img">
        {phone.main_image_url && !imgErr ? (
          <img
            src={phone.main_image_url}
            alt={phone.model_name}
            loading="lazy"
            decoding="async"
            onError={() => setImgErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <Smartphone size={20} color={c.border} strokeWidth={1.25} />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="ab-phone-name">{stripBrandFromDisplayName(phone.model_name, phone.brand)}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: c.text2 }}>{formatDisplayPrice(phone)}</div>
      </div>
    </Link>
  )
}

function FeaturedCard({ entry }: { entry: FeaturedBrand }) {
  const href = ROUTES.brand(entry.slug)

  return (
    <article className="ab-card">
      <Link href={href} className="ab-card-head">
        <BrandLogo name={entry.brand} slug={entry.slug} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: f.serif, fontSize: 21, fontWeight: 400, color: c.text1, lineHeight: 1.15 }}>
            {entry.brand}
          </h3>
          <div style={{ fontSize: 12.5, color: c.text3, marginTop: 2 }}>
            {entry.count} {entry.count === 1 ? 'phone' : 'phones'}
          </div>
        </div>
        <ChevronRight size={16} color={c.text3} />
      </Link>

      {entry.phones.length > 0 ? (
        <div className="ab-phones">
          {entry.phones.map(p => <PhoneTile key={p.id} phone={p} />)}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: c.text3, padding: '4px 0 12px' }}>No phones to preview yet.</p>
      )}

      <Link href={href} className="ab-more">
        View all {entry.brand} phones <ArrowRight size={13} />
      </Link>
    </article>
  )
}

function BrandRow({ entry }: { entry: BrandSummary }) {
  return (
    <Link href={ROUTES.brand(entry.slug)} className="ab-row">
      <BrandLogo name={entry.brand} slug={entry.slug} size={32} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: c.text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {entry.brand}
      </span>
      <span style={{ fontSize: 12, color: c.text3 }}>{entry.count}</span>
    </Link>
  )
}

export default function AllBrandsClient({ featured, all }: { featured: FeaturedBrand[]; all: BrandSummary[] }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const groups = useMemo(() => {
    const list = q ? all.filter(b => b.brand.toLowerCase().includes(q)) : all
    const map = new Map<string, BrandSummary[]>()
    for (const b of [...list].sort((a, b) => a.brand.localeCompare(b.brand))) {
      const l = letterOf(b.brand)
      map.set(l, [...(map.get(l) ?? []), b])
    }
    return [...map.entries()].sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
  }, [all, q])

  const matchCount = groups.reduce((n, [, items]) => n + items.length, 0)

  return (
    <>
      {!q && featured.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <h2 className="ab-heading">Popular brands</h2>
          <div className="ab-grid">
            {featured.map(entry => <FeaturedCard key={entry.slug} entry={entry} />)}
          </div>
        </section>
      )}

      <div className="ab-bar">
        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search
            size={15}
            color={c.text3}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter brands..."
            aria-label="Filter brands"
            style={{
              width: '100%', height: 38, padding: '0 34px 0 38px', background: c.surface,
              border: `1px solid ${c.border}`, borderRadius: r.full, fontSize: 13.5, color: c.text1,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear filter"
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: c.text3 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <nav aria-label="Jump to letter" className="ab-letters scrollbar-none">
          {groups.map(([letter]) => (
            <a key={letter} href={`#brands-${letter === '#' ? 'other' : letter}`} className="ab-letter">
              {letter}
            </a>
          ))}
        </nav>
      </div>

      <section>
        <h2 className="ab-heading">
          All brands <span style={{ color: c.text3, fontSize: 14, fontFamily: f.sans }}>({matchCount})</span>
        </h2>

        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: c.text3 }}>
            <Smartphone size={44} color={c.border} strokeWidth={1.25} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15 }}>No brands match &ldquo;{query}&rdquo;.</p>
          </div>
        ) : (
          groups.map(([letter, items]) => (
            <div key={letter} id={`brands-${letter === '#' ? 'other' : letter}`} className="ab-group">
              <div className="ab-group-letter">{letter}</div>
              <div className="ab-rows">
                {items.map(b => <BrandRow key={b.slug} entry={b} />)}
              </div>
            </div>
          ))
        )}
      </section>

      <style>{`
        .ab-heading { font-family: ${f.serif}; font-size: 24px; font-weight: 400; color: ${c.text1}; margin-bottom: 18px; }
        .ab-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .ab-card {
          display: flex; flex-direction: column; background: ${c.surface}; border: 1px solid ${c.border};
          border-radius: ${r.lg}; padding: 18px; transition: border-color 150ms ease, box-shadow 150ms ease;
        }
        .ab-card:hover { border-color: ${c.borderHover}; box-shadow: ${sh.md}; }
        .ab-card-head { display: flex; align-items: center; gap: 14px; padding-bottom: 16px; margin-bottom: 14px; border-bottom: 1px solid ${c.border}; }
        .ab-phones { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
        .ab-phone {
          display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: ${r.md};
          border: 1px solid transparent; background: ${c.bg}; transition: border-color 120ms ease, background 120ms ease;
        }
        .ab-phone:hover { border-color: ${c.borderHover}; background: ${c.surface}; }
        .ab-phone-img { width: 40px; height: 40px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .ab-phone-name {
          font-family: ${f.serif}; font-size: 13px; line-height: 1.25; color: ${c.text1}; margin-bottom: 2px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .ab-more { margin-top: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 600; color: ${c.accent}; }
        .ab-more:hover { text-decoration: underline; text-underline-offset: 3px; }

        .ab-bar {
          position: sticky; top: var(--nav-h); z-index: ${z.sticky}; display: flex; align-items: center; gap: 16px;
          padding: 12px 0; margin-bottom: 20px; background: rgba(247,245,240,0.92);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid ${c.border};
        }
        .ab-letters { display: flex; gap: 2px; overflow-x: auto; flex: 1; min-width: 0; }
        .ab-letter {
          min-width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: ${r.sm};
          font-size: 12.5px; font-weight: 600; color: ${c.text2}; transition: background 120ms ease, color 120ms ease;
        }
        .ab-letter:hover { background: ${c.primary}; color: #fff; }

        .ab-group { display: grid; grid-template-columns: 56px 1fr; gap: 12px; padding: 18px 0; border-bottom: 1px solid ${c.border}; scroll-margin-top: calc(var(--nav-h) + 72px); }
        .ab-group-letter { font-family: ${f.serif}; font-size: 34px; line-height: 1; color: ${c.text3}; }
        .ab-rows { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px 14px; }
        .ab-row {
          display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: ${r.md};
          transition: background 120ms ease;
        }
        .ab-row:hover { background: ${c.surface}; }

        ${mq.xl} { .ab-rows { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        ${mq.lg} { .ab-rows { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        ${mq.md} {
          .ab-grid { grid-template-columns: 1fr; }
          .ab-bar { flex-direction: column; align-items: stretch; gap: 8px; }
          .ab-group { grid-template-columns: 1fr; gap: 6px; }
        }
        ${mq.sm} { .ab-rows { grid-template-columns: 1fr; } .ab-phones { grid-template-columns: 1fr; } }
      `}</style>
    </>
  )
}
