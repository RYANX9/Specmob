'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { c, f, r, sh } from '@/lib/tokens'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Specmob] Unhandled error:', error)
  }, [error])

  const digest = error.digest ?? 'unknown'

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: c.bg,
      fontFamily: 'var(--font-sans)',
    }}>

      {/*
        Intentionally not using <Navbar> here. Navbar depends on useSearchParams,
        requires Suspense, and can itself throw — all of which are bad properties
        for a component sitting inside an error boundary. This inline header is
        intentionally minimal and self-contained.
      */}
      <header style={{
        height: 'var(--nav-h)',
        borderBottom: `1px solid ${c.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--page-px)',
      }}>
        <Link
          href="/"
          style={{
            fontFamily: f.serif,
            fontSize: 22,
            color: c.primary,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            letterSpacing: '-0.4px',
          }}
        >
          <img src="/logored.svg" alt="" aria-hidden="true" style={{ height: '1em', width: 'auto' }} />
          Specmob
        </Link>

        <nav style={{
          marginLeft: 'auto',
          display: 'flex',
          gap: 4,
        }}>
          {[
            { label: 'Browse',        href: '/' },
            { label: 'Compare',       href: '/compare' },
            { label: 'Help Me Choose',  href: '/pick' },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              style={{
                padding: '7px 12px',
                fontSize: 14,
                fontWeight: 500,
                color: c.text2,
                borderRadius: r.sm,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.text1 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text2 }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px var(--page-px)',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 520,
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: r.xl,
          padding: '36px 40px',
          boxShadow: sh.md,
        }}>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            background: 'var(--accent-light)',
            border: '1px solid var(--accent-border)',
            borderRadius: r.full,
            fontSize: 11,
            fontWeight: 700,
            color: c.accent,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
            marginBottom: 20,
          }}>
            500 — Server Error
          </div>

          <h1 style={{
            fontFamily: f.serif,
            fontSize: 28,
            color: c.text1,
            letterSpacing: '-0.4px',
            marginBottom: 12,
          }}>
            Something went wrong.
          </h1>

          <p style={{
            fontSize: 15,
            color: c.text2,
            lineHeight: 1.65,
            marginBottom: 28,
          }}>
            An unexpected error occurred on our end. Your data is safe — nothing was lost.
            Try again now, or come back in a moment if the problem persists.
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' as const }}>
            <button
              onClick={reset}
              style={{
                flex: 1,
                minWidth: 120,
                padding: '11px 20px',
                background: c.primary,
                color: '#fff',
                borderRadius: r.full,
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
            >
              Try Again
            </button>
            <Link
              href="/"
              style={{
                flex: 1,
                minWidth: 120,
                padding: '11px 20px',
                background: 'transparent',
                color: c.text2,
                borderRadius: r.full,
                fontSize: 14,
                fontWeight: 500,
                border: `1px solid ${c.border}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'center' as const,
                display: 'block',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
            >
              Go Home
            </Link>
          </div>

          <details style={{
            border: `1px solid ${c.border}`,
            borderRadius: r.md,
            overflow: 'hidden',
            marginBottom: 24,
          }}>
            <summary style={{
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 500,
              color: c.text3,
              cursor: 'pointer',
              userSelect: 'none' as const,
              background: c.bg,
              listStyle: 'none',
            }}>
              Technical details
            </summary>
            <div style={{
              background: c.primary,
              color: 'rgba(255,255,255,0.7)',
              padding: '14px 16px',
              fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
              fontSize: 12,
              lineHeight: 1.7,
            }}>
              <div>digest: {digest}</div>
              <div>message: {error.message || 'No message available'}</div>
              <div>time: {new Date().toISOString()}</div>
            </div>
          </details>

          <p style={{ fontSize: 12, color: c.text3, textAlign: 'center' as const }}>
            Problem persisting?{' '}
            <a
              href="mailto:hello@Specmob.com"
              style={{ color: c.text2, textDecoration: 'underline' }}
            >
              Contact us
            </a>
          </p>
        </div>
      </main>

      <footer style={{
        borderTop: `1px solid ${c.border}`,
        padding: '20px var(--page-px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap' as const,
        gap: 12,
      }}>
        <span style={{ fontFamily: f.serif, fontSize: 16, color: c.primary }}>Specmob</span>
        <nav style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Browse',   href: '/' },
            { label: 'Compare',  href: '/compare' },
            { label: 'About',    href: '/about' },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              style={{ fontSize: 13, color: c.text3, transition: 'color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.text1 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text3 }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <span style={{ fontSize: 12, color: c.text3 }}>
          © {new Date().getFullYear()} Specmob
        </span>
      </footer>
    </div>
  )
}
