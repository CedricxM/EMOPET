# EMOPET — Observed Repository Architecture

This document records the architecture observed in the current repository. It separates implemented facts from intended direction and unresolved decisions. It does not declare production readiness or change any `OPEN`, `GATED`, or `CANDIDATE` status.

## 1. System topology

```text
Expo mobile client ─────────────┐
                               │
Next.js web + Route Handlers ──┼── currently split API/data paths
                               │
Hono API ──────────────────────┘
   │
   ├── Drizzle schemas / PostgreSQL driver
   ├── ELI engine
   └── shared validation and domain types

MAT/TAG partial firmware ── BLE protocol package ── client/backend integration

Unity: absent and gated
Nakama: not canonical on main; experimental work remains gated
```

The controlled target direction supplied for this reconciliation is a Hono/TypeScript backend with PostgreSQL as durable data authority and backend authorization as policy authority. Current code only partially realizes that direction.

## 2. Workspace boundaries

The repository uses pnpm workspaces and Turbo.

| Workspace | Responsibility | Important dependencies |
|---|---|---|
| `apps/web` | Next.js UI, server Route Handlers, prototype server storage | shared, ELI engine, AI personality |
| `apps/mobile` | Expo/React Native client and BLE-facing services | shared, ELI engine, BLE protocol, AI personality |
| `backend` | Hono API, middleware, services, Drizzle schemas/migrations | shared, ELI engine |
| `packages/shared` | Domain types, Zod validators, constants | Zod |
| `packages/eli-engine` | EKF, confidence, baselines, dynamics, vetoes | shared |
| `packages/ble-protocol` | Versioned MAT/TAG frame parsing and commands | shared |
| `packages/ai-personality` | Breiz content templates and safeguards | shared |
| `firmware` | Partial embedded sensor algorithms | no complete build boundary observed |

The shared packages do not import application code. Applications and backend consume shared packages.

## 3. Backend API

`backend/api/index.ts` is the active TypeScript API entrypoint.

- Framework: Hono 4 on `@hono/node-server`.
- Input validation: `@hono/zod-validator` and validators from `@emopet/shared`.
- Global middleware: logging, CORS, and fixed-window in-memory rate limits.
- Public route group: `/api/auth`.
- Authenticated route groups: dogs, sensors, community, feature progress, health, and directory.
- Authentication: HS256 JWT verification through `jose`.
- Authorization: dog ownership lookup through Drizzle; cross-owner lookup returns 404.

Material limitations:

- auth register/login/refresh handlers are TODO stubs;
- several dog/sensor/health handlers return placeholders rather than durable records;
- rate limits are process-local;
- the API contract is represented by TypeScript/Zod code, not a versioned OpenAPI artifact;
- route-level negative authorization coverage is incomplete.

Authentication and production authorization therefore remain `OPEN / GATED`.

## 4. Persistence model

### PostgreSQL/Drizzle plane

`backend/db` contains schemas for users, dogs, devices, sensor summaries, ELI state, community, AI, datasets, freemium content, and related records. `backend/db/index.ts` creates a Postgres.js client wrapped by Drizzle.

The repository now has a repeatable **disposable PostgreSQL QA** path for comparing checked-in SQL path A with a Drizzle-generated baseline.

- P0 DB validates table inventory on both paths;
- constraint/index fingerprints are compared against an explicit classified known-drift ledger;
- path-A migrations now repair the identified shadow foreign keys and restore the missing community-membership and sensor-summary provenance/idempotence schema;
- the parity gate fails on new drift and on ledger entries that have been resolved but not removed.

This is not full production-migration authority. Classified schema drift remains, including column-level differences that are not yet globally gated, and production/upgrade promotion still requires separately reviewed evidence.

### Next.js prototype plane

`apps/web/app/api/**` implements a separate set of Route Handlers for contact, journal, community, map, admin, Breiz, breeds, and context features.

`apps/web/lib/server/store.ts` writes JSON collections under `.data/`. Web clients also use localStorage/sessionStorage fallbacks and prototype owner/admin tokens. These paths are outside the Hono JWT and dog-ownership middleware.

### Backend in-memory plane

Backend services currently keep presence, consent, waitlist, community-rule, report, and block state in process memory for some prototype flows.

### Authority consequence

The repository currently has multiple stores and policy boundaries. PostgreSQL/backend cannot yet be described as the sole runtime truth. Consolidation requires a controlled API/data migration decision and compatibility tests.

## 5. Client applications

### Web

- Next.js 15 App Router and React 19.
- Current route tree includes `/`, `/dashboard`, `/breiz`, `/journal`, `/quartier`, `/rapport`, `/profil`, `/world`, `/contact`, and `/admin`.
- Server Route Handlers provide prototype APIs and JSON persistence.
- Mapbox and multiple external providers are environment-gated.

### Mobile

- Expo 52, React 18, React Native 0.76, Expo Router.
- API client sends Bearer tokens to the configured backend URL.
- Auth state is in-memory Zustand state; no controlled secure persistence/recovery flow is implemented.
- Platform manifests request Bluetooth and fine-location permissions; location purpose and consent remain gated.
- Mobile preferences default location opt-in to false, but community and vet-export opt-ins to true. Those defaults conflict with private-by-default/explicit-opt-in constraints and require a controlled decision.

## 6. Sensor and inference boundaries

Shared sensor contracts use hourly summaries and derived features. Microphone-related fields are vocal-event counts, energy summaries, spectral metadata, and reliability—not audio files. The mobile manifest does not request microphone/record-audio permission.

This is positive implementation evidence for data minimization, but it is not end-to-end proof that raw audio cannot enter API payloads, logging, analytics, or future integrations. Negative contract and persistence tests remain required.

`packages/eli-engine` contains inference, confidence, baseline, recovery/anticipation, and veto logic with unit tests. Scientific or product maturity must not be inferred from the presence of those algorithms or tests.

## 7. Firmware and transport

`packages/ble-protocol` implements binary MAT/TAG frame parsing and commands. The firmware tree contains partial sensor algorithms for MAT and collar components, but no complete firmware application/build system was identified during the baseline inspection.

Firmware readiness is `OBSERVED_PARTIAL`, not validated hardware integration.

## 8. Unity and Nakama

No canonical Unity project is present on `main`; Unity remains gated.

Nakama is also not canonical on `main`. Experimental World/Nakama work may exist on non-main branches, but branch presence is not runtime, product, deployment, or production authority.

Both workstreams remain `GATED / NOT PRODUCTION AUTHORITY` until their own activation-gate evidence is promoted deliberately.

## 9. CI, deployment, and repository controls

- GitHub Actions runs repository-owned Security supply-chain, P0 DB (path-scoped), Owner-terminology and targeted Windows-portability workflows;
- all 33 current `scripts/control/*.test.mjs` authority tests have a CI execution path, either directly or through a package-script alias invoked by CI;
- the Windows gate verifies cross-platform checkout attributes, generated-source byte stability, VBO committed-snapshot evidence, Windows-sensitive path/guard behavior and the web test suite on `windows-latest`;
- the active `main-protection` repository ruleset requires pull-request promotion and conversation resolution, blocks branch deletion and non-fast-forward updates, uses 0 required approvals for the current single-admin ownership model, and has no bypass actors;
- **required status checks are not yet configured in the ruleset**, so the seven selected repository-owned checks remain a governance P0 rather than a mechanical merge prerequisite (#257);
- P0 DB remains intentionally excluded from global required checks because it is path-scoped;
- GitHub still reports `delete_branch_on_merge=false`; branch lifecycle cleanup remains open under #679;
- the repository is public while licence/contribution ownership and CODEOWNERS policy remain open under #680.

CI is materially stronger than the original baseline, but required-check enforcement, branch lifecycle settings, IP/contribution ownership, CODEOWNERS/reviewer ownership, deployment environments and release ownership remain `OPEN`.

## 10. Confirmed constraints and open decisions

Confirmed working constraints for implementation:

- protected-resource policy belongs on the backend;
- clients and future Unity/Nakama components are untrusted inputs;
- raw audio must not be stored or transmitted;
- unsupported medical/emotional claims and anthropomorphism are prohibited;
- code evidence does not promote product, security, scientific, deployment, or release maturity.

Open or gated decisions include:

- production identity provider/protocol and lifecycle;
- remaining database drift and production migration/upgrade promotion;
- disposition of the Next.js prototype API/data plane;
- consent, retention, deletion, location, and telemetry rules;
- exact ELI/ELS/Claim Guard definitions and Breiz bounds;
- required status-check enforcement, branch lifecycle, repository IP/licensing, CODEOWNERS/reviewer policy, environments, and deployment ownership;
- Unity project/version/targets/first slice;
- Nakama use cases and deployment target.

