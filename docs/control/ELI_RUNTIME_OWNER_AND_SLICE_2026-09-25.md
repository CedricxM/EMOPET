# ELI runtime owner + first vertical-slice candidate

**Issue:** #479  
**Parent:** #118  
**Date:** 2026-09-25  
**Status:** `CANDIDATE / NOT RUNTIME ACTIVATION / NOT RELEASE AUTHORITY`

## 1. Repository ownership assignment

This candidate makes the architecture responsibility explicit without inventing human approval:

| Responsibility | Candidate owner |
|---|---|
| ELI algorithm implementation | `packages/eli-engine` |
| Cross-surface contracts | `packages/shared` |
| Durable runtime orchestration | `backend/api` |
| Web/mobile | projection only; no canonical recompute |
| Scientific feature/mapping authority | controlled science gate for the feature |
| Human runtime approver | **UNASSIGNED** |
| Human science approver | **UNASSIGNED** |

The backend is therefore the **technical orchestration candidate**, not a scientific authority.

## 2. First slice candidate: TAG `activity_variability`

Why this feature was selected for architecture work:

- its mechanical feature contract is internally coherent across the current TAG firmware/header/protocol evidence;
- it is explicitly separated from affective interpretation under #87;
- unlike `rr_variability`, it does not currently have a unit/window fork.

Controlled feature version for this candidate:

`tag-activity-variability-cv30m-v1`

Contract:

- 1 Hz ODBA samples;
- trailing 30-minute window;
- BODY_SHAKE-suppressed samples excluded;
- coefficient of variation `std / mean`;
- null/invalid below 50% valid coverage.

## 3. Science hold

The mapping:

`activity_variability -> latent arousal`

is an **EMOPET hypothesis**, not literature-established canine science.

Therefore this candidate may:

- prove type/orchestration boundaries;
- call the canonical engine;
- carry provenance/version/quality;
- exercise veto behavior;
- create deterministic software conformance evidence.

It may **not**:

- publish a Guardian arousal observation;
- persist itself as canonical Product ELI truth;
- remove the current `501 eli_runtime_not_implemented`;
- expose valence/load;
- claim validation.

The implementation hard-codes that boundary by always returning `userProjection: null`.

## 4. Why the 501 remains

#479's final definition of done requires a real authoritative observation path. The feature measurement is mechanically coherent, but the affective mapping and human science approval are still open.

Changing the existing ELI endpoint from 501 merely because the engine can execute would turn software executability into science authority.

So this PR intentionally does **not** activate a route.

## 5. Candidate code

`backend/api/services/eli-runtime/activity-variability-slice.ts`

It proves:

1. exact dog/baseline coherence;
2. exact feature-contract version;
3. exact 1800 s window;
4. null/invalid abstention;
5. veto fail-closed behavior;
6. IMU reliability/noise propagation;
7. invocation of `@emopet/eli-engine::stepEKF`;
8. internal result only;
9. no valence/load/user projection.

## 6. What remains for the real vertical slice

Before removing the 501 for one route:

1. name the human runtime approver;
2. name the human science approver;
3. approve or replace the #87 affective mapping;
4. define the durable feature-ingestion owner and replay contract;
5. define baseline identity/version provenance;
6. define canonical persistence writer schema;
7. define a public Care projection carrying all nine doctrine fields;
8. add deterministic end-to-end vectors;
9. prove one client consumes the projection without local fallback.

## 7. Current disposition

`CANONICAL_ENGINE = packages/eli-engine`

`DURABLE_ORCHESTRATOR = backend/api CANDIDATE`

`FIRST_FEATURE = activity_variability / TECHNICAL CONTRACT COHERENT`

`AFFECTIVE_MAPPING = SCIENCE HOLD #87`

`USER_PUBLICATION = DISABLED`

`EXISTING_501 = MUST REMAIN`
