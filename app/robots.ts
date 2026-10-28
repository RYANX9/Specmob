import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: ['Bytespider', 'GPTBot', 'CCBot', 'ClaudeBot', 'PetalBot', 'KeenableBot', 'meta-externalagent', ],
        disallow: '/',
      },
      { userAgent: '*', allow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap-main.xml`,
  }
}
