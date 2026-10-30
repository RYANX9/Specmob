
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Block selected AI and third-party crawlers.
      {
        userAgent: [
          'Bytespider',
          'GPTBot',
          'CCBot',
          'ClaudeBot',
          'PetalBot',
          'KeenableBot',
          'meta-externalagent',
        ],
        disallow: '/',
      },

      // Rules for normal crawlers, including Googlebot.
      {
        userAgent: '*',
        allow: '/',

        // Don't crawl phone-prefilled trade-in URLs.
        // The normal /trade-in page remains crawlable.
        disallow: ['/trade-in?phone='],
      },
    ],

    sitemap: `${SITE_URL}/sitemap-main.xml`,
  }
}
