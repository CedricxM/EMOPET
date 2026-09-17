# EMOPET R2 document-control records

**Promotion ID:** GH-PROMO-R2-001  
**Promotion date:** 2026-09-01  
**Repository status:** INTERNAL CONTROLLED REFERENCE / NOT RELEASED  
**Source checkpoint:** `EMOPET_DOCUMENT_CONTROL_GLOBAL_CHECKPOINT_2026-08-29_R2_NOT_RELEASED.zip`  
**Source checkpoint SHA-256:** `1fda848d1bb7a77513450f797171ba672f9a7fc7062b701f6af8c088ad713ce7`

## Purpose

This directory promotes a minimal set of verified document-control records from the immutable R2 checkpoint into the repository review workflow. Promotion means repository integration for traceability only. It does not mean publication, transmission, product approval, manufacturing authorization or release.

## Current repository authority

The root [`AGENTS.md`](../../../AGENTS.md) is the current repository authority. Its 2026-05-30 visual-brand addendum supersedes the historical EMOPET v2 authority carried by parts of the R2 checkpoint. Repository-facing materials therefore use Sora as the primary typeface and JetBrains Mono for technical data, with the current navy/orange/teal/cream palette.

The source R2 checkpoint remains immutable. This repository promotion does not amend, rebuild or silently rehash it.

## Promoted exact records

| Record | Source SHA-256 | Role |
|---|---|---|
| [`CONTROLLED_ARCHIVE_CUSTODY_RECOVERY_2026-08-29.md`](CONTROLLED_ARCHIVE_CUSTODY_RECOVERY_2026-08-29.md) | `897a1dbdb015d76f4d9be072bce2f49fbd1ebb200bc2a7a2979c991b223999e3` | Controlled archive custody evidence |
| [`CONTROLLED_ARCHIVE_CUSTODY_RECOVERY_2026-08-29.json`](CONTROLLED_ARCHIVE_CUSTODY_RECOVERY_2026-08-29.json) | `2e8ce52a6e7c1691b5471ee9852f6a8ff83aa555059b905d43b5029da6b75e5e` | Machine-readable controlled archive custody evidence |
| [`GLOBAL_METADATA_NORMALIZATION_QA_2026-08-29.md`](GLOBAL_METADATA_NORMALIZATION_QA_2026-08-29.md) | `4e96a95fa37c8cbcfa4cbb23dc798c03318799476a007a5c262e29b65bb7d93e` | Non-inferential metadata QA evidence |
| [`SOURCE_MATERIALIZATION_CUSTODY_RECOVERY_2026-08-29.md`](SOURCE_MATERIALIZATION_CUSTODY_RECOVERY_2026-08-29.md) | `be5839fdf3f46e161e0ae6c8969d42225c1426962a10982c28fe6eda286dcb9f` | Immutable source materialization evidence |
| [`SOURCE_MATERIALIZATION_CUSTODY_RECOVERY_2026-08-29.json`](SOURCE_MATERIALIZATION_CUSTODY_RECOVERY_2026-08-29.json) | `e5a9b737c4b30b6a55a7199445513c619c4a876c9a0059cae39a18b05cacb5da` | Machine-readable immutable source materialization evidence |

These five files are byte-identical to their members in the R2 checkpoint and match its manifest.

## Repository-generated controls

- [`R2_CHECKPOINT_INTEGRITY_RECORD.md`](R2_CHECKPOINT_INTEGRITY_RECORD.md) records the local re-verification and the repository-authority boundary.
- [`BRAND_AUTHORITY_REPOSITORY_DISPOSITION.md`](BRAND_AUTHORITY_REPOSITORY_DISPOSITION.md) records the current repository authority without rewriting R2 history.
- [`CLOSED_GATE_PROMOTION_REGISTER.csv`](CLOSED_GATE_PROMOTION_REGISTER.csv) records the four R2 gates whose active count is `NO` and their bounded repository treatment.
- [`PROMOTION_MANIFEST.csv`](PROMOTION_MANIFEST.csv) records every promoted or generated file and the selection decision.
- [`PROMOTION_QA.md`](PROMOTION_QA.md) records the repository promotion checks.

## Deliberately not promoted

- the R2 guide, workbook and their rendered outputs, because they carry or validate historical typography authority that conflicts with the current repository addendum;
- the source R2 verification record verbatim, because its closing visual-authority statement is historical in repository context;
- package-wide scope and release notes that point to those excluded guide/workbook artifacts;
- ZIP archives, source documents, MOKO payloads, third-party originals, publication binaries and transmission material.

Those exclusions preserve traceability without turning historical control evidence into current repository authority.

## Merge boundary

This set is suitable for pull-request review. It must not bypass repository checks or be treated as a direct authorization to merge, publish or release any underlying document package.
