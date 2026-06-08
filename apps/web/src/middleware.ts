import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE } from './lib/auth-constants';

const PUBLIC_PATHS = ['/login', '/register'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(ACCESS_COOKIE);
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Not logged in + private page → go sign in.
  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  // Already logged in + auth page → go to the app.
  if (hasSession && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/projects';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Run on pages only — skip BFF routes (/api/*), Next internals, and static files.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
