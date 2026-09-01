# MOKO r1.6 ingestion-gate disposition

**Document ID:** GH-MOKO-INGEST-001  
**Revision:** 1.0  
**Date:** 2026-09-01  
**Status:** CLOSED FOR EXACT-PACKAGE INGESTION / NOT RELEASED  
**Classification:** INTERNAL CONTROLLED

## Current lineage

| Revision | Role | Archive SHA-256 | Handling |
|---|---|---|---|
| r1.4 | Immutable historical/source reference | `2043fe122de169132192abd103913de237ea4691d2054c4160637fb71cc89690` | Preserve unchanged; lineage only |
| r1.5 | Superseded release candidate | `1e4d71af213cf34f84ad808b415d86c9f034bf08beec7b7b83374fdd37bc9cb4` | Preserve unchanged; reconciliation history |
| r1.6 | Active current release candidate | `ca08ef8f81154a17cf1862884c19df6ff5d3a9a68163aded0fb587365794066c` | Exact ingestion authority; `PREPARED_NOT_SENT` |

## Closed scope

The MOKO current-release reconciliation gate is closed only for identifying and reconciling the exact r1.6 package. The controlled evidence records:

- 46 unique payload rows;
- 35 DOCX, 9 PDF and 2 XLSX payloads;
- 46/46 overall payload results `PASS`;
- four third-party originals identified in the register and excluded from this repository promotion;
- r1.4, r1.5 and r1.6 lineage preserved.

## Repository authority reconciliation

Two historical R2 narrative records assert the visual authority that applied when R2 was frozen. They are not promoted verbatim because the later rebrand addendum in the root `AGENTS.md` governs current repository-facing work. Their exact R2 hashes remain traceable in the source checkpoint.

This repository disposition does not rewrite those source records or the byte-frozen MOKO archives.

## Gates that remain open

- transmission and disclosure-register evidence;
- manufacturing, production and tooling authorization;
- Product V1 freeze;
- battery, GNSS/positioning module, antenna and provider selection;
- final typography-compliant publication;
- `OPEN-DOC-005` and corpus-wide conversion.

No package presence, manifest pass or GitHub promotion may be interpreted as evidence that any of those gates is closed.
