# EMOPET — Bretagne RNR field review packet

**Date:** 2026-10-02  
**Status:** `DRAFT HUMAN REVIEW PACKET / NO FIELD APPROVED`

## Purpose

The live Région Bretagne schema receipt already identifies a candidate minimum field set for:

`reserves-naturelles-regionales-de-bretagne`

Those candidates must not become runtime authority merely because they exist in JSON.

This packet converts the durable schema receipt into an exact review artefact for a human product/data reviewer.

Evidence chain:

`live schema receipt -> generated field-review packet -> human decision -> field-approval receipt -> runtime allow-list`

## Current candidate fields

The packet is derived directly from the durable schema receipt and currently exposes:

- `id`;
- `nom`;
- `geo_point_2d`.

For each candidate it preserves:

- exact field name;
- current live-schema type;
- exact reason recorded in the schema receipt;
- requested disposition:
  - `APPROVE`;
  - `REJECT`;
  - `APPROVE_WITH_CONDITIONS`.

## Source binding

The review packet carries the exact:

- dataset ID;
- dataset UID when available;
- source authority;
- source version;
- schema fingerprint;
- durable schema-evidence path.

A later source-version or schema-fingerprint change requires a new field review.

## Purpose boundary

The review is limited to the minimum information necessary to identify and place an official regional nature reserve as **territorial context**.

It cannot authorize claims about:

- dog access;
- leash rules;
- seasonal restrictions;
- opening hours;
- safety;
- dog-friendliness.

Those require separate current authorities.

## Deferred fields

The packet also exposes the groups deliberately deferred by the schema receipt so the reviewer can see what is being excluded.

This includes:

- description/media/link fields;
- broader/redundant geometry;
- optional context;
- technical identifiers.

Candidate/deferred overlap causes packet generation to fail.

## Source-state guard

The packet generator refuses to run as review authority when the source receipt already claims:

- runtime ingestion permitted; or
- release disposition other than `HOLD`.

The field packet is a pre-release review tool, not a way to rationalise a release after the fact.

## Review response requirements

The response template requires:

- disposition;
- reviewer role;
- reviewed timestamp;
- controlled evidence reference;
- exact approved fields;
- confirmation of the purpose boundary;
- conditions/restrictions.

Automatic application is explicitly disabled.

## CI

The packet contract is exercised in the Security supply-chain workflow.

Tests verify:

- the current durable receipt builds the expected three-field packet;
- candidates exist in the exact live schema;
- candidates remain `CANDIDATE`;
- candidate and deferred sets do not overlap;
- release/runtime flags remain HOLD/false;
- source version and schema fingerprint remain bound.

## Current runtime state

Nothing is promoted by this slice.

The runtime dataset descriptor still has:

- `allowedRecordFields: []`;
- no field-approval evidence;
- no rights GO;
- no record retrieval.

## Non-goals

This packet does not:

- approve `id`, `nom` or `geo_point_2d`;
- resolve the licence-version HOLD;
- create a reviewer;
- perform live API calls;
- enable ingestion;
- create dog-access knowledge.

Related:

- PR #995 — field-approval evidence gate;
- #836 — Région Bretagne data workstream;
- #989 — dataset-scoped Regional Pack readiness;
- #116 — third-party data/service rights.
