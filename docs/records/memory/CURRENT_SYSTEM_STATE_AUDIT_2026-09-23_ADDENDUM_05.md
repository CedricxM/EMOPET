# EMOPET — Current System-State Audit — 23 September 2026 — Addendum 05

**Status:** `CONTROLLED MEMORY / DOCUMENT-CONTROL CUSTODY DISPOSITION — CREATES NO RELEASE AUTHORITY`  
**Snapshot base:** `main@3fa5c5298247fc88412ce2c8294fdb4f36024f56`  
**Scope:** PRs #44, #52, #62 and #104 only.

## 1. Why these four document-control PRs were closed without merge

All four PRs are custody/readiness snapshots built from external document-control checkpoints. They remain useful provenance, but merging them into the current tree would make historical authority or dated readiness look current.

- **#44:** all 5 promoted custody records matched their declared SHA-256 values. The branch still names the 30 May 2026 AGENTS.md brand profile as current authority; current AGENTS.md classifies that profile as historical/superseded and BRAND-AUTHORITY-001 governs instead.
- **#52:** all 3 promoted MOKO r1.6 control records matched their declared SHA-256 values. The documented ingestion gate was already closed at the checkpoint source; merging the dated supplier state would not create new authority.
- **#62:** 149 of 150 `PROMOTION_MANIFEST.csv` rows match. The sole mismatch is the bundle `README.md`: the manifest was written at commit `44ed8f8`, then the README changed at `5cc25e2` without manifest regeneration. The 8 chunked originals / 54 parts reassemble to their declared source hashes. This is a stale manifest row, not evidence of tampering, but it invalidates a blanket byte-identical claim for all 150 files.
- **#104:** the R4 records are a dated `PASS_WITH_NOTES — NOT RELEASED` readiness snapshot and custody pointer. They do not establish current release, transmission, manufacturing, legal or publication authority.

## 2. Authority retained outside the merged tree

The authoritative custody sources remain the checkpoint archives identified by those PRs, including:

- R2 document-control checkpoint: `1fda848d1bb7a77513450f797171ba672f9a7fc7062b701f6af8c088ad713ce7`;
- R4 global consolidation archive as identified in #104.

Closing the PRs preserves their Git history and discussion without promoting stale state into `main`.

## 3. Method boundary

This addendum records repository-observable integrity and authority conflicts only. It does not:

- release or transmit any document;
- validate supplier payloads for manufacturing;
- reopen or close legal, scientific, privacy or publication gates;
- convert historical brand authority into current authority;
- claim that repository custody copies replace the external checkpoint archives.

PRs #44, #52, #62 and #104 were therefore closed **without merge** on 2026-09-23.
