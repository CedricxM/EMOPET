# Région Bretagne Open Data — dataset allow-list evidence

**Review date:** 2026-10-01  
**Status:** `DATASET METADATA REVIEWED / RECORD FIELDS OPEN / NO RUNTIME INGESTION`

## Portal rule

The Région Bretagne Open Data portal is treated as a catalogue, not as one blanket data authority.

Every dataset must receive its own allow-list entry with:
- dataset identifier;
- producer;
- canonical URL;
- licence;
- intended EMOPET purpose;
- approved data domain;
- exact field allow-list;
- review status.

No generic catalogue search may become production ingestion merely because the portal is public.

## First reviewed dataset

### Réserves naturelles régionales de Bretagne

- dataset ID: `reserves-naturelles-regionales-de-bretagne`
- canonical page: https://data.bretagne.bzh/explore/dataset/reserves-naturelles-regionales-de-bretagne/
- export/licence page: https://data.bretagne.bzh/explore/dataset/reserves-naturelles-regionales-de-bretagne/export/
- producer: Région Bretagne
- licence statement observed: Licence Ouverte / Open Licence
- intended EMOPET domain: `territorial_context`

The official dataset page describes the records as regional nature reserves used for protection of high-value natural sites.

## Important semantic boundary

The mere existence/location of a reserve does **not** establish:

- whether dogs are allowed;
- whether dogs must be leashed;
- seasonal restrictions;
- access hours;
- safe walking conditions;
- dog-friendliness;
- current local rules.

EMOPET must never derive those claims from this dataset alone.

If future product copy needs access/rules, it requires a separate authoritative rules source with freshness/provenance appropriate to that claim.

## Current implementation state

`apps/web/lib/data/breiz/bretagneOpenDataAllowlist.ts` now:

- allows metadata lookup only for reviewed dataset IDs;
- rejects arbitrary dataset IDs;
- records the source-level licence statement and intended purpose;
- keeps `allowedRecordFields: []`;
- keeps the dataset at `METADATA_REVIEWED_FIELDS_OPEN`;
- blocks record retrieval until the exact record fields and release state are approved.

This means dataset discovery can be governed without accidentally enabling content ingestion.

## Remaining work before records

1. inspect the exact current schema through the supported Explore API;
2. choose a minimal field allow-list;
3. record source update/freshness behaviour;
4. define attribution output;
5. test response normalisation;
6. preserve dataset ID + source update + retrieval date in provenance;
7. only then promote to `RELEASE_READY`.

Related:
- #836
- #116
- #827
