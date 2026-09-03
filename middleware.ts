// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  
  // Remove hash-based compare URLs and redirect to clean URL
  if (pathname === '/' && search.startsWith('?')) {
    const params = new URLSearchParams(search);
    const compareParam = params.get('compare');
    
    if (compareParam) {
      return NextResponse.redirect(new URL(`/compare/${compareParam}`, request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
