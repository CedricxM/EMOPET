# EMOPET Security Audit Plan

## Scope

This audit covers the EMOPET monorepo with priority on:

- `apps/web` Next.js app, especially `app/api/**`, `lib/server/**`, `lib/data/**`, Mapbox community data, Breiz API and contact/admin routes.
- `backend` Hono API, especially auth middleware, route handlers, Drizzle schema/migrations, service integrations and CORS.
- Shared packages only where they affect validation, public data exposure or server-side authorization.
- Environment handling at repository root and app/backend boundaries.

No UI redesign, route redesign, navigation change or visual identity change is planned.

## Current Stack Observed

- Monorepo: pnpm + Turbo.
- Web: Next.js 15 / React 19 in `apps/web`, with route handlers under `apps/web/app/api`.
- Backend API: Hono + Drizzle + PostgreSQL driver in `backend`.
- Database layer: Drizzle schema/migrations in `backend/db`.
- Mapbox: already integrated in `apps/web/components/bretagne-map`; data-layer schemas/mocks exist under `apps/web/lib/data/mapbox`.
- Supabase: no Supabase client or migration usage observed in the initial structure scan; Supabase-specific RLS work will be skipped unless later inspection finds active usage.
- AI/API integrations: Anthropic in `/api/breiz`, Resend notification hook, OpenWeatherMap backend service, Mapbox public token.
- Authentication: backend JWT middleware exists; web admin routes use an `ADMIN_TOKEN` header gate; some web prototype data uses local/server stores.

## Phase 1 - Secrets and Environment

Inspect:

- `.gitignore`
- `.env.example`
- local env file names without printing values
- `apps/web/app/api/**`
- `apps/web/lib/server/**`
- `backend/api/**`
- `backend/db/**`
- package configs and scripts

Actions if needed:

- Ensure real env files are ignored.
- Ensure examples contain placeholders only.
- Add missing placeholder variable names.
- If any committed-looking secret is found, replace only with a placeholder and create `SECURITY_ROTATION_REQUIRED.md` listing variable names only.

## Phase 2 - Authentication and Authorization

Inspect:

- `backend/api/middleware/auth.ts`
- `backend/api/routes/*.ts`
- `apps/web/lib/server/admin.ts`
- `apps/web/app/api/admin/**`
- user/dog/profile/sensor/community route handlers

Likely fixes:

- Harden production admin access when no admin token is configured.
- Add reusable safe authz helpers where the current project shape allows it.
- Add tests for admin checks and cross-user ownership logic.

## Phase 3 - Database and RLS

Inspect:

- `backend/db/schema/**`
- `backend/db/migrations/**`
- `backend/db/index.ts`
- route-level Drizzle queries

Expected outcome:

- Supabase RLS likely not applicable.
- Drizzle/Postgres authorization must be enforced in API code.
- Add index or query guidance only if concrete inefficient or unsafe patterns are present.

## Phase 4 - Rate Limiting

Inspect:

- Existing `apps/web/lib/server/rate-limit.ts`
- All Next route handlers under `apps/web/app/api/**`
- Backend Hono routes under `backend/api/routes/**`

Likely fixes:

- Reuse existing lightweight fixed-window limiter.
- Add missing limits on public or expensive endpoints.
- Return safe `429` responses with standard headers.

## Phase 5 - Validation and Error Handling

Inspect:

- API request parsing and payload limits.
- Breiz AI fallback behavior.
- Map/community contribution serialization.
- FCI/Breiz/ELI data-layer no-result and insufficient-data paths.

Likely fixes:

- Add small validation helpers where missing.
- Avoid raw stack traces and sensitive logs.
- Keep error payloads generic and useful.

## Phase 6 - Scalability and Query Efficiency

Inspect:

- Unbounded API responses.
- Queries in loops or repeated store loads.
- Client-side exposure of large private datasets.
- Static FCI/Breiz data caching boundaries.

Likely fixes:

- Add pagination/limits where missing.
- Keep public map serialization restricted to public-safe fields.
- Document DB index recommendations if schema changes are not safe in this pass.

## Phase 7 - Privacy Boundaries

Inspect:

- Mapbox/community marker serialization.
- Journal/contact/admin APIs.
- Breiz local knowledge and AI request body.
- Data-layer mock vs production boundaries.

Likely fixes:

- Ensure map popups and marker APIs do not expose owner email, user id, dog profile, sensor data or private notes.
- Keep community contribution visibility opt-in.

## Phase 8 - Tests and Verification

Run or update:

- `pnpm --filter @emopet/web typecheck`
- `pnpm --filter @emopet/web lint`
- `pnpm --filter @emopet/web test`
- `pnpm --filter @emopet/web build`
- backend typecheck/tests where fixes touch `backend`

Add focused tests for:

- admin authorization behavior
- rate limit behavior
- public map privacy serialization
- Breiz fallback
- ELI insufficient-data behavior
- FCI no-results behavior
- territorial scoring regression

## Phase 9 - Reports

Create:

- `SECURITY_AUDIT_REPORT.md`
- `SECURITY_CHECKLIST.md`
- `SECURITY_ROTATION_REQUIRED.md` only if secret rotation is required

Reports will list secret variable names only, never secret values.
