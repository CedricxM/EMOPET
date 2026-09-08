# EMOPET

EMOPET is a canine-wellbeing software and firmware monorepo containing a web application, a mobile application, a TypeScript API, shared inference/protocol packages, PostgreSQL/Drizzle schemas and migrations, controlled product/science authorities, and partial MAT/TAG firmware work.

> **Observed snapshot:** 2026-09-08  
> **Observed branch:** `experience-hardening-2026-09-06`  
> **Snapshot basis:** PR #224 after reconciliation with `main`  
> **Do not treat as fresh after:** 2026-09-15 without re-observation

This README is a repository snapshot, not product authority. It does not establish deployment readiness, clinical validity, scientific validation, legal clearance, or a frozen Product V1 scope.

## Repository status

| Area | Observed implementation | Current status |
|---|---|---|
| Web | Next.js 15, React 19, HeroUI 3, Tailwind 4 | `OBSERVED` |
| Mobile | Expo 52, React 18, React Native 0.76 | `OBSERVED`; Home/Devices are being aligned to current Care/brand authority |
| API | Hono 4 on Node.js, Zod validation | `OBSERVED`; several routes remain placeholders/prototypes |
| Database | Drizzle ORM + PostgreSQL migrations | `EXECUTABLE BASELINE CI PASS`; production/upgrade migration authority remains open |
| Shared packages | ELI engine, BLE protocol, AI personality, shared types | `OBSERVED` |
| Firmware | Partial MAT/TAG C sources | `OBSERVED_PARTIAL`; no complete physical integration proof |
| Authentication | JWT middleware and ownership helper; register/login/refresh still not consolidated production auth | `OPEN / GATED` |
| Security CI | GitHub Actions supply-chain and P0 DB baseline workflows execute on PR #224 | `EXECUTABLE CODE EVIDENCE`, not release/scientific/legal evidence |
| Third-party data | Rights register + fail-closed release gates | `CONTROLLED / LEGAL CLEARANCE STILL OPEN` |
| Unity | No active Unity product implementation | `ABSENT_IN_ACTIVE_RUNTIME / GATED` |
| Nakama | No active Nakama product implementation | `ABSENT_IN_ACTIVE_RUNTIME / GATED` |

### Exact-head CI evidence observed on 2026-09-08

For PR #224 head `dac5d185be0930d9ecc8cdf3a743e45113d68a91` before this documentation refresh:

- `Security supply chain` run `34197853592`: **success**;
- `P0 DB baseline validation` run `34197853598`: **success**;
- dependency remediation regression executed install, workspace typecheck, workspace tests, and web build successfully;
- rights, professional-sharing, mobile-Home, legacy-content, Semgrep, Gitleaks, SBOM/provenance-related gates executed in CI.

A green code run proves only the checks it executed on that SHA. It does **not** prove animal-science validity, hardware performance, user value, third-party legal rights, regulatory compliance, or production readiness. Any later commit requires fresh exact-head evidence.

## Monorepo layout

```text
apps/
  web/                  Next.js application and prototype Route Handlers
  mobile/               Expo/React Native application
backend/
  api/                  Hono routes, middleware, and services
  db/                   Drizzle schemas, migrations, and controlled seeds
  test/                 Backend node:test suites
packages/
  shared/               Shared TypeScript types and Zod validators
  eli-engine/           ELI inference, confidence, baseline, and veto logic
  ble-protocol/         MAT/TAG binary frame parsing and commands
  ai-personality/       Breiz release authority and semantic safeguards
firmware/               Partial MAT/TAG embedded implementations
docs/                   Controlled strategy/product/science/engineering records
data/                    Dataset registries and provenance/rights evidence
scripts/                 Validation, provenance and authority gates
```

The workspace is declared in `pnpm-workspace.yaml` and orchestrated with Turbo.

## Prerequisites

- Node.js 20 or newer
- pnpm 10.33.0
- PostgreSQL for database-backed API work

## Core validation commands

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm web:build
pnpm rights:audit
pnpm professional-share:audit
pnpm mobile-home:audit
pnpm legacy-freemium:audit
```

Application shortcuts:

```bash
pnpm web:dev
pnpm backend:dev
pnpm mobile:dev
pnpm mobile:ios
pnpm mobile:android
```

Backend tests may depend on compiled backend output in some paths; CI is the reference for the exact composed command sequence used as code evidence.

## Runtime and data authority

The durable target direction is Hono + TypeScript with PostgreSQL as durable data authority and server-side authorization as policy authority. The repository does not yet realize that boundary consistently.

Observed competing/prototype paths still include:

- Drizzle/PostgreSQL under `backend/db`;
- in-memory backend prototype stores;
- JSON-file persistence under `apps/web/.data/` through Next.js Route Handlers;
- browser/local fallbacks and prototype identity paths in some clients.

Treat JSON, in-memory, and browser stores as prototype/non-authoritative paths unless a controlled record states otherwise. A Product V1 behavior should not be born in the wrong data plane merely because it is convenient.

## Database evidence boundary

The previous statement that clean migration application was simply `BLOCKED` is stale.

The P0 DB baseline workflow now executes a PostgreSQL service, applies the checked-in SQL migration sequence, checks repeatability/inventory expectations, builds the backend and runs database-related validation successfully on the cited PR head.

That establishes **current CI baseline executability**. It does not automatically establish:

- compatibility with every historical deployed database;
- rollback/recovery readiness;
- production migration ownership;
- backup/restore guarantees;
- zero-downtime upgrade behavior.

Those remain separate evidence questions.

## Product and maturity boundaries

- `docs/strategy/FOUNDER_STRATEGIC_LOCKS_2026-09-07.md` is founder-level strategic authority.
- MAT commercial inclusion remains governed by `G-MAT-INCREMENTAL-VALUE-01` / issue #230; a candidate reconciliation record now exists and still requires Founder approval.
- `docs/product/EMOPET_CARE_PRODUCT_MASTER_v0.1.md` is product authority, not evidence that Care is implemented or validated.
- Breiz release content must pass canonical semantic/release authority; legacy paths are not release authority.
- Third-party rights gates fail closed where evidence is missing; this is a control, not legal clearance.
- Code tests are not scientific validation.

## Safety and privacy constraints

- Backend authorization must enforce Guardian-to-dog access for protected resources.
- Clients and future realtime/game components are untrusted inputs, not policy authorities.
- Raw audio must not be stored or transmitted in Product V1; end-to-end negative tests remain required.
- Sensitive location/telemetry requires explicit purpose, consent, minimization, retention, export, and deletion rules.
- Outputs must remain non-diagnostic and must not convert signals into unsupported emotional truth.
- Product, scientific, brand, legal and maturity claims require their controlling source; implementation alone cannot promote them.

## Known open integration risks

- Hono/PostgreSQL is not yet the only runtime data/policy plane.
- Authentication is not yet a single composed production authority.
- Community and Vet sharing still require end-to-end truth tests rather than optimistic UI success.
- BLE bytes → parsed frame → features → ingestion → ELI has not yet been demonstrated as one controlled end-to-end evidence chain.
- MAT and TAG physical/product evidence remain behind the maturity of repo governance.
- Historical documentation and prototype paths still require explicit retirement/supersession decisions.

## Further reading

- `ARCHITECTURE.md` — observed runtime architecture and unresolved authority boundaries
- `AGENTS.md` / `CLAUDE.md` — project working constraints and authority routing
- `docs/strategy/FOUNDER_STRATEGIC_LOCKS_2026-09-07.md` — founder strategic authority
- `docs/strategy/MAT_STRATEGIC_THESIS_LAUNCH_AUTHORITY_CANDIDATE_2026-09-08.md` — OPEN candidate reconciliation, not yet a founder decision
- `docs/product/EMOPET_CARE_PRODUCT_MASTER_v0.1.md` — Care product authority
- `docs/brand/BRAND-AUTHORITY-001_EMOPET_Current_Visual_Authority_2026-08-25.md` — current controlled brand authority
