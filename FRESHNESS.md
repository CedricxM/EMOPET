# EMOPET — Freshness / STALE State

**Snapshot date:** 2026-10-01  
**Snapshot base:** `main@f12e39d1c8d453aac1189b484d5a1c7cbb21ae74`  
**Status:** `GENERATED COMPANY OS FRESHNESS PROJECTION / NOT DOMAIN AUTHORITY`  
**Machine-readable source:** `state/freshness/freshness-state.json`

> **Generated file. Do not hand-edit.** Regenerate with `node scripts/control/generate-company-os-views.mjs`.

Freshness is orthogonal to substantive status. Git activity, a recent file edit, or a dated evidence file does not automatically make the underlying claim current.

## Semantics

| Freshness state | Machine rule |
|---|---|
| `UNREVIEWED` | Use UNREVIEWED when a controlled domain review date or review cadence is absent. |
| `CURRENT` | CURRENT requires a controlled domain review date, review cadence, review_due_at and stale_after, with the snapshot date before review_due_at. |
| `REVIEW_DUE` | REVIEW_DUE requires the snapshot date to be on or after review_due_at but before stale_after. |
| `STALE` | STALE requires stale_after to be on or before the snapshot date. |
| `NOT_APPLICABLE` | Freshness does not meaningfully apply; no freshness promotion is implied. |

Decision rule: UNREVIEWED, REVIEW_DUE and STALE cannot support freshness-dependent strong claims, promotions or decisions.

## Coverage summary

State scope: `COMPANY_AND_CORPORATE_V2`

Evidence scope: `EVIDENCE_REFS_EXPOSED_BY_COMPANY_AND_CORPORATE_V2`

| Freshness state | Count |
|---|---:|
| `UNREVIEWED` | 19 |
| `CURRENT` | 0 |
| `REVIEW_DUE` | 0 |
| `STALE` | 0 |
| `NOT_APPLICABLE` | 0 |

## State-object freshness

| Target | Freshness | Last domain review | Review cadence (days) | Review due | Stale after | Decision use |
|---|---|---|---:|---|---|---|
| `EMO-COMPANY-PHASE` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-WS-MAT` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-WS-TAG` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-WS-SOFTWARE` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-WS-ELI` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-WS-WORLD` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-WS-FUNDING` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-WS-CORPORATE` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-GATE-MAT-VALUE` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-GATE-PHYSICAL-PROOF` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-GATE-PRODUCT-VALUE` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-GATE-ECONOMICS` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-GATE-IP-RIGHTS` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-CORP-ENTITY` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-CORP-GOVERNANCE` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-CORP-IP-PROVENANCE` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-CORP-THIRD-PARTY-RIGHTS` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |
| `EMO-CORP-REPO-IP-POLICY` | `UNREVIEWED` | not recorded | not recorded | not recorded | not recorded | BLOCK_STRONG_CLAIMS_UNTIL_CURRENT |

## Evidence freshness

| Evidence | Freshness | Last domain review | Review due | Stale after | Decision use |
|---|---|---|---|---|---|
| `docs/implementation/WORLD_UNITY_LIVE_VALIDATION_2026-10-01.md` | `UNREVIEWED` | not recorded | not recorded | not recorded | CANNOT_SUPPORT_FRESHNESS_DEPENDENT_PROMOTION |

## Fail-closed rule

Missing review cadence stays missing. The Company OS must not invent a 30/60/90-day cycle merely to make a human view look complete.
