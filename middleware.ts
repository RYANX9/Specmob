import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'

const PERMANENT = 308

const LIMITS = {
  page: { perMinute: 10, perDay: 60 },
  prefetch: { perMinute: 120, perDay: 600 },
} as const

const MINUTE_S = 60
const DAY_S = 86_400
const BLOCK_AFTER_MINUTE_S = 86_400
const BLOCK_AFTER_DAY_S = 604_800
const MAX_COMPARE = 4

const TRUSTED_CRAWLER =
  /googlebot|google-inspectiontool|bingbot|duckduckbot|applebot|facebookexternalhit|twitterbot|slackbot|whatsapp|telegrambot|linkedinbot/i
const PHONE_PATH = /^\/brand\/([^/]+)\/([^/]+)\/?$/
const COMPARE_PATH = /^\/compare\/([^/]+)\/?$/

// ARGV: 1 minLimit, 2 dayLimit, 3 minTtl, 4 dayTtl, 5 blockTtlMin, 6 blockTtlDay, 7.. members
// Returns seconds until the client may retry, or 0 when allowed.
const SCRIPT = `
local ttl = redis.call('TTL', KEYS[1])
if ttl > 0 then return ttl end
redis.call('SADD', KEYS[2], unpack(ARGV, 7))
redis.call('SADD', KEYS[3], unpack(ARGV, 7))
if redis.call('TTL', KEYS[2]) < 0 then redis.call('EXPIRE', KEYS[2], ARGV[3]) end
if redis.call('TTL', KEYS[3]) < 0 then redis.call('EXPIRE', KEYS[3], ARGV[4]) end
if redis.call('SCARD', KEYS[2]) > tonumber(ARGV[1]) then
  redis.call('SET', KEYS[1], '1', 'EX', ARGV[5])
  return tonumber(ARGV[5])
end
if redis.call('SCARD', KEYS[3]) > tonumber(ARGV[2]) then
  redis.call('SET', KEYS[1], '1', 'EX', ARGV[6])
  return tonumber(ARGV[6])
end
return 0
`

let redis: Redis | null | undefined

function client(): Redis | null {
  if (redis !== undefined) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  redis = url && token ? new Redis({ url, token }) : null
  return redis
}

function clientIp(request: NextRequest): string | null {
  return request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null
}

function trackedPhones(pathname: string): string[] | null {
  const phone = pathname.match(PHONE_PATH)
  if (phone) return [`${phone[1]}-${phone[2]}`.toLowerCase().slice(0, 120)]

  const compare = pathname.match(COMPARE_PATH)
  if (compare) {
    return compare[1]
      .toLowerCase()
      .split('-vs-')
      .slice(0, MAX_COMPARE)
      .map(s => s.slice(0, 120))
  }
  return null
}

async function retryAfter(request: NextRequest, members: string[]): Promise<number> {
  const r = client()
  const ip = clientIp(request)
  if (!r || !ip) return 0

  const prefetch =
    request.headers.get('next-router-prefetch') === '1' || request.headers.get('purpose') === 'prefetch'
  const { perMinute, perDay } = prefetch ? LIMITS.prefetch : LIMITS.page
  const tag = prefetch ? 'pf' : 'pg'

  try {
    return await r.eval<(string | number)[], number>(
      SCRIPT,
      [`blk:${ip}`, `seen:${tag}:m:${ip}`, `seen:${tag}:d:${ip}`],
      [perMinute, perDay, MINUTE_S, DAY_S, BLOCK_AFTER_MINUTE_S, BLOCK_AFTER_DAY_S, ...members],
    )
  } catch {
    return 0
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  if (pathname === '/') {
    const compare = searchParams.get('compare')
    if (compare) {
      return NextResponse.redirect(new URL(`/compare/${compare}`, request.url), PERMANENT)
    }

    const q = searchParams.get('q')
    if (q) {
      return NextResponse.redirect(new URL(`/search?q=${encodeURIComponent(q)}`, request.url), PERMANENT)
    }

    const brand = searchParams.get('brand')
    if (brand) {
      const slug = brand.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      if (slug) {
        const target = new URL(`/brand/${slug}`, request.url)
        const page = searchParams.get('page')
        if (page && /^\d+$/.test(page) && page !== '1') target.searchParams.set('page', page)
        return NextResponse.redirect(target, PERMANENT)
      }
    }
  }

  if (request.method === 'GET' && !TRUSTED_CRAWLER.test(request.headers.get('user-agent') ?? '')) {
    const members = trackedPhones(pathname)
    if (members?.length) {
      const wait = await retryAfter(request, members)
      if (wait > 0) {
        return new NextResponse('Too many requests', {
          status: 429,
          headers: { 'Retry-After': String(wait), 'Cache-Control': 'no-store' },
        })
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
}
