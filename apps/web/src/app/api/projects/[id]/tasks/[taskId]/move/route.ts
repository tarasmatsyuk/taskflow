import { NextRequest, NextResponse } from 'next/server';
import { api } from '../../../../../../../lib/api';
import { getAccessToken } from '../../../../../../../lib/auth-cookies';

// BFF: move/reorder a task. Proxies to Nest PATCH /projects/:id/tasks/:taskId/move.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id, taskId } = await params;
  const body = await req.json();
  const token = await getAccessToken();
  const res = await api.patch(
    `/projects/${id}/tasks/${taskId}/move`,
    body,
    { headers: token ? { authorization: `Bearer ${token}` } : {} },
  );
  return NextResponse.json(res.data, { status: res.status });
}
