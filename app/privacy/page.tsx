import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { c, f, r, mq } from '@/lib/tokens'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What data Specmob collects, why, and what choices you have.',
  robots: { index: true, follow: true },
}

const EFFECTIVE_DATE = 'August 1, 2026'
const LAST_UPDATED = 'August 1, 2026'

const SECTIONS = [
  { id: 's1', label: '1. Information We Collect' },
  { id: 's2', label: '2. What We Don\u2019t Do' },
  { id: 's3', label: '3. Third-Party Services' },
  { id: 's4', label: '4. Data Retention' },
  { id: 's5', label: '5. Children\u2019s Privacy' },
  { id: 's6', label: '6. Your Choices' },
  { id: 's7', label: '7. Changes to This Policy' },
  { id: 's8', label: '8. Contact' },
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

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--page-px) 80px' }}>
        <nav style={{ padding: '16px 0 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/" style={{ color: c.text2 }}>Home</Link>
          <span>/</span>
          <span>Privacy Policy</span>
        </nav>

        <div style={{ padding: '36px 0 40px', maxWidth: 720 }}>
          <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(30px,4vw,42px)', color: c.text1, letterSpacing: '-0.5px', marginBottom: 12 }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 13, color: c.text3, marginBottom: 18 }}>
            Effective date: {EFFECTIVE_DATE} &middot; Last updated: {LAST_UPDATED}
          </p>
          <p style={{ fontSize: 16, color: c.text2, lineHeight: 1.75 }}>
            Specmob (&quot;we,&quot; &quot;our,&quot; &quot;us&quot;) operates specmob.vercel.app (the &quot;Service&quot;). This policy
            explains what data we collect, why, and what choices you have. We don&apos;t require an account
            to use Specmob, and we&apos;ve kept data collection to what&apos;s actually needed to run the site and
            keep it free.
          </p>
        </div>

        <div className="legal-grid" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 56, alignItems: 'start' }}>
          <TocSidebar />

          <div style={{ maxWidth: 720 }}>
            <section style={{ marginBottom: 36 }}>
              <H2 id="s1">1. Information We Collect</H2>
              <P><strong style={{ color: c.text1 }}>Automatically collected data.</strong> When you use Specmob, our servers log standard technical information for every request: IP address, browser/device type, pages visited, timestamps, and a request identifier used for debugging. This keeps the service running, secure, and performant (including rate-limiting to prevent abuse), and isn&apos;t linked to a named individual.</P>
              <P><strong style={{ color: c.text1 }}>View activity.</strong> When you view a phone&apos;s detail page, we log that a view occurred for that phone. This is used in aggregate to understand which phones people are interested in (for example, informing our &quot;trending&quot; rankings). It isn&apos;t tied to a user account or profile, since Specmob doesn&apos;t have accounts.</P>
              <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.7, marginBottom: 8 }}>
                <strong style={{ color: c.text1 }}>Cookies and local storage.</strong> Specmob may use cookies or browser local storage for:
              </p>
              <Bullets items={[
                'Remembering display preferences (e.g. a saved comparison list), stored in your browser only, not on our servers',
                'Advertising, via Google AdSense or similar ad networks, which may set their own cookies to serve and measure ads',
                'Affiliate link tracking, so retailers can attribute a purchase to Specmob when you click through',
              ]} />
              <P>You can disable cookies in your browser at any time; some personalization features (like a saved comparison) simply won&apos;t persist without them.</P>
              <P><strong style={{ color: c.text1 }}>Information you provide directly.</strong> If you contact us by email, we receive whatever you choose to include in that message. We use it only to respond to you.</P>
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="s2">2. What We Don&apos;t Do</H2>
              <Bullets items={[
                'We do not require account registration to browse, compare, or search phones.',
                'We do not sell your personal data to third parties.',
                'We do not send your personal browsing activity to our AI provider. When AI-generated comparison text or recommendations are produced, only the relevant phone specifications and your stated filters or priorities (budget, priorities selected) are sent to generate that text — not your identity, IP, or browsing history.',
              ]} />
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="s3">3. Third-Party Services</H2>
              <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.7, marginBottom: 8 }}>Specmob uses or may use:</p>
              <Bullets items={[
                <><strong style={{ color: c.text1 }}>Advertising networks</strong> (e.g. Google AdSense) — may collect data per their own privacy policies to serve relevant ads. See Google&apos;s policy at <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: c.accent }}>policies.google.com/privacy</a>.</>,
                <><strong style={{ color: c.text1 }}>Affiliate programs</strong> (e.g. Amazon Associates, eBay Partner Network) — when you click a &quot;Buy&quot; or &quot;Where to Buy&quot; link, you leave Specmob and that retailer&apos;s own privacy policy applies to your activity on their site.</>,
                <><strong style={{ color: c.text1 }}>AI text generation</strong> — used to generate comparison verdicts and recommendation explanations from phone specification data.</>,
                <><strong style={{ color: c.text1 }}>Analytics</strong> — used in aggregate to understand traffic patterns and improve the site.</>,
              ]} />
              <P>We don&apos;t control these third parties&apos; own data practices; please review their respective policies.</P>
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="s4">4. Data Retention</H2>
              <P>Technical request logs are retained only as long as needed for debugging and abuse prevention, then rotated out. Aggregate view-count data may be retained longer since it isn&apos;t tied to an individual.</P>
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="s5">5. Children&apos;s Privacy</H2>
              <P>Specmob is not directed at children under 13, and we do not knowingly collect personal information from children under 13.</P>
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="s6">6. Your Choices</H2>
              <Bullets items={[
                'Disable cookies via your browser settings.',
                <>Opt out of personalized advertising via <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" style={{ color: c.accent }}>Google Ads Settings</a> or the <a href="https://optout.aboutads.info" target="_blank" rel="noopener noreferrer" style={{ color: c.accent }}>Digital Advertising Alliance opt-out</a>.</>,
                'Contact us to ask what data, if any, we hold relating to a specific request you made (e.g. via IP) — as noted above, we do not maintain individual user profiles.',
              ]} />
            </section>

            <section style={{ marginBottom: 36 }}>
              <H2 id="s7">7. Changes to This Policy</H2>
              <P>We may update this policy as the site evolves — for example, when adding new features or ad partners. We&apos;ll update the &quot;Last updated&quot; date above when we do. Continued use of Specmob after changes means you accept the updated policy.</P>
            </section>

            <section style={{ marginBottom: 0 }}>
              <H2 id="s8">8. Contact</H2>
              <P>
                Questions about this policy: <a href="mailto:hello@specmob.com" style={{ color: c.accent, fontWeight: 600 }}>hello@specmob.com</a>
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
