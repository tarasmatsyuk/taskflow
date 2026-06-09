import { NextResponse } from 'next/server';
import { api } from '../../../../../lib/api';
import { getAccessToken } from '../../../../../lib/auth-cookies';

// BFF: the client board fetches tasks here (same-origin); we attach the
// httpOnly access token and proxy to the Nest API.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = await getAccessToken();
  const res = await api.get(`/projects/${id}/tasks`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return NextResponse.json(res.data, { status: res.status });
}

// Create a task in the project.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const token = await getAccessToken();
  const res = await api.post(`/projects/${id}/tasks`, body, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return NextResponse.json(res.data, { status: res.status });
}
