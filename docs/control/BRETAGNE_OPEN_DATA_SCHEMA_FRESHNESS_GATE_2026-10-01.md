# EMOPET — Région Bretagne dataset-scoped rights + schema freshness gate

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED FAIL-CLOSED DATASET RIGHTS + LIVE-SCHEMA BINDING / FIRST DATASET STILL BLOCKED`

## Why this successor exists

The Région Bretagne portal is a catalogue, not one blanket-licensed source.

The first controlled candidate is:

`reserves-naturelles-regionales-de-bretagne`

Its identity and dataset-level open licence are supported by the official Région Bretagne portal. The official export surface states that the dataset is under **Licence ouverte**, while data.gouv.fr republishes the dataset with **Licence Ouverte / Open Licence version 2.0** and identifies Région Bretagne as the publisher.

However, indexed observations are not sufficiently stable to promote record retrieval:

- an indexed official export view reported **10 records**;
- a separate API-verification service observed **11 records** recently;
- data.gouv.fr still displayed **30 April 2026** as the dataset update date when reviewed.

This disagreement is not treated as an error in either source. It is treated as evidence that EMOPET must bind any future approval to a fresh live API snapshot instead of trusting a stale catalogue page.

## Sources reviewed

Official dataset page:

https://data.bretagne.bzh/explore/dataset/reserves-naturelles-regionales-de-bretagne/

Official export/licence page:

https://data.bretagne.bzh/explore/dataset/reserves-naturelles-regionales-de-bretagne/export/

data.gouv.fr mirror:

https://www.data.gouv.fr/datasets/reserves-naturelles-regionales-de-bretagne-2

Independent API-monitoring diagnostic only, **not authority**:

https://c0mm0.com/entry/open-data-brittany-region/

## New release invariant

A future `RELEASE_READY` dataset must now satisfy all of the following together:

1. controlled Région Bretagne source exists and is enabled;
2. source has a freshness/recheck rule;
3. dataset is explicitly `RELEASE_READY`;
4. exact selected record fields are non-empty;
5. exact dataset licence + licence URL exist;
6. a fresh live API schema snapshot exists;
7. that snapshot records:
   - observation time,
   - immutable/version-like source identifier,
   - schema fingerprint,
   - record count,
   - exact field names,
   - source URL;
8. every approved field exists in that observed schema;
9. dataset-scoped rights receipt exists and is `SOURCE_CONFIRMED + GO`;
10. rights receipt is still within its review window;
11. rights receipt and schema snapshot name the **same source version**.

Any failure keeps record ingestion blocked.

## Current first dataset state

`reserves-naturelles-regionales-de-bretagne`

- identity: reviewed;
- producer: Région Bretagne;
- licence: Licence Ouverte / Open Licence;
- domain: `territorial_context`;
- allowed record fields: **none yet**;
- live schema evidence: **absent**;
- rights receipt: **absent**;
- status: `METADATA_REVIEWED_FIELDS_OPEN`;
- record retrieval: **blocked**.

## Why no fake RELEASE_READY was created

The exact live Explore API metadata/schema endpoint could not be retrieved from the current review environment, while indexed observations showed a record-count discrepancy.

Therefore this change deliberately does **not** invent:

- field names;
- a source version;
- a schema fingerprint;
- a record count authority;
- a rights receipt;
- a `GO` disposition.

The correct next promotion requires a successful live API capture and a controlled receipt produced from that exact snapshot.

## Semantic boundary

Even after record retrieval becomes technically release-ready, reserve identity/location data alone must never be used to claim:

- dogs are allowed;
- dogs are forbidden;
- leash rules;
- seasonal restrictions;
- opening hours;
- walking safety;
- dog-friendliness.

Those claims require a separate, current rules/access authority.

## Next operational step

When a live API capture is available:

1. record the exact schema fields;
2. choose the minimum territorial fields;
3. compute/store the schema fingerprint;
4. bind source version + record count + processing timestamps;
5. create the dataset rights receipt under the controlled receipt path;
6. ensure the receipt and schema evidence use the same source version;
7. only then promote the dataset to `RELEASE_READY`.

Related: #116, #836, #901, supersedes the stale #919 implementation path.
