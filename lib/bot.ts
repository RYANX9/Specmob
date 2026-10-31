// Client-side only. Headless browsers that run JS should not fire API calls or analytics events.
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|meta-webindexer|python|curl|wget|phantom|puppeteer|playwright|selenium|preview/i

export function isLikelyBot(): boolean {
  if (typeof navigator === 'undefined') return false
  if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return true
  return BOT_RE.test(navigator.userAgent || '')
}
