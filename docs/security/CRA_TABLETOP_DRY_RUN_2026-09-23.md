# CRA T+0 → T+72 repository tabletop dry-run — 23 September 2026

**Status:** `REPOSITORY_DRY_RUN_COMPLETED_WITH_OPEN_HUMAN_CORRECTIVE_ACTIONS`  
**Canonical readiness issue:** #37  
**SRP Assigned Representative continuity:** #239  
**Real incident:** no  
**Real notification:** no  
**Legal reportability decision:** no

This record executes the repository-verifiable part of the CRA incident procedure against a synthetic scenario. It is intentionally **not** the human operational tabletop required to close #37.

## 1. Synthetic scenario

At `2026-09-23T08:00:00Z`, the exercise assumes a future EU-market EMOPET release receives credible evidence that an authorization bypass in an owner-scoped backend export endpoint is being actively exploited and may expose another Guardian's export data.

The scenario is fictional. No repository statement asserts that such a vulnerability exists.

## 2. Current public CRA / SRP facts rechecked on 23 September

Public ENISA and European Commission guidance now establishes that:

- the CRA Single Reporting Platform is operational from **11 September 2026**;
- manufacturers submit the CRA notifications through the SRP;
- the early warning is due within **24 hours** and the main notification within **72 hours** of awareness;
- for an actively exploited vulnerability, the final report is due no later than 14 days after a corrective or mitigating measure becomes available;
- Assigned Representatives authenticate with **EU Login + MFA**;
- ENISA states that manufacturer-association validation is not a prerequisite for submitting a notification.

Sources:
- https://www.enisa.europa.eu/topics/product-security/vulnerability-services/eu-incident-response-and-cyber-crisis-management/single-reporting-platform-srp
- https://www.enisa.europa.eu/topics/product-security/single-reporting-platform-srp/cra-srp-guidance-ar-user-registration
- https://www.enisa.europa.eu/topics/product-security/single-reporting-platform-srp/cra-srp-guidance-ar-notification-submission-and-update
- https://digital-strategy.ec.europa.eu/en/policies/cra-reporting

**Boundary:** public platform availability is verified. EMOPET's own Primary/Secondary AR identities, EU Login+MFA, access and continuity remain `UNVERIFIED` under #239.

## 3. Simulated clock

| Checkpoint | Simulated UTC | Result |
|---|---|---|
| T+0 awareness | 2026-09-23 08:00 | synthetic incident record opened; clock starts |
| T+4 qualification | 2026-09-23 12:00 | CRA candidate assumed for exercise; uncertainty retained |
| T+12 containment | 2026-09-23 20:00 | containment/evidence-preservation path exercised |
| T+20 decision | 2026-09-24 04:00 | `TABLETOP_ASSUME_REPORT_REQUIRED_FOR_EXERCISE_ONLY`; not a legal conclusion |
| T+24 early warning | 2026-09-24 08:00 | package can be drafted; `SIMULATED_NOT_SUBMITTED`; human/SRP blockers remain |
| T+60 main build | 2026-09-25 20:00 | main package updated without rewriting unknowns as facts |
| T+68 review | 2026-09-26 04:00 | factual review exercised; privacy/legal/SRP human authority remains open |
| T+72 main notification | 2026-09-26 08:00 | `SIMULATED_NOT_SUBMITTED` |
| final-report handoff | 2026-09-26 08:05 | CAPA/final-report handoff recorded; AEV deadline waits for corrective-measure timestamp |

## 4. Representative release ↔ SBOM lookup

Current repository evidence is **partial, not release proof**:

- repository commit: `db7e3dbf03d0f06b54bbe658521e00f8134f1dd9`;
- firmware source declares `6.0.0`;
- mobile declares `1.0.0`;
- web declares `1.0.0`;
- backend declares `1.0.0`;
- Security supply chain run **35839453533** passed on that commit;
- combined SBOM artifact `emopet-sbom`: artifact **10740358583**, digest `sha256:80fcb5d5f8f7a4e4423992e4cde5c7cdd9fb64b5f7c07a4fd63d918b2cd63976`;
- CycloneDX artifact **10741185291**, digest `sha256:1d2967a2a0e94b8350b24f98769b43d8df64f4fc7a10d6fddd83dfb52b835b5a`;
- SPDX artifact **10740408642**, digest `sha256:0853199d33894576687dc90c84ece8d3ab2e6ed66967d1c10b5820ccf3e1a597`.

What is **not** established: a representative signed release artifact, physical firmware release artifact, market-release receipt or a single release identifier binding all of those pieces. That remains corrective action F8.

## 5. Privacy composition

The exercise reuses current-main privacy evidence rather than inventing a second recipient model:

- #522 / `e2c0c199…` supplies the 48-surface fail-closed recipient authority;
- #523 / `db7e3dbf…` supplies the externally-decided, deterministic `SIMULATED_NOT_SENT` privacy exercise.

No contact lookup or actual notification is performed.

## 6. Findings and corrective actions

| ID | Finding | Owner role | Due |
|---|---|---|---|
| F1 | monitored security mailbox not configured/tested | Founder / Product Authority | human owner must set |
| F2 | backup IC / evidence custodian not nominated | Founder / Product Authority | human owner must set |
| F3 | privacy/DPO escalation contact missing | Privacy/DPO role to appoint | human owner must set |
| F4 | legal/regulatory escalation contact missing | legal/regulatory role to appoint | human owner must set |
| F5 | EMOPET SRP AR access/MFA/continuity unverified | Founder / Product Authority; canonical #239 | human owner must set |
| F6 | restricted evidence location + retention owner absent | Founder / Product Authority | human owner must set |
| F7 | controlled supplier escalation registry absent | Founder / Product Authority | human owner must set |
| F8 | signed representative release / physical firmware mapping absent | Technical release owner | human owner must set |
| F9 | calendar due dates themselves require human authority | Founder / Product Authority | human owner must set |

The absence of authorised calendar due dates is preserved as a finding rather than fabricated by the repository.

## 7. Result

The dry-run proves that the repository can walk the **shape** of T+0 → T+24 → T+72 → final handoff and retrieve current software/SBOM evidence while preserving unknowns.

It also proves why #37 cannot close yet: the decisive remaining work is human and operational. A green CI audit for this record means **the record is internally truthful and fail-closed**, not that CRA operational readiness is complete.
