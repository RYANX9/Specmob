
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Training / bulk scrapers: still blocked
      { userAgent: ['Bytespider', 'CCBot', 'PetalBot', 'meta-externalagent'], disallow: '/' },

      // Everyone else, including AI search and answer bots
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/trade-in?phone=', '/search', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap-main.xml`,
  }
}
