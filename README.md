# EMOPET

EMOPET is a canine-wellbeing software and firmware monorepo. The repository currently contains a web application, a mobile application, a TypeScript API, shared inference/protocol packages, database schemas and migrations, and partial MAT/TAG firmware code.

This README describes the code observed on `main`. It does not establish product maturity, deployment readiness, clinical validity, or a frozen Product V1 scope.

## Repository status

| Area | Observed implementation | Current status |
|---|---|---|
| Web | Next.js 15, React 19, HeroUI 3, Tailwind 4 | `OBSERVED` |
| Mobile | Expo 52, React 18, React Native 0.76 | `OBSERVED` |
| API | Hono 4 on Node.js, Zod validation | `OBSERVED`, several routes remain placeholders |
| Database | Drizzle ORM schemas for PostgreSQL | `OBSERVED`, clean migration application is `BLOCKED` |
| Shared packages | ELI engine, BLE protocol, AI personality, shared types | `OBSERVED` |
| Firmware | Partial MAT/TAG C sources | `OBSERVED_PARTIAL` |
| Authentication | JWT middleware and ownership helper; register/login/refresh are stubs | `OPEN / GATED` |
| CI and branch protection | No GitHub Actions, CODEOWNERS, or protected `main` observed | `OPEN` |
| Unity | No Unity project in this repository | `ABSENT_IN_REPOSITORY / GATED` |
| Nakama | No Nakama integration in this repository | `ABSENT_IN_REPOSITORY / GATED` |

## Monorepo layout

```text
apps/
  web/                  Next.js application and prototype Route Handlers
  mobile/               Expo/React Native application
backend/
  api/                  Hono routes, middleware, and services
  db/                   Drizzle schemas, migrations, and seeds
  test/                 Backend node:test suites
packages/
  shared/               Shared TypeScript types and Zod validators
  eli-engine/           ELI inference, confidence, baseline, and veto logic
  ble-protocol/         MAT/TAG binary frame parsing and commands
  ai-personality/       Breiz templates and content safeguards
firmware/               Partial MAT/TAG embedded implementations
docs/, data/, scripts/  Documentation, reference data, and utilities
```

The workspace is declared in `pnpm-workspace.yaml` and orchestrated with Turbo.

## Prerequisites

- Node.js 20 or newer
- pnpm 10.33.0
- PostgreSQL for database-backed API work

## Manifest-declared commands

These commands are defined by the committed manifests. Their presence is not evidence that the current branch passes them in every environment.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

Application shortcuts:

```bash
pnpm web:dev
pnpm backend:dev
pnpm mobile:dev
pnpm mobile:ios
pnpm mobile:android
```

Package-focused validation:

```bash
pnpm --filter @emopet/web lint
pnpm --filter @emopet/web typecheck
pnpm --filter @emopet/web test
pnpm --filter @emopet/web build

pnpm --filter @emopet/api typecheck
pnpm --filter @emopet/api build
pnpm --filter @emopet/api test

pnpm --filter @emopet/eli-engine typecheck
pnpm --filter @emopet/eli-engine test
pnpm --filter @emopet/ai-personality test
```

Backend tests import compiled files from `backend/dist`, so build the backend before running its test command.

## Runtime and data boundaries

The intended backend direction in the current handoff is Hono + TypeScript with PostgreSQL as durable authority and server-side authorization as policy authority. The repository does not yet implement that boundary consistently.

Observed data paths include:

- Drizzle/PostgreSQL schemas under `backend/db`;
- in-memory stores in backend prototype services;
- JSON-file persistence under `apps/web/.data/` through Next.js Route Handlers;
- localStorage/sessionStorage fallbacks and prototype owner tokens in web clients.

Treat the JSON, in-memory, and browser stores as prototype paths, not production or governance authority. Migration to one versioned backend contract remains open.

## Database warning

Do not treat `pnpm --filter @emopet/api db:migrate` as clean-database proof yet.

The committed migrations alter base tables such as `breed_sensor_profiles` and `devices` without a checked-in migration that creates every required base table, and Drizzle migration metadata is absent. Repair and validation of the migration baseline require a separate approved change with clean-database and upgrade-path evidence.

## Docker warning

`docker-compose.yml`, `scripts/init_db.sh`, and several helper documents still reference the historical Python/FastAPI/Alembic stack. The Compose API service also references a missing root `Dockerfile`. These files are retained for provenance but are not valid instructions for the active Hono backend.

## Safety and privacy constraints

- Backend authorization must enforce Guardian-to-dog access for protected resources.
- Clients, Unity, and any future realtime subsystem are untrusted inputs, not policy authorities.
- Raw audio must not be stored or transmitted; current data contracts use derived vocal counts/energy, but end-to-end negative tests remain required.
- Sensitive location/telemetry requires explicit purpose, consent, minimization, retention, and deletion rules.
- Outputs must remain non-diagnostic and avoid unsupported emotional labels or anthropomorphism.
- Product, scientific, brand, and maturity claims require their controlling source; code existence is not approval.

## Known documentation drift

Historical FastAPI, Uvicorn, psycopg2, Flutter, Python backend, NestJS, and web React 18 references remain in parts of the repository. They are cleanup candidates, not evidence of active implementations. Do not delete or promote them without an approved retention disposition.

## Further reading

- `ARCHITECTURE.md` — evidence-based repository topology and boundaries
- `AGENTS.md` / `CLAUDE.md` — project working constraints
- `SECURITY_AUDIT_REPORT.md` — historical security-pass evidence; reverify before relying on results
- `SECURITY_ROTATION_REQUIRED.md` — credential names requiring rotation review, without values
- `docs/APP_OVERVIEW.md` — detailed web application description; some product/status claims require reconciliation
