# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TaskFlow — an Nx monorepo learning project building a Jira-like task board through milestones M1→M10.
Two apps: a **NestJS API** (`apps/api`) and a **Next.js App-Router web client** (`apps/web`), backed by
Postgres + Redis (Docker). E2E suites live in `apps/api-e2e` (Jest) and `apps/web-e2e` (Playwright).
`packages/` is a workspace glob but is currently empty.

Milestone plan and mockups live outside the repo on the user's Desktop (`~/Desktop/taskflow-fullstack-plan.md`,
`~/Desktop/taskflow-mockups.html`). Session/architecture context: `docs/HANDOFF.md`; decisions: `docs/decisions/`.

## Environment (read before running anything)

- **Node**: the shell defaults to Node v14, which breaks pnpm/prisma/nx. Prefix every command with:
  ```
  export PATH="/Users/admin/.nvm/versions/node/v22.22.3/bin:$PATH"
  ```
- **Package manager is pnpm** (v11; workspace config in `pnpm-workspace.yaml`). Install workspace deps with
  `pnpm add -w <pkg>` from the repo root.
- **Ports**: API `:4200`, web `:3000`. macOS AirPlay squats `:5000` — don't use it.
- Secrets live in root `.env` (gitignored); `.env.example` is the tracked template. `apps/web/.env.local` holds
  the web client's public/BFF env and *is* tracked.

## Commands

Run Nx via `pnpm exec nx …` (or `pnpm dev*` scripts). Common targets per project: `build`, `lint`, `test`,
`serve`/`dev`, and (api only) `typecheck`.

- **Dev (everything)**: `pnpm dev` — brings up Docker then `nx run-many -t serve dev`. Or individually:
  `pnpm dev:api` (`nx serve api`), `pnpm dev:web` (`nx dev web`).
- **Build**: `pnpm exec nx build api` / `nx build web`.
- **Lint**: `pnpm exec nx lint <project>`.
- **Test**: `pnpm exec nx test api` / `nx test web` (Jest). Single file: `pnpm exec nx test api -- --testPathPattern=auth`.
  Run many at once: `nx run-many -t typecheck lint test build --projects=api,web --exclude-task-dependencies`.
- **Build is the reliable verify signal** — see caveats below about `typecheck`/`test`.

### Database (Prisma 7 — non-standard, see below)

- `pnpm db:up` / `db:down` — Postgres + Redis via docker compose.
- `pnpm db:migrate` (`prisma migrate dev`), `pnpm db:generate`, `pnpm db:seed`, `pnpm db:studio`.
- `pnpm db:reset` (`prisma migrate reset`) is **destructive** — do not run without explicit user consent.

## Architecture

### API (NestJS) — auth is the backbone
- **Tokens**: JWT access (15m) + refresh (7d). Refresh tokens are argon2-hashed, stored on `User`, and
  **rotated** on every `/auth/refresh`. `AuthService.issueSession(user)` is the single choke point that signs a
  token pair, stores the hashed refresh token, and returns `{ user, accessToken, refreshToken }` — reuse it for
  any new login path (e.g. OAuth) rather than re-implementing token signing.
- **Access + refresh use different secrets**, so `JwtModule.register({})` is empty and secrets/expiries are passed
  per-call in `AuthService` via `ConfigService.getOrThrow(...)`.
- **Guards**: `JwtAuthGuard`, `JwtRefreshGuard`, `RolesGuard` (+`@Roles()`), `ProjectMemberGuard` (resolves
  `:id`/`:projectId` and checks membership). `@CurrentUser()` extracts the authed user/claim.
- Passwords are argon2-hashed. `User.passwordHash` is nullable (OAuth users have no local password).

### Web (Next.js App Router) — the BFF pattern is the thing to understand
The browser **never** calls the Nest API directly. Instead:
- **Route handlers** under `apps/web/src/app/api/**` are the BFF: they read the httpOnly `tf_access`/`tf_refresh`
  cookies, proxy to Nest with a Bearer token, and (for auth routes) call `setAuthCookies(...)` so the browser only
  ever receives the non-secret `user` object. New auth flows follow `app/api/auth/login/route.ts` as the template.
- **`middleware.ts`** (edge) does silent refresh via `fetch`.
- **Server Components** fetch through `lib/server-api.ts` (401 → redirect `/login`; other errors throw →
  `app/error.tsx`). Other client HTTP goes through the axios instance in `lib/api.ts` (note `validateStatus: () => true`,
  so callers must check `res.status` explicitly rather than rely on thrown errors).
- **Board (M5)** is a client component using TanStack Query (with SSR `initialData`), dnd-kit for drag, and
  optimistic move + rollback.

### Data model (Prisma)
`User` (email unique, role, nullable passwordHash + hashedRefreshToken); `Project` (key unique, status, ownerId);
`ProjectMember` (composite PK `[projectId, userId]`, `MemberRole`); `Task` (per-project `number` → "TF-40",
status/priority, `order` as fractional Float for positioning, soft-delete via `deletedAt`, M:N `labels`);
`Label` (per-project, implicit M:N `_TaskLabels`). Enums: `ProjectStatus`, `TaskStatus`
(BACKLOG/TODO/IN_PROGRESS/IN_REVIEW/DONE), `TaskPriority`, `MemberRole`, `UserRole`.

## Prisma 7 gotchas (this repo diverges from Prisma docs)
- The datasource URL is **not** in `schema.prisma` — it lives in root `prisma.config.ts`, which loads `.env`
  (Prisma 7 no longer auto-loads it) and hands the URL to Migrate.
- At **runtime** the client needs the pg driver adapter: `new PrismaClient({ adapter: new PrismaPg(...) })`.
- `prisma migrate dev` requires a **TTY** and will refuse to run in a non-interactive shell (piping `y` does not
  satisfy it). For automated migrations, generate SQL with
  `prisma migrate diff --from-config-datasource --to-schema … --script` into a timestamped
  `apps/api/prisma/migrations/<ts>_<name>/migration.sql`, then apply with `prisma migrate deploy`. Never fall back
  to `migrate reset`.

## Known traps
- **`nx typecheck api` and `nx test web` have pre-existing failures** unrelated to most changes (missing `express`
  types, `isolatedModules` `import type` issues, stale build-cache `TS6305`, and a `page.tsx` redirect test). Judge
  a change by whether it adds *new* failures, not by a green typecheck. `nx build`/`nx lint`/`nx test api` are clean.
- **Stale-server trap**: an API process running pre-change code produces confusing 400s (e.g. "property X should not
  exist"). Fix: `lsof -i :4200`, kill it, `nx build api`, restart.
- **Demo login**: `taras@taskflow.dev` / `password123` (ADMIN, member of all seeded projects). Test as this user or
  task/label endpoints 403.
- **`gh` CLI is not installed.** Create PRs and comments via the GitHub REST API using the keychain token
  (`git credential fill`). Branch stack merges bottom-up; PRs based on the parent branch auto-retarget to `main`.
