# Specmob rules

Read this before changing pricing, ranking, the home dial, compare, or SEO.
Do not change these behaviors without the owner's explicit approval.
If a task conflicts with a rule, stop and ask.

## 1. Product principles
- The home dial is the core product. The phone database is evidence behind it.
- Compare supports up to 4 phones with a verdict. Competitors stop at 2.
- No sponsored picks. Rankings come from specs only.
- USD is the default currency everywhere.
- The API runs on a free host: fewer calls are better. Never refetch data
  already present in a payload. Region-dependent ordering is done in the browser.

## 2. Price source
- Single source of truth: the phone_prices DB view. No other code computes a
  phone price. Cards, search, matches, pick, compare and the dial all read it.
- Phone with variants: price = lowest variant price, with or without a retailer
  link. A variant means the price was checked, so it is trusted.
- Phone with no variants: price = phones.price_usd.
- price_history only feeds the chart. It never changes a price.

## 3. Price display
- Headline price is always USD: the lowest price of the selected variant.
- No link: show USD only.
- Local currency appears only when viewer region == offer region exactly
  (DE viewer on Amazon.de shows EUR).
- A viewer from another euro-zone country (FR on Amazon.de) gets the link but
  sees USD.
- Global retailers (amazon.com) always show USD, for every viewer.
- Never switch currency by zone, language or scope. Exact region match only.
- The regional price is shown on the primary buy button, not the headline.

## 4. Offers
- Show every linked offer of the selected variant, including several offers for
  the same variant. Region never hides an offer.
- Primary (default) offer = viewer's exact region, then same zone, then global,
  then europe, then china_version, then others. Remaining offers go in the
  dropdown (AlternateOfferPicker).
- Ordering lives in app/core/market.py (_offer_priority) and lib/offers.ts.
  Keep both identical.
- The detail payload carries all offers once. The browser sorts them by region.
  Do not add a client refetch of offers.
- A buy button needs a linked, available, non-placeholder offer (isRealOffer).
- Placeholder offers are search links: only used as the "Find on" fallback.
- SEO AggregateOffer uses retailer-sourced offers only. Do not widen it.

## 5. Home dial
- Dial value V is a ceiling. Range = [0.80 V, 1.05 V]. The 5% tolerance exists
  because prices differ by region. At 2000+ there is no ceiling.
- Constants live only in app/services/recommend_service.py
  (BUDGET_FLOOR_RATIO, BUDGET_CEILING_RATIO). The client never pads a range.
- Ranking: overall_score (or the priority blend) + price-position bonus
  - penalty for phones above V.
- Priorities are optional, max 3.
- If nothing matches, widen the floor downward only. The ceiling never moves.
- Phones above V are flagged (over_budget) and explained in the UI.
- Home calls recommend with limit=1 only. The top 5 live on /pick.
- Slider scale is piecewise (lib/priceTiers.ts). Do not make it linear.
- Last budget and priorities are stored in localStorage (disclosed in /privacy).

## 6. Scores
- overall_score is tier-relative and not comparable across tiers. Never rank
  across a wide price range by score alone.

## 7. Compare
- Up to 4 phones. Popularity is ranked by whole sets (compare_set_stats),
  not by pairs split from sets. Fallback order: sets, pairs, curated, same-tier.

## 8. SEO
- One h1 per page, server-rendered. The home h1 lives in PriceDial.
- A page is indexable only with enough real phones (indexable flags).
- Canonicals derive from NEXT_PUBLIC_SITE_URL.
- Scores and verdicts are the unique content. Do not remove them.

## 9. Code map
- Price view: phone_prices (DB). Offers and variants: app/services/phone_repo.py
- Region rules: app/core/market.py, lib/offers.ts
- Currency: app/core/currency.py, lib/price.ts
- Dial: app/components/home/PriceDial.tsx, lib/priceTiers.ts
- Recommend: app/services/recommend_service.py, app/routes/phones.py
- Phone page: app/components/phone-detail/PhoneDetailClient.tsx

## 10. Style
- No emojis. Comments only where necessary. Senior-level code, no beginner patterns.