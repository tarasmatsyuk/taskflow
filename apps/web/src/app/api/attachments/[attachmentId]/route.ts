import { NextResponse } from 'next/server';
import { api } from '../../../../lib/api';
import { getAccessToken } from '../../../../lib/auth-cookies';

// BFF: presigned download URL (GET) + delete (DELETE) for a single attachment.
// Proxies to Nest, which enforces project membership from the attachment's task.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  const token = await getAccessToken();
  const res = await api.get(`/attachments/${attachmentId}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return NextResponse.json(res.data, { status: res.status });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  const token = await getAccessToken();
  const res = await api.delete(`/attachments/${attachmentId}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  // Nest returns 204 No Content on success — don't attach a JSON body.
  if (res.status >= 400) {
    return NextResponse.json(res.data, { status: res.status });
  }
  return new NextResponse(null, { status: 204 });
}
