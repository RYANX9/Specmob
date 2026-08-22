# Specmob (Mobylite)

Live: [mobylite.vercel.app](https://mobylite.vercel.app)

A phone discovery and comparison platform built with Next.js. Lets users search and filter phones by specs, compare models side by side, get personalized recommendations, and estimate trade-in value — all backed by a dedicated FastAPI service ([renderphones](https://github.com/RYANX9/renderphones)).

## Features

- **Browse and filter** — brand pages, dynamic model pages, and category-based "best of" listings (`/best/[category]`).
- **Compare** — pick multiple phones and compare specs side by side at `/compare/[phones]`, with an always-available compare bar for building the comparison as you browse.
- **Personalized pick** — a guided flow (`/pick`) that recommends phones based on budget and priorities.
- **Trade-in estimator** — condition-based valuation at `/trade-in`.
- **Phone detail pages** — gallery, overview, and full spec breakdown as separate composable client components.
- **Ad infrastructure** — ad slots and cards with adblock detection, plus a crypto-donation support page as an ad-free alternative.
- Standard content pages: about, contact, privacy, terms.

## Tech stack

- **Next.js 15** (App Router) with **React 19** and **TypeScript**
- **Tailwind CSS 4**
- **Neon** (`@neondatabase/serverless`) for any server-side data needs in the Next layer
- Backend API: [Specmob API](https://github.com/RYANX9/renderphones) (FastAPI + Postgres)

## Project structure

```
app/
  about/, contact/, privacy/, support/, terms/, trade-in/, pick/
  best/[category]/            category listing pages
  brand/[brand]/[model]/      phone detail pages
  brand/[brand]/               brand listing pages
  compare/, compare/[phones]/  comparison tool
  components/                  navbar, footer, phone card, filter panel, compare bar, toast
  components/ads/               ad slot, ad card, adblock banner
  components/compare/           compare client logic
  components/phone-detail/      gallery, overview, specs
  components/support/           crypto donation card
lib/
  api.ts            typed client for the Specmob API
  types.ts          shared types (Phone, SearchFilters, CompareVerdict, etc.)
  specs.ts, tiers.ts, priceTiers.ts, valueScore.ts, featureTags.ts   spec/scoring helpers
  brandData.ts, team.ts, supportData.ts, adConfig.ts   static content
```

## Getting started

```bash
npm install
```

Create `.env.local`:

```
NEXT_PUBLIC_API_BASE=<url of the Specmob API backend>
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Related

- [Specmob API](https://github.com/RYANX9/renderphones) — the FastAPI backend this frontend consumes for search, comparison, recommendations, and trade-in pricing.
