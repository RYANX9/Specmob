import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PERMANENT = 308
const OLD_HOST = 'specmob.vercel.app'
const NEW_HOST = process.env.NEW_HOST // e.g. 'specmob.com'

// Real slugs that legitimately start with the brand name: 'brand/slug'
const KEEP = new Set<string>(['honor/honor-x9b'])

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // 1. Kill duplicate-brand URLs. No redirect, on any host.
  const m = pathname.match(/^\/brand\/([^/]+)\/([^/]+)\/?$/)
  if (m && m[2].startsWith(m[1] + '-') && !KEEP.has(`${m[1]}/${m[2]}`)) {
    return new NextResponse('Gone', {
      status: 410,
      headers: { 'X-Robots-Tag': 'noindex', 'Cache-Control': 'public, max-age=3600' },
    })
  }

  // 2. Old domain -> new domain, same path
  const host = request.headers.get('host')?.split(':')[0]
  if (NEW_HOST && host === OLD_HOST) {
    return NextResponse.redirect(`https://${NEW_HOST}${pathname}${request.nextUrl.search}`, PERMANENT)
  }

  // 3. your existing rules, unchanged
  if (pathname === '/') {
    // ...compare / q / brand blocks exactly as you have them
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
}
