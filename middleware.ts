import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PERMANENT = 308

export function middleware(request: NextRequest) {
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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
}
