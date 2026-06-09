import { NextResponse } from 'next/server';
import { api } from '../../../../lib/api';
import {
  clearAuthCookies,
  getRefreshToken,
  setAuthCookies,
} from '../../../../lib/auth-cookies';
import type { AuthResponse } from '../../../../lib/types';

// Exchange the refresh cookie for a fresh token pair (rotation).
export async function POST() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ message: 'No session' }, { status: 401 });
  }

  const res = await api.post<AuthResponse>(
    '/auth/refresh',
    {},
    { headers: { authorization: `Bearer ${refreshToken}` } },
  );

  if (res.status >= 400) {
    await clearAuthCookies(); // refresh token invalid/expired → end session
    return NextResponse.json(res.data, { status: res.status });
  }

  await setAuthCookies(res.data.accessToken, res.data.refreshToken);
  return NextResponse.json({ user: res.data.user });
}
