// app/contact/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Github, Linkedin, Globe, Mail, ArrowUpRight, Sparkles } from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { c, f, r, sh } from '@/lib/tokens'
import { TEAM, CONTACT_EMAIL } from '@/lib/team'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Report data issues, send feedback, propose a sponsorship, or reach the team behind Specmob.',
  openGraph: {
    title: 'Contact | Specmob',
    description: 'Report data issues, send feedback, propose a sponsorship, or reach the team behind Specmob.',
  },
}

const CONTACT_REASONS = [
  { label: 'Incorrect or outdated specs', subject: 'Data correction' },
  { label: 'Something is broken', subject: 'Bug report' },
  { label: 'Feature request or suggestion', subject: 'Feedback' },
  { label: 'Sponsorship or partnership', subject: 'Sponsorship inquiry' },
]

function mailto(subject: string, email: string = CONTACT_EMAIL): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`
}

const LINK_ICON: Record<string, React.ReactNode> = {
  github: <Github size={15} strokeWidth={1.5} />,
  linkedin: <Linkedin size={15} strokeWidth={1.5} />,
  portfolio: <Globe size={15} strokeWidth={1.5} />,
}

function linkIcon(label: string): React.ReactNode {
  return LINK_ICON[label.toLowerCase()] ?? <ArrowUpRight size={15} strokeWidth={1.5} />
}

function contactJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Specmob',
    mainEntity: TEAM.map(m => ({
      '@type': 'Person',
      name: m.name,
      jobTitle: m.role,
      sameAs: m.links.map(l => l.url),
    })),
  }
}

export default function ContactPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F0' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd()) }}
      />

      <Suspense fallback={null}>
        <Navbar />
      </Suspense>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 var(--page-px) 80px' }}>
        <nav style={{ padding: '24px 0 0', fontSize: 13, color: c.text3 }}>
          <Link href="/" style={{ color: c.text2, textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 6px' }}>/</span>
          <span>Contact</span>
        </nav>

        <div style={{ padding: '40px 0 48px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(32px,4vw,48px)', color: c.text1, letterSpacing: '-0.6px', marginBottom: 12, fontWeight: 400 }}>
            Get in touch
          </h1>
          <p style={{ fontSize: 16, color: c.text3, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Data issue, feedback, or a sponsorship proposal — pick the right one below.
          </p>
        </div>

        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, marginBottom: 18, fontWeight: 400 }}>
            Report or ask something
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }} className="contact-reason-grid">
            {CONTACT_REASONS.map(reason => (
              <a
                key={reason.subject}
                href={mailto(reason.subject)}
                className="contact-card"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 20px', background: '#FFFFFF', border: `1px solid ${c.border}`,
                  borderRadius: r.lg, textDecoration: 'none', transition: 'all 0.15s',
                  boxShadow: sh.sm,
                }}
              >
                <span style={{ fontSize: 14.5, fontWeight: 500, color: c.text1 }}>{reason.label}</span>
                <Mail size={16} color={c.text3} strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </section>

        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Sparkles size={18} color={c.accent} />
            <h2 style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, fontWeight: 400 }}>Built by</h2>
          </div>
          <p style={{ fontSize: 14, color: c.text3, marginBottom: 24, lineHeight: 1.6 }}>
            Specmob — catalog, comparison engine, recommendation engine, and AI scoring pipeline — built
            and shipped as a single, self-funded project.
          </p>

          <div
            style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(TEAM.length, 3)}, 1fr)`, gap: 20 }}
            className="team-grid"
          >
            {TEAM.map(member => (
              <div
                key={member.slug}
                style={{
                  background: '#FFFFFF', border: `1px solid ${c.border}`, borderRadius: r.xl,
                  padding: '28px 24px', boxShadow: sh.sm,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                    background: '#F8F6F0', border: `1px solid ${c.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}>
                    {member.avatarUrl
                      ? <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontFamily: f.serif, fontSize: 22, color: c.text1 }}>{member.name[0]}</span>}
                  </div>
                  <div>
                    <div style={{ fontFamily: f.serif, fontSize: 18, color: c.text1, fontWeight: 400 }}>{member.name}</div>
                    <div style={{ fontSize: 12.5, color: c.text3, marginTop: 2 }}>{member.role}</div>
                  </div>
                </div>

                <p style={{ fontSize: 13.5, color: c.text2, lineHeight: 1.65, marginBottom: 20 }}>
                  {member.bio}
                </p>

                {member.highlights.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                    {member.highlights.map(h => (
                      <span key={h} style={{
                        fontSize: 11, fontWeight: 600, color: c.text2,
                        background: '#F8F6F0', border: `1px solid ${c.border}`,
                        borderRadius: r.full, padding: '4px 12px',
                      }}>
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {member.links.map(link => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="member-link"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500,
                        color: c.text2, border: `1px solid ${c.border}`, borderRadius: r.full,
                        padding: '6px 14px', textDecoration: 'none', transition: 'all 0.15s',
                        background: '#FFFFFF'
                      }}
                    >
                      {linkIcon(link.label)} {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer />

      <style>{`
        .contact-card:hover { border-color: ${c.accent} !important; background: #FFFFFF; }
        .member-link:hover { border-color: ${c.accent} !important; color: ${c.text1} !important; background: #F8F6F0; }
        @media (max-width: 640px) {
          .contact-reason-grid { grid-template-columns: 1fr !important; }
          .team-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
