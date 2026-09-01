# EMOPET Batch 4 Software, Data and Cyber Authority and Evidence Reconciliation

**Document ID:** BATCH4-RECON-001  
**Revision:** 1.0  
**Date:** 2026-08-27  
**Status:** PASS_WITH_NOTES — AUTHORITY / STATIC EVIDENCE RECONCILED — EXECUTION NOT VALIDATED — NOT RELEASED  
**Classification:** INTERNAL CONTROLLED  
**Visual authority:** BRAND-AUTHORITY-001 / EMOPET_Charte_Graphique_v2.html v2.0

## Technical summary

The 69-source Batch 4 set is complete against its living control-matrix hashes. Document and source authority is now separated from execution evidence: architecture, requirements, migration definitions and IaC sources are controlled inputs, while build, CI, database application, deployment, runtime behaviour and security validation remain open.

Two earlier conclusions are narrowed rather than erased. Later Product authorities supersede the old “outside V1” treatment only for immersive Product membership. The cyber register's zero-occurrence conclusion is corrected because historical capability and data-model traces exist, including in `SYS-002`; their exact current Product provenance remains unresolved.

No gate is closed. `OPEN-DOC-005`, `EX-020`, `EX-021`, the legal/privacy gates and the new transversal `OPEN-VAL-B4-001` remain active. MOKO r1.6 remains `PREPARED_NOT_SENT / NOT RELEASED`.

## Source set and measured controls

| Control | Result |
|---|---:|
| Source files | 69 |
| Total source bytes | 2,836,530 |
| SHA-256 matches | 69/69 PASS |
| DOCX | 20 |
| Active Word comments | 0 |
| Tracked changes | 0 |
| Empty `comments.xml` packaging parts | 9 |
| Unity proposal archive | PASS / 7 file members + 12 directory entries |
| Third-party originals | 0 |

The local snapshot is used only within the existing `OPEN-DOC-008` containment. These 69 files match their recorded source hashes; this does not cure or overwrite the unrelated `BRD-PUB-001` snapshot divergence.

## Authority results

- `SW-002` remains the development/code-governance authority: exact repository, protected branches and CI evidence govern code status.
- `SYS-002` governs the application-platform boundary, including PostgreSQL durable truth and server-side decision authority. Historical diagrams and fields are not current Product decisions.
- `SW-CLOUD-001` and `SW-CLOUD-002` govern the Scaleway target; the Terraform/OpenTofu source set is static implementation authority only. Production is not authorised or evidenced.
- `DATA-001` governs six active migration definitions and four review-only definitions. No production migration is established.
- `SW-I18N-001` and `SW-I18N-002` govern the FR/EN web architecture and migration path; complete cross-client execution remains open.
- `SW-004` and the Unity/backend proposal remain an open technical-review package. Product membership is controlled by `PRD-005`, `PRD-APP-001` and `PRD-IMM-001`; runtime selection and implementation remain open.
- `SEC-001` through `SEC-003` are requirements/checks, not certification or implementation evidence. `SEC-004` remains non-canonical working review input with its declared v0.4 source unreconciled.

## Repository evidence is useful but bounded

Nine selected paths from each of two parallel Drive trees have matching metadata and exact connector Base64 equality. The sample supports the observed pnpm/Turbo, Next.js, Expo, Hono, Drizzle and PostgreSQL stack markers and also exposes a legacy Python docker-compose path.

This evidence does not establish complete-tree identity, git history, an authoritative commit, dependency installation, CI success, build/test results or deployment. `EX-021` therefore remains open.

## Product and cyber supersessions

`SUPR-025` limits supersession to Product membership: older software/security/migration statements cannot remove immersive/Unity/World from the later controlled Product architecture. Their dated execution and evidence status remains useful.

`SUPR-026` corrects only the historical search conclusion in the cyber integration register. The bounded searchable corpus contains the following file-level occurrences: Voice Cues 5, `voice_clips` 3, Guardian Circle 6, `trusted_guardians` 3, Rescue 6, `rescue_tokens` 3, Meet Mode 6 and Relay 9. Some Relay occurrences concern remote-location engineering and are not capability provenance. `EX-020` stays open.

## Execution evidence remains open

`OPEN-VAL-B4-001` consolidates the missing execution proof: exact frozen git authority, reproducible install/build/test, successful CI, Terraform/OpenTofu init/validate/plan and approved state, migration apply/rollback evidence, runtime authz/RLS and security testing, deployment records and named approvals.

The frozen Terraform variables default `deploy_api_container`, `deploy_nakama_instance` and `nakama_public_ingress` to false. These are safe static defaults, not deployed-state evidence. The ten bounded SQL files contain no RLS/`CREATE POLICY`/`GRANT`/`REVOKE` statement; that absence does not prove the authoritative repository or runtime database lacks authorisation controls.

## Required next actions

1. Freeze the exact authoritative repository and git commit/ref with complete custody metadata.
2. Run the controlled build, test and CI workflow and retain failures, partial results and logs.
3. Run approved Terraform/OpenTofu validation/plan against controlled provider versions and state without inferring deployment.
4. Reconcile and execute migration apply/rollback plus runtime authorisation/security tests in the intended environment.
5. Obtain the exact SEC-004 v0.4 declared source pack.
6. Reconcile each EX-020 capability against current controlled Product authority and privacy/access requirements.

Corpus-wide visual conversion remains blocked by `OPEN-DOC-005`; the controlled pilot remains immutable QA evidence.
