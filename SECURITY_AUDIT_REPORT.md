# EMOPET Security Audit Report

## Summary

Security hardening was applied to the web API and backend API without changing routes, navigation, layout or visual identity.

Main outcomes:

- Environment examples were replaced with placeholder-only values.
- A rotation note was created for variable names that may have appeared as non-placeholder values in examples.
- Public and expensive web API routes now use rate limiting.
- Admin web routes are rate limited and remain closed when `ADMIN_TOKEN` is missing.
- Journal entries created through the prototype server store are scoped by an owner token and no longer share all user-created entries globally.
- Public map/community routes now apply safer serialization, input cleanup and hidden-post filtering.
- Backend JWT/report secrets now fail closed in production when only dev fallback values are available.
- Backend `dogId` routes now have reusable ownership checks before returning or accepting dog-scoped data.
- Shared generated declarations were regenerated after a corrupted null-byte artifact broke backend builds.
- The ELI anticipation tracker now uses UTC time consistently and falls back to validated historical windows when today's predicted window has no samples.
- Supabase was not found in active code; RLS work is not applicable in this repo state.

## Files Inspected

- Root config: `.gitignore`, `.env.example`, package files, `pnpm-workspace.yaml`, `turbo.json`.
- Web API: `apps/web/app/api/**`.
- Web server helpers: `apps/web/lib/server/**`.
- Web data privacy: `apps/web/lib/data/mapbox/**`, `apps/web/lib/data/eli/**`, `apps/web/lib/data/fci/**`, `apps/web/lib/data/breiz/**`.
- Backend API: `backend/api/**`.
- Backend DB layer: `backend/db/schema/**`, `backend/db/migrations/**`, `backend/db/index.ts`.
- Mapbox integration: `apps/web/components/bretagne-map/**`.

## Fixes Implemented

### Secrets and Environment

- Rewrote `.env.example` and `apps/web/.env.example` with safe placeholders only.
- Confirmed `.gitignore` ignores root `.env`, `.env*.local`, `apps/web/.env.local` and server `.data`.
- Added `SECURITY_ROTATION_REQUIRED.md` listing variable names only.
- Local `.env` and `apps/web/.env.local` contain configured values but are ignored. This workspace is not an active Git checkout, so historical tracking could not be verified.
- Secret-pattern scan has one known false positive in `data/vbo/breed_canonical.json` and `data/vbo/breed_canonical_insert.sql`: a breed slug beginning with the letters `sk-` inside a Danish-Swedish breed name. It is not a secret token.

### Rate Limiting

- Added shared web helper: `apps/web/lib/server/request-security.ts`.
- Added rate limits to:
  - `/api/contact`
  - `/api/journal`
  - `/api/map/spots`
  - `/api/map/spots/[id]/comments`
  - `/api/community/posts`
  - `/api/community/events`
  - `/api/community/posts/[id]/replies`
  - `/api/community/posts/[id]/flag`
  - `/api/admin/moderation`
  - `/api/admin/posts/[id]`
  - `/api/admin/contact/[id]`
  - `/api/breeds`
- Added backend Hono rate limiter: `backend/api/middleware/rate-limit.ts`.
- Applied backend limits to auth and protected API route groups.

### Authorization and Privacy

- Added backend dog ownership helper: `backend/api/middleware/authorization.ts`.
- Applied ownership checks to dog-scoped backend routes:
  - `backend/api/routes/dogs.ts`
  - `backend/api/routes/sensors.ts`
  - `backend/api/routes/health.ts`
  - `backend/api/routes/community.ts` for copresence dog access
- Hardened `/api/journal` so prototype user-created entries require `x-journal-owner-token`.
- Updated the journal client fetches to send that token without changing UI.
- Filtered hidden community posts from public reads.
- Rejected replies to hidden posts.
- Cleaned display names used in public/community submissions.
- Validated map comment ratings.
- Ensured map marker tests cover absence of private owner/dog fields.

### Production Fail-Closed Behavior

- `backend/api/middleware/auth.ts` rejects missing/dev `JWT_SECRET` in production.
- `backend/api/services/vet-report.ts` rejects missing/dev report secret in production.
- `backend/api/index.ts` rejects missing `CORS_ORIGIN` in production.

### Scalability and Reliability

- Bounded backend directory search radius and query length.
- Added rate limits to public write endpoints to reduce spam/load.
- Kept static FCI/Breiz/ELI data-layer tests passing.
- Did not add heavy dependencies.

## Supabase / RLS Status

No Supabase client, Supabase migrations or `auth.uid()` policy files were found in active project code. The backend uses Drizzle/Postgres. RLS-specific migration changes were therefore skipped.

Recommended future Postgres work:

- Add database indexes for `owner_id`, `dog_id`, `user_id`, `created_at`, `privacy_level`, `verified_status`, `commune`, `category`.
- Add database-level constraints for public/community privacy fields when real tables replace prototype stores.

## Mock Data vs Production Structures

Production-ready structures:

- Web and backend rate-limit helpers.
- Admin token fail-closed behavior.
- Backend dog ownership abstraction.
- Mapbox public marker privacy schema/tests.
- FCI/Breiz/ELI data-layer validation tests.

Still mock/prototype:

- Web JSON file store under `.data`.
- Journal owner token scoping.
- Community posts/events and map spots.
- Backend auth registration/login implementation.
- Backend dog CRUD persistence.
- In-memory rate limiting for local/dev use.

Needs real datasets/infrastructure later:

- Real auth provider/session model.
- Durable rate-limit store such as Redis/Upstash for multi-instance deployments.
- Postgres persistence for journal/contact/community/map data.
- Database migrations for indexes and row-level ownership constraints.
- Monitoring/logging pipeline with secret redaction.

## Validation Results

Passed:

- `pnpm --filter @emopet/web typecheck`
- `pnpm --filter @emopet/web lint`
- `pnpm --filter @emopet/web test` (144 tests)
- `pnpm --filter @emopet/web build`
- `pnpm --filter @emopet/api typecheck`
- `pnpm --filter @emopet/api test` (7 tests)
- `pnpm --filter @emopet/api build`
- `pnpm --filter @emopet/shared typecheck`
- `pnpm --filter @emopet/shared build`
- `pnpm --filter @emopet/eli-engine typecheck`
- `pnpm --filter @emopet/eli-engine test` (26 tests)
- `pnpm --filter @emopet/eli-engine build`

Notes:

- `@emopet/api test` still emits a Node module-type performance warning for `packages/shared/dist/index.js`; tests pass.
- Git status/diff could not be used because `.git` is present as an empty directory, so this workspace is not an active Git checkout.
- A local `.env` and `apps/web/.env.local` exist. Their contents were not printed. `.gitignore` excludes real env files and the example files contain placeholders.

## Remaining Risks

- Backend auth routes are still TODO and must not be used as production authentication until password hashing, persistence and refresh-token handling are implemented.
- Web prototype stores are not a production data boundary; they are now safer but should be replaced by authenticated server persistence.
- In-memory rate limiting is not sufficient for horizontally scaled production.
- Git history and working-tree diffs could not be inspected because `.git` is empty in this workspace.
- Supabase RLS is not applicable unless Supabase is introduced later.

## Manual Follow-Up

- Rotate variables listed in `SECURITY_ROTATION_REQUIRED.md` if any previous example values were real.
- Add `"type": "module"` or adjust shared package output later if the Node module-type warning matters in CI.
- Replace prototype owner-token scoping with authenticated user/dog ownership once auth is live.
- Add Postgres migrations for indexes and privacy constraints when real tables are wired.

## Product Safety Confirmation

This security pass did not introduce dog-state scoring, public dog-state exposure, owner/dog rankings or new clinical claims.


