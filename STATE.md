# EMOPET — Current Company State

**Snapshot date:** 2026-10-01  
**Snapshot base:** `main@f12e39d1c8d453aac1189b484d5a1c7cbb21ae74`  
**Status:** `GENERATED COMPANY STATE PROJECTION / NOT DOMAIN AUTHORITY`  
**Machine-readable sources:** `state/company-state.json` + `state/freshness/freshness-state.json`

> **Generated file. Do not hand-edit.** Regenerate with `node scripts/control/generate-company-os-views.mjs`.

This page is a generated navigation projection. The cited controlled domain authority always wins.

## Company phase

**PROJECT_DECISION** · freshness `UNREVIEWED`

2026 is the foundation/preparation period. 2027 is the beginning of the launch phase and operational integration into the Brittany ecosystem. Exact launch month, production volume, revenue target and final pricing remain unfixed.

Authority: `docs/strategy/PROJECT_TIMELINE_2026_2027.md`.

Next gate: Preserve evidence-gated preparation through 2026 and create separate controlled decisions for launch details when evidence is sufficient.

## Workstream snapshot

| Workstream | Projection | Freshness | Next gate |
|---|---|---|---|
| MAT | `OPEN / EVIDENCE-GATED` | `UNREVIEWED` | Demonstrate physical feasibility and incremental value over TAG-only before locking the two-device commercial architecture. |
| TAG | `OBSERVED_PARTIAL / VALIDATION OPEN` | `UNREVIEWED` | Attach controlled physical bring-up, trust, RF/power/mechanical and end-to-end evidence before production claims. |
| Core software | `OBSERVED / PRODUCTION GATES OPEN` | `UNREVIEWED` | Close the narrow production-critical identity, durable backend-contract and release-authority gaps without expanding unrelated scope. |
| ELI | `GATED` | `UNREVIEWED` | Advance only through controlled scientific/product gates with explicit provenance and abstention behavior. |
| World / Unity | `GATED / NOT PRODUCTION AUTHORITY` | `UNREVIEWED` | Keep World outside production authority until explicit product-value, retention, security/deployment, and production-readiness gates justify promotion. |
| Funding | `PROJECT_DECISION / EVIDENCE-GATED` | `UNREVIEWED` | Build the finance/fundraising state from sourced costs, milestones, runway assumptions and verified funding evidence. |
| Corporate / IP | `OPEN / INDEXED / EVIDENCE-GATED` | `UNREVIEWED` | Advance the source gates in #114, #116 and #680 with controlled evidence and reviewed dispositions while keeping restricted instruments and personal data outside the public repository. |

## Critical company gates

| Gate | Domain | Status | Freshness | Question | References |
|---|---|---|---|---|---|
| `EMO-GATE-MAT-VALUE` | hardware/product | `OPEN` | `UNREVIEWED` | Does MAT create sufficient incremental value over TAG-only to justify a two-device commercial architecture? | issue `#230` |
| `EMO-GATE-PHYSICAL-PROOF` | hardware | `OPEN` | `UNREVIEWED` | Do controlled physical tests support the intended MAT/TAG evidence paths with repeatability and trustworthy provenance? | `AGENTS.md` |
| `EMO-GATE-PRODUCT-VALUE` | product/market | `OPEN` | `UNREVIEWED` | Does a narrow end-to-end product create recurring owner value before broader Community/World/platform expansion? | `docs/strategy/CORE_CAPABILITY_AND_ACTIVATION_DOCTRINE_2026-09-07.md` |
| `EMO-GATE-ECONOMICS` | finance | `OPEN` | `UNREVIEWED` | Are hardware COGS, support cost, pricing logic and financing need evidenced well enough to support a launch decision? | `docs/strategy/PROJECT_TIMELINE_2026_2027.md` |
| `EMO-GATE-IP-RIGHTS` | legal | `OPEN` | `UNREVIEWED` | Are contribution ownership, third-party rights and public-repository policy controlled before scale? | issue `#114`, issue `#116`, issue `#680` |

## Freshness boundary

Freshness is a separate overlay. `UNREVIEWED`, `REVIEW_DUE`, and `STALE` cannot support freshness-dependent promotion into strong Company OS states. Repository recency does not reset domain freshness.

## Confidentiality

Store public-safe state, status, hashes and references only. Keep secrets, PII, signatures, bank data, confidential supplier material, executed legal originals and restricted investor terms outside the public repository.

See `FRESHNESS.md`, `CORPORATE.md`, and `docs/company/EMOPET_COMPANY_OS_ARCHITECTURE_2026-10-01.md`.
