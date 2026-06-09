import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
} from './lib/auth-constants';

const PUBLIC_PATHS = ['/login', '/register'];
const API_URL = process.env.API_URL ?? 'http://localhost:4200/api';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  // Valid access token present.
  if (access) {
    if (isPublic) return redirectTo(req, '/projects');
    return NextResponse.next();
  }

  // Access expired but a refresh token remains → silent refresh.
  // Set the new cookies and bounce to the same URL so the next request (and the
  // server component that renders it) sees a fresh access cookie.
  if (refresh) {
    const tokens = await tryRefresh(refresh);
    if (tokens) {
      const res = NextResponse.redirect(req.nextUrl);
      setAuthCookies(res, tokens);
      return res;
    }
  }

  // No usable session.
  if (isPublic) return NextResponse.next();
  const res = redirectTo(req, '/login');
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}

async function tryRefresh(refreshToken: string) {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { authorization: `Bearer ${refreshToken}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
  } catch {
    return null;
  }
}

function setAuthCookies(
  res: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
) {
  const base = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: REFRESH_MAX_AGE,
  });
}

function redirectTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
