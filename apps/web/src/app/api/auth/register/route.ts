import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '../../../../lib/api';
import { setAuthCookies } from '../../../../lib/auth-cookies';
import type { AuthResponse } from '../../../../lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  const auth = data as AuthResponse;
  await setAuthCookies(auth.accessToken, auth.refreshToken);
  return NextResponse.json({ user: auth.user }, { status: 201 });
}
