import { NextResponse } from 'next/server';
import { api } from '../../../../../../../lib/api';
import { getAccessToken } from '../../../../../../../lib/auth-cookies';

// BFF: list + upload attachments for a task. Proxies to Nest, which keys these
// on the task id (membership is resolved from the task); the project id in the
// path is only for URL consistency with the other task routes.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { taskId } = await params;
  const token = await getAccessToken();
  const res = await api.get(`/tasks/${taskId}/attachments`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return NextResponse.json(res.data, { status: res.status });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { taskId } = await params;
  const token = await getAccessToken();
  // Forward the raw multipart body (boundary intact) so Nest's Multer parses it
  // — no re-encoding of the FormData on our side.
  const contentType = req.headers.get('content-type') ?? 'application/octet-stream';
  const body = Buffer.from(await req.arrayBuffer());
  const res = await api.post(`/tasks/${taskId}/attachments`, body, {
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': contentType,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  return NextResponse.json(res.data, { status: res.status });
}
