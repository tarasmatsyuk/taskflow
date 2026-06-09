import { NextRequest, NextResponse } from 'next/server';
import { api } from '../../../../lib/api';
import { setAuthCookies } from '../../../../lib/auth-cookies';
import type { AuthResponse } from '../../../../lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await api.post<AuthResponse>('/auth/register', body);
  if (res.status >= 400) {
    return NextResponse.json(res.data, { status: res.status });
  }
  await setAuthCookies(res.data.accessToken, res.data.refreshToken);
  return NextResponse.json({ user: res.data.user }, { status: 201 });
}
