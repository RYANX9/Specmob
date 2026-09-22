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
      background: '#FFFFFF', padding: '20px', borderRadius: r.lg, border: `1px solid ${c.border}`,
      boxShadow: sh.sm,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: c.text3, marginBottom: 12 }}>
        On this page
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {TOC.map(item => (
          <a
            key={item.id}
            href={`#${item.id}`}
            style={{
              padding: '8px 12px', fontSize: 13, color: c.text2, borderRadius: r.sm,
              transition: 'all 0.15s', textDecoration: 'none', fontWeight: 500
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
      display: 'flex', gap: 12, alignItems: 'flex-start', padding: '16px 20px',
      background: '#FFFFFF', border: `1px solid ${c.border}`,
      borderRadius: r.md, fontSize: 13.5, color: c.text2, lineHeight: 1.65, margin: '24px 0',
      boxShadow: sh.sm
    }}>
      <Info size={18} color={c.accent} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>{children}</div>
    </div>
  )
}

function Section({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 'calc(var(--nav-h) + 20px)', marginBottom: 40, background: '#FFFFFF', padding: '32px', borderRadius: r.xl, border: `1px solid ${c.border}`, boxShadow: sh.sm }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{
          width: 40, height: 40, borderRadius: r.md, background: '#F8F6F0', border: `1px solid ${c.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text1, flexShrink: 0,
        }}>
          {icon}
        </span>
        <h2 style={{ fontFamily: f.serif, fontSize: 28, color: c.text1, letterSpacing: '-0.3px', fontWeight: 400 }}>{title}</h2>
      </div>
      <div style={{ fontSize: 15, color: c.text2, lineHeight: 1.8 }}>{children}</div>
    </section>
  )
}

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F0' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Suspense fallback={null}>
        <Navbar />
      </Suspense>

      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 var(--page-px) 80px' }}>
        <nav style={{ padding: '24px 0 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/" style={{ color: c.text2, textDecoration: 'none' }}>Home</Link>
          <span>/</span>
          <span>About</span>
        </nav>

        <div id="overview" style={{ scrollMarginTop: 'calc(var(--nav-h) + 20px)', padding: '40px 0 48px', maxWidth: 780 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
            background: '#FFFFFF', border: `1px solid ${c.border}`,
            borderRadius: r.full, fontSize: 11, fontWeight: 700, color: c.accent,
            textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 20, boxShadow: sh.sm
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.accent }} />
            No sponsored picks — ranked on specs only
          </div>
          <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(36px, 5vw, 56px)', color: c.text1, letterSpacing: '-0.8px', lineHeight: 1.05, marginBottom: 20, fontWeight: 400 }}>
            About Specmob
          </h1>
          <p style={{ fontSize: 18, color: c.text2, lineHeight: 1.7, marginBottom: 16 }}>
            Specmob is a phone comparison and buying-decision tool. We track specs, real prices, and
            release history across brands, and turn that into tools that answer one question: which
            phone actually fits what you need and what you want to spend.
          </p>
          <p style={{ fontSize: 15, color: c.text3, lineHeight: 1.75 }}>
            We&apos;re not a retailer and we don&apos;t sell phones directly. When you follow a &quot;Buy&quot; link from
            Specmob to a retailer, we may earn a commission at no extra cost to you — see our{' '}
            <Link href="/terms#affiliate" style={{ color: c.accent, fontWeight: 500, textDecoration: 'underline' }}>Affiliate Disclosure</Link>{' '}
            for details.
          </p>
        </div>

        <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 40, alignItems: 'start' }}>
          <TocSidebar />

          <div>
            <Section id="scoring" icon={<Sparkles size={18} strokeWidth={1.75} />} title="How We Score">
              <p style={{ marginBottom: 16 }}>
                Every phone listed on Specmob is scored by our AI pipeline before it ever reaches a
                catalog page — there&apos;s no partial coverage and no phone showing up with an empty
                scoring section.
              </p>

              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: c.text1 }}>Smart Score.</strong> Each phone is scored across six
                dimensions — camera, performance, battery, display, build quality, and value — by an AI
                model evaluating the phone&apos;s actual specifications. Those six sub-scores are averaged
                into the single overall number shown on cards, detail pages, and comparisons. That average
                is a fixed property of the phone itself, so the number you see on a category page and the
                number you see on the phone&apos;s own detail page are always the same — it never shifts
                depending on which page you&apos;re looking at it from.
              </p>

              <p style={{ marginBottom: 12 }}>
                <strong style={{ color: c.text1 }}>Tier system.</strong> Every phone is placed into one of
                five market tiers as part of that same scoring pass:
              </p>
              <div className="tier-strip" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Ultra Flagship', color: '#C9A84C' },
                  { label: 'Flagship', color: c.accent },
                  { label: 'Upper Mid-Range', color: '#457B9D' },
                  { label: 'Mid-Range', color: '#457B9D' },
                  { label: 'Budget', color: c.text2 },
                ].map(t => (
                  <span key={t.label} style={{
                    fontSize: 12, fontWeight: 600, color: t.color,
                    padding: '6px 14px', borderRadius: r.full,
                    background: '#F8F6F0', border: `1px solid ${c.border}`,
                  }}>
                    {t.label}
                  </span>
                ))}
              </div>
              <p style={{ marginBottom: 16 }}>
                Tier placement weighs the AI-assigned tier first, and where that&apos;s absent, falls back
                to detecting the tier from the chipset itself — matched against known flagship and
                upper-mid-range silicon: Snapdragon 8-series, Dimensity 9000-series, Apple A-series
                Bionic/Pro, Tensor, Kirin, and Exynos.
              </p>

              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: c.text1 }}>Value score.</strong> Compares a phone&apos;s hardware
                composite (benchmark, camera resolution, battery capacity, RAM, charging speed, screen
                size) against a real peer group of similarly priced phones — not the entire catalog — so a
                budget phone is judged against other budget phones, not flagships three times the price.
              </p>

              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: c.text1 }}>Category rankings.</strong> Best Camera Phones, Best
                Battery Life, Foldables, and every other &quot;Best Of&quot; list are ranked directly off
                the Smart Score dimension relevant to that category.
              </p>

              <p style={{ marginBottom: 0 }}>
                <strong style={{ color: c.text1 }}>AI-generated text.</strong> Comparison verdicts, match
                explanations, and trade-off notes on comparison and recommendation pages are written by an
                AI model based on the phones&apos; real specifications and your stated priorities or
                budget. This is a summary layer on top of the underlying data — it never changes the
                specs, prices, or scores, and it&apos;s regenerated from scratch each time rather than
                written by hand. If that generation step fails or is unavailable, these pages still work;
                you simply see the specs and scores without the written commentary.
              </p>

              <Callout>
                We continuously refine the scoring model and tier detection as new hardware releases. If a
                score or tier looks wrong, <a href="#contact" style={{ color: c.accent, fontWeight: 600, textDecoration: 'underline' }}>contact us</a> — we read every message.
              </Callout>
            </Section>

            <Section id="tools" icon={<RotateCcw size={18} strokeWidth={1.75} />} title="Tools">
              <p style={{ marginBottom: 16 }}>
                Beyond browsing and comparing, Specmob has a few purpose-built tools:
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 0, paddingLeft: 0, listStyle: 'none' }}>
                {[
                  <>
                    <strong style={{ color: c.text1 }}>Help Me Choose</strong> (<Link href={ROUTES.pick} style={{ color: c.accent, textDecoration: 'underline' }}>/pick</Link>) —
                    set a budget and pick 2–3 priorities, and we rank the top 5 matching phones using the
                    same scoring logic described above.
                  </>,
                  <>
                    <strong style={{ color: c.text1 }}>Compare</strong> (<Link href={ROUTES.compare()} style={{ color: c.accent, textDecoration: 'underline' }}>/compare</Link>) —
                    put up to 4 phones side by side with every spec, an AI-written verdict, and a
                    category-by-category winner breakdown.
                  </>,
                  <>
                    <strong style={{ color: c.text1 }}>Trade-In Estimator</strong> (<Link href={ROUTES.tradein} style={{ color: c.accent, textDecoration: 'underline' }}>/trade-in</Link>) —
                    get an estimated resale range for a phone you own based on its condition, battery
                    health, and functional state, plus recommendations for what you could upgrade to with
                    that value.
                  </>,
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.accent, flexShrink: 0, marginTop: 10 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="data" icon={<Database size={18} strokeWidth={1.75} />} title="Data Sources">
              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: c.text1 }}>Specifications.</strong> Phone specs — dimensions,
                display, camera, chipset, battery, connectivity, and more — are aggregated from publicly
                available manufacturer specifications and established phone-database sources, then
                normalized into a consistent structure so every phone can be compared apples-to-apples
                regardless of brand.
              </p>
              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: c.text1 }}>Pricing.</strong> We track pricing over time rather than
                showing a single static number. Prices are checked periodically per phone and per region
                where available, which is what powers our price history charts and price-drop detection.
                Prices are shown for reference and can lag real-world changes — always confirm the final
                price on the retailer&apos;s page before buying.
              </p>
              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: c.text1 }}>Benchmarks.</strong> Performance figures — AnTuTu, GPU
                scores, and similar — come from published third-party benchmark results for each chipset,
                not from our own testing.
              </p>
              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: c.text1 }}>Known limitations.</strong> Specs data can occasionally
                contain scraping artifacts or gaps, especially for newly released or less mainstream
                phones. We run automated repair checks on known problem fields, but if you spot something
                that looks clearly wrong, flagging it via <a href="#contact" style={{ color: c.accent, textDecoration: 'underline' }}>Contact</a> helps us fix it faster than we&apos;d catch
                it ourselves.
              </p>
              <p style={{ marginBottom: 0 }}>
                <strong style={{ color: c.text1 }}>Data freshness.</strong> Not every field refreshes on the
                same interval — stable data (specs, brand info) is cached longer than time-sensitive data
                (prices, trending rankings), so different parts of a page may reflect slightly different
                snapshot times.
              </p>
            </Section>

            <Section id="contact" icon={<Mail size={18} strokeWidth={1.75} />} title="Contact">
              <p style={{ marginBottom: 16 }}>
                Corrections, feedback, or sponsorship inquiries — the fastest route is our{' '}
                <Link href={ROUTES.contact} style={{ color: c.accent, fontWeight: 600, textDecoration: 'underline' }}>Contact page</Link>,
                which routes each type of message correctly. Or email directly:{' '}
                <a href="mailto:ahmed.messaad.ml@gmail.com" style={{ color: c.accent, fontWeight: 600, textDecoration: 'underline' }}>ahmed.messaad.ml@gmail.com</a>
              </p>
              <p style={{ marginBottom: 16 }}>
                For data corrections specifically, including the phone name/model and what looks wrong
                speeds things up a lot.
              </p>
              <p style={{ marginBottom: 0, color: c.text3, fontSize: 13.5 }}>
                We aim to respond within a few business days.
              </p>
            </Section>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#FFFFFF', border: `1px solid ${c.border}`, borderRadius: r.lg,
                padding: '16px 20px', boxShadow: sh.sm
              }}>
                <ShieldCheck size={18} color="#2A9D8F" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, color: c.text2 }}>
                  Read our full <Link href="/privacy" style={{ color: c.accent, fontWeight: 600, textDecoration: 'underline' }}>Privacy Policy</Link>{' '}
                  and <Link href="/terms" style={{ color: c.accent, fontWeight: 600, textDecoration: 'underline' }}>Terms of Use</Link> for the legal details.
                </span>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
                background: '#FFFFFF', border: `1px solid ${c.border}`, borderRadius: r.lg,
                boxShadow: sh.sm
              }}>
                <Heart size={18} color={c.accent} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, color: c.text2 }}>
                  Specmob is self-funded and ad-light by design. See what it costs to run and how to help
                  at <Link href={ROUTES.support} style={{ color: c.accent, fontWeight: 600, textDecoration: 'underline' }}>/support</Link>.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <style>{`
        .about-toc a:hover { color: ${c.accent} !important; background: #F8F6F0; }
        ${mq.lg} {
          .about-grid { grid-template-columns: 1fr !important; }
          .about-toc { display: none; }
        }
      `}</style>
    </div>
  )
}
