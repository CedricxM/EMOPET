# EMOPET Controlled Archive Custody Recovery

**Document ID:** QA-CUSTODY-RECOVERY-002  
**Revision:** 1.0  
**Date:** 2026-08-29  
**Status:** PASS_WITH_NOTES — EXACT CONTROLLED ARCHIVES RESTORED / NOT RELEASED  
**Classification:** INTERNAL CONTROLLED

## Result

The exact controlled Batch 3, MOKO r1.5 and MOKO r1.6 archive bytes were recovered from durable custody and verified locally. No archive member was rebuilt, edited or silently rehashed.

| Archive | SHA-256 | ZIP | Manifest / sums | Status |
|---|---|---:|---:|---|
| Batch 3 science checkpoint | `a457008037a5b14e47ae3c248728c375b3c4e5c4bf40bdf2b3e685c70f293aac` | PASS | Existing internal controls preserved | NOT RELEASED |
| MOKO r1.5 | `1e4d71af213cf34f84ad808b415d86c9f034bf08beec7b7b83374fdd37bc9cb4` | PASS | 46/46 manifest; 47 sums | SUPERSEDED / PREPARED_NOT_SENT |
| MOKO r1.6 | `ca08ef8f81154a17cf1862884c19df6ff5d3a9a68163aded0fb587365794066c` | PASS | 46/46 manifest; 47 sums | ACTIVE CURRENT CANDIDATE / PREPARED_NOT_SENT / NOT RELEASED |

## Preserved corrupt local evidence

| Original | Quarantine | Bytes | SHA-256 |
|---|---|---:|---|
| `EMOPET_DOCUMENT_CONTROL_2026/10_RELEASE_CONTROL/.EMOPET_BATCH3_SCIENCE_CHECKPOINT_2026-08-27_NOT_RELEASED.zip.tT3To1` | `EMOPET_DOCUMENT_CONTROL_2026/10_RELEASE_CONTROL/QUARANTINE/BATCH3_CUSTODY_2026-08-29/.EMOPET_BATCH3_SCIENCE_CHECKPOINT_2026-08-27_NOT_RELEASED.zip.tT3To1.CORRUPT_PRESERVED_e45c754f680aa64e` | 4194304 | `e45c754f680aa64ecbdcfbb85e4fb0b460b9330076f5ac32e2d744e2d3c2452c` |
| `EMOPET_DOCUMENT_CONTROL_2026/10_RELEASE_CONTROL/EMOPET_BATCH3_SCIENCE_CHECKPOINT_2026-08-27_NOT_RELEASED.zip` | `EMOPET_DOCUMENT_CONTROL_2026/10_RELEASE_CONTROL/QUARANTINE/BATCH3_CUSTODY_2026-08-29/EMOPET_BATCH3_SCIENCE_CHECKPOINT_2026-08-27_NOT_RELEASED.zip.CORRUPT_PRESERVED_17ca68e17eb64d97` | 35151360 | `17ca68e17eb64d97e98d1735e3dd78740874e64807939226307aac9c042aebed` |

## Boundaries

- MOKO r1.5 is preserved as a superseded release candidate.
- MOKO r1.6 is the exact active current candidate, `PREPARED_NOT_SENT / NOT RELEASED`.
- No transmission, manufacturing authorization, component selection, physical validation or final typography publication is claimed.
- The prior corrupt Batch 3 bytes remain preserved in quarantine for audit traceability.

## Gate disposition

`OPEN-DOC-010` can be closed for local custody recovery because the exact controlled archive has been restored, its SHA-256 matches the existing sidecar, and the ZIP test passes. This does not promote the checkpoint to RELEASED.
