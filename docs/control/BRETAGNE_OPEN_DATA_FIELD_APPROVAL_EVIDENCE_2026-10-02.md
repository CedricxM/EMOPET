# EMOPET — Bretagne Open Data field-approval evidence gate

**Date:** 2026-10-02  
**Status:** `IMPLEMENTED FAIL-CLOSED FIELD-MINIMISATION EVIDENCE / NO FIELD PROMOTED`

## Purpose

Région Bretagne dataset release already requires:

- exact dataset allow-list membership;
- exact live schema evidence;
- dataset-scoped rights evidence;
- source-version agreement.

One more boundary is required:

> the runtime must prove that the fields it is allowed to retrieve were explicitly reviewed for that exact use case and exact schema version.

A non-empty `allowedRecordFields` array by itself is not enough authority.

## New evidence object

`BretagneDatasetFieldApprovalEvidence` binds:

- exact approved field list;
- exact source version;
- exact schema fingerprint;
- reviewer role;
- reviewer reference;
- review timestamp;
- controlled review receipt;
- purpose boundary.

## Release gate

Record ingestion now remains blocked when:

- no field-approval evidence exists;
- field-approval evidence is incomplete or future-dated;
- approved fields differ from `allowedRecordFields`;
- field approval was issued for a different schema/source version.

This is independent of the rights/licence gate.

A licence GO cannot choose product fields, and a product field review cannot grant reuse rights.

## Why exact order matters

The approved field list is compared in exact order with `allowedRecordFields`.

That keeps the review receipt deterministic and prevents silent reordering/addition/removal after review.

A later schema fingerprint or source-version change invalidates the field approval until reviewed again.

## Current RNR dataset state

Nothing is promoted.

`reserves-naturelles-regionales-de-bretagne` still has:

- `allowedRecordFields: []`;
- no runtime schema evidence;
- no field-approval evidence;
- no dataset rights GO;
- `METADATA_REVIEWED_FIELDS_OPEN`;
- runtime record retrieval blocked.

The durable schema receipt currently proposes only candidate minimum fields:

- `id`;
- `nom`;
- `geo_point_2d`.

Those remain candidates until a controlled field-minimisation review explicitly approves them.

## Semantic boundary

Even an approved field set such as identity/name/location cannot establish:

- dog access;
- leash rules;
- seasonal restrictions;
- opening hours;
- safety;
- dog-friendliness.

Those claims require independent current authority.

## Non-goals

This gate does not:

- approve the candidate field set;
- create a reviewer;
- reconcile the licence-version HOLD;
- enable record ingestion;
- create legal advice;
- create partnership status.

Related:

- #836 — Région Bretagne open-data workstream;
- #989 — dataset-scoped Regional Pack readiness;
- #116 — third-party data/service rights.
