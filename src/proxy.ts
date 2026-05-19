import { NextRequest, NextResponse } from 'next/server';

const PUBLIC = ['/login', '/signup'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = req.cookies.has('adhd_session');
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  if (authed && isPublic) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (!authed && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
