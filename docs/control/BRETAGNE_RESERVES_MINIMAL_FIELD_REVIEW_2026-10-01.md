# Région Bretagne Open Data — reserve dataset schema review receipt

**Issue:** #836  
**Date:** 2026-10-01  
**Dataset:** `reserves-naturelles-regionales-de-bretagne`  
**Status:** `SCHEMA REVIEWED / MINIMAL FIELDS APPROVED / RECORD RETRIEVAL STILL BLOCKED`

## Evidence source

GitHub Actions run:

- workflow: `Bretagne open-data schema evidence`
- run id: `36893545531`
- artifact id: `11178636271`
- artifact name: `bretagne-open-data-schema-evidence-36893545531`
- artifact digest: `sha256:cd3186bc5543956d319c16de3ed22e1bc7a5378213af2141d448a3b7c0c45354`
- head SHA: `8adf96fc11c961c0017d98d5904333d450d2dc74`

The capture used:

- dataset metadata endpoint;
- a `records?limit=0` probe;
- no retained record payload.

The artifact explicitly states:

`authority = EVIDENCE_ONLY_NO_RELEASE_AUTHORITY`

## Observed live dataset snapshot

Observed at:

`2026-10-01T16:38:59.589Z`

Dataset identity:

- dataset id: `reserves-naturelles-regionales-de-bretagne`
- dataset uid: `da_b4p8we`
- publisher: Région Bretagne
- title: Réserves naturelles régionales de Bretagne
- observed record count: 11
- metadata record count: 11
- metadata processed at: `2026-09-27T03:39:40.891000+00:00`
- data processed at: `2026-09-20T03:16:25+00:00`

Schema fingerprint:

`sha256:c1c150f210e79b85c31525863b6ee92dd7d96a504c61fc0456c38e38355eb9dd`

Source-version fingerprint:

`sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0`

Observed licence statement:

`Licence ouverte`

## Exact observed fields

```text
credit_photo
date_creation
description
geo_point_2d
geo_shape
gml_id
id
image
latitude
lien_plaquette
longitude
nom
nom_long
search_id
site_web
site_web_ext
surface
```

## Approved v0 field allow-list

Only these five fields are approved for a future first territorial-context path:

```text
id
nom
geo_point_2d
surface
date_creation
```

Rationale:

- `id`: source record identity;
- `nom`: human-readable reserve name;
- `geo_point_2d`: coarse territorial placement without retaining the full polygon;
- `surface`: bounded territorial context;
- `date_creation`: source-published creation context.

## Explicitly excluded in this review

Not approved:

- `description`: free editorial text not needed for the minimum territorial-context slice;
- `image`, `credit_photo`: media/credit branch excluded from v0;
- `lien_plaquette`: document/media branch excluded from v0;
- `site_web`, `site_web_ext`: external-link branch not required for v0;
- `geo_shape`: full geometry is unnecessary for the first slice;
- `latitude`, `longitude`: redundant with `geo_point_2d`;
- `gml_id`, `search_id`: technical/search identifiers not required for product context;
- `nom_long`: redundant with `nom` for the first slice.

This field approval does **not** mean the excluded fields are unlawful or unusable. It only means they are unnecessary for the current minimal product purpose.

## Semantic hard stop

This dataset proves the existence/location of official regional nature reserves.

It does **not** establish:

- dog access;
- leash rules;
- seasonal restrictions;
- opening hours;
- dog-friendliness;
- trail safety;
- current local regulations.

No such claim may be derived from this dataset alone.

## Remaining release blockers

The dataset remains:

`METADATA_REVIEWED_FIELDS_OPEN`

and not `RELEASE_READY`.

Record retrieval remains blocked until all of the following exist:

1. dataset-scoped rights receipt with `GO`;
2. exact attribution text;
3. recheck/freshness rule;
4. rights receipt bound to the same source-version fingerprint;
5. response normalisation tests;
6. provenance preservation for dataset id, source update and retrieval time;
7. #116 data-rights gate remains satisfied.

No runtime ingestion authority is created by this receipt.
