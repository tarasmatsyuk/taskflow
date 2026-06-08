import { NextResponse } from 'next/server';
import { API_URL } from '../../../../lib/api';
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

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { authorization: `Bearer ${refreshToken}` },
  });

  const data = await res.json();
  if (!res.ok) {
    await clearAuthCookies(); // refresh token invalid/expired → end session
    return NextResponse.json(data, { status: res.status });
  }

  const auth = data as AuthResponse;
  await setAuthCookies(auth.accessToken, auth.refreshToken);
  return NextResponse.json({ user: auth.user });
}
