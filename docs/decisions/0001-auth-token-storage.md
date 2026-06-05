# ADR 0001 — Auth token strategy & storage

**Status:** Accepted (M2) · revisit transport in M4 (frontend)
**Date:** 2026-06-05

## Context

M2 adds register/login with JWTs, route guards, and RBAC. Two questions:
1. How do we authenticate requests — sessions or tokens?
2. Where/how are tokens stored and transported?

## Decision

### Sessions vs JWT → **JWT (stateless access + stateful-ish refresh)**
- **Access token** — short-lived (`15m`), signed with `JWT_ACCESS_SECRET`. Carries
  `{ sub, email, role }`. Sent as `Authorization: Bearer <token>`. Verified by the
  `jwt` Passport strategy / `JwtAuthGuard`. Not stored server-side.
- **Refresh token** — long-lived (`7d`), signed with a **separate** `JWT_REFRESH_SECRET`,
  payload `{ sub }`. Used only at `POST /auth/refresh`.

### Refresh-token rotation → **rotate on every use, store hashed**
- On login/register/refresh we sign a new refresh token and store **`argon2(refreshToken)`**
  in `User.hashedRefreshToken` (never the raw token).
- `/auth/refresh` verifies the presented token against the stored hash, then issues a new
  pair and overwrites the hash → the previous refresh token is immediately invalid (verified
  in tests: reusing an old refresh token returns 401).
- `/auth/logout` sets `hashedRefreshToken = null`.
- Storing only the hash means a DB leak doesn't expose usable refresh tokens.

### Passwords → **argon2id** (never plaintext)
`argon2.hash` on write, `argon2.verify` on login. `passwordHash` is nullable so pre-auth
seed rows and future OAuth users can exist without a local password.

### Transport (M2) → **tokens in the JSON response body**
For M2 the API is exercised via curl/Postman, so both tokens are returned in the JSON body
and the client sends the access token as a Bearer header. Simple and testable.

### RBAC
- Global `UserRole` (`USER` | `ADMIN`) on `User`; `@Roles()` + `RolesGuard` gate by role.
- `ProjectMemberGuard` enforces **ownership** (`project.ownerId === user.sub`, ADMIN bypass).
  In M3 this broadens to real `ProjectMember` membership.

## Revisit in M4 (frontend)

**Recommendation: move the refresh token to an `httpOnly`, `Secure`, `SameSite` cookie**
once the Next.js app exists:
- `httpOnly` keeps it out of reach of JS → mitigates XSS token theft.
- The access token can stay in memory (not localStorage) and be refreshed via the cookie.
- Requires `cookie-parser`, setting/clearing the cookie in auth responses, and reading it in
  the refresh strategy. CORS already runs `credentials: true`.

Trade-off recorded: body/Bearer is fine for a pure API + Postman (M2); cookies are the right
call for a browser client (M4) to avoid XSS-exposed storage.

## Consequences
- `CreateProjectDto` no longer accepts `ownerId` — the owner is the authenticated user.
- Mutating a project requires auth; `GET` endpoints remain public for now.
- Env now requires `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_SECRET`,
  `JWT_REFRESH_EXPIRES` (see `.env.example`).
