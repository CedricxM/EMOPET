# EMOPET — Observed Repository Architecture

> **Observed:** 2026-09-11  
> **Observed branch:** `experience-hardening-2026-09-06` / draft PR #224  
> **Implementation observed through:** `9ba58acf6ef0bb5ca9c12323c2e813a2d620f49e`  
> **Rule:** re-observe after a major integration merge or material runtime-authority change.

This document records implementation and authority boundaries observed in the repository. It is not itself product, scientific, legal, deployment, hardware, privacy or release authority.

## 1. System topology

```text
Expo mobile client ─────────────┐
                               │
Next.js web + Route Handlers ──┼── product UI + bounded prototype/demo server paths
                               │
Hono API ──────────────────────┘
   │
   ├── canonical access/session boundary candidate
   ├── Drizzle / PostgreSQL durable product-data candidate
   ├── backend authorization / Guardian ownership checks
   ├── Community durable member-scoped core
   ├── Guardian professional-share policy/grant candidate
   ├── ELI availability boundary
   └── shared validation/domain contracts

MAT/TAG partial firmware
   │
   └── BLE protocol package ── client/backend integration

Breiz canonical release authority ── bounded contextual output, not scientific truth
Unity / Nakama ── gated, not active Product V1 runtime authority
```

The controlled Product V1 direction is now materially clearer: protected durable product data should converge behind Hono/TypeScript, PostgreSQL and backend authorization. PR #224 contains several real slices of that direction, but PostgreSQL/Hono is **not yet the sole runtime truth for every product surface**.

## 2. Evidence classes

Repository maturity must be reported by evidence class rather than one global green/red status.

| Evidence class | What it can prove | Current example | What it cannot prove |
|---|---|---|---|
| **Code evidence** | install/typecheck/tests/build/static/runtime DB gates on an exact SHA | PR #224 GitHub Actions | animal validity, hardware performance, legal clearance |
| **Physical evidence** | measured behavior of MAT/TAG/harness/bench | still incomplete/open | user value or scientific validity by itself |
| **Human evidence** | Guardian/vet comprehension, burden, task success | pilots/interviews still open | electrical or security correctness |
| **Scientific evidence** | validity against controlled ground/reference evidence | canine validation still open | legal or operational readiness |
| **Legal/compliance evidence** | rights, classification, applicable obligations | registers/gates exist; item-level review remains open | scientific efficacy |

A passing code workflow must never silently promote another evidence class.

## 3. Workspace boundaries

The repository uses pnpm workspaces and Turbo.

| Workspace | Responsibility | Current authority caveat |
|---|---|---|
| `apps/web` | Next.js UI plus several Route Handlers | some historical server/data paths remain prototype/demo only |
| `apps/mobile` | Expo/React Native client and BLE-facing services | client is not authorization or scientific authority |
| `backend` | Hono API, middleware, services, Drizzle schemas/migrations | intended durable Product V1 authority; increasingly real but not yet exclusive |
| `packages/shared` | shared types and Zod validators | contract layer only |
| `packages/eli-engine` | inference/confidence/baseline/veto logic | implementation/tests are not scientific validation |
| `packages/ble-protocol` | MAT/TAG wire parsing and commands | one layer of the device-to-ELI chain, not the whole chain |
| `packages/ai-personality` | Breiz release templates and semantic safeguards | bounded contextual layer, not scientific truth |
| `firmware` | partial embedded implementations | no complete production firmware evidence |

## 4. Backend identity, authorization and data authority

`backend/api/index.ts` is the Hono API entrypoint.

### Auth/session candidate

PR #224 now contains a durable AUTH-01 candidate rather than the earlier scaffold:

- normalized account registration and password verification;
- canonical UUID identity;
- short-lived access JWTs with issuer/audience/algorithm/token-use validation;
- hashed opaque refresh sessions;
- atomic rotation and reuse detection;
- logout/session-family revocation and account-wide refresh revocation;
- PostgreSQL concurrency evidence for refresh/logout/password-change races.

This is strong candidate runtime evidence. Production client token transport/storage, password recovery, MFA/provider choices, security review and retention remain open.

### Guardian/dog authorization

Owner-scoped dog, sensor, baseline, health and export paths increasingly use backend authorization rather than client assertion. Negative authorization and concurrency evidence exists for several important slices. This does not yet mean every product surface has one complete authorization lifecycle.

**Target rule:** no new Product V1 durable behavior should be introduced into a browser JSON store, process memory or local client fallback merely because that path already exists.

## 5. Persistence planes

### PostgreSQL / Drizzle

The P0 DB workflow now proves:

- current migrations apply to the controlled disposable historical baseline;
- a fresh generated Drizzle baseline applies;
- schema generation/repeatability checks run;
- backend typecheck/tests execute against PostgreSQL.

Current status:

- **fresh candidate baseline executability:** proven on recent #224 exact heads;
- **disposable historical migration repeatability:** proven on recent #224 exact heads;
- **real existing-database production upgrade path:** OPEN;
- **rollback/restore/production migration runbook:** OPEN;
- **PostgreSQL as sole Product V1 runtime truth:** NOT YET TRUE.

### Next.js prototype/demo planes

Historical Next.js Route Handlers remain present for several product surfaces. Their disposition must be explicit per path: `MIGRATE`, `REMOVE`, `DEMO_ONLY`, or `KEEP` with approved authority.

Two important containment examples now exist:

- **Community:** historical Next.js Community persistence is disabled by default and can run only with explicit non-production demo opt-in. Product V1 Community authority is the Hono/PostgreSQL candidate.
- **Journal/Memories prototype (#242):** historical Next.js Journal persistence is disabled by default, production cannot opt in, and the web client no longer uses browser `localStorage` as fallback Product V1 persistence or renders a new entry as saved before server acknowledgement. Final Journal/Memory Product V1 authority is still OPEN.

### Backend in-memory behavior

Any remaining process-memory service is prototype/test evidence only unless an explicit authority says otherwise. In-memory success must not be presented as durable create/read/delete behavior.

## 6. Community runtime truth

The earlier false-ACK / synthetic-identity Community findings are no longer an accurate description of the composed candidate.

Current PR #224 Community candidate includes:

- Hono + PostgreSQL as Product V1 data-plane candidate;
- router-level fail-closed authenticated identity;
- durable versioned rules acceptance;
- member-scoped community reads;
- durable posts/comments/events;
- bounded cursor feed;
- membership/rules authority retained through dependent DB work under concurrency;
- explicit response projections rather than whole-row serialization;
- stored historical sensor/ELI overlays withheld from post responses;
- community and event coordinates withheld pending a real progressive-location authority;
- invalid media-reference metadata rejected/withheld rather than blindly published;
- private/no-store behavior on protected responses.

Still OPEN:

- membership join/leave/invite/removal lifecycle;
- reports, blocks and moderation enforcement;
- public discovery policy;
- RSVP/progressive event-location authority;
- free-text/media-content moderation and access;
- privacy retention/erasure/anonymisation lifecycle;
- final web/mobile client integration.

`G-COMMUNITY-DATA-PLANE-01` remains OPEN despite substantial candidate progress.

## 7. Journal / Memories authority boundary

The historical Journal route and browser fallback are now explicitly contained under #242.

Current rule:

- no production use of the legacy Next.js Journal store;
- explicit non-production demo opt-in only;
- no browser-storage fallback presented as Product V1 saved state;
- demo responses carry `LEGACY_DEMO_ONLY`;
- unavailable authority is shown as unavailable rather than converted into local success.

This containment does **not** choose the final Memories/Journal schema, identity binding, retention, deletion, attachment, export, offline or sharing model.

## 8. Guardian professional sharing

The repository contains a meaningful backend candidate for professional sharing:

- durable PostgreSQL grants and policy-decision audit records;
- Guardian create/list/revoke with current-owner recheck;
- server-controlled `PENDING` creation;
- clients cannot mint a verified professional principal;
- concurrency handling for owner changes and simultaneous revocation;
- private/no-store sharing responses;
- access-policy checks with purpose/scope/time constraints.

Still OPEN:

- verified professional identity and binding;
- activation/delivery/reissue policy;
- actual recipient read transaction;
- revocation during recipient data collection;
- approved snapshot/live semantics per scope;
- deletion/expiry lifecycle;
- production transport and human review.

No current grant row should be treated as a reusable bearer capability.

## 9. Client applications

### Web

- Next.js 15 / React 19;
- product UI plus bounded prototype/demo Route Handlers;
- Community legacy plane is contained;
- Journal legacy plane is now contained;
- map/local services remain subject to third-party rights and provenance gates.

### Mobile

- Expo 52 / React 18 / React Native 0.76 / Expo Router;
- Home/Devices are being aligned to current Care/brand authority;
- device operational state must not become a hidden-state conclusion about the dog;
- mobile ELI remains unwired/non-authoritative;
- production secure token storage/transport and recovery remain separate integration decisions.

## 10. Sensor → ELI chain

The project still needs five explicit contracts:

1. **wire frame** — bytes emitted by MAT/TAG transport;
2. **parsed frame** — validated decoded transport record;
3. **feature extraction** — derived physical/behavioral features with quality/provenance;
4. **ingestion envelope** — server-bound identity/time/device/provenance contract;
5. **ELI input** — inference-ready evidence after eligibility/quality checks.

Current backend candidate has real durable sensor-summary writes/reads and a Guardian-authorized baseline projection. ELI latest/history deliberately return `501 ELI_RUNTIME_NOT_IMPLEMENTED` after ownership checks because no live authoritative producer/orchestration path exists yet.

That is preferable to a normal `200 null`/`[]` that could be mistaken for successful authoritative no-data.

Required code evidence for the full chain: cross-layer golden vectors.  
Required scientific evidence: separate canine/bench validation appropriate to each claimed observation.

## 11. Raw audio boundary

Current contracts emphasize derived vocal/acoustic features rather than raw household audio, and mobile does not rely on microphone permission as the Product V1 input path in the observed candidate.

That is positive minimization evidence, not proof of non-exfiltration.

Product V1 still requires negative evidence that raw audio is not representable, serialized, persisted, logged or transmitted unless an explicitly approved future authority changes that rule.

## 12. MAT and TAG maturity

### MAT

MAT remains a strategic hypothesis plus an experimental hardware workstream. Commercial inclusion is gated by `G-MAT-INCREMENTAL-VALUE-01` / #230.

Do not infer commercial necessity from sunk cost or sensor count. Allowed controlled outcomes remain `MAT_CORE`, `MAT_OPTIONAL`, `MAT_POST_V1`, `MAT_REDIRECT`, or `MAT_KILL` unless Founder authority changes that framework.

### TAG

TAG remains strategically important but physically incomplete. Power sequencing, PDN, footprints, battery, RF/antenna, GNSS/BLE coexistence, charging, sealing, thermal behavior, attachment/comfort, energy budget and final placement/routing still require physical/engineering evidence.

Repository documentation or green software CI cannot close those hardware gates.

## 13. CI, security and supply-chain evidence

On the last fully verified pre-Journal-containment head `bcb60503c1634b1342c4a6ecd730268562688117`:

- P0 PostgreSQL validation passed with **93 backend tests, zero failures/skips**;
- Security supply chain passed, including workspace typecheck/tests and web build;
- dependency audit, Semgrep, secret scanning, authority/CRA gates, SBOM and provenance passed;
- GitHub-managed CodeQL passed across the configured languages.

The Journal-containment commits require their own exact-head runs before they inherit that status. Code evidence is always SHA-specific.

Branch protection/rulesets, deployment ownership, staging evidence and release policy remain separate operational controls.

## 14. Controlled strategic/product authorities

Important current authorities include:

- `docs/strategy/FOUNDER_STRATEGIC_LOCKS_2026-09-07.md`;
- `docs/product/EMOPET_CARE_PRODUCT_MASTER_v0.1.md`;
- `docs/product/EMOPET_EXPERIENCE_DOCTRINE_v0.1.md`;
- `docs/product/EMOPET_SURFACE_NECESSITY_MATRIX_v0.1.md`;
- `docs/control/EMOPET_PRODUCT_AUTHORITY_MAP_v0.1.md`;
- `docs/control/EMOPET_CLAIMS_REGISTRY_v0.1.md`;
- `docs/control/EMOPET_BREIZ_SEMANTIC_AUTHORITY_v0.1.md`;
- `docs/control/EMOPET_GUARDIAN_AUTHORITY_MASTER_v0.1.md`;
- third-party rights/provenance registers under `docs/control` and `data/registry`.

Authority documents define what may be claimed or implemented. They are not substitutes for physical, human, scientific, legal or operational evidence.

## 15. Open P0 integration decisions

The next phase should preferentially close these gates with executable evidence rather than create additional broad governance layers:

- `RUNTIME-AUTHORITY-01`: continue retiring/containing prototype persistence planes until Product V1 protected data has one explicit authority per domain;
- `AUTH-PRODUCTION`: close client token transport/storage, recovery/MFA/provider and production security decisions around the composed auth candidate;
- `JOURNAL-AUTH-01` (#242): design the real Journal/Memory backend authority before enabling Product V1 persistence;
- `COMMUNITY`: membership lifecycle, moderation/block/report enforcement, event participation/location authority and privacy lifecycle;
- `PRIV-01`: retention, erasure, processor/transfer, backup and rights behavior;
- `VET SHARE`: verified professional binding plus scoped recipient-read transaction and revocation-during-read evidence;
- `ELI-IO-01`: freeze device → feature → ingestion → ELI contracts and golden vectors;
- `MAT-EVIDENCE-01`: collect physical bench evidence and close actual hardware assumptions;
- `TAG-FEAS-01`: complete combined electrical/mechanical/RF/energy feasibility work;
- `DATA-LIC-01`: close item-level data/service rights and rendered attribution where required;
- real existing-database upgrade/restore/release runbooks remain open.

The architecture rule is now simple: **when authority is missing, EMOPET must say unavailable, abstain, or stay demo-only. It must not manufacture success to keep a surface looking finished.**
