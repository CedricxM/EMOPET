# EMOPET — Third-Party Data & Service Rights Register v0.1

**Status:** CONTROLLED / NON-CONCLUSIVE / HOLD-AWARE  
**Date:** 2026-09-06  
**Parent gate:** #116 (`G-THIRD-PARTY-DATA-RIGHTS-01`)  
**Snapshot preserved:** `main@c099581ff8aed1e619f72ab38898fc05833b7c66`  
**Current implementation branch:** `experience-hardening-2026-09-06`  
**Authority:** NOT LEGAL SIGN-OFF / NOT RELEASE AUTHORITY

## 0. Purpose

This register turns #116 into an operational evidence ledger. It separates:

- existence of a public source;
- published licence/terms labels;
- immutable retrieval evidence;
- exact EMOPET use;
- rendered attribution;
- contractual/service-account authority;
- final product-use disposition.

A public URL, a repository licence label, or an `enabled: true` flag is **not** product-use authorization.

Allowed evidence states:

- `SOURCE_CONFIRMED`
- `REPOSITORY_FACT`
- `RECEIPT_MISSING`
- `UNVERIFIED_CLAIM`
- `HOLD`
- `OPEN`

Final controlled disposition, when eventually reviewed, is limited to `GO | HOLD | REMEDIATE`.

## 1. Gate summary

| Gate | Scope | State | Owner role | Next action |
|---|---|---|---|---|
| DATA-LIC-G1 | Dataset identity + retrieval receipts | OPEN | Data/Science | create immutable receipts + SHA-256 for every external dataset |
| DATA-LIC-G2 | VBO upstream/derivative traceability | OPEN | Data/Science | bind payload + derivatives to exact upstream release and transform commands |
| DATA-LIC-G3 | Local-directory row provenance | HOLD | Product/Data | remove production representation until row-level evidence or explicit demo classification exists |
| DATA-LIC-G4 | OSM/Overpass flow + attribution | OPEN | Product/Engineering | classify query/cache/export flows and review provider/service use |
| DATA-LIC-G5 | Mapbox account/terms/token authority | OPEN | Founder/Product/Engineering | record account, billing, terms snapshot, token custody and rendered attribution evidence |
| DATA-LIC-G6 | Breiz item-level source controls | OPEN | Product/Data | require item-level rights evidence and fail closed when absent |
| DATA-LIC-G7 | Dependency licence inventory | OPEN | Engineering | exact-head licence inventory + notice/copyleft review |
| DATA-LIC-G8 | Controlled review + release disposition | OPEN | Founder + qualified reviewer | dated GO/HOLD/REMEDIATE with residual gaps visible |

## 2. Registered external datasets

### dog-movement-vxhx934tbn-v4

- Source: `https://data.mendeley.com/datasets/vxhx934tbn/4`
- DOI/version: `10.17632/vxhx934tbn.4` / V4
- Repository licence label: `CC-BY-4.0`
- Official-source state from #116: `SOURCE_CONFIRMED`
- Immutable retrieval receipt: `RECEIPT_MISSING`
- SHA-256: missing in `data/registry/real-datasets.json`
- Intended use: R&D / IMU feature validation / activity-posture research
- Release disposition: `HOLD` for any claim that implies dataset labels validate an individual dog's internal state
- Next action: capture exact payload filename, retrieval date, SHA-256, citation/attribution and reviewer

### dog-posture-mpph6bmn7g-v1

- Source: `https://data.mendeley.com/datasets/mpph6bmn7g/1`
- DOI/version: `10.17632/mpph6bmn7g.1` / V1
- Repository licence label: `CC-BY-4.0`
- Official-source state from #116: `SOURCE_CONFIRMED`
- Immutable retrieval receipt: `RECEIPT_MISSING`
- SHA-256: missing
- Intended use: R&D / posture recognition / preprocessing validation
- Release disposition: `HOLD` for product claims until evidence + validation gates are separate and complete
- Next action: capture payload checksum and exact associated-code licence before copying any code

### vbo-ontology

- Source: `https://monarchinitiative.org/ontologies/vbo`
- Repository licence label: `CC-BY-4.0`
- Official-source state from #116: `SOURCE_CONFIRMED`
- Current version tag: `controlled-at-retrieval` (not immutable enough)
- Immutable retrieval receipt: `RECEIPT_MISSING`
- Committed payload/derivatives exist under `data/vbo/`
- Release disposition: `HOLD` on redistribution/derivative claims until exact upstream release + transform provenance is bound
- Next action: upstream version, source SHA-256, local SHA-256, transform command/version, attribution and redistribution review

### anmv-veterinary-medicines-fr

- Source: data.gouv.fr ANMV/Anses dataset
- Repository label: `CC-BY`
- Official-source state from #116: `SOURCE_CONFIRMED`
- Exact licence/legal-code receipt: OPEN
- SHA-256: missing
- Intended use: reference identifiers / veterinary record normalisation
- Hard semantic boundary: never use reference data to recommend, prescribe, diagnose or alter treatment
- Release disposition: `HOLD` until exact resource/version/licence receipt is captured

## 3. Local directory — Lorient seed

Observed #116 snapshot facts:

- header claimed `45+ entries` and aggregate sources;
- snapshot had 41 entries;
- `sourceId` was null on all rows;
- most rows carried ratings;
- many rows carried `verified: true`;
- obvious placeholder phone patterns existed;
- aggregate header did not establish row-level provenance.

**Controlled disposition:**

`PUBLICATION OR PRODUCTION REPRESENTATION AS A VERIFIED DIRECTORY = HOLD`

Implementation requirements:

1. raw legacy seed must not be seeded into normal runtime by default;
2. any explicit demo seed must suppress unsupported `verified` and rating claims;
3. production API must fail closed until `EMOPET_LOCAL_DIRECTORY_RELEASE_GATE=GO` is deliberately set after evidence review;
4. demo access must be explicit and visibly marked `UNVERIFIED_DEMO`;
5. future production rows require item-level source pointer + evidence state.

## 4. OpenStreetMap / Overpass

Repository flow:

`Mapbox viewport -> public overpass-api.de query -> in-memory bbox cache -> OSM POI markers`

Current known behaviour:

- no persistent cache is created by `apps/web/lib/osm-spots.ts`;
- POIs are derived from OSM tags;
- Mapbox popup identifies OpenStreetMap text;
- exact public service-policy review and full rendered attribution evidence remain OPEN.

**Controlled implementation disposition:**

- public Overpass querying must fail closed unless an explicit runtime gate is set;
- every returned POI should carry source-element URL, attribution and licence URL metadata;
- release cannot treat the environment flag itself as legal clearance;
- persistent caching/export/derived-database use remains a separate review.

## 5. Mapbox

Repository facts:

- Mapbox GL JS is used;
- Mapbox-hosted style is used;
- `NEXT_PUBLIC_MAPBOX_TOKEN` controls the legacy activation path;
- attribution control is enabled.

**Gap:** token presence is not evidence of product-use authority.

**Controlled implementation disposition:**

Mapbox runtime requires both:

- a token; and
- explicit `NEXT_PUBLIC_EMOPET_MAPBOX_RIGHTS_GATE=GO`.

`GO` is an operator gate only. It does not replace the required evidence record for:

- account holder;
- billing owner;
- accepted terms/product terms + date;
- intended plan/volume;
- token custody/scope/rotation;
- rendered attribution evidence;
- privacy/data-processing review where applicable.

## 6. Breiz regional source registry

`apps/web/lib/data/breiz/sourceRegistry.ts` is a catalogue, not rights authority.

Required controlled rule:

> `enabled === true` MUST NOT imply release readiness.

A source becomes release-ready only when an item/source evidence object records at minimum:

- immutable source/version pointer;
- licence/terms receipt pointer;
- attribution text;
- permitted transformation/use note;
- review date;
- reviewer role;
- recheck/expiry date where appropriate;
- disposition `GO`.

Missing evidence => fail closed.

## 7. Dependency licences

SBOM/security scanning is supporting evidence only.

Still required:

- exact-head machine-readable dependency licence inventory;
- unknown/custom/copyleft review;
- attribution/notice retention;
- source-offer obligations where applicable;
- transitive package review;
- dated disposition.

State: `OPEN`.

## 8. Evidence schema for future receipts

Recommended receipt fields:

```text
evidence_id
source_id
item_id_or_dataset_id
canonical_url
immutable_version_or_release
retrieved_at_utc
payload_filename
payload_sha256
licence_id
licence_legal_code_url
terms_snapshot_path
required_attribution
allowed_use_summary
transformations
storage_location
reviewer_role
reviewed_at
recheck_at
final_disposition = GO | HOLD | REMEDIATE
notes
```

Do not commit confidential account material, personal data, secrets or private contracts to this register. Store only controlled pointers where needed.

## 9. Current release statement

As of 2026-09-06:

- no dataset in `real-datasets.json` has a completed immutable SHA-256 receipt;
- the Lorient seed is not authorized to be represented as a verified production directory;
- OSM/Overpass runtime/service classification is not fully reviewed;
- Mapbox account/terms/token authority is not evidenced in-repo;
- Breiz source catalogue inclusion is not release authorization;
- dependency licence review remains open.

Therefore:

`G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN`

This document narrows accidental use and creates evidence structure. It does not close #116.