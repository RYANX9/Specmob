import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // First-party path for Vercel Analytics so ad blockers don't drop the script.
  async rewrites() {
    return [
      { source: '/va/script.js', destination: '/_vercel/insights/script.js' },
      { source: '/va/view', destination: '/_vercel/insights/view' },
      { source: '/va/event', destination: '/_vercel/insights/event' },
    ]
  },
}

export default nextConfig
