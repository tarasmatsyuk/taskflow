import { NextResponse } from 'next/server';
import { api } from '../../../../../lib/api';
import { getAccessToken } from '../../../../../lib/auth-cookies';

// BFF: list + create a project's labels.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = await getAccessToken();
  const res = await api.get(`/projects/${id}/labels`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return NextResponse.json(res.data, { status: res.status });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const token = await getAccessToken();
  const res = await api.post(`/projects/${id}/labels`, body, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return NextResponse.json(res.data, { status: res.status });
}
