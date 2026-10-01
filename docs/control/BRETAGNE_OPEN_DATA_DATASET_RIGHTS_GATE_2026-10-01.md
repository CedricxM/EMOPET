# EMOPET — Région Bretagne dataset-scoped rights gate

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED FAIL-CLOSED DATASET RIGHTS MODEL / FIRST DATASET STILL BLOCKED`

## Problem

The Région Bretagne source registry entry represents the **portal/catalogue**:

`region-bretagne-open-data`

The portal contains many datasets and the exact reuse licence belongs to the selected dataset, not automatically to the whole catalogue.

Keeping the source-registry field `license: null` is therefore intentional.

A portal-level licence value would create a dangerous shortcut:

`catalogue is open data -> every dataset is reusable under one assumed licence`

EMOPET must instead use:

`portal authority + exact allow-listed dataset + exact dataset licence + exact field allow-list + controlled rights receipt`

## Dataset-scoped gate

`evaluateBretagneOpenDataDatasetRights()` now checks:

1. the Région Bretagne source still exists in the controlled source registry;
2. the source is enabled;
3. the source has a recheck/freshness rule;
4. the exact dataset is at `RELEASE_READY`;
5. the exact selected record fields are non-empty;
6. the dataset carries a non-empty licence and licence URL;
7. a dataset-scoped rights receipt exists;
8. that receipt is `SOURCE_CONFIRMED` + `GO`;
9. the receipt binds an immutable source version;
10. attribution, permitted-use summary, reviewer role and receipt path exist;
11. review/recheck timestamps are valid and not expired.

Any failure keeps record ingestion blocked.

## Why the parent source can keep `license: null`

The general Breiz source-rights gate remains correct for sources whose licence can be represented at source level.

Région Bretagne Open Data is a catalogue-style source.

Its record-level path therefore uses the stricter dataset-scoped gate rather than filling the parent registry with a licence that may not apply to every dataset.

This is a scope refinement, not a relaxation.

## Current first dataset

Dataset:

`reserves-naturelles-regionales-de-bretagne`

Current controlled state:

- dataset identity reviewed;
- producer recorded as Région Bretagne;
- dataset page/export page records Licence Ouverte / Open Licence;
- intended domain: `territorial_context`;
- exact record field allow-list: still empty;
- review status: `METADATA_REVIEWED_FIELDS_OPEN`;
- dataset rights receipt: absent;
- runtime record retrieval: blocked.

The official Région Bretagne dataset page describes the dataset as the regional nature-reserve inventory, and its export surface states that the dataset is under Licence Ouverte.

## Semantic boundary

Even after this dataset eventually becomes release-ready, its existence/location metadata must **not** be used by itself to claim:

- dogs are allowed;
- dogs must be leashed;
- dogs are forbidden;
- seasonal access rules;
- opening hours;
- walking safety;
- dog-friendliness.

Those claims require a different rules/access source with suitable freshness and provenance.

## Next evidence required

Before promotion:

1. inspect the current Explore API record schema;
2. choose the minimum territorial fields;
3. record the exact source/update/version reference;
4. create the controlled dataset rights receipt;
5. define attribution rendering;
6. define recheck timing;
7. test normalisation/provenance;
8. only then change the dataset to `RELEASE_READY`.

## Non-goals

This change does not:

- activate record ingestion;
- assign one blanket licence to data.bretagne.bzh;
- create dog-access knowledge;
- change the top-level source registry licence;
- grant legal approval;
- create a partnership claim.

Related:

- #836 — Région Bretagne dataset allow-list;
- #116 — third-party data/service rights;
- merged PR #901 — first current-main dataset allow-list.
