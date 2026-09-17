# EMOPET — Global corpus QA report

Document ID: `EMOPET-QA-GLOBAL-2026-09-01`  
Revision: `1.0`  
Date: `2026-09-01`  
Status: `PASS_WITH_NOTES — CONTROLLED INTERNAL QA / NOT RELEASED`  
Classification: `INTERNAL CONTROLLED`

## Executive result

QA has been applied to all 430 byte-materialized source files represented by 444 reconciliation occurrences. All 430 source identities match the immutable archive; the QA pass changed zero source files.

All 430 files are `PASS_WITH_NOTES`. There are zero QA failures, but this result does **not** mean release-ready, transmitted, scientifically validated, physically validated, legally approved, typography-compliant or authorized for corpus-wide conversion.

## Coverage

| Control | Result |
|---|---:|
| Source identities checked | 430/430 PASS |
| Visual files rendered/inspected | 181/181 |
| Rendered pages | 1371 |
| Contact sheets reviewed | 24 |
| Automated blank-page suspects | 0 |
| Edge-contact suspects reviewed | 70 — no truncation found |
| DOCX active comments | 0 |
| DOCX tracked changes | 0 |
| XLSX formulas checked | 248 |
| XLSX formula errors | 0 |
| Potential secrets detected | 0 |

Visual coverage includes full automated rendering of all 146 DOCX, 15 XLSX and 15 PDF files plus direct inspection of five PNG files. First and last pages of every visual document and all automated suspect pages were reviewed through 24 contact sheets. A future official publication revision still requires full-size page-by-page visual QA.

## Deferred improvement classes

| Finding class | Files | Handling |
|---|---:|---|
| Core metadata title missing | 169 | Repair only in a new controlled revision |
| Core metadata creator missing | 68 | Repair only in a new controlled revision |
| DOCX table header flag missing | 118 | Accessibility improvement deferred |
| DOCX image alternative text missing | 43 | Accessibility improvement deferred |
| XLSX long/fragmented print profile | 10 | Rebuild print profile before presentation |
| DOCX external relationships present | 7 | Verify targets when revised/published |
| PDF AcroForm present | 1 | Preserve source; review form behavior on new revision |

The 70 page-edge detections were manually reviewed on contact sheets and correspond to intentional full-frame imagery or normal page-edge graphics. They are closed as automated false positives for this QA pass.

## Typography and publication control

The historical Work authority supplied for this QA records `Fraunces`, `Instrument Sans` and `JetBrains Mono` under `BRAND-AUTHORITY-001`. The repository's later `AGENTS.md` (2026-08-29) declares the 2026 Sora/JetBrains rebrand authoritative for repository-facing work and preserves v2 only as history. This QA does not resolve that cross-context authority difference and does not back-propagate the repository rule into immutable historical sources.

The QA-rendered Office derivatives use the available rendering environment. Font fallback evidence amends neither authority context. `OPEN-DOC-005` remains open, and final typography-compliant publication is not established.

## Preserved gates

- `OPEN-DOC-005`: OPEN.
- Corpus-wide mass conversion: BLOCKED.
- MOKO r1.6: `PREPARED_NOT_SENT / NOT_RELEASED`.
- Transmission, manufacturing, Product freeze, component selection, scientific validation, legal conclusion and physical validation gates: unchanged.
- Third-party originals and all source archives: immutable.

## Disposition

The corpus may be retained as controlled internal-review evidence at its current maturity. Improvements are deferred until new evidence, authority or an explicitly controlled document revision becomes available. No source is overwritten by this QA checkpoint.
