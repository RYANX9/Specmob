# Specmob frontend v3 changes

Type-check: `npx tsc --noEmit` passes with zero errors. A full `next build` was not run (the sandbox cannot reach Google Fonts or your API).

## Environment variables
- NEXT_PUBLIC_API_URL (existing)
- NEXT_PUBLIC_SITE_URL (new, defaults to https://specmob.vercel.app)
- NEXT_PUBLIC_CONTACT_EMAIL (new, defaults to the previous Gmail address)
- INTERNAL_API_KEY (new, server only; sent as X-Internal-Key on server-side fetches)

## Foundation
- lib/types.ts, lib/api.ts rewritten for the v2 API (display_name, path fields, flat scores, analysis, variants, offers)
- lib/seo.ts (metadata helper), lib/structuredData.ts (BreadcrumbList, ItemList url-only, Product with AggregateOffer from real offers only, WebSite, Organization), lib/phone.ts, lib/events.ts
- sitemap.ts (API lastmod and images, indexable only), robots.ts, middleware.ts (308 redirects), next.config.ts (type errors no longer ignored)

## Pages
- Phone page: anchor sections, review from phone_analysis, full specs in HTML, Compare with, similar, price history, next steps
- Compare page and landing: pair endpoint, canonical redirect, indexable flag, most compared, matchups
- /best hub, /best/{slug}, /methodology
- Brand page (server-rendered pagination) and /brands
- /search (noindex), 404 page
- Trade-in: variant price, prefill ?phone=, estimate explanation, API next steps
- Pick: zero priorities allowed, no match percentage
- Home: new hero (H1, server-rendered default pick, optional priorities), top rated by tier, compare starter, best tiles, new releases, brands, how we rank, trade-in banner

## Not done
- Compare page: "People also compare" and "stronger alternative" sections
- Pick page: static explanation section below the wizard
- Brand logos are still hotlinked (self-host them in /public/brands)
- Age-based depreciation in trade-in (needs your percentages)
- Category page: "Coming soon" row, and "Updated" shows the render month
