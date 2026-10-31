import type { NextConfig } from 'next'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.specmob.com').replace(/\/+$/, '')

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'specmob.vercel.app' }],
        destination: `${SITE_URL}/:path*`,
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      { source: '/va/script.js', destination: '/_vercel/insights/script.js' },
      { source: '/va/view', destination: '/_vercel/insights/view' },
      { source: '/va/event', destination: '/_vercel/insights/event' },
    ]
  },
}

export default nextConfig
