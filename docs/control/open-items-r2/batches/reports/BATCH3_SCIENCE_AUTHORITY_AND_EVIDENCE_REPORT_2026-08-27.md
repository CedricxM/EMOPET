# EMOPET Batch 3 Science Authority and Evidence Reconciliation

**Document ID:** BATCH3-RECON-001  
**Revision:** 1.0  
**Date:** 2026-08-27  
**Status:** PASS_WITH_NOTES — AUTHORITY / EVIDENCE RECONCILED / NOT RELEASED  
**Classification:** INTERNAL CONTROLLED

## Technical result

The 19-source Batch 3 intake is reconciled without source mutation: **9 records remain in Batch 3**, **9 engineering records move to Batch 2**, and **COR-007 moves to Batch 0**. No Product, science, legal, component, validation, typography, transmission, manufacturing or release gate closes.

`SCI-001` through `SCI-006` are usable as controlled normative claim/semantic authorities within their stated scopes. They do not prove implementation or scientific validity. `SCI-100` remains a DRAFT derivative and cannot govern publication or scientific claims.

## Route map

| Controlled route | Rows | Interpretation |
|---|---:|---|
| Batch 3 | 9 | Seven controlled science DOCX + research report/raw provenance |
| Batch 2 | 9 | Engineering source, model, trade-study, run-plan and evidence-package inputs |
| Batch 0 | 1 | COR-007 historical release-control manifest |

## Scientific authority and claim boundary

- `SCI-001`–`SCI-006`: controlled normative truth, claim, provenance, Breiz/ELI boundary, generation and semantic-layer controls.
- Implementation, calibrated model, client bundle, CI enforcement and EMOPET-specific scientific validation: not established.
- `SCI-100`: revision 0.1, DRAFT, DERIVATIVE, no empirical validation and no public claim authority.
- Exact `EMOPET-SCI-ELI-001` and `SCI-BIB-001`: `SOURCE_NOT_RECONCILED`.
- Three similarly named Drive documents were found, but none carries the exact cited identifiers or a reconciled binary authority chain.
- Two SCI-100 sentences overstate implementation and require correction in a future controlled revision; the source itself remains unchanged.

## Regulatory boundary

European Commission sources confirm that Article 50 transparency duties apply from 2 August 2026, with a limited transition for Article 50(2) marking in defined earlier-market cases. This verifies timing only. `OPEN-LEGAL-B1-001` remains open for the exact Breiz/ELI/EMOPET applicability analysis.

## Release-control and custody findings

- Immutable global ZIP: integrity PASS; SHA-256 `f464f15959e2010e77302289d8622129673af613d3350bb863b85173b270b376`.
- COR-007: 267/267 listed payloads pass size and SHA checks.
- COR-007 current completeness: FAIL for current use because 39 later payloads are not listed.
- Local source snapshot: 429/430 byte-identical; one BRD-PUB-001 PDF differs.
- All 19 Batch 3 inputs match the immutable ZIP.

`OPEN-DOC-008` records the local-snapshot divergence. The old snapshot is not repaired in place.

## Source-document visual QA

Seven DOCX render successfully across 14 pages with no clipping or active Word comments/tracked changes. SCI-100 page 7 is an orphaned table continuation. It remains a source-layout note under `OPEN-DOC-005`; no visual conversion or repair is authorised.

## New controlled OPEN items

- `OPEN-SCI-B3-001` — exact SCI-100 source authority, claim mapping, scientific review and empirical validation.
- `OPEN-DOC-008` — local snapshot byte divergence and custody root cause.

## Required next actions

1. Obtain exact `EMOPET-SCI-ELI-001` and `SCI-BIB-001` and reconcile their revisions, owners, hashes and claim mappings.
2. Correct SCI-100's two implementation overstatements only in a new controlled revision.
3. Assign qualified scientific review and define EMOPET-specific validation with predeclared metrics and acceptance criteria.
4. Use immutable ZIP bytes or a new isolated 430/430 materialisation; investigate the divergent local snapshot without overwriting it.
5. Continue the next authority/evidence batch. Keep `OPEN-DOC-005` and corpus-wide mass conversion blocked.
