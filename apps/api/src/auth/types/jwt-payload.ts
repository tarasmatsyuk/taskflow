import { UserRole } from '@prisma/client';

/** Claims carried by the access token; attached to req.user on protected routes. */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
}

/** Refresh token carries only the subject. */
export interface JwtRefreshPayload {
  sub: string;
}

/** What the refresh strategy attaches: the subject + the raw token (for hash compare). */
export interface RefreshUser extends JwtRefreshPayload {
  refreshToken: string;
}
