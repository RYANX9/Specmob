'use client'

import Link from 'next/link'
import { Search, Smartphone } from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import CompareBar from '@/app/components/CompareBar'
import PhoneCard from '@/app/components/PhoneCard'
import { useToast } from '@/app/components/Toast'
import { useCompare } from '@/lib/compareStore'
import { MAX_COMPARE, ROUTES } from '@/lib/config'
import { c, f, mq } from '@/lib/tokens'
import type { CSSProperties } from 'react'
import type { Phone, SearchResponse } from '@/lib/types'

interface Props {
  q: string
  data: SearchResponse | null
  failed: boolean
}

export default function SearchResultsClient({ q, data, failed }: Props) {
  const { toast } = useToast()
  const { phones: compare, add, remove } = useCompare()

  const results = data?.results ?? []
  const compareIds = compare.map(phone => phone.id)

  const toggle = (phone: Phone) => {
    const alreadyCompared = compare.some(item => item.id === phone.id)

    if (alreadyCompared) {
      remove(phone.id)
      toast('Removed from compare', 'info')
      return
    }

    if (compare.length >= MAX_COMPARE) {
      toast(`Maximum ${MAX_COMPARE} phones`, 'error')
      return
    }

    add(phone)
    toast('Added to compare', 'success')
  }

  const pill: CSSProperties = {
    padding: '9px 16px',
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 'var(--r-full)',
    fontSize: 13,
    fontWeight: 600,
    color: c.text1,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  }

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar />

      <main
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '0 var(--page-px) 72px',
        }}
      >
        <header style={{ padding: '36px 0 24px' }}>
          <h1
            style={{
              fontFamily: f.serif,
              fontSize: 'clamp(26px, 3.5vw, 38px)',
              color: c.text1,
              fontWeight: 400,
              letterSpacing: '-0.5px',
              marginBottom: 8,
            }}
          >
            {q ? <>Results for &ldquo;{q}&rdquo;</> : 'Search phones'}
          </h1>

          {data && (
            <p style={{ fontSize: 14, color: c.text3 }}>
              {data.total > results.length
                ? `Top ${results.length} of ${data.total} matches`
                : `${data.total} phone${data.total === 1 ? '' : 's'} found`}
            </p>
          )}

          {!q && (
            <p style={{ fontSize: 14, color: c.text3 }}>
              Use the search bar above to find a phone by name, brand or chipset.
            </p>
          )}

          {failed && (
            <p role="status" style={{ fontSize: 14, color: c.text3 }}>
              Search is unavailable right now. Please try again in a moment.
            </p>
          )}
        </header>

        {results.length > 0 && (
          <div className="search-grid">
            {results.map(phone => (
              <PhoneCard
                key={phone.id}
                phone={phone}
                compareIds={compareIds}
                onCompareToggle={toggle}
              />
            ))}
          </div>
        )}

        {q && data && results.length === 0 && (
          <section style={{ textAlign: 'center', padding: '40px 0' }}>
            <Smartphone
              size={48}
              color={c.border}
              strokeWidth={1.2}
              style={{ margin: '0 auto 14px' }}
            />

            <h2
              style={{
                fontFamily: f.serif,
                fontSize: 22,
                color: c.text1,
                fontWeight: 400,
                marginBottom: 8,
              }}
            >
              No phones matched your search
            </h2>

            <p style={{ fontSize: 14, color: c.text3, marginBottom: 20 }}>
              Check the spelling, or try a brand or model number.
            </p>

            {data.empty?.closest && data.empty.closest.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: c.text3,
                    marginBottom: 10,
                  }}
                >
                  Closest matches
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    justifyContent: 'center',
                  }}
                >
                  {data.empty.closest.map(phone => (
                    <Link key={phone.id} href={phone.path} style={pill}>
                      {phone.display_name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
              }}
            >
              {(data.empty?.categories ?? []).map(category => (
                <Link key={category.slug} href={category.path} style={pill}>
                  {category.title}
                </Link>
              ))}

              <Link href={ROUTES.best} style={pill}>
                All rankings
              </Link>

              <Link href={ROUTES.brands} style={pill}>
                Browse brands
              </Link>

              <Link href={ROUTES.pick} style={pill}>
                Help me choose
              </Link>
            </div>
          </section>
        )}

        {!q && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link href={ROUTES.best} style={pill}>
              <Search size={13} />
              Browse rankings
            </Link>

            <Link href={ROUTES.brands} style={pill}>
              Browse brands
            </Link>

            <Link href={ROUTES.pick} style={pill}>
              Help me choose
            </Link>
          </div>
        )}
      </main>

      <Footer />
      <CompareBar />

      <style>{`
        .search-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 14px;
        }

        ${mq.md} {
          .search-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
        }
      `}</style>
    </div>
  )
}

