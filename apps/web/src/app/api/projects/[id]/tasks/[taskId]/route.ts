import { NextResponse } from 'next/server';
import { api } from '../../../../../../lib/api';
import { getAccessToken } from '../../../../../../lib/auth-cookies';

// Update a task (title/description/status/priority/...).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id, taskId } = await params;
  const body = await req.json();
  const token = await getAccessToken();
  const res = await api.patch(`/projects/${id}/tasks/${taskId}`, body, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return NextResponse.json(res.data, { status: res.status });
}
