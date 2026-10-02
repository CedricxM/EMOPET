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

Unity World spike ── Hono `/api/world-spike` ── isolated Nakama runtime
World status: Unity 6000.3.25f1 present on `main`; recorded live loopback PASS; not production authority
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

World progression now also has a durable G2 foundation on `main`: migration `backend/db/migrations/0047_world_gamification_persistence.sql`, Drizzle schema `backend/db/schema/world-gamification.ts`, and PostgreSQL ledger/build stores. The controlling persistence gate remains `BLOCKED_PENDING_PRIVACY_TOPOLOGY_RECONCILIATION`; its durable implementation status is `SCHEMA_AND_STORE_PRESENT_NOT_ACTIVATED`, with no active World progression HTTP route and no promoted privacy lifecycle. The controlled legacy replay path is likewise `CONTROLLED_DRAFT_NOT_RUNTIME_AUTHORITY`.

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

A canonical **World spike** is present on `main` under `unity/world`, pinned to Unity **6000.3.25f1**. It contains transport-independent World state, a Hono-backed client, session lifecycle handling and deterministic EditMode tests. There is deliberately no production scene or production release authority.

Nakama is present as an isolated World realtime transport boundary under `backend/api/services/world-spike` and `infra/nakama`. Unity talks to the canonical backend under `/api/world-spike`; it does not authenticate directly to Nakama and does not own Nakama credentials, tokens, durable identity, privacy, moderation, scientific or persistence authority.

Recorded workstation evidence on **2026-10-01** includes a separate **32/32 EditMode baseline** plus the named live `LiveTwoUserBootstrapPresenceChatRenewalAndDegradedTransport` scenario, which passed in **2.487 s** through the loopback Unity → Hono → Nakama path. The live scenario covered two synthetic session bootstraps, visibility/presence, group join, preset chat, renewal and fail-closed degraded transport.

This is `SPIKE EVIDENCE / NOT PRODUCTION AUTHORITY`. It proves the checked-in first slice and loopback integration path, not deployment readiness, production credentials, product-value validation or permission to release World.

## 9. CI, deployment, and repository controls

- GitHub Actions runs repository-owned Security supply-chain, P0 DB (path-scoped), Owner-terminology and targeted Windows-portability workflows;
- all current `scripts/control/*.test.mjs` authority tests have a CI execution path, with dynamic coverage enforcement preventing newly added root control tests from silently bypassing pull-request CI;
- the Windows gate verifies cross-platform checkout attributes, generated-source byte stability, VBO committed-snapshot evidence, Windows-sensitive path/guard behavior and the web test suite on `windows-latest`;
- the active `main-protection` repository ruleset requires pull-request promotion and conversation resolution, blocks branch deletion and non-fast-forward updates, uses 0 required approvals for the current single-admin ownership model, and has no bypass actors;
- **seven selected repository-owned security/supply-chain status checks are required by the active `main-protection` ruleset**, making them mechanical merge prerequisites; #257 is completed;
- P0 DB remains intentionally excluded from global required checks because it is path-scoped;
- GitHub reports `delete_branch_on_merge=true`; automatic deletion is active for newly merged heads, while legacy/stale branch cleanup remains open under #679;
- the repository is public while licence/contribution ownership and CODEOWNERS policy remain open under #680.

CI is materially stronger than the original baseline. Required-check enforcement and automatic merged-head deletion are active; legacy/stale branch cleanup remains open under #679, IP/contribution ownership and CODEOWNERS/reviewer ownership remain open under #680, and deployment environments/release ownership remain `OPEN` under #831.

## 10. Confirmed constraints and open decisions

Confirmed working constraints for implementation:

- protected-resource policy belongs on the backend;
- clients, including Unity, and Nakama transport components are untrusted inputs rather than policy authorities;
- raw audio must not be stored or transmitted;
- unsupported medical/emotional claims and anthropomorphism are prohibited;
- code evidence does not promote product, security, scientific, deployment, or release maturity.

Open or gated decisions include:

- production identity provider/protocol and lifecycle;
- remaining database drift and production migration/upgrade promotion authority under #831;
- disposition of the Next.js prototype API/data plane;
- consent, retention, deletion, location, and telemetry rules;
- exact ELI/ELS/Claim Guard definitions and Breiz bounds;
- legacy/stale branch cleanup, repository IP/licensing, CODEOWNERS/reviewer policy, environments, and deployment ownership;
- production Unity scene/content pipeline, supported release targets, packaging and activation authority;
- production Nakama deployment, operations and release authority;
- World progression privacy-lifecycle promotion, runtime/UI activation and any production migration authority.

