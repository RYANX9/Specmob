import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { c, f, r, mq } from '@/lib/tokens'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'The terms that govern your use of Specmob, including our affiliate disclosure.',
  robots: { index: true, follow: true },
}

const EFFECTIVE_DATE = 'August 1, 2026'
const LAST_UPDATED = 'August 1, 2026'

const SECTIONS = [
  { id: 's1', label: '1. What Specmob Is' },
  { id: 'affiliate', label: '2. Affiliate Disclosure' },
  { id: 's3', label: '3. Accuracy of Information' },
  { id: 's4', label: '4. AI-Generated Content' },
  { id: 's5', label: '5. Acceptable Use' },
  { id: 's6', label: '6. Third-Party Links' },
  { id: 's7', label: '7. Limitation of Liability' },
  { id: 's8', label: '8. Changes to These Terms' },
  { id: 's9', label: '9. Governing Law' },
  { id: 's10', label: '10. Contact' },
]

function TocSidebar() {
  return (
    <nav aria-label="On this page" className="legal-toc" style={{ position: 'sticky', top: 'calc(var(--nav-h) + 24px)', alignSelf: 'start' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: c.text3, marginBottom: 12 }}>
        Sections
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`} style={{
            padding: '7px 10px', fontSize: 13, color: c.text2, borderRadius: r.sm,
            borderLeft: `2px solid ${c.border}`, transition: 'all 0.15s',
          }}>
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.8, marginBottom: 14 }}>{children}</p>
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} style={{
      fontFamily: f.serif, fontSize: 23, color: c.text1, letterSpacing: '-0.3px',
      marginBottom: 14, scrollMarginTop: 'calc(var(--nav-h) + 20px)',
    }}>
      {children}
    </h2>
  )
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, paddingLeft: 0, listStyle: 'none' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, fontSize: 15, color: c.text2, lineHeight: 1.7 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.text3, flexShrink: 0, marginTop: 8 }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--page-px) 80px' }}>
        <nav style={{ padding: '16px 0 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/" style={{ color: c.text2 }}>Home</Link>
          <span>/</span>
          <span>Terms of Use</span>
        </nav>

        <div style={{ padding: '36px 0 40px', maxWidth: 720 }}>
          <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(30px,4vw,42px)', color: c.text1, letterSpacing: '-0.5px', marginBottom: 12 }}>
            Terms of Use
          </h1>
          <p style={{ fontSize: 13, color: c.text3, marginBottom: 18 }}>
            Effective date: {EFFECTIVE_DATE} &middot; Last updated: {LAST_UPDATED}
          </p>
          <p style={{ fontSize: 16, color: c.text2, lineHeight: 1.75 }}>
            Welcome to Specmob. By accessing or using specmob.vercel.app (the &quot;Service&quot;), you agree to
            these Terms of Use. If you don&apos;t agree, please don&apos;t use the Service.
          </p>
        </div>

        <div className="legal-grid" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 56, alignItems: 'start' }}>
          <TocSidebar />

          <div style={{ maxWidth: 720 }}>
            <section style={{ marginBottom: 36 }}>
              <H2 id="s1">1. What Specmob Is</H2>
              <P>Specmob provides phone specifications, price tracking, comparisons, and recommendations to help you research and choose a phone. Specmob is an independent research and comparison tool — we are not a retailer, we do not sell phones, and we are not affiliated with any phone manufacturer unless explicitly stated.</P>
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="affiliate">2. Affiliate Disclosure</H2>
              <P>Specmob participates in affiliate programs, including but not limited to Amazon Associates and the eBay Partner Network. This means when you click certain &quot;Buy,&quot; &quot;Where to Buy,&quot; or similar links and make a purchase, Specmob may earn a commission — <strong style={{ color: c.text1 }}>at no additional cost to you.</strong> The price you pay is the same whether or not you came from Specmob.</P>
              <P>Affiliate relationships do not influence our specifications data or scoring methodology. A phone&apos;s Smart Score, chipset tier, or ranking is never adjusted based on affiliate commission rates or partnership status. Sponsored or featured placements, if and when we offer them, will be clearly labeled as such and kept visually distinct from organic rankings.</P>
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="s3">3. Accuracy of Information</H2>
              <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.7, marginBottom: 8 }}>
                Specifications, prices, and benchmark figures are aggregated from third-party and publicly available sources and are provided for informational purposes. While we make reasonable efforts to keep this data accurate and current:
              </p>
              <Bullets items={[
                'Prices shown may not reflect the current price on the retailer\u2019s site at the time you visit — always verify the final price before purchasing.',
                'Specifications may occasionally contain errors, particularly for newly released phones.',
                'Availability status may lag real-world stock changes.',
              ]} />
              <P>Specmob is provided &quot;as is&quot; without warranties of any kind regarding the accuracy, completeness, or timeliness of any information displayed.</P>
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="s4">4. AI-Generated Content</H2>
              <P>
                Some content on Specmob — including comparison verdicts, match explanations, and trade-off
                summaries — is generated by an AI model based on the underlying phone specifications and
                the filters or priorities you provide. This content is intended as a helpful summary, not
                professional advice, and may occasionally be imprecise. It does not override or change the
                underlying specification data, which is sourced separately. See{' '}
                <Link href="/about#scoring" style={{ color: c.accent, fontWeight: 500 }}>How We Score</Link> for more detail.
              </P>
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="s5">5. Acceptable Use</H2>
              <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.7, marginBottom: 8 }}>You agree not to:</p>
              <Bullets items={[
                'Scrape, crawl, or systematically extract data from Specmob using automated means outside of what our robots.txt and published API (if any) permit',
                'Attempt to circumvent rate limiting or other technical protections',
                'Use the Service to build a directly competing product using our aggregated or processed data without permission',
                'Interfere with or disrupt the Service\u2019s operation',
              ]} />
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="s6">6. Third-Party Links</H2>
              <P>Specmob contains links to third-party retailers, review videos, and other external sites. We don&apos;t control and aren&apos;t responsible for the content, policies, or practices of any third-party site you reach through a link on Specmob.</P>
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="s7">7. Limitation of Liability</H2>
              <P>To the maximum extent permitted by law, Specmob and its operator are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including purchase decisions made based on information found here. You are responsible for verifying details directly with the retailer or manufacturer before making a purchase.</P>
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="s8">8. Changes to These Terms</H2>
              <P>We may update these Terms as the Service evolves. Continued use of Specmob after changes are posted means you accept the updated Terms. Material changes will update the &quot;Last updated&quot; date above.</P>
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="s9">9. Governing Law</H2>
              <P>These Terms are governed by the laws of the jurisdiction in which Specmob&apos;s operator is legally established, without regard to conflict-of-law principles. Any dispute not resolved informally will be subject to the exclusive jurisdiction of the courts of that jurisdiction.</P>
            </section>

            <section style={{ marginBottom: 0 }}>
              <H2 id="s10">10. Contact</H2>
              <P>
                Questions about these Terms: <a href="mailto:hello@specmob.com" style={{ color: c.accent, fontWeight: 600 }}>hello@specmob.com</a>
              </P>
            </section>
          </div>
        </div>
      </div>

      <Footer />

      <style>{`
        .legal-toc a:hover { border-left-color: ${c.primary} !important; color: ${c.text1} !important; background: ${c.surface}; }
        ${mq.lg} {
          .legal-grid { grid-template-columns: 1fr !important; }
          .legal-toc { display: none; }
        }
      `}</style>
    </div>
  )
}
