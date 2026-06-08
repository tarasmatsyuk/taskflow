// Cookie names — kept in their own module (no `next/headers` import) so the
// edge middleware can import them without pulling in server-only APIs.
export const ACCESS_COOKIE = 'tf_access';
export const REFRESH_COOKIE = 'tf_refresh';

export const ACCESS_MAX_AGE = 60 * 15; // 15 min (matches API access token)
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (matches refresh)
