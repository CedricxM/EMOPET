# Bretagne Open Data live schema capture

**Date:** 2026-10-01  
**Status:** `EVIDENCE CAPTURE TOOLING / NO RELEASE AUTHORITY`

## Purpose

This control closes the next evidence gap after the dataset-scoped rights and
schema-freshness gate.

The current Région Bretagne candidate cannot become `RELEASE_READY` until
EMOPET has a fresh, exact API schema snapshot. The capture process must not
turn a successful HTTP request into product, legal or ingestion authority.

## Controlled source

Pilot dataset:

`reserves-naturelles-regionales-de-bretagne`

API base:

`https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets`

The Huwise/Opendatasoft Explore API v2.1 dataset response exposes the dataset
schema in `fields` and processing metadata under `metas.default`.
The records endpoint exposes `total_count`. The API permits `limit=0`, so
the control can verify the live count without retaining any dataset record.

Reference:

https://help.opendatasoft.com/apis/ods-explore-v2/

## Captured evidence

The script records:

- observation timestamp;
- exact metadata endpoint;
- zero-row records probe endpoint;
- dataset id and uid;
- field names, types, labels, descriptions and annotations;
- `records_count` from metadata;
- live `total_count` from the zero-row records probe;
- metadata/data processing timestamps when exposed;
- licence/publisher/title hints when exposed;
- schema SHA-256 fingerprint;
- broader source-version SHA-256;
- response ETag/Last-Modified headers when exposed.

The source-version hash does **not** include the observation timestamp. An
unchanged live dataset snapshot therefore keeps the same content identity.

## Fail-closed behaviour

Capture fails when:

- dataset id is not in the controlled pilot set;
- returned dataset id differs from the requested one;
- schema is missing or malformed;
- field names are duplicated;
- live count is invalid;
- a `limit=0` probe unexpectedly returns row payloads;
- metadata `records_count` and records-probe `total_count` disagree.

The artifact may still be uploaded on a failed workflow when a file exists,
but failure never promotes release state.

## Explicit non-authority

The artifact contains:

`authority = EVIDENCE_ONLY_NO_RELEASE_AUTHORITY`

and:

`reviewBoundary.releaseReady = false`

No workflow step edits the allow-list, creates a rights `GO`, commits evidence
back to the repository or enables runtime record retrieval.

A human review must still:

1. inspect the captured schema;
2. choose the minimum permitted territorial fields;
3. review dataset-scoped rights/attribution;
4. bind the rights receipt to the exact captured source version;
5. update the controlled dataset descriptor in a separate reviewed change.

Related: #939, #116, #836.
