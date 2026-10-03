# Execution control-plane reconciliation — Phase 2A

**Date:** 2026-10-03  
**Status:** `FOUNDER_ALLOCATION / REPOSITORY_RECONCILIATION / NO_RUNTIME_ACTIVATION`  
**Observed main:** `main@3971492350d4b0bac515bc240ebf42dabb21f5e7`  
**Previous audit:** `main@d190fbb141641157b09eeeea2174f6f1164be110`  
**Controlling work:** #1043, #246, historical rights tracker #116, #1102, #1066/#679.  
**Decision provenance:** Founder instruction approving Phase 2A after reviewing EMOPET_RECONCILIATION_AUDIT, 2026-10-03.

This dated record corrects execution guidance. It is not a new product specification, scientific review, rights GO, release permission or Company OS domain review. Re-query main and open PRs before a future session acts; GitHub changed during the preceding audit and again afterwards.

## 1. Active allocation

**MS-S1-PHYSICS** remains the active company priority:

- #230 — MAT incremental value;
- #480 — TAG combined physical feasibility.

Optimize **high-impact uncertainty retired per unit of time and capital**. A valid next software slice does not allocate company resources to it.

Phase 2A permits repository truth reconciliation only: documentation, the #246 residual inventory, tracker-versus-rights interpretation, the existing #1102 test's normal CI path, and rebuilding #1066 for read-only classification. No additional implementation slice is approved.

## 2. Frozen and deferred work

| Work | Allocation status | Stop boundary |
|---|---|---|
| #1103 Gate 5C Slice A | `VALID_TECHNICAL_CANDIDATE / CURRENTLY_DEFERRED_BY_RESOURCE_ALLOCATION` | Preserve current slice. No Slice B/C, internal refresh route, new BFF client, multi-instance proof, merge or closure |
| #1093 phone Presence foundation | `FROZEN_CANDIDATE_DRAFT` | No merge, extension or activation; #481 requires #133 source/coverage semantics before durable Presence advances |
| #1090 territory transitions | `FROZEN_CANDIDATE` | No approved-harness promotion or successor Breiz capability PR |
| #1092 Community/Meet authority | `FROZEN_CANDIDATE` | Same restriction; consent/action authority is separate from territory |
| #1095 queue regeneration | `DEFERRED_BY_RESOURCE_ALLOCATION` | No additional engineering; no current manifest mismatch was verified |
| #224 composed candidate | `FROZEN_EVIDENCE_SOURCE_CUSTODY / NO_DIRECT_MERGE` | No broad cherry-pick, migration replay or new implementation branch from it |

Do not continue older PR conversations merely because they contain a proposed next action. The founder allocation above is the current execution boundary.

## 3. Movement since the audit

#1101 merged the WP-02 source/reconciliation pack. #1104 subsequently merged the original World vertical-slice design pack. Source recovery is on main; neither merge creates participant evidence or production authority.

#1103 appeared as the Gate 5C service-token Slice A candidate. It is not delivered on main and is deferred. #1100's architecture decision remains `SELECTED_NOT_IMPLEMENTED`.

At the observation boundary the open set was #1103, #1102, #1095, #1093, #1092, #1090, #1066, #1043 and #224. This list is a dated inventory, not a promise that those refs stay unchanged.

## 4. Runtime truth and evidence levels

| Area | Implemented | Scoped software evidence | Production / external boundary |
|---|---|---|---|
| Core authentication | Registration, email verification/resend, password login, hashed refresh rotation/reuse handling, logout/logout-all | `backend/test/auth-routes-postgres.test.mjs` and related security/session tests; exact-head GitHub CI is required | Production email operation, legacy rollout, recovery/erasure and #831 remain separate |
| Owner web session | Canonical Hono delegate with HttpOnly, strict SameSite cookies; explicit refresh POST; World GET does not refresh | Owner provider/route/single-flight tests | Process-local single-flight only; strict rotated-token replay can revoke the active family across instances |
| Gate 5C coordination | Internal-channel architecture selected by #1100 | Decision-contract tests | No internal refresh route on main, no multi-instance proof, no UI cutover; #1103 deferred |
| Physical ELI slice | #479/#621 Owner-scoped physical-movement projection imports the canonical engine publication gate | Physical contract/conformance/PostgreSQL tests | No latent EKF, arousal, valence, stress, emotion or wellbeing publication; no hardware/science validation inferred |
| Unity/Nakama | Bounded spike and recorded loopback path | Named 2026-10-01 workstation receipts, not a new run by this phase | No production deployment, participant/retention proof or new workstation proof |
| Presence | Fail-closed Product V1 routes | Readiness and unavailable-path guards | #1093 draft foundation is frozen; no absence, tracking, retention or runtime authority |

Authoritative implementation pointers include `backend/api/routes/auth.ts`, `auth-sessions.ts`, `apps/web/lib/server/owner-session-provider.ts`, `owner-session-singleflight.ts`, `config/world/world-gate5c-web-activation-readiness-v1.json` and `config/eli/runtime-physical-movement-v1.json`.

The headline dashboard global ELI value/gauge/14-day curve is retired. Demo observations and historical composite surfaces remain; retiring one card does not establish complete scientific/product reconciliation.

**Implemented**, **tested**, **production-authorized** and **externally evidenced** are separate statements. CI only supports the scope and exact commit actually checked.

## 5. #246 / #224 conceptual residual inventory

`PR224-INTEGRATION = OPEN / NO DIRECT MERGE`.

Frozen source head: `7e0d90445a3cf03b094d7037aa6addbfa6f2cc19`. Against observed main it is 464 commits ahead / 1689 behind. The prior exhaustive path/blob inventory remains 338 paths: 69 identical, 156 different and 113 absent at their candidate paths. These are not 113 missing capabilities or proof of exhaustive functional equivalence.

| Historical slice | Current conceptual disposition |
|---|---|
| INT-00 control plane | Historical September bootstrap plan superseded by current reconciliation. Do not recreate it |
| INT-01 CI/safety | Focused repository controls delivered; old workflow shape superseded. CRA continuity delta remains a controlled residual candidate |
| INT-02 identity/auth/subject | Core authentication and ordinary Dog CRUD delivered (#75/#397/#73); production/recovery/erasure gates remain separate |
| INT-03 ingestion/provenance/BLE | Focused software contracts delivered; physical-device trust, target bring-up and scientific evidence remain domain dependencies |
| INT-04 privacy/export/discovery | Focused foundations delivered and later topology/contracts supersede old blanket replay; lifecycle/legal decisions remain gated |
| INT-05 professional sharing | Access, DB authority, projection and recipient-read services exist on main; the September absence claim is superseded. #64 identity/binding/activation/delivery and release gaps remain |
| INT-06 Community core | Technical integration delivered through #408 and prerequisites; #98 closed. Product necessity/moderation/release are separate |
| INT-07 local intelligence/rights | Newer rights, freshness, exact provenance and SHA-256 gates supersede old source material; no legal/source GO follows |
| INT-08 product/science/strategy | Documents represented on main; their presence is not physical/scientific proof |
| INT-09 client composition | Focused work delivered or superseded. Broad historical UI/mock replay is no longer justified by file absence |

Only two potentially material residual source families are retained:

1. **CRA SRP continuity mechanics — #239:** `docs/security/CRA_SRP_LAUNCH_CRITICAL_2026-09-10.md`, the operator handoff checklist and `scripts/security/cra-srp-readiness-audit.mjs`. Revalidate current official guidance and human/access evidence before any future reconstruction.
2. **Dormant Contact source:** `backend/api/routes/contact.ts`, `backend/db/schema/contact.ts` and `backend/test/contact-authority.integration.test.mjs` in frozen #224. A retained need, current identity/input/privacy/lifecycle authority and owner must be explicitly assigned; #244's containment closure does not authorize a new product plane.

Both are `CONTROLLED_RESIDUAL_CANDIDATE / NOT_IMPLEMENTED_IN_PHASE_2A`. No new source branch is created. Legacy migration numbering, old blanket UI guards, mock World authority and unsupported publication contracts are not justified reconstruction work.

Issue #246 remains open for custody and disposition. Its old plan/comments remain historical evidence, not the active queue.

## 6. #116 tracker versus rights authority

- **TRACKER_STATE:** GitHub `closed`, `state_reason=completed`, closed 2026-10-02T18:17:43Z.
- **Closure evidence:** Closure event has no commit ID; no inspected contemporaneous receipt establishes reviewed completion of DATA-LIC-G1–G8. The nearby RNR checkpoint records `DRAFT_NOT_SENT`, rights/licence HOLD and `releaseAllowed=false`; later comments saying “remains open” conflict with the tracker lifecycle.
- **RIGHTS_AUTHORITY_STATE:** Source/use-specific controls remain OPEN/HOLD as recorded by the P0 register and live code. Mechanical closure is not legal/source/product-use approval.

Do not reopen or close #116 automatically. Preserve history and separately assign reconciliation of tracker ownership/closure rationale. Follow `docs/control/P0_THIRD_PARTY_DATA_RIGHTS_REGISTER.md`, source/service gates and current receipts rather than the issue state alone.

DATAtourisme remains disabled without runtime rights evidence. #1102 is only the source-fact/HOLD vessel: no INGESTION, no PUBLIC_ANSWER_WITH_SOURCE, `HOLD_CGU_SCOPE_CLARIFICATION`, an unsent request and five unanswered questions. Licence Ouverte 2.0 is not inferred API-v1 contractual or product-use sufficiency.

## 7. Company OS freshness

Generated projections still cite `main@769987f9b0de6f0e1cb45d38c283a7308075044a` dated 2026-10-01. Their repository snapshot is older than this reconciliation; domain state remains **18 UNREVIEWED / 0 CURRENT**.

The empty pending-transition queue's eleven controlled Git blob references match observed main despite its older candidate ref. No current queue mismatch was found. Documentation/nav reconciliation does not reset domain review, regenerate speculative state, accept proposals or append synthetic transition history.

## 8. Read-only branch evidence

#1066 is limited to `READ_ONLY_AUDIT_NOT_DELETION_AUTHORITY`. Exact ref evidence is time-bounded. Open heads, hard exclusions and protected/uncertain refs are preserved; closed-unmerged source is not automatically disposable. No branches or PRs are deleted/closed by Phase 2A.

## 9. Remaining authority dependencies and next-session stop

Physical #230/#480 evidence, #133 source semantics, IP/legal/third-party review, financial evidence, participant results, production #831 receipts and workstation-only Unity proof remain human/external work. No implementation around these gaps is authorized.

Before proposing the next slice: re-query GitHub, read this record and the controlling issue, confirm founder allocation, preserve fail-closed gates, and use fresh current main. Do not resume frozen source or superseded delivery conversations.
