import { cookies } from 'next/headers';
import { api } from './api';
import { ACCESS_COOKIE } from './auth-constants';

/**
 * Server-side GET to the Nest API (via axios), authenticated with the
 * access-token cookie. Middleware refreshes an expired access token before the
 * page renders, so by the time this runs the cookie is fresh.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  const res = await api.get<T>(path, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (res.status >= 400) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return res.data;
}
