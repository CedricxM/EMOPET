# Bretagne RNR dataset — schema receipt and field minimisation review

**Date:** 2026-10-01  
**Dataset:** `reserves-naturelles-regionales-de-bretagne`  
**State:** `HOLD / EVIDENCE STABLE / RIGHTS VERSION NOT RECONCILED`

## What is now established

Two independent runs of the controlled GitHub Actions capture produced the same
live dataset identity:

- 17 schema fields;
- 11 live records;
- metadata `records_count = 11`;
- live zero-row probe `total_count = 11`;
- schema fingerprint:
  `sha256:c1c150f210e79b85c31525863b6ee92dd7d96a504c61fc0456c38e38355eb9dd`;
- source version:
  `sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0`.

The two artifact ZIP digests differ because each artifact contains a different
observation timestamp. The schema fingerprint and source version remain
identical, which is the controlled content identity that matters here.

Durable receipt:

`data/registry/schema-evidence/reserves-naturelles-regionales-de-bretagne-65ff0d253fd1.json`

## Candidate minimum field set

The first territorial-context slice should remain deliberately tiny.

### `id`

Candidate identity field only.

The schema proves that the field exists and is text. It does **not** yet prove
that the value is a permanently stable business identifier across upstream
revisions. Therefore it remains `CANDIDATE`.

### `nom`

Candidate public display name.

This is the minimum human-readable field needed to identify the reserve in a
territorial context card.

### `geo_point_2d`

Candidate geographic point.

For the first slice it is preferable to storing both `latitude` and
`longitude`, and it avoids pulling the larger `geo_shape` boundary when a
point is sufficient.

## Fields intentionally deferred

### Content/media/link fields

`description`, `image`, `credit_photo`, `lien_plaquette`,
`site_web`, `site_web_ext`

These are not necessary for the first territorial identity slice. They also
introduce separate questions around content freshness, media reuse, links,
credits and potentially third-party material.

### Redundant/broader geometry

`latitude`, `longitude`, `geo_shape`

If `geo_point_2d` is sufficient, the first two duplicate the spatial signal
and `geo_shape` collects materially more geometry than the first use case
requires.

### Optional context

`nom_long`, `surface`, `date_creation`

Potentially useful later, but not required to identify and place a reserve.

### Technical identifiers

`gml_id`, `search_id`

Not needed for the first public projection.

## Rights blocker still open

The live official Région Bretagne API exposes:

- publisher: `Région Bretagne`;
- licence string: `Licence ouverte`;
- a licence URL pointing to an Etalab PDF under a 2014 path.

The API licence URL resolves to Etalab's historical Licence Ouverte document,
which identifies itself as **version 1.0**.

The data.gouv mirror labels the same dataset
`Licence Ouverte / Open Licence version 2.0`, but data.gouv also warns on this
external-portal dataset that source metadata may have been lost during
harvesting.

The portal cannot be normalized as one licence family. It currently exposes
other datasets with an explicit `Licence Ouverte v2.0 (Etalab)` label, while
this RNR dataset retains the generic legacy label. Therefore a portal-wide
"everything is v2.0" assumption is rejected.

The repository must not silently collapse those observations into a
self-issued legal conclusion. The receipt therefore records:

`HOLD_VERSION_RECONCILIATION_REQUIRED`

A targeted source-authority clarification packet is stored at
`docs/partnerships/BRETAGNE_RNR_OPEN_DATA_LICENCE_CLARIFICATION_2026-10-01.md`.

A future rights receipt may become `GO` only after the exact applicable
licence/version and attribution obligation are reconciled for this dataset and
bound to source version
`sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0`.

## Runtime state

This review does **not**:

- set `allowedRecordFields`;
- add `schemaEvidence` to the runtime descriptor;
- add a `GO` rights receipt;
- set `RELEASE_READY`;
- enable record retrieval.

The current runtime remains fail-closed.

## Semantic boundary

Even after future release, reserve identity and location alone cannot establish
dog access, leash requirements, seasonal restrictions, opening hours, walking
safety or dog-friendliness.

Those statements require their own current authority.

Related: #939, #944, #116, #836.
