// app/contact/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Github, Linkedin, Globe, Mail, ArrowUpRight } from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { c, f, r, sh } from '@/lib/tokens'
import { TEAM, CONTACT_EMAIL } from '@/lib/team'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Report data issues, send feedback, or reach the team behind Specmob.',
  openGraph: {
    title: 'Contact | Specmob',
    description: 'Report data issues, send feedback, or reach the team behind Specmob.',
  },
}

const CONTACT_REASONS = [
  { label: 'Incorrect or outdated specs', subject: 'Data correction' },
  { label: 'Something is broken', subject: 'Bug report' },
  { label: 'Feature request or feedback', subject: 'Feedback' },
  { label: 'Press or partnership', subject: 'Partnership inquiry' },
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
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd()) }}
      />

      <Navbar />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 var(--page-px) 80px' }}>
        <nav style={{ padding: '16px 0 0', fontSize: 13, color: c.text3 }}>
          <Link href="/" style={{ color: c.text2 }}>Home</Link>
          <span style={{ margin: '0 6px' }}>/</span>
          <span>Contact</span>
        </nav>

        <div style={{ padding: '40px 0 48px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(30px,4vw,44px)', color: c.text1, letterSpacing: '-0.6px', marginBottom: 10 }}>
            Get in touch
          </h1>
          <p style={{ fontSize: 15, color: c.text3, maxWidth: 480, margin: '0 auto' }}>
            Data issue, feedback, or a project you want built — pick the right one below.
          </p>
        </div>

        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: f.serif, fontSize: 20, color: c.text1, marginBottom: 16 }}>
            Report or ask something
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }} className="contact-reason-grid">
            {CONTACT_REASONS.map(reason => (
              <a
                key={reason.subject}
                href={mailto(reason.subject)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 18px', background: c.surface, border: `1px solid ${c.border}`,
                  borderRadius: r.md, textDecoration: 'none', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border }}
              >
                <span style={{ fontSize: 14, fontWeight: 500, color: c.text1 }}>{reason.label}</span>
                <Mail size={15} color={c.text3} strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ fontFamily: f.serif, fontSize: 20, color: c.text1, marginBottom: 4 }}>
            Built by
          </h2>
          <p style={{ fontSize: 13, color: c.text3, marginBottom: 20 }}>
            Specmob is an independent project. If you want something like it built, reach out directly.
          </p>

          <div
            style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(TEAM.length, 3)}, 1fr)`, gap: 16 }}
            className="team-grid"
          >
            {TEAM.map(member => (
              <div
                key={member.slug}
                style={{
                  background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.lg,
                  padding: '24px 22px', boxShadow: sh.sm,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                    background: c.bg, border: `1px solid ${c.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}>
                    {member.avatarUrl
                      ? <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontFamily: f.serif, fontSize: 20, color: c.primary }}>{member.name[0]}</span>}
                  </div>
                  <div>
                    <div style={{ fontFamily: f.serif, fontSize: 16, color: c.text1 }}>{member.name}</div>
                    <div style={{ fontSize: 12, color: c.text3 }}>{member.role}</div>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, marginBottom: 16 }}>
                  {member.bio}
                </p>

                {member.openToWork && (
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 600, color: 'var(--green)',
                    background: 'var(--green-light)', border: '1px solid var(--green-border)',
                    borderRadius: r.full, padding: '3px 10px', marginBottom: 16,
                  }}>
                    Open to freelance work
                  </span>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {member.links.map(link => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500,
                        color: c.text2, border: `1px solid ${c.border}`, borderRadius: r.full,
                        padding: '5px 12px', textDecoration: 'none', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
                    >
                      {linkIcon(link.label)} {link.label}
                    </a>
                  ))}
                  <a
                    href={mailto('Project inquiry')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
                      color: '#fff', background: c.primary, borderRadius: r.full,
                      padding: '5px 12px', textDecoration: 'none', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
                  >
                    <Mail size={13} /> Hire me
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer />

      <style>{`
        @media (max-width: 640px) {
          .contact-reason-grid { grid-template-columns: 1fr !important; }
          .team-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
