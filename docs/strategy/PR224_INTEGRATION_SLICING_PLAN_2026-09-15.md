# PR #224 integration slicing plan — 15 September 2026

Status: **CONTROLLED INTEGRATION PLAN / NO DIRECT MERGE**  
Parent issue: #246  
Source PR: #224  

## 1. Purpose

PR #224 is now a composed candidate/evidence branch, not a human-reviewable delivery unit. This plan defines how to move its useful work toward `main` without treating the existence of 464 candidate commits as release authority.

This document moves **no runtime code**. It creates the control plane for later focused integration PRs.

## 2. Exact repository state used by this plan

- `main`: `51bfdde694903c7f0e4b759ae8914c1d18f15810`
- PR #224 branch: `experience-hardening-2026-09-06`
- PR #224 exact head: `7e0d90445a3cf03b094d7037aa6addbfa6f2cc19`
- compare state: `464` commits ahead / `0` behind
- PR state: `DRAFT / UNMERGED / NOT RELEASE AUTHORITY`

Exact-head evidence on `7e0d90445a3cf03b094d7037aa6addbfa6f2cc19`:

| Control | Run | Result |
|---|---:|---|
| Security supply chain | 34870082065 | PASS |
| P0 DB baseline validation | 34870082023 | PASS |
| P0 DB upgrade rehearsal | 34870082095 | PASS |
| P0 DB authority parity | 34870082094 | PASS |
| GitHub-managed CodeQL | 34870076326 | PASS |

These results prove the composed candidate head passed those repository checks. They do not prove production readiness, scientific validity, physical-device validity, legal clearance or human operational readiness.

## 3. Freeze rule for PR #224

Until explicitly superseded:

1. PR #224 remains available as the candidate evidence/source branch.
2. Do not merge PR #224 directly to `main`.
3. Do not use PR #224 as the default place for unrelated new work.
4. New integration work must be reconstructed as focused slices with explicit source provenance.
5. A slice must earn fresh exact-head CI after reconstruction.

If an emergency fix must touch the candidate branch, record why it could not wait for a focused slice and update the source-head reference before using this plan further.

## 4. Replay method

Because the branch history is heavily interleaved, the default method is **controlled replay by domain/path and behavior**, not blind bulk cherry-pick.

For every integration slice:

- state the source PR #224 head used;
- identify source commits and/or exact paths being replayed;
- state dependencies on earlier slices;
- preserve current fail-closed semantics;
- include the minimum tests and authority documents necessary to review the behavior;
- compare the reconstructed result to the candidate source where practical;
- run fresh CI on the reconstructed head;
- keep unresolved external/human/legal/scientific gates open.

## 5. Proposed canonical integration order

### INT-01 — CI and repository safety foundation

Scope candidates:
- `.github/workflows/security-supply-chain.yml`;
- `.github/workflows/p0-db-baseline.yml`;
- `.github/workflows/p0-db-upgrade-rehearsal.yml`;
- `.github/workflows/p0-db-authority-parity.yml`;
- CodeQL alignment/evidence verification;
- dependency-audit / SBOM / provenance / static CRA repository controls.

Goal: establish the checks later slices must satisfy before bringing in product runtime changes.

Do not claim human CRA readiness from static CI.

### INT-02 — Identity, AUTH and subject authority

Scope candidates:
- durable account/password boundary;
- canonical access JWTs;
- hashed refresh sessions;
- refresh rotation/reuse detection;
- logout and account/session concurrency controls;
- canonical dog/subject ownership prerequisites.

Keep open:
- production mobile/web token storage and transport decisions;
- external workforce/privileged-MFA provider authority;
- production retention policy.

### INT-03 — Sensor ingestion, provenance and BLE boundary

Scope candidates:
- sensor ingestion transaction authority;
- device/dog attribution and persisted provenance;
- dataset writer authority;
- BLE protocol verification and BLE-to-feature-ingestion contract where already implemented/tested.

Explicit non-claims:
- no physical device trust;
- no calibration authority;
- no clock/time-sync authority;
- no physical signal-quality proof;
- no scientific validity claim.

### INT-04 — Privacy, export and subject discovery

Scope candidates:
- bounded owner export;
- source/interval authority;
- subject discovery and lineage;
- account/dog privacy coverage records;
- erasure topology, dependency and residue-verification gates.

Keep open:
- production processor/provider choices;
- legal retention periods;
- human/legal privacy review where required.

### INT-05 — Guardian professional sharing

Scope candidates:
- durable grant/access-audit schema;
- owner authority and concurrency;
- create/list/revoke PENDING grant behavior;
- recipient-read transaction and projection boundaries;
- vet-report source-truth constraints.

Keep open:
- verified professional identity/binding;
- activation/delivery policy;
- real recipient login/access flow;
- production deletion/retention semantics.

### INT-06 — Community durable core

Scope candidates:
- versioned rules acceptance;
- durable member-scoped posts/comments/events;
- bounded feed/cursors;
- transactional membership/authority rechecks;
- publication projections and structured location withholding;
- moderation/report/block pieces only where implemented and evidenced.

Keep open:
- full membership lifecycle;
- free-text moderation/privacy;
- media access/content verification;
- RSVP/progressive-location authority;
- product-value/kill-gate decision;
- final client integration.

### INT-07 — Local intelligence and external-service rights

Scope candidates:
- Breiz source/provenance controls;
- OSM/Overpass rights/runtime boundaries;
- Mapbox reviewed-service authority gate;
- dependency/data-rights evidence controls;
- receipt/inventory fail-closed behavior.

Keep all service/dataset release dispositions on HOLD unless the required external rights evidence and qualified review actually exist.

### INT-08 — Product, science and strategy authorities

Scope candidates:
- Experience Doctrine;
- Surface Necessity Matrix;
- Product Authority Map;
- Claims Registry;
- MAT incremental-value protocol/evidence map;
- controlled strategy and positioning records.

These documents can constrain later implementation. They do not establish physical, scientific or market validation.

### INT-09 — Client/UI composition

Scope candidates:
- web/mobile adaptations required by integrated backend authorities;
- removal of browser-local/shared-success fabrication;
- explicit unavailable/candidate states;
- owner-controlled professional-share UX once backend authority exists.

Do not reintroduce superseded product claims, legacy global scores or unsupported emotion labels while reconstructing UI behavior.

## 6. Dependency rules

Default dependency direction:

`INT-01 -> INT-02 -> INT-03/INT-04 -> INT-05 -> INT-06/INT-07 -> INT-09`

`INT-08` may be integrated earlier where it is purely authority/documentation, but a documentation merge must never be used as evidence that the corresponding runtime or validation exists.

Any slice that requires a later slice must stop and record the dependency instead of copying unrelated code forward merely to make tests green.

## 7. Per-slice PR template requirements

Every canonical integration PR must include:

- source candidate SHA;
- focused scope and excluded scope;
- replayed source commits/paths;
- dependency list;
- authority/non-claim statement;
- migrations/schema impact, if any;
- exact test list;
- fresh workflow run IDs;
- residual open gates;
- superseded historical PR/issue mapping;
- explicit statement: `DRAFT / UNMERGED / NOT RELEASE AUTHORITY` until founder review.

## 8. Migration discipline

Database migration replay is especially sensitive because PR #224 contains an ordered chain including later feature migrations.

Rules:

1. Never renumber/reorder candidate migrations casually.
2. Before INT-02 onward, generate a migration dependency inventory against the candidate head and a fresh database.
3. A focused slice may need to replay a prerequisite schema separately even when the user-facing feature is deferred.
4. Fresh-baseline, historical-upgrade and authority-parity checks must remain distinct.
5. Do not infer production migration safety from disposable-test success alone.

## 9. Historical PR cleanup

The repository still contains many older stacked draft PRs. Do not close them in bulk.

For each canonical integration slice, classify older PRs as:

- `SUPERSEDED_FULLY` — canonical slice contains the intended behavior/evidence;
- `SUPERSEDED_PARTIALLY` — some scope moved, residual scope remains;
- `INDEPENDENT` — not represented by the canonical slice;
- `HISTORICAL_EVIDENCE_ONLY` — useful record but not a delivery candidate.

Only close a historical PR after the replacement is identifiable and the supersession reason is recorded.

## 10. Gates that cannot be solved by slicing alone

Keep these separate from repository-integration success:

- #239 CRA SRP human/access/tabletop evidence;
- #230 MAT incremental-value physical evidence;
- verified professional identity/binding under #64;
- third-party data/service rights review under #116;
- physical MAT/TAG validation;
- canine scientific validation;
- production provider/hosting/security decisions.

## 11. INT-00 exit criteria

This control-plane slice is complete when:

- #246 exists and tracks the decomposition;
- this plan is reviewable on a docs-only branch from `main`;
- PR #224 exact source/base SHAs are recorded;
- the no-direct-merge rule is explicit;
- integration order and non-claims are explicit;
- no runtime code has moved;
- no historical PR has been mass-closed;
- no merge to `main` has occurred.

Next action after INT-00 review: build the INT-01 file/commit replay manifest and open the first focused integration candidate.
