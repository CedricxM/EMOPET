# EMOPET — Observed Repository Architecture

> **Observed:** 2026-09-08  
> **Observed branch:** `experience-hardening-2026-09-06` / PR #224  
> **Snapshot freshness:** re-observe after 2026-09-15 or after any major integration merge

This document records implementation and authority boundaries observed in the repository. It is not itself product, scientific, legal, deployment, or hardware validation authority.

## 1. System topology

```text
Expo mobile client ─────────────┐
                               │
Next.js web + Route Handlers ──┼── multiple current/prototype API and data paths
                               │
Hono API ──────────────────────┘
   │
   ├── Drizzle / PostgreSQL
   ├── ELI engine
   ├── Breiz canonical release authority
   └── shared validation/domain contracts

MAT/TAG partial firmware
   │
   └── BLE protocol package ── client/backend integration

Unity: gated / not active runtime authority
Nakama: gated / not active runtime authority
```

The controlled durable direction is Hono/TypeScript with PostgreSQL as durable data authority and backend authorization as policy authority. Current runtime code still contains competing prototype planes, so that target is not yet fully realized.

## 2. Evidence classes

Repository maturity must be reported by evidence class rather than one global green/red status.

| Evidence class | What it can prove | Current example | What it cannot prove |
|---|---|---|---|
| **Code evidence** | install/typecheck/tests/build/static gates on an exact SHA | PR #224 GitHub Actions | animal validity, hardware performance, legal clearance |
| **Physical evidence** | measured behavior of MAT/TAG/harness/bench | still incomplete/open | user value or scientific validity by itself |
| **Human evidence** | Guardian/vet comprehension, burden, task success | pilots/interviews still open | electrical or security correctness |
| **Scientific evidence** | validity against controlled ground/reference evidence | canine validation still open | legal or operational readiness |
| **Legal/compliance evidence** | rights, classification, applicable obligations | rights register/gates exist; clearance remains item-specific | scientific efficacy |

A passing code workflow must never silently promote another evidence class.

## 3. Workspace boundaries

The repository uses pnpm workspaces and Turbo.

| Workspace | Responsibility | Authority caveat |
|---|---|---|
| `apps/web` | Next.js UI and several prototype Route Handlers | some server/data behavior remains outside Hono policy authority |
| `apps/mobile` | Expo/React Native client and BLE-facing services | client is not authorization or scientific authority |
| `backend` | Hono API, middleware, services, Drizzle schemas/migrations | intended durable runtime authority, not yet exclusive |
| `packages/shared` | shared types and Zod validators | contract layer only |
| `packages/eli-engine` | inference/confidence/baseline/veto logic | implementation/tests are not scientific validation |
| `packages/ble-protocol` | MAT/TAG wire parsing and commands | one layer of the device-to-ELI chain, not the whole chain |
| `packages/ai-personality` | Breiz release templates and semantic safeguards | bounded contextual layer, not scientific truth |
| `firmware` | partial embedded implementations | no complete production firmware evidence |

## 4. Backend and policy authority

`backend/api/index.ts` is the Hono API entrypoint.

Observed controls include JWT verification, Zod validation, middleware, and dog-ownership authorization helpers. Material limitations remain:

- production auth is not one fully composed/externally verified authority;
- register/login/refresh maturity must be assessed on the actual composed candidate/main state, not by counting auth PRs;
- several feature paths remain prototype/placeholder or process-local;
- route-level negative authorization and lifecycle coverage are not yet complete for Product V1;
- API contracts are not yet one versioned cross-client authority from device ingestion through ELI and user surfaces.

**Target rule:** no new Product V1 durable behavior should be introduced into a browser JSON store, process memory, or client fallback merely because that path already exists.

## 5. Persistence planes

### PostgreSQL / Drizzle

`backend/db` contains schemas and SQL migrations. The P0 DB baseline workflow now executes successfully on the cited PR head, including PostgreSQL startup, migration application, schema/inventory checks, backend build and database-related validation.

This changes the old conclusion that clean baseline application was simply blocked.

Current status:

- **fresh CI baseline executability:** `PASS` on observed PR head;
- **historical upgrade compatibility:** `OPEN`;
- **rollback/restore/production migration runbook:** `OPEN`;
- **PostgreSQL as sole Product V1 runtime truth:** `NOT YET TRUE`.

### Next.js prototype plane

`apps/web/app/api/**` still contains Route Handlers for multiple product surfaces. `apps/web/.data/` / server-store patterns and browser fallbacks remain prototype data paths where present.

Disposition must be explicit per path: `MIGRATE`, `REMOVE`, `DEMO_ONLY`, or `KEEP` with approved authority. Absence of a retirement decision is not permission to expand a prototype path.

### Backend in-memory plane

Some backend services retain process-memory behavior. These may be useful for prototype/test work but cannot support claims of durable write/read/delete semantics unless backed by durable persistence.

## 6. Community and professional sharing truth boundary

Two P0 principles apply across social/professional surfaces:

1. **No false successful mutation.** A `201 created/posted/commented` response is not truthful unless the created object is durably or intentionally retrievable under the declared authority.
2. **No synthetic protected identity.** A missing authenticated Guardian must never be converted into `demo-user` inside a protected runtime path.

Vet/professional sharing must be backend-authorized and backend-signed. A mobile client must not fabricate a successful share URL, expiry, dog identity, or grant when server authority is absent.

These are runtime acceptance rules; documentation alone does not prove them satisfied.

## 7. Client applications

### Web

- Next.js 15 / React 19;
- multiple current product routes and prototype Route Handlers;
- third-party map/local services are now subject to explicit rights/release gates rather than token-presence alone.

### Mobile

- Expo 52 / React 18 / React Native 0.76 / Expo Router;
- Home/Devices on PR #224 are being aligned to current Care and brand authority;
- device operational state must not be converted into a hidden-state conclusion about the dog;
- consent and sharing defaults require current-head verification before being treated as private-by-default evidence;
- auth/secure persistence/recovery remain separate integration questions.

## 8. Sensor → ELI chain

The project needs five distinct contracts, even if some types currently overlap:

1. **wire frame** — bytes emitted by MAT/TAG transport;
2. **parsed frame** — validated decoded transport record;
3. **feature extraction** — derived physical/behavioral features with quality/provenance;
4. **ingestion envelope** — server-bound identity/time/device/provenance contract;
5. **ELI input** — inference-ready evidence after eligibility/quality checks.

The repository contains pieces of this chain, especially BLE parsing, shared sensor structures, and ELI logic. It does not yet have end-to-end proof that one canonical transformation owns each boundary.

Required code evidence: cross-layer golden vectors.  
Required scientific evidence: separate canine/bench validation appropriate to each claimed observation.

## 9. Raw audio boundary

Current contracts emphasize derived vocal features rather than raw audio, and mobile does not request microphone permission in the observed baseline. That is positive minimization evidence, not proof of non-exfiltration.

Product V1 requires negative tests showing that raw audio is not representable, serializable, persisted, logged, or emitted by network contracts unless an explicitly approved future authority changes that rule.

## 10. MAT and TAG maturity

### MAT

MAT is currently both a strategic hypothesis and an experimental hardware workstream. Commercial inclusion remains gated by `G-MAT-INCREMENTAL-VALUE-01` / #230.

The candidate reconciliation in `docs/strategy/MAT_STRATEGIC_THESIS_LAUNCH_AUTHORITY_CANDIDATE_2026-09-08.md` is **not** founder approval. Until approved, do not silently resolve the conflict between the founder architecture lock and the allowed `MAT_OPTIONAL / POST_V1 / REDIRECT / KILL` outcomes.

### TAG

TAG remains strategically important but physically less closed than the governance surrounding it. Battery, RF/antenna, GNSS/BLE coexistence, charging, sealing, thermal behavior, attachment/comfort, and energy budget require explicit feasibility evidence.

## 11. CI and supply-chain evidence

The previous architecture snapshot incorrectly said there were no GitHub Actions workflows.

Observed on PR #224 head `dac5d185be0930d9ecc8cdf3a743e45113d68a91` before this documentation refresh:

- `Security supply chain` run `34197853592`: `success`;
- `P0 DB baseline validation` run `34197853598`: `success`;
- dependency install/typecheck/tests/web build executed;
- dependency audit, Semgrep, secret scan, SBOM/provenance and authority gates executed.

This establishes an executable CI path for that exact SHA. Any subsequent commit requires fresh exact-head runs.

Branch protection, CODEOWNERS/rulesets, deployment ownership, staging evidence and release policy remain separate repository/operational controls and must not be inferred from a green workflow.

## 12. Controlled strategic/product authorities

Important current authorities include:

- `docs/strategy/FOUNDER_STRATEGIC_LOCKS_2026-09-07.md`;
- `docs/product/EMOPET_CARE_PRODUCT_MASTER_v0.1.md`;
- `docs/brand/BRAND-AUTHORITY-001_EMOPET_Current_Visual_Authority_2026-08-25.md`;
- `docs/control/EMOPET_BREIZ_SEMANTIC_AUTHORITY_v0.1.md`;
- third-party rights/provenance registers under `docs/control` and `data/registry`.

Authority documents define what may be claimed or implemented. They are not substitutes for physical, human, scientific, legal, or operational evidence.

## 13. Open P0 integration decisions

- `RUNTIME-AUTHORITY-01`: retire/migrate prototype stores and prove one vertical slice through durable backend authority;
- `AUTH`: compose one real identity/Guardian authority with negative ownership tests;
- `COMMUNITY`: remove false success and synthetic protected identity paths;
- `VET SHARE`: backend-signed grant only, with real dog/auth/revoke/expiry evidence;
- `ELI-IO-01`: freeze cross-layer contracts and golden vectors;
- `MAT-EVIDENCE-01`: collect physical bench evidence and close pin/resource assumptions from actual hardware constraints;
- `TAG-FEAS-01`: run combined electrical/mechanical/RF/energy feasibility review;
- `GUARDIAN-01`: owner/delegation/revoke/expiry and private-by-default consent behavior;
- legal/regulatory applicability and dataset rights remain explicit external evidence tasks.

The next phase should preferentially **close these existing gates with evidence** rather than create additional broad governance layers.
