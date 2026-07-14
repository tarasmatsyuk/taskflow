# TaskFlow — Session Handoff / Progress Tracker

Learning project: Nx monorepo (NestJS API + Next.js web, Postgres + Redis in Docker), worked through
milestones M1→M10. Plan and mockups live on the user's Desktop
(`~/Desktop/taskflow-fullstack-plan.md`, `~/Desktop/taskflow-mockups.html`).

**Architecture, environment setup, commands, Prisma 7 gotchas, and known traps now live in `../CLAUDE.md`.**
This file only tracks milestone progress, the PR stack, parked issues, and what's next.

## Progress
- **M1–M5 done**: auth (JWT access+refresh w/ rotation, guards), web BFF (httpOnly cookies + silent refresh),
  M4 project detail board (read-only), M5 board (TanStack Query + dnd-kit drag + optimistic move), task
  create/edit modal, labels (create/assign/filter).
- **In flight**: Google OAuth login/registration (ID-token flow) — PR #16.
- **Next: M6** — WebSocket gateway (live board), BullMQ (Redis) jobs (due-date reminders), Redis caching +
  invalidation, rate limiting (`@nestjs/throttler`), MinIO/Mailhog.

## Git / PR chain (stacked, merge bottom-up; GitHub auto-retargets to main)
```
main ─ #3 filter-pagination ─ #4 swagger-docs ─ #5 m2-auth ─ #6 m3-tasks ─ #8 m3-perf
     └ #11 m4-auth ─ #12 m4-projects ─ #13 m4-detail ─ #15 m5-board ─ #16 google-oauth
```
- `#15 m5-board` — M5 complete, pushed.
- `#16 google-oauth` (branch `task/google-oauth-login`, based on `m5-board`) — Sign in/register with Google via
  a Google Identity Services ID-token: `User.googleId` (unique), `POST /auth/google` verifies the token and reuses
  `issueSession()`, `/api/auth/google` BFF route + shared `GoogleButton` on login/register. **Inert until real
  Google Cloud Web-client credentials are set**: `GOOGLE_CLIENT_ID` (`.env`) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  (`apps/web/.env.local`), same value, with `http://localhost:3000` as an authorized origin.

## Parked issues / decisions
- **`GET /projects` unscoped/public**: a non-member sees a project in the list but 403s opening its tasks.
  Scoping-to-user was implemented then **reverted by the user** — revisit separately.
- **dnd-kit drag isn't simulable headlessly** (real mouse only). Drop appends to end of column; within-column
  reorder via `@dnd-kit/sortable` is future work. Labels step was verified at build/migration level, not UI-exercised.
- **Google OAuth** hasn't been exercised at runtime (needs real Google credentials); account-linking is by
  Google-verified email.
