# EMOPET — Région Bretagne primary schema evidence gate

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED FAIL-CLOSED SCHEMA GATE / NO REAL DATASET PROMOTION`

## Purpose

Dataset-level reuse rights and dataset-level schema authority are separate controls.

A licence can authorize reuse while still leaving unanswered:

- which fields currently exist;
- which exact fields EMOPET is allowed to request;
- which source version was inspected;
- whether a secondary catalogue or search index is stale;
- when the schema must be checked again.

EMOPET therefore requires both:

`dataset rights GO`

and

`primary API schema evidence usable`

before record ingestion may be release-ready.

## Primary-evidence rule

A schema receipt is usable only when it binds:

- the exact allow-listed dataset ID;
- the exact official Région Bretagne Explore API v2.1 metadata endpoint;
- a non-future observation timestamp;
- a future recheck timestamp;
- an immutable source/version reference;
- the complete observed field-ID set used for review;
- the minimal approved field-ID subset;
- a controlled evidence pointer;
- reviewer role;
- evidence state `PRIMARY_API_SCHEMA_CONFIRMED`.

Approved fields must be a subset of observed fields and must exactly match the dataset descriptor's `allowedRecordFields`.

## Secondary evidence

Secondary catalogues, mirrors, search engines and indexed pages may help identify candidate fields.

They cannot produce `PRIMARY_API_SCHEMA_CONFIRMED`.

For the first Bretagne dataset, external observations currently corroborate fields such as `latitude` and `longitude`, but EMOPET does not promote them because the primary API schema and immutable source version have not yet been captured as a controlled receipt.

## Current first dataset

`reserves-naturelles-regionales-de-bretagne`

remains blocked:

- status: `METADATA_REVIEWED_FIELDS_OPEN`;
- approved fields: none;
- dataset rights receipt: absent;
- primary schema receipt: absent;
- record ingestion: blocked.

This PR intentionally does **not** fabricate a source version or copy field names from secondary evidence into runtime authority.

## Release sequence

1. capture the exact primary API metadata response;
2. record its immutable dataset/source version;
3. preserve the observed field IDs;
4. select the minimum fields needed for territorial context;
5. create a controlled schema receipt;
6. reconcile `allowedRecordFields` with the receipt;
7. complete the dataset-scoped rights receipt;
8. only then consider `RELEASE_READY`.

## Semantic boundary

Schema confirmation says only that fields exist and were reviewed.

It does not establish:

- dog access;
- dog-friendliness;
- leash rules;
- opening hours;
- safety;
- suitability;
- partnership or endorsement.

Those claims need their own source and evidence authority.

Related:
- #919 — dataset-scoped rights gate;
- #901 — current-main Bretagne dataset allow-list;
- #116 — third-party data/service rights.
