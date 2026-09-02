# P0 ELI canonical runtime reconciliation

**Status:** `CONTROLLED ARCHITECTURE INTAKE / DRAFT / NOT RELEASE AUTHORITY / NOT RUNTIME ACTIVATION`

**Tracking issue:** `ELI-ARCH-01 #118`

**Snapshot boundary:** `main@c099581ff8aed1e619f72ab38898fc05833b7c66`

**Prepared:** 2026-09-02

---

## 1. Purpose

This record reconciles the repository's current ELI implementation surfaces without activating a new runtime path and without converting an implementation observation into model, product or release authority.

The bounded question is:

> Where is ELI algorithm authority intended to live, which current application code duplicates or simulates that behavior, and what exact backend/device/client boundary must exist before `@emopet/eli-engine` can be described as the live end-to-end inference path?

This record does not choose unresolved feature semantics, model parameters or evidence claims. Those remain governed by their existing gates.

---

## 2. Evidence method and limits

The repository was reviewed at the snapshot above using bounded source/file search and direct file reads.

Evidence language in this record:

- `REPOSITORY_FACT` — directly observed in the bounded snapshot;
- `NOT_LOCATED` — not found by the bounded repository search performed for this review;
- `CANDIDATE_DIRECTION` — proposed architecture requiring review;
- `OPEN` — unresolved;
- `HOLD` — must not be presented as active/authoritative in the stated context.

`NOT_LOCATED` is not proof that something never existed outside the repository or on another unmerged branch.

Current unmerged pull requests are review candidates and do not alter the snapshot authority of `main`.

---

## 3. Current implementation map

### 3.1 Canonical engine package exists

`REPOSITORY_FACT`

`packages/eli-engine/src/index.ts` exports:

- RSM;
- confidence;
- baseline;
- hooks;
- EKF;
- vetoes;
- dynamics.

The package manifest identifies it as `@emopet/eli-engine`.

Repository architecture text also describes `packages/eli-engine` as the location for EKF, confidence, baselines, dynamics and veto logic.

**Disposition:** `CANONICAL_ENGINE_CANDIDATE`.

Package existence alone is not evidence that an application runtime currently invokes it.

### 3.2 Web, mobile and backend already declare the package

`REPOSITORY_FACT`

The following manifests declare `@emopet/eli-engine` as `workspace:*`:

- `apps/web/package.json`;
- `apps/mobile/package.json`;
- `backend/package.json`.

`apps/web/next.config.mjs` also includes `@emopet/eli-engine` in `transpilePackages`.

This makes the historical comment in `apps/web/lib/eli/catalog.ts` — local definitions being required to avoid a cross-package Next build import — stale as a current build rationale.

**Disposition:** dependency/build capability exists; runtime authority remains `OPEN`.

### 3.3 No application source import was located

`NOT_LOCATED`

A bounded default-branch search for `@emopet/eli-engine` located package manifests, build configuration and documentation references, but no application source import that establishes an active web/mobile/backend inference call path.

A separate search for `runPreInferenceHooks` located its definition in `packages/eli-engine` and did not locate an application caller.

**Disposition:** `LIVE_ENGINE_RUNTIME = NOT ESTABLISHED`.

### 3.4 Web contains a substantial deterministic local model/demo layer

`REPOSITORY_FACT`

`apps/web/lib/eli/mock.ts` is explicitly labelled simulated/deterministic data and says it is to be replaced by a real ELI API.

It nevertheless contains application-local calculations and constants for, among other things:

- per-proxy generated values;
- local baseline freeze;
- family aggregation;
- publication gating;
- WQI presentation values and weights;
- RSI presentation values;
- data-quality tiers;
- recovery/anticipation presentation values;
- local veto-like demo state;
- summary construction.

This is materially more than visual metadata.

**Disposition:** `DEMO_MOCK_ONLY / MUST NOT BECOME PRODUCTION FALLBACK`.

No statement in this record validates the underlying formulas or constants.

### 3.5 Web catalogue mixes presentation metadata with model-like constants

`REPOSITORY_FACT`

`apps/web/lib/eli/catalog.ts` contains genuine presentation concerns such as:

- labels;
- descriptions;
- colors;
- family metadata;
- UI copy.

The same file also contains model-like or contract-like values, including:

- publication-gate labels tied to numerical boundaries in comments;
- WQI dimensions/weights;
- RSI threshold constants;
- sub-baseline metadata;
- local veto catalogue;
- proxy/reference mapping.

Several of those subjects are already separately gated by #88 and #91.

**Disposition:** `MIXED_SURFACE / SPLIT AUTHORITY REQUIRED`.

Presentation metadata may remain local. Algorithm/model constants may not acquire authority merely because they are convenient for a UI file.

### 3.6 Mobile is not wired to a live ELI API

`REPOSITORY_FACT`

`apps/mobile/src/hooks/use-v6-insights.ts` currently returns an `EMPTY` state. Its own comment says a future implementation is expected to call `/api/eli/latest`.

No live API call exists in that hook at the snapshot.

**Disposition:** `CLIENT_PLACEHOLDER / NOT LIVE ELI CONSUMPTION`.

### 3.7 Core ELI persistence is a schema capability, not a proven producer path

`REPOSITORY_FACT / NOT_LOCATED`

The repository contains persistence structures for ELI-related results. Existing DATA-01 review has already separated schema presence from runtime persistence.

A bounded search for `insert(eliStates` did not locate a production writer at the snapshot.

**Disposition:** `ELI_STATE_PRODUCER = NOT ESTABLISHED`.

No new writer is authorized by this record.

### 3.8 Two different `InferenceResult` contracts currently exist

`REPOSITORY_FACT`

`packages/shared/src/types/inference.ts` defines the cross-surface `InferenceResult` as a structure containing:

- `eli` state;
- active veto IDs;
- contributing feature IDs;
- anticipation result;
- recovery result.

`packages/eli-engine/src/hooks/index.ts` separately defines an `InferenceResult` used by post-inference hooks with:

- `confidence`;
- `eli_score`;
- `components`;
- `context_label`.

These are not the same contract despite sharing the same exported type name.

**Disposition:** `CONTRACT COLLISION / OPEN`.

The engine-local intermediate shape must be renamed or deliberately mapped before a cross-surface runtime is activated.

---

## 4. Authority classification register

| Surface | Observed role | Current classification | Required action |
|---|---|---|---|
| `packages/eli-engine/src/**` | Algorithm package | `CANONICAL_ENGINE_CANDIDATE` | Keep algorithm authority here; reconcile internal contracts before activation |
| `packages/shared/src/types/inference.ts` | Cross-surface result types | `SHARED_CONTRACT_CANDIDATE` | Make transport/domain result authoritative and versionable |
| `packages/eli-engine/src/hooks/index.ts::InferenceResult` | Hook-local intermediate result | `NAME_COLLISION / OPEN` | Rename/narrow or explicitly adapt to shared result |
| `apps/web/lib/eli/mock.ts` | Deterministic simulated ELI presentation data | `DEMO_MOCK_ONLY` | Quarantine from production missing-data paths; do not use as source truth |
| `apps/web/lib/eli/catalog.ts` | UI metadata plus model-like constants | `MIXED_SURFACE` | Separate display metadata from controlled model/contract values |
| `apps/mobile/src/hooks/use-v6-insights.ts` | Empty client placeholder | `CLIENT_PLACEHOLDER` | Consume a real backend projection only after producer contract exists |
| Backend package dependency | Engine dependency declared | `CAPABILITY_ONLY` | Add a thin orchestrator only after input/provenance contract is controlled |
| Core ELI DB structures | Storage schema | `SCHEMA_CAPABILITY_ONLY` | Do not infer producer/readiness from schema presence |
| MAT/TAG firmware feature code | Physical/deterministic feature production candidates | `SEPARATE CONTROLLED INPUT LAYER` | Version semantics and conformance; do not create independent latent ELI publication |
| `@emopet/ble-protocol` | Device transport protocol package | `TRANSPORT CANDIDATE` | Carry versioned source/provenance fields needed by future backend orchestration |

---

## 5. Candidate execution topology

The following topology is a `CANDIDATE_DIRECTION`, not release authority.

```text
MAT / TAG firmware
  -> deterministic acquisition + controlled physical/preprocessed features
  -> versioned device frame / provenance
  -> mobile transport and bounded offline queue
  -> backend authenticated ingestion boundary
  -> normalized ELI runtime input envelope
  -> @emopet/eli-engine
  -> controlled publication gate
  -> versioned provenance-aware persistence
  -> backend API projection
  -> web / mobile presentation
```

### 5.1 MAT/TAG firmware boundary

Firmware may own deterministic sensor acquisition and feature extraction only under controlled feature contracts.

Firmware does not become a second latent ELI publication authority merely because some preprocessing runs close to the sensor.

If a future requirement proposes a firmware-side ELI port, it requires a separate decision plus deterministic conformance vectors against the canonical source implementation.

### 5.2 Mobile boundary

The mobile app is the candidate device transport and presentation client.

Default candidate rule:

- collect/receive versioned device data;
- preserve event time and source lineage;
- buffer/retry according to a defined delivery contract;
- submit to the authenticated backend;
- display backend projections.

Optional local execution of `@emopet/eli-engine` may only be considered as:

- development;
- deterministic conformance testing;
- an explicitly designed offline candidate.

It must not silently publish a second authoritative result or overwrite backend provenance.

### 5.3 Backend boundary

The backend is the preferred candidate for durable ELI orchestration because it can bind:

- canonical identity;
- authenticated ownership;
- device/firmware lineage;
- feature-contract version;
- baseline identity/version;
- engine/config version;
- persistence lineage;
- downstream API/export rules.

This is an architecture candidate, not evidence that the current backend already implements the path.

### 5.4 Web boundary

The web application should consume a backend/shared projection and render it.

The production web path must not recompute ELI from local UI constants and must not replace unavailable backend evidence with plausible mock values.

---

## 6. Candidate runtime input contract

Before code activation, a backend adapter needs a controlled input envelope. The following fields are required conceptually; exact TypeScript naming remains implementation work.

### Identity and time

- canonical dog ID;
- observation/event time;
- receive time;
- source time-zone/clock metadata where required by the feature contract.

### Device lineage

- device principal/reference;
- MAT/TAG role;
- firmware version;
- protocol/frame version;
- feature-contract version.

### Feature lineage

For every supplied feature:

- stable feature ID;
- value;
- unit;
- source channel/modality;
- source window/sample basis;
- validity/quality state;
- source observation or bounded lineage reference.

### Context

- controlled context values required by the engine;
- suppressed/unavailable modalities;
- quality modifiers;
- baseline reference/version.

### Engine authority

- engine package/version or immutable build identity;
- model/config version;
- gate-policy version where independently versioned.

A missing required input must produce an explicit unavailable/abstaining path. Application mock data are not an input-recovery mechanism.

---

## 7. Candidate result/provenance contract

The runtime result must distinguish at least:

1. engine-internal computation state;
2. publication/gate disposition;
3. Guardian/client projection;
4. persistence/export policy.

One state must not be assumed equivalent to another.

The durable record needs enough lineage to answer:

- which input observations were used;
- which features contributed;
- which modalities were unavailable/suppressed;
- which baseline was used;
- which engine/model/config version produced the result;
- which gate disposition applied;
- when the computation occurred;
- whether the result was replayed/recomputed.

The shared client result must not expose internal-only fields merely because they were persisted.

DATA-01 remains the authority for export/disclosure boundaries.

---

## 8. Web reconciliation plan

### 8.1 `catalog.ts`

Retain only concerns that are truly UI/product projection metadata when they do not duplicate model authority.

Examples of likely UI-local concerns:

- localized labels;
- colors;
- component descriptions;
- display grouping.

Move or gate model-like constants instead of maintaining a parallel local truth.

### 8.2 `mock.ts`

Keep only as explicit demo/test data while a live API does not exist.

Required protections before production activation:

- no production fetch failure may fall back to `generateSnapshots()` or equivalent;
- demo data must carry an explicit demo provenance/state;
- mock values must not be persisted as dog observations or ELI results;
- web tests must distinguish demo rendering from real-result rendering.

### 8.3 WQI/RSI and proxy material

No architectural cleanup may accidentally promote the current WQI/RSI constants or proxy/reference mapping into engine authority.

#88 and #91 remain open and control those decisions.

---

## 9. Shared contract reconciliation

The type-name collision around `InferenceResult` is the safest first code slice after this architecture record is reviewed.

Recommended bounded direction:

1. keep `packages/shared/src/types/inference.ts::InferenceResult` as the cross-surface result candidate;
2. rename the hook-local engine type to an explicitly internal/intermediate name;
3. make the hook API accept only the minimum intermediate fields it actually needs;
4. add compile/test coverage preventing a second exported cross-surface `InferenceResult` authority;
5. do not change model calculations in the same patch.

This separates contract hygiene from model/science changes.

---

## 10. Backend implementation sequence

No backend runtime implementation is included in this candidate.

When authorized, use this order:

1. establish truthful durable upstream ingestion or another approved authoritative feature source;
2. define normalized feature envelope and validation;
3. bind canonical dog/device ownership and source lineage;
4. load the correct contextual baseline/config version;
5. invoke `@emopet/eli-engine` through one thin adapter;
6. apply controlled publication/gate behavior;
7. persist only under an explicit version/provenance contract;
8. expose an owner-scoped API projection;
9. migrate web/mobile from demo/placeholder surfaces;
10. add deterministic end-to-end conformance tests.

Do not start at step 5 using fabricated or UI-generated inputs simply to make the API appear complete.

---

## 11. STOP conditions

Runtime activation is `HOLD` if any of the following remains unresolved for the intended input/result path:

- required feature semantics are still contradictory under #86/#87;
- the shared versus engine-local result contract is unresolved;
- the upstream ingestion path acknowledges data without durable/defined handling;
- canonical identity/ownership is not established for the selected path;
- baseline identity/version cannot be reproduced;
- engine/model/config version is not recorded;
- a client can silently substitute demo output for unavailable authoritative data;
- web/mobile independently recalculate release-significant ELI values;
- an open #88–#91 model/evidence question is being treated as solved merely because the software is wired;
- no deterministic lineage/conformance test exists for the activated slice.

Repository-wide #101/#105/#106 and #74 remain independent release/coverage blockers and are not waived by this work.

---

## 12. Gate register

| Gate | Current state | Evidence at snapshot | Required next action |
|---|---|---|---|
| ELI-ARCH-G1 canonical inventory | `OPEN / PARTIAL INVENTORY` | engine package + web mock/catalogue + mobile placeholder mapped | Complete repository-wide classification of ELI-like constants/calculations |
| ELI-ARCH-G2 one result contract | `OPEN` | two incompatible `InferenceResult` shapes observed | Rename/narrow engine-local intermediate contract and add regression coverage |
| ELI-ARCH-G3 web duplicate/mock quarantine | `OPEN` | deterministic `mock.ts`; mixed `catalog.ts` | Split UI metadata from model authority; add no-production-fallback guard |
| ELI-ARCH-G4 firmware/mobile boundary | `OPEN` | firmware and mobile surfaces exist; mobile ELI hook is placeholder | Define versioned feature/transport/offline contract and secondary-execution policy |
| ELI-ARCH-G5 backend orchestration | `OPEN` | dependency declared; active call path not located | Design/implement thin validated adapter only after truthful feature source exists |
| ELI-ARCH-G6 persistence/provenance | `OPEN` | schema capability exists; producer not located | Define versioned lineage and writer semantics before persistence activation |
| ELI-ARCH-G7 API/client projection | `OPEN` | future `/api/eli/latest` referenced by mobile | Define owner-scoped projection with explicit unavailable state |
| ELI-ARCH-G8 conformance/activation | `OPEN` | package tests exist but no end-to-end app path | Add cross-layer vectors and explicit GO/HOLD/REMEDIATE decision |

`G-ELI-CANONICAL-RUNTIME-01 = OPEN`

---

## 13. Controlled next slices

### Slice A — contract hygiene

Preferred first implementation slice:

- rename/narrow the engine hook-local `InferenceResult`;
- preserve calculations byte-for-byte where practical;
- add type/test regression coverage;
- no persistence/API activation;
- no model parameter change.

### Slice B — web authority quarantine

After Slice A:

- make demo provenance explicit;
- add a regression that production result consumers cannot import/use the mock generator as fallback;
- isolate UI-only metadata from model-like constants;
- leave #88/#91-controlled values unresolved rather than silently relocating them.

### Slice C — backend adapter design

Only after the upstream data source and feature contract are truthful enough to support it:

- add the normalized runtime input schema;
- add a thin engine adapter;
- test unavailable-input behavior;
- keep persistence and public API separately gated until provenance is complete.

---

## 14. Review roles

Before any runtime activation, review is required from:

- Engineering — implementation authority, adapter and versioning;
- Firmware/device owner — feature and transport semantics;
- Data/backend owner — ingestion, persistence and lineage;
- Product — client projection and demo/production separation;
- Science/ELI authority — only for model/feature decisions already controlled by their dedicated gates;
- Privacy/security authority where identity, retention, access or device provenance is affected.

No reviewer is named by assumption in this record.

---

## 15. Current disposition

`CANONICAL SOURCE-CODE DIRECTION = packages/eli-engine`

`CROSS-SURFACE CONTRACT DIRECTION = packages/shared`

`BACKEND DURABLE ORCHESTRATION = CANDIDATE / NOT IMPLEMENTED`

`FIRMWARE LATENT ELI PUBLICATION = NOT AUTHORIZED`

`MOBILE SECONDARY ENGINE EXECUTION = HOLD UNLESS EXPLICITLY CONTROLLED`

`WEB LOCAL MODEL/MOCK = DEMO ONLY / NOT PRODUCTION AUTHORITY`

`LIVE END-TO-END ELI RUNTIME = NOT ESTABLISHED`

`G-ELI-CANONICAL-RUNTIME-01 = OPEN`

This record is an architecture reconciliation candidate only. It does not merge, release, activate or validate ELI.