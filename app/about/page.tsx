// app/about/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Info, Mail, Sparkles, Database, ShieldCheck, Heart, RotateCcw } from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { c, f, r, sh, mq } from '@/lib/tokens'
import { ROUTES } from '@/lib/config'

export const metadata: Metadata = {
  title: 'About Specmob',
  description:
    'How Specmob scores phones, where the data comes from, and how to reach us. No sponsored picks — every ranking is driven by specs.',
  openGraph: {
    title: 'About Specmob',
    description: 'How we score phones, where the data comes from, and how to reach us.',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About Specmob',
  url: 'https://specmob.vercel.app/about',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://specmob.vercel.app' },
      { '@type': 'ListItem', position: 2, name: 'About', item: 'https://specmob.vercel.app/about' },
    ],
  },
}

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'scoring', label: 'How We Score' },
  { id: 'tools', label: 'Tools' },
  { id: 'data', label: 'Data Sources' },
  { id: 'contact', label: 'Contact' },
]

function TocSidebar() {
  return (
    <nav aria-label="On this page" className="about-toc" style={{
      position: 'sticky', top: 'calc(var(--nav-h) + 24px)', alignSelf: 'start',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: c.text3, marginBottom: 12 }}>
        On this page
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {TOC.map(item => (
          <a
            key={item.id}
            href={`#${item.id}`}
            style={{
              padding: '7px 10px', fontSize: 13, color: c.text2, borderRadius: r.sm,
              borderLeft: `2px solid ${c.border}`, transition: 'all 0.15s',
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px',
      background: 'var(--blue-light)', border: '1px solid rgba(69,123,157,0.15)',
      borderRadius: r.sm, fontSize: 13.5, color: c.text2, lineHeight: 1.65, margin: '16px 0',
    }}>
      <Info size={15} color="var(--blue)" style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{children}</span>
    </div>
  )
}

function Section({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 'calc(var(--nav-h) + 20px)', marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{
          width: 34, height: 34, borderRadius: r.sm, background: c.bg, border: `1px solid ${c.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.accent, flexShrink: 0,
        }}>
          {icon}
        </span>
        <h2 style={{ fontFamily: f.serif, fontSize: 26, color: c.text1, letterSpacing: '-0.3px' }}>{title}</h2>
      </div>
      <div style={{ fontSize: 15, color: c.text2, lineHeight: 1.8 }}>{children}</div>
    </section>
  )
}

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Suspense fallback={null}>
        <Navbar />
      </Suspense>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--page-px) 80px' }}>
        <nav style={{ padding: '16px 0 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/" style={{ color: c.text2 }}>Home</Link>
          <span>/</span>
          <span>About</span>
        </nav>

        <div id="overview" style={{ scrollMarginTop: 'calc(var(--nav-h) + 20px)', padding: '36px 0 44px', maxWidth: 720 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
            background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
            borderRadius: r.full, fontSize: 11, fontWeight: 700, color: c.accent,
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 18,
          }}>
            No sponsored picks
          </div>
          <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(32px,4vw,46px)', color: c.text1, letterSpacing: '-0.6px', lineHeight: 1.1, marginBottom: 18 }}>
            About Specmob
          </h1>
          <p style={{ fontSize: 16.5, color: c.text2, lineHeight: 1.75, marginBottom: 14 }}>
            Specmob is a phone comparison and buying-decision tool. We track specs, real prices, and
            release history across brands, and turn that into tools that answer one question: which
            phone actually fits what you need and what you want to spend.
          </p>
          <p style={{ fontSize: 15, color: c.text3, lineHeight: 1.75 }}>
            We&apos;re not a retailer and we don&apos;t sell phones directly. When you follow a &quot;Buy&quot; link from
            Specmob to a retailer, we may earn a commission at no extra cost to you — see our{' '}
            <Link href="/terms#affiliate" style={{ color: c.accent, fontWeight: 500 }}>Affiliate Disclosure</Link>{' '}
            for details.
          </p>
        </div>

        <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 56, alignItems: 'start' }}>
          <TocSidebar />

          <div>
            <Section id="scoring" icon={<Sparkles size={16} strokeWidth={1.75} />} title="How We Score">
              <p style={{ marginBottom: 14 }}>
                Every phone on Specmob can carry two kinds of scoring, and we&apos;re upfront about which
                one you&apos;re looking at.
              </p>

              <p style={{ marginBottom: 14 }}>
                <strong style={{ color: c.text1 }}>Smart Score (AI-assisted).</strong> Where available,
                phones are scored across six dimensions — camera, performance, battery, display, build
                quality, and value — using an AI model that evaluates the phone&apos;s actual specifications.
                Those six sub-scores are averaged into the single overall number shown on cards, detail
                pages, and comparisons. That average is a fixed property of the phone itself, so the number
                you see on a category page and the number you see on the phone&apos;s own detail page are
                always the same — it doesn&apos;t shift depending on which page you&apos;re looking at it from.
              </p>

              <p style={{ marginBottom: 10 }}>
                <strong style={{ color: c.text1 }}>Fallback scoring.</strong> Not every phone has been
                through AI scoring yet. When a smart score isn&apos;t available, we fall back to a
                transparent, formula-based estimate:
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, paddingLeft: 0, listStyle: 'none' }}>
                {[
                  <>
                    <strong style={{ color: c.text1 }}>Chipset tier</strong> (Flagship / Upper Mid-Range /
                    Entry) is detected from the chipset name itself, matched against known flagship and
                    upper-mid-range silicon — Snapdragon 8-series, Dimensity 9000-series, Apple A-series
                    Bionic/Pro, Tensor, Kirin, and Exynos.
                  </>,
                  <>
                    <strong style={{ color: c.text1 }}>Value score</strong> compares a phone&apos;s hardware
                    composite (benchmark, camera resolution, battery capacity, RAM, charging speed, screen
                    size) against a real peer group of similarly priced phones — not the entire catalog —
                    so a budget phone is judged against other budget phones, not flagships three times the
                    price.
                  </>,
                  <>
                    <strong style={{ color: c.text1 }}>Category rankings</strong> (Best Camera Phones, Best
                    Battery Life, Foldables, and so on) use the AI-scored dimension where it exists and fall
                    back to the equivalent spec-based composite where it doesn&apos;t, so every list stays
                    fully populated even for newer or less-covered phones.
                  </>,
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.accent, flexShrink: 0, marginTop: 8 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p style={{ marginBottom: 0 }}>
                <strong style={{ color: c.text1 }}>AI-generated text.</strong> Comparison verdicts, match
                explanations, and trade-off notes on comparison and recommendation pages are generated by
                an AI model based on the phones&apos; real specifications and your stated priorities or
                budget. This is a summary layer on top of the underlying data — it never changes the
                specs, prices, or scores, and it&apos;s regenerated from scratch each time rather than
                written by hand. If the AI service is unavailable, these pages still work; you simply see
                the specs and scores without the generated commentary.
              </p>

              <Callout>
                We continuously refine the scoring model and chipset detection rules as new hardware
                releases. If a score or tier looks wrong, <a href="#contact" style={{ color: 'var(--blue)', fontWeight: 600 }}>contact us</a> — we read every message.
              </Callout>
            </Section>

            <Section id="tools" icon={<RotateCcw size={16} strokeWidth={1.75} />} title="Tools">
              <p style={{ marginBottom: 14 }}>
                Beyond browsing and comparing, Specmob has a few purpose-built tools:
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, paddingLeft: 0, listStyle: 'none' }}>
                {[
                  <>
                    <strong style={{ color: c.text1 }}>Help Me Choose</strong> (<Link href={ROUTES.pick} style={{ color: c.accent }}>/pick</Link>) —
                    set a budget and pick 2–3 priorities, and we rank the top 5 matching phones using the
                    same scoring logic described above.
                  </>,
                  <>
                    <strong style={{ color: c.text1 }}>Compare</strong> (<Link href={ROUTES.compare()} style={{ color: c.accent }}>/compare</Link>) —
                    put up to 4 phones side by side with every spec, an AI-written verdict where available,
                    and a category-by-category winner breakdown.
                  </>,
                  <>
                    <strong style={{ color: c.text1 }}>Trade-In Estimator</strong> (<Link href={ROUTES.tradein} style={{ color: c.accent }}>/trade-in</Link>) —
                    get an estimated resale range for a phone you own based on its condition, battery
                    health, and functional state, plus recommendations for what you could upgrade to with
                    that value.
                  </>,
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.accent, flexShrink: 0, marginTop: 8 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="data" icon={<Database size={16} strokeWidth={1.75} />} title="Data Sources">
              <p style={{ marginBottom: 14 }}>
                <strong style={{ color: c.text1 }}>Specifications.</strong> Phone specs — dimensions,
                display, camera, chipset, battery, connectivity, and more — are aggregated from publicly
                available manufacturer specifications and established phone-database sources, then
                normalized into a consistent structure so every phone can be compared apples-to-apples
                regardless of brand.
              </p>
              <p style={{ marginBottom: 14 }}>
                <strong style={{ color: c.text1 }}>Pricing.</strong> We track pricing over time rather than
                showing a single static number. Prices are checked periodically per phone and per region
                where available, which is what powers our price history charts and price-drop detection.
                Prices are shown for reference and can lag real-world changes — always confirm the final
                price on the retailer&apos;s page before buying.
              </p>
              <p style={{ marginBottom: 14 }}>
                <strong style={{ color: c.text1 }}>Benchmarks.</strong> Performance figures — AnTuTu, GPU
                scores, and similar — come from published third-party benchmark results for each chipset,
                not from our own testing.
              </p>
              <p style={{ marginBottom: 14 }}>
                <strong style={{ color: c.text1 }}>Known limitations.</strong> Specs data can occasionally
                contain scraping artifacts or gaps, especially for newly released or less mainstream
                phones. We run automated repair checks on known problem fields, but if you spot something
                that looks clearly wrong, flagging it via <a href="#contact" style={{ color: c.accent }}>Contact</a> helps us fix it faster than we&apos;d catch
                it ourselves.
              </p>
              <p style={{ marginBottom: 0 }}>
                <strong style={{ color: c.text1 }}>Data freshness.</strong> Not every field refreshes on the
                same interval — stable data (specs, brand info) is cached longer than time-sensitive data
                (prices, trending rankings), so different parts of a page may reflect slightly different
                snapshot times.
              </p>
            </Section>

            <Section id="contact" icon={<Mail size={16} strokeWidth={1.75} />} title="Contact">
              <p style={{ marginBottom: 14 }}>
                Questions, corrections, or partnership inquiries — the fastest route is our{' '}
                <Link href={ROUTES.contact} style={{ color: c.accent, fontWeight: 600 }}>Contact page</Link>,
                which routes each type of message correctly. Or email directly:{' '}
                <a href="mailto:hello@specmob.com" style={{ color: c.accent, fontWeight: 600 }}>hello@specmob.com</a>
              </p>
              <p style={{ marginBottom: 14 }}>
                For data corrections specifically, including the phone name/model and what looks wrong
                speeds things up a lot.
              </p>
              <p style={{ marginBottom: 0, color: c.text3, fontSize: 13.5 }}>
                We aim to respond within a few business days.
              </p>
            </Section>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: 10,
              background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md,
              padding: '14px 18px', marginBottom: 14,
            }}>
              <ShieldCheck size={16} color="var(--green)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: c.text2 }}>
                Read our full <Link href="/privacy" style={{ color: c.accent, fontWeight: 600 }}>Privacy Policy</Link>{' '}
                and <Link href="/terms" style={{ color: c.accent, fontWeight: 600 }}>Terms of Use</Link> for the legal details.
              </span>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
              background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md,
            }}>
              <Heart size={16} color={c.accent} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: c.text2 }}>
                Specmob is self-funded and ad-light by design. See what it costs to run and how to help
                at <Link href={ROUTES.support} style={{ color: c.accent, fontWeight: 600 }}>/support</Link>.
              </span>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <style>{`
        .about-toc a:hover { border-left-color: ${c.primary} !important; color: ${c.text1} !important; background: ${c.surface}; }
        ${mq.lg} {
          .about-grid { grid-template-columns: 1fr !important; }
          .about-toc { display: none; }
        }
      `}</style>
    </div>
  )
}
