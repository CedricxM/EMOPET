# P0 ELI canonical runtime reconciliation

Status: `CONTROLLED ARCHITECTURE INTAKE / OPEN / NOT RELEASE AUTHORITY / NOT RUNTIME ACTIVATION`
Control date: `2026-09-23`
Snapshot boundary: `main@3fa5c5298247fc88412ce2c8294fdb4f36024f56`
Tracking issue: [#118 — ELI-ARCH-01](https://github.com/CedricxM/EMOPET/issues/118)
Related gates: [#122 — ELI-IO-01](https://github.com/CedricxM/EMOPET/issues/122), [#124 — ELI-API-01](https://github.com/CedricxM/EMOPET/issues/124), #86–#91 (feature semantics and evidence)
Pointer self-check: `pnpm control:pointer-audit` · contract guard: `pnpm control:eli-contract:test` — both run in CI

## 0. Reconstruction provenance

This record was first drafted in [PR #119](https://github.com/CedricxM/EMOPET/pull/119) on 2026-09-02, anchored to
`main@c099581ff8aed1e619f72ab38898fc05833b7c66`. That PR never merged. Meanwhile three of its
eight gates moved on `main`, and the #118 thread became the only place that knew which.

Nothing was carried forward on trust. Every claim in the draft's §3 was re-observed at the
snapshot boundary above, and the #118 thread's delivery claims were checked against merge
commits on `main` rather than accepted from the thread.

### 0.1 The draft's eight findings, re-observed

| Draft § | Claim on 2026-09-02 | At `main@3fa5c52` | Outcome |
|---|---|---|---|
| 3.1 | `@emopet/eli-engine` exports RSM, confidence, baseline, hooks, EKF, vetoes, dynamics | Same seven re-exports | **holds** |
| 3.2 | Web, mobile and backend declare the engine `workspace:*`; web transpiles it; `catalog.ts`'s "avoid cross-package import" rationale is stale | All three still true — the stale rationale has survived three weeks after being named | **holds** |
| 3.3 | No application source imports the engine; `runPreInferenceHooks` has no caller | Zero runtime importers; the only references outside the package are manifests, `next.config.mjs`, two comments and one test that reads a manifest | **holds** |
| 3.4 | `mock.ts` is a substantial deterministic model/demo layer | Unchanged in substance and still consumed by the dashboard — but now declared `DEMO_MOCK_ONLY / authoritative: false` and visibly labelled | **changed: contained** |
| 3.5 | `catalog.ts` mixes presentation metadata with model-like constants | Unchanged | **holds** |
| 3.6 | Mobile hook returns empty and names a future `/api/eli/latest` | The phantom endpoint name is gone; the hook declares `UNWIRED`, `authoritative: false`, `endpoint: null` | **changed: made truthful** |
| 3.7 | No production writer for ELI state | Still none — only test fixtures insert into `eli_states`. The portability export now declares the `inferred` level `NO_CANONICAL_ELI_PRODUCER` instead of implying an empty result | **holds, and now declared** |
| 3.8 | Two incompatible exported `InferenceResult` contracts | One remains, in `@emopet/shared`; the engine's is `PostInferenceCandidate` | **resolved, now guarded** |

### 0.2 What the draft could not see

The G1 inventory posted to #118 on 2026-09-19 found surfaces the draft did not list, and two
of them have since been contained. Recorded here so the register, not a comment thread, is
the authority:

1. **A third ELI implementation: `apps/web/lib/data/eli/`.** It is two things. Its contract
   half (`dogProfile.schema.ts` and the observation schemas) is live product code; its demo
   half (`mockEliPipeline.ts`, `mockSensorEvents.ts`) was already honest in wording. A flat
   barrel re-exported both, so they were indistinguishable at the import site. Contained by
   `7f74d33`: every demo output carries mock provenance, and a boundary test forbids pages and
   components from importing the demo half.
2. **A second publication path to the user: narration.** `lib/narration.ts` produced
   indicator sentences such as a bare activity score out of 100 with a confidence word, from
   `catalog.ts`, with no provenance, while no producer exists. The path was latent — no
   component called it with an indicator — which is why closing it cost nothing. Contained by
   `02ca232`: provenance is a required argument, and a non-authoritative statement carries
   the `DÉMO · ` prefix. **A cleanup confined to the dashboard would have left this intact.**
3. **A reader of `eli_states` asserting backend provenance.** The portability export selects
   from a table no canonical producer writes, under a `source: 'EMOPET_BACKEND'` envelope.
   `a6af5cf` now declares the `inferred` level `NO_CANONICAL_ELI_PRODUCER`, so an empty
   result no longer reads as "EMOPET holds nothing". Rows written by anything other than a
   canonical producer would still leave under that envelope; that is a G6 dependency.

### 0.3 The regression that justifies a guard

G2 has been lost once already. Draft PR #120 introduced the rename on 2026-09-02 and never
merged; the frozen #224 reconstruction silently restored a second `export interface InferenceResult` in
the engine, and nothing failed. A forensic read found it on 2026-09-16. `#294` restored the
boundary on `main`, together with `hooks-contract.test.ts` — which pins confidence
thresholds, not names, and would therefore have stayed green through the #224 regression.

`scripts/control/eli-result-contract.test.mjs` now asserts that exactly one exported
`InferenceResult` exists in the workspace, owned by `@emopet/shared`, and that the engine
hooks consume `PostInferenceCandidate`. It was probed on the real tree: re-inserting the #224
interface turns it red. It runs in CI.

## 1. Purpose and authority boundary

This record reconciles the repository's ELI implementation surfaces without activating a
runtime path and without converting an implementation observation into model, product or
release authority.

The bounded question is unchanged:

> Where is ELI algorithm authority intended to live, which application code duplicates or
> simulates it, and what exact backend/device/client boundary must exist before
> `@emopet/eli-engine` can be described as the live end-to-end inference path?

It does not choose feature semantics, model parameters or evidence claims; those remain with
#86–#91. It names no reviewer by assumption.

## 2. Evidence vocabulary

| State | Meaning |
|---|---|
| `REPOSITORY_FACT` | Directly observed at the snapshot boundary |
| `VERIFIED_POINTER` | A path/blob pair resolved at the snapshot boundary and machine-re-checked |
| `NOT_LOCATED` | Not found by the bounded search performed; not proof of absence elsewhere |
| `DELIVERED` | Merged on `main`, with the merge commit identified here |
| `CONTAINED` | A demo or placeholder surface is now explicitly non-authoritative; nothing real replaced it |
| `CANDIDATE_DIRECTION` | Proposed architecture requiring review |
| `OPEN` | Unresolved |
| `HOLD` | Must not be presented as active or authoritative in the stated context |

`DELIVERED` and `CONTAINED` are narrower than they sound. Containment makes a surface honest
about being a demo; it produces no ELI value.

## 3. Repository evidence at the snapshot boundary

Each blob below was written from `git rev-parse main@3fa5c52:<path>` output, not by hand.

| Evidence ID | Path | Blob at snapshot | Narrow fact established |
|---|---|---|---|
| ELI-SRC-001 | `packages/eli-engine/src/index.ts` | `1b3437db11e1d96e2b3716c4628715f976f92966` | Re-exports RSM, confidence, baseline, hooks, EKF, vetoes and dynamics |
| ELI-SRC-002 | `packages/eli-engine/src/hooks/index.ts` | `0b678b6c156c07d28592d7db9eb3a456d9f28302` | Engine-local post-inference input is `PostInferenceCandidate`; the file names no `InferenceResult`; `runPreInferenceHooks` has no caller outside this package |
| ELI-SRC-003 | `packages/eli-engine/src/__tests__/hooks-contract.test.ts` | `9fca1d9ff75a06008eb9f1b860727a5dad01414a` | Pins the confidence gate at publish `0.70`, degrade `0.40`, reject below; tests no name |
| ELI-SRC-004 | `packages/shared/src/types/inference.ts` | `6ab4e62080504e7bf19aff0c20226f2cb181054c` | Sole exported `InferenceResult`; carries `eli: ELIState` |
| ELI-SRC-005 | `packages/shared/src/types/eli.ts` | `50125d193bbf0b8167cd850413e249f6e6dc6e95` | `ELIState` carries `arousal`, `valence` (commented "Internal to V1 — NOT published"), `load`, `confidence`, `gateStatus` |
| ELI-SRC-006 | `apps/web/next.config.mjs` | `b9a7bf2d80cf8c18b8cd82f41215782572e76fab` | `@emopet/eli-engine` is in `transpilePackages` |
| ELI-SRC-007 | `apps/web/lib/eli/catalog.ts` | `2b73d36338a65523e3953a3939437aa41ca4ce94` | Header still says values are defined locally « pour éviter tout import cross-package dans le build Next » |
| ELI-SRC-008 | `apps/web/lib/eli/mock.ts` | `c9bfe66246842dddee39b861abba6727d0ad46e4` | Deterministic simulated ELI data; exports `generateSnapshots`, `freezeBaseline`, `gateOf`, `summarize`, `proxyHistory`; consumed by `app/dashboard/BienEtreSection.tsx` |
| ELI-SRC-009 | `apps/web/lib/eli/mock-provenance.ts` | `3ccb9d989f3e9ba8f644a503bdffaeb30294ee1a` | Declares `DEMO_MOCK_ONLY`, `authoritative: false`, no MAT/TAG source, no backend inference source |
| ELI-SRC-010 | `apps/web/lib/narration.ts` | `2e586c6e07dfee6b6a5d4f3ff850acb51f595e82` | `lockedEliStatement()` requires an `EliStatementProvenance`; a non-authoritative statement is prefixed `DÉMO · ` |
| ELI-SRC-011 | `apps/web/lib/data/eli/eliValidation.ts` | `7de9f2ddc9d4f824ef962ea731b7a15feb4053ea` | `DEFAULT_ELI_QUALITY_THRESHOLDS` begins `minMatSignalQuality: 0.62`, with no recorded provenance |
| ELI-SRC-012 | `apps/mobile/src/hooks/use-v6-insights.ts` | `9e8afe7552416c451e94d778ae6c79acd6281cfe` | `V6_INSIGHTS_RUNTIME_SOURCE` is `UNWIRED`, `authoritative: false`, `endpoint: null`; the hook always returns its empty state |
| ELI-SRC-013 | `backend/api/routes/sensors.ts` | `5e97da50a8fc896e9c8cb27a1f837143343ed469` | `GET /eli/:dogId` and `/eli/:dogId/history` check ownership, then return `501 eli_runtime_not_implemented` |
| ELI-SRC-014 | `backend/api/routes/data-export.ts` | `74e6bc60bdc42ca73b08e2d1e9cc8dd344951f6d` | Portability export declares the `inferred` level `NO_CANONICAL_ELI_PRODUCER` |

These rows establish only the narrow facts stated. None of them says an ELI value is correct.

## 4. Authority classification register

| Surface | Observed role | Classification | State |
|---|---|---|---|
| `packages/eli-engine/src/**` | Algorithm package, unit-tested | `CANONICAL_ENGINE_CANDIDATE / NOT WIRED` | Zero runtime importers |
| `packages/shared/src/types/inference.ts` | Cross-surface result type | `SHARED_CONTRACT_CANDIDATE` | Sole `InferenceResult`; guarded |
| `packages/eli-engine/src/hooks/index.ts::PostInferenceCandidate` | Hook-local intermediate | `ENGINE_INTERNAL` | `DELIVERED` (G2) |
| `apps/web/lib/eli/mock.ts` | Deterministic simulated dashboard data | `DEMO_MOCK_ONLY` | `CONTAINED` (G3) |
| `apps/web/lib/eli/catalog.ts` | UI metadata plus model-like constants | `MIXED_SURFACE` | `OPEN` — split not done; stale rationale comment remains |
| `apps/web/lib/data/eli/` contract half | Observation/profile schemas used by product code | `CONTRACT_CANDIDATE` | Live; thresholds such as `0.62` lack provenance (#86–#91) |
| `apps/web/lib/data/eli/` demo half | Mock pipeline and events | `DEMO_MOCK_ONLY` | `CONTAINED`, import boundary tested |
| `apps/web/lib/narration.ts` | Second user-facing publication path | `PROVENANCE_REQUIRED` | `CONTAINED` |
| `apps/mobile/src/hooks/use-v6-insights.ts` | Client placeholder | `UNWIRED` | `CONTAINED` (G7 client half) |
| `backend/api/routes/sensors.ts` ELI reads | Owner-scoped placeholders | `501 eli_runtime_not_implemented` | `CONTAINED` (G7 backend half) |
| `backend/api/routes/data-export.ts` `inferred` level | Reader of `eli_states` | `NO_CANONICAL_ELI_PRODUCER` declared | G6 dependency |
| Core ELI tables | Storage schema | `SCHEMA_CAPABILITY_ONLY` | No production writer located |
| MAT/TAG firmware feature code | Deterministic feature production candidates | `SEPARATE CONTROLLED INPUT LAYER` | Governed by #86–#91 and #122 |
| `@emopet/ble-protocol` | Device transport | `TRANSPORT_CANDIDATE` | Parsed frame → feature vector transform not located (#122) |

## 5. Gate register

| Gate | State at `main@3fa5c52` | Evidence | Next action |
|---|---|---|---|
| ELI-ARCH-G1 canonical inventory | `OPEN / EXTENDED` | Three implementations and two publication paths now mapped (§0.2) | Carry a disposition for `catalog.ts`'s model-like constants and for the `data/eli` contract half into whichever object owns the runtime |
| ELI-ARCH-G2 one result contract | `DELIVERED / GUARDED` | `40accfa`, `5f7be7f`, merged by `bbe9db9` (#294); CI guard `scripts/control/eli-result-contract.test.mjs` | Keep the guard; nothing else |
| ELI-ARCH-G3 web mock quarantine | `DELIVERED` for dashboard, `data/eli` and narration | `86ae21a`, `7926841` merged by `994b0c2` (#295); `7f74d33`; `02ca232` | `catalog.ts` split remains under G1 |
| ELI-ARCH-G4 firmware/mobile boundary | `OPEN` | No parsed-frame → feature-vector transform located | Owned by #122; blocked on #86/#87 feature semantics |
| ELI-ARCH-G5 backend orchestration | `OPEN` | Engine declared, never invoked | Requires a truthful durable feature source first (§8) |
| ELI-ARCH-G6 persistence/provenance | `OPEN` | No writer; export reader declares producer absence | Define lineage and writer semantics before any writer exists |
| ELI-ARCH-G7 API/client projection | `INTERIM TRUTH DELIVERED / FINAL OPEN` | Mobile `UNWIRED` via `b10f51b` merged by `b37115e` (#372); backend `501` via `1d8a10c` merged by `c4bd5ae` (#389) | Final endpoint and projection owned by #124 |
| ELI-ARCH-G8 conformance/activation | `OPEN` | Package unit tests only; no end-to-end path | Cross-layer vectors and an explicit GO/HOLD/REMEDIATE decision |

`G-ELI-CANONICAL-RUNTIME-01 = OPEN`

What was delivered is **containment**: every surface that could show an ELI value now says
whether it is a demo, and every read that has no producer says so instead of returning an
empty success. No surface shows a value produced by the engine, because no path invokes it.

## 6. Open finding carried into the gate: `valence` in the shared result

`@emopet/shared::InferenceResult` carries `eli: ELIState`, and `ELIState` carries `valence`
next to a comment reading "Internal to V1 — NOT published". Under the current Care authority,
arousal is the only latent authorized for user publication and valence stays internal. The
comment is the only thing standing between the field and a client.

No client consumes the type today, so nothing leaks now. But the one sanctioned cross-surface
result type is shaped to carry a field the product must not publish, and #118's 2026-09-18
handoff already records that the historical affective-exposure guard needs a rewrite at the
output boundary rather than a verbatim port. This belongs to G7 and must be settled before a
projection is built on `InferenceResult`, not after.

## 7. Candidate execution topology

Carried from the 2026-09-02 draft as a `CANDIDATE_DIRECTION`, not release authority:

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

- **Firmware** owns deterministic acquisition and feature extraction under controlled feature
  contracts, and does not become a second latent-ELI publication authority. A firmware-side
  ELI port would need its own decision and conformance vectors.
- **Mobile** transports and presents. Local engine execution is limited to development,
  conformance testing or an explicitly designed offline candidate, and must never publish a
  second authoritative result.
- **Backend** is the preferred home for durable orchestration, because it can bind identity,
  ownership, device lineage, feature-contract version, baseline version, engine version and
  persistence lineage.
- **Web** renders a backend projection and never recomputes ELI from UI constants or replaces
  missing evidence with plausible mock values.

## 8. Implementation order and STOP conditions

When — and only when — runtime work is authorized, the draft's order still holds:

1. truthful durable upstream ingestion or another approved feature source;
2. normalized feature envelope and validation;
3. canonical dog/device ownership and source lineage;
4. reproducible contextual baseline and config version;
5. one thin adapter invoking `@emopet/eli-engine`;
6. controlled publication gate;
7. persistence under an explicit version/provenance contract;
8. owner-scoped API projection that withholds internal latents (§6);
9. migration of web/mobile from contained demo surfaces;
10. deterministic end-to-end conformance tests.

Do not start at step 5 with fabricated or UI-generated inputs to make the API look complete.

Runtime activation is `HOLD` while any of these holds for the intended path:

- feature semantics contradict under #86/#87 (the divergence notes added to `docs/eli_model.md`
  on branch `claude/emopet-audit-sept-22-ni7yo7` are not on `main` at the snapshot boundary);
- the upstream ingestion path acknowledges data it does not durably handle;
- canonical identity or ownership is not established;
- baseline, engine, model or config version cannot be reproduced or is unrecorded;
- a client can substitute demo output for unavailable authoritative data;
- web or mobile independently recalculates release-significant ELI values;
- an open #88–#91 question is treated as solved because software is wired;
- the result projection can carry `valence` to a client (§6);
- no deterministic lineage/conformance test covers the activated slice.

## 9. Current disposition

`CANONICAL SOURCE-CODE DIRECTION = packages/eli-engine`
`CROSS-SURFACE CONTRACT = packages/shared (single, guarded)`
`WEB / MOBILE / BACKEND DEMO AND PLACEHOLDER SURFACES = CONTAINED`
`BACKEND DURABLE ORCHESTRATION = CANDIDATE / NOT IMPLEMENTED`
`FIRMWARE LATENT ELI PUBLICATION = NOT AUTHORIZED`
`MOBILE SECONDARY ENGINE EXECUTION = HOLD UNLESS EXPLICITLY CONTROLLED`
`LIVE END-TO-END ELI RUNTIME = NOT ESTABLISHED`
`G-ELI-CANONICAL-RUNTIME-01 = OPEN`

This record is an architecture reconciliation only. It does not merge, release, activate or
validate ELI, and nothing the dashboard shows today comes from the engine.
