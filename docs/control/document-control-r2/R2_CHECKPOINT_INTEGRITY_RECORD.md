# R2 checkpoint integrity record for repository promotion

**Document ID:** GH-PROMO-R2-001  
**Revision:** 1.0  
**Date:** 2026-09-01  
**Status:** PASS_WITH_NOTES — REPOSITORY CONTROL REFERENCE / NOT RELEASED  
**Classification:** INTERNAL CONTROLLED

## Source identity

| Control | Result |
|---|---|
| Archive | `EMOPET_DOCUMENT_CONTROL_GLOBAL_CHECKPOINT_2026-08-29_R2_NOT_RELEASED.zip` |
| Expected SHA-256 | `1fda848d1bb7a77513450f797171ba672f9a7fc7062b701f6af8c088ad713ce7` |
| Recalculated SHA-256 | MATCH |
| ZIP compressed-data test | PASS |
| Source archive mutation | NONE |

## Checkpoint verification carried forward

The controlled R2 verification record reports:

| Check | Result |
|---|---:|
| Actual files | 312 |
| Payload files / manifest rows | 310 / 310 |
| SHA256SUMS rows | 311 |
| Manifest size / hash failures | 0 / 0 |
| SHA256SUMS hash failures | 0 |
| Nested ZIP payloads | 0 |
| Exact materialization | 430 / 430 |

This repository promotion independently recalculated the archive hash, reran the ZIP compressed-data test and matched all five copied source records against the R2 manifest.

## Repository authority reconciliation

The R2 verification record closes with a historical visual-authority statement. It is not copied verbatim into the repository because the root `AGENTS.md` contains a later 2026-05-30 rebrand addendum that supersedes the historical EMOPET v2 authority for repository-facing work.

This is a repository-context reconciliation only. It does not modify the byte-frozen R2 archive or rewrite its audit trail.

## Boundaries

- The checkpoint and promoted records remain `NOT RELEASED`.
- No product, scientific, legal, component-selection, transmission, manufacturing or publication gate is closed.
- MOKO release candidates and third-party originals are not included.
- The global guide and workbook are not promoted until their authority conflict is reconciled under a new controlled revision.
- The four R2 gates whose active count is `NO` are mapped in `CLOSED_GATE_PROMOTION_REGISTER.csv`; every closure remains limited to its stated scope.
- Promotion is limited to a review branch and pull request; `main` is unchanged until normal review and merge.
