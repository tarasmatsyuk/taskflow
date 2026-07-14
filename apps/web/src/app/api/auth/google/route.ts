import { NextRequest, NextResponse } from 'next/server';
import { api } from '../../../../lib/api';
import { setAuthCookies } from '../../../../lib/auth-cookies';
import type { AuthResponse } from '../../../../lib/types';

// BFF: proxy the Google ID-token credential to the API, then stash tokens in
// httpOnly cookies. The browser only ever receives the (non-secret) user object.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await api.post<AuthResponse>('/auth/google', {
    credential: body.credential,
  });
  if (res.status >= 400) {
    return NextResponse.json(res.data, { status: res.status });
  }
  await setAuthCookies(res.data.accessToken, res.data.refreshToken);
  return NextResponse.json({ user: res.data.user });
}
