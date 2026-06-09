import { NextResponse } from 'next/server';
import { api } from '../../../../lib/api';
import { clearAuthCookies, getAccessToken } from '../../../../lib/auth-cookies';

export async function POST() {
  const accessToken = await getAccessToken();
  if (accessToken) {
    // Best-effort: tell the API to revoke the refresh token. Ignore failures.
    await api
      .post('/auth/logout', {}, { headers: { authorization: `Bearer ${accessToken}` } })
      .catch(() => undefined);
  }
  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}
