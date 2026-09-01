# MOKO r1.6 ingestion-control records

**Promotion ID:** GH-MOKO-INGEST-001  
**Promotion date:** 2026-09-01  
**Repository status:** INTERNAL CONTROLLED / CLOSED FOR INGESTION ONLY / NOT RELEASED  
**Source checkpoint:** `EMOPET_DOCUMENT_CONTROL_GLOBAL_CHECKPOINT_2026-08-29_R2_NOT_RELEASED.zip`  
**Source checkpoint SHA-256:** `1fda848d1bb7a77513450f797171ba672f9a7fc7062b701f6af8c088ad713ce7`

## Purpose

This directory promotes the neutral, GitHub-safe control records supporting the closed MOKO current-release ingestion gate. It does not contain the MOKO archive, supplier payloads or third-party originals.

## Exact promoted records

| Record | R2 member SHA-256 | Role |
|---|---|---|
| [`MOKO_R1.6_PAYLOAD_VERIFICATION_REGISTER.csv`](MOKO_R1.6_PAYLOAD_VERIFICATION_REGISTER.csv) | `e2a346bdf07f5577e0221afecd92d3df46f0d00db4cae6d005679059e227eea2` | 46-row payload verification evidence |
| [`MOKO_RELEASE_LINEAGE_REGISTER.csv`](MOKO_RELEASE_LINEAGE_REGISTER.csv) | `b3e68d92a91d4523622fd8540a81cc2f1b1a06acf66f9d3a108e679f40a0eb40` | r1.4 → r1.5 → r1.6 lineage control |
| [`MOKO_R1.6_RECONCILIATION_REGISTER_INPUT_QA_REPORT_2026-08-26.md`](MOKO_R1.6_RECONCILIATION_REGISTER_INPUT_QA_REPORT_2026-08-26.md) | `4785f61a3bee721fb689f588b529d4bfe3cb615e17d529a2f60b1fb91e245a8a` | Input-register QA evidence |

These three records are byte-identical to their R2 checkpoint members.

## Repository controls

- [`MOKO_R1_6_INGESTION_GATE_DISPOSITION.md`](MOKO_R1_6_INGESTION_GATE_DISPOSITION.md) records the bounded gate closure under current repository authority.
- [`PROMOTION_MANIFEST.csv`](PROMOTION_MANIFEST.csv) records exact source identity and exclusions.
- [`PROMOTION_QA.md`](PROMOTION_QA.md) records promotion checks.

## Boundaries

- r1.6 remains `PREPARED_NOT_SENT / NOT RELEASED`.
- No transmission, manufacturing, tooling, component-selection or final-publication approval is created.
- No supplier archive, DOCX/PDF/XLSX payload or third-party original is stored here.
- The root [`AGENTS.md`](../../../AGENTS.md) remains the current repository authority.
