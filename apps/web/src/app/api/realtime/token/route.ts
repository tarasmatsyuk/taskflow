import { NextResponse } from 'next/server';
import { getAccessToken } from '../../../../lib/auth-cookies';

// BFF: hand the client the access token for the socket.io handshake. The token
// lives in an httpOnly cookie the browser can't read, so the realtime client
// fetches it here (same-origin) right before connecting to the Nest gateway.
export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }
  return NextResponse.json({ token });
}
