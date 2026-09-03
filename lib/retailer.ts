export interface RetailerOffer {
  id?: number
  phone_id?: number
  variant_id?: number | null
  retailer: string
  region: string
  url: string
  price?: number | null
  currency?: string | null
  is_available?: boolean
  status?: string
}

export interface RetailerOffersResponse {
  offers: RetailerOffer[]
  regions_available: string[]
  is_region_exclusive: boolean
}

const RETAILER_LABELS: Record<string, string> = {
  amazon: 'Amazon',
  amazon_us: 'Amazon',
  amazon_global: 'Amazon',
  amazon_uk: 'Amazon.co.uk',
  amazon_de: 'Amazon.de',
  amazon_fr: 'Amazon.fr',
  amazon_it: 'Amazon.it',
  amazon_es: 'Amazon.es',
  amazon_in: 'Amazon.in',
  bestbuy: 'Best Buy',
  walmart: 'Walmart',
  bhphotovideo: 'B&H Photo',
  newegg: 'Newegg',
  samsung_us: 'Samsung',
  samsung_de: 'Samsung.de',
  samsung_uk: 'Samsung.co.uk',
  samsung_in: 'Samsung.in',
  apple_us: 'Apple',
  google_store: 'Google Store',
  mediamarkt: 'MediaMarkt',
  currys: 'Currys',
  fnac: 'Fnac',
  jd: 'JD.com',
  'jd.com': 'JD.com',
  tmall: 'Tmall',
  taobao: 'Taobao',
  suning: 'Suning',
  pinduoduo: 'Pinduoduo',
  mi_cn: 'Mi.com (China)',
  honor_cn: 'Honor (China)',
  oppo_cn: 'OPPO (China)',
  vivo_cn: 'vivo (China)',
  aliexpress: 'AliExpress',
  aliexpress_global: 'AliExpress',
  ebay_global: 'eBay',
  gearbest: 'Gearbest',
  banggood: 'Banggood',
  hekka: 'Hekka',
  tomtop: 'Tomtop',
  flipkart: 'Flipkart',
  daraz_pk: 'Daraz',
  mi_in: 'Mi.com (India)',
}

export function retailerDisplayName(retailer: string): string {
  const key = retailer.trim().toLowerCase()
  return RETAILER_LABELS[key] ?? retailer
}

export function buyButtonLabel(retailer: string): string {
  return `Buy on ${retailerDisplayName(retailer)}`
}

interface VariantLike {
  id: number
}

export interface OfferResolution {
  primary: RetailerOffer | null
  alternates: RetailerOffer[]
}

/**
 * offers is assumed already region-priority-sorted by the backend
 * (resolve_offers_for_region) — this only narrows by variant and
 * splits the result into one primary CTA plus any remaining alternates.
 */
export function resolveOffersForVariant(
  offers: RetailerOffer[],
  selectedVariant: VariantLike | null,
): OfferResolution {
  if (!offers.length) return { primary: null, alternates: [] }

  const variantMatches = selectedVariant
    ? offers.filter(o => o.variant_id === selectedVariant.id)
    : []

  const phoneLevel = offers.filter(o => o.variant_id == null)
  const matched = variantMatches.length > 0 ? variantMatches : phoneLevel

  if (matched.length === 0) return { primary: null, alternates: [] }

  const [primary, ...alternates] = matched
  return { primary, alternates }
}

const AMAZON_TLD_LABEL: Record<string, string> = {
  com: 'Amazon',
  'co.uk': 'Amazon.co.uk',
  de: 'Amazon.de',
  fr: 'Amazon.fr',
  it: 'Amazon.it',
  es: 'Amazon.es',
  ca: 'Amazon.ca',
  in: 'Amazon.in',
  'co.jp': 'Amazon.co.jp',
  'com.au': 'Amazon.com.au',
  'com.mx': 'Amazon.com.mx',
  nl: 'Amazon.nl',
  se: 'Amazon.se',
  pl: 'Amazon.pl',
}

const AMAZON_TLD_REGION: Record<string, string> = {
  com: 'US', 'co.uk': 'UK', de: 'DE', fr: 'FR', it: 'IT', es: 'ES',
  ca: 'CA', in: 'IN', 'co.jp': 'JP', 'com.au': 'AU', 'com.mx': 'MX',
  nl: 'NL', se: 'SE', pl: 'PL',
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

/** Derives a display label straight from the URL's domain — works for
 * any link (legacy phone_variants.url / phones.amazon_link, or a
 * retailer_links row), independent of region matching. */
export function inferRetailerLabelFromUrl(url: string): string | null {
  const hostname = hostnameOf(url)
  if (!hostname) return null

  const amazonMatch = hostname.match(/^amazon\.(.+)$/)
  if (amazonMatch) {
    const tld = amazonMatch[1]
    return AMAZON_TLD_LABEL[tld] ?? `Amazon.${tld}`
  }

  if (hostname.includes('aliexpress')) return 'AliExpress'
  if (hostname.includes('ebay')) return 'eBay'
  if (hostname.includes('jd.com')) return 'JD.com'
  if (hostname.includes('tmall')) return 'Tmall'
  if (hostname.includes('flipkart')) return 'Flipkart'
  if (hostname.includes('bestbuy')) return 'Best Buy'
  if (hostname.includes('walmart')) return 'Walmart'
  if (hostname.includes('gearbest')) return 'Gearbest'
  if (hostname.includes('banggood')) return 'Banggood'

  return null
}

/** Same idea, for the small region tag shown next to the price. */
export function inferRegionTagFromUrl(url: string): string | null {
  const hostname = hostnameOf(url)
  if (!hostname) return null
  const amazonMatch = hostname.match(/^amazon\.(.+)$/)
  if (!amazonMatch) return null
  const tld = amazonMatch[1]
  return AMAZON_TLD_REGION[tld] ?? tld.toUpperCase()
}