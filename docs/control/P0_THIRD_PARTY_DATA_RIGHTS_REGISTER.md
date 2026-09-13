# EMOPET — P0 Third-Party Data and Service-Rights Evidence Register

Status: `P0 CONTROLLED EVIDENCE INTAKE / OPEN / NOT LEGAL SIGN-OFF / NOT RELEASE AUTHORITY`  
Control date: `2026-09-02`  
Snapshot boundary: `main@c099581ff8aed1e619f72ab38898fc05833b7c66`  
Work item: [#116 — DATA-LIC-01](https://github.com/CedricxM/EMOPET/issues/116)  
Source briefing: [PR #112](https://github.com/CedricxM/EMOPET/pull/112)  
Related provenance gate: [#114 — IP-PROV-01](https://github.com/CedricxM/EMOPET/issues/114)

## 1. Purpose and authority boundary

This register records repository-observable facts, official-source checks and missing evidence for third-party data, regional directory content, mapping services, regional-source ingestion and software dependencies.

It deliberately separates:

1. a source publishing a licence or terms label;
2. an immutable receipt proving exactly what EMOPET retrieved;
3. the obligations created by EMOPET's actual use, transformation and distribution;
4. the authority to use that material in a product.

This register does not:

- provide legal advice or declare any item compliant;
- establish that a source label covers every file, field, image, review or associated code repository;
- authorize publication, production use or redistribution;
- remove, rewrite or reclassify current data automatically;
- change a provider, account, token, plan or billing owner;
- select a repository-wide public licence;
- replace qualified licensing, privacy, contract or product review.

Do not commit confidential contracts, account screenshots, tokens, personal contact records or restricted legal material here. Use non-sensitive control identifiers and custody pointers.

## 2. Evidence-state vocabulary

| State | Meaning |
|---|---|
| `SOURCE_CONFIRMED` | The official publisher/source and its displayed licence or terms label were checked. This does not authorize EMOPET's use. |
| `REPOSITORY_FACT` | The fact was directly observed at the snapshot boundary. |
| `RECEIPT_MISSING` | An immutable retrieval/version/checksum/attribution receipt has not been recorded. |
| `UNVERIFIED_CLAIM` | Repository text makes a claim that lacks a supporting item-level pointer. |
| `HOLD` | Do not use or represent the item in the stated product context until the gate is resolved. |
| `NOT_APPLICABLE` | A bounded, recorded rationale establishes that the requested control does not apply. |
| `OPEN` | Review or evidence remains incomplete. |

The words `CLEARED`, `COMPLIANT`, `LICENSED`, `APPROVED` and `RELEASED` must not be used as aggregate conclusions unless the exact scope, reviewer, evidence and date are recorded.

## 3. Gate summary

| Gate | Required outcome | Current state | Closing authority |
|---|---|---|---|
| DATA-LIC-G1 | Dataset identity and immutable retrieval receipts | `OPEN` | Data owner + Engineering + licensing review |
| DATA-LIC-G2 | VBO payload and derivative traceability | `OPEN` | Data owner + Engineering |
| DATA-LIC-G3 | Local-directory item-level provenance or explicit demo classification | `HOLD` | Product/Data owner + qualified review where relied upon |
| DATA-LIC-G4 | OSM/Overpass flow classification and rendered attribution evidence | `OPEN` | Engineering + Product + licensing review |
| DATA-LIC-G5 | Mapbox account, terms, billing, token and attribution authority | `OPEN` | Founder/authorized account owner + Engineering |
| DATA-LIC-G6 | Breiz item-level licence controls | `OPEN` | Data owner + connector owner |
| DATA-LIC-G7 | Exact-head dependency licence inventory and notices | `OPEN` | Engineering + licensing review |
| DATA-LIC-G8 | Controlled residual-gap and release disposition | `OPEN` | Founder/Product authority with qualified review |

`G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN`

## 4. Repository evidence checked

| Evidence ID | Scope | Pointer at snapshot | Narrow fact established | State | Review date |
|---|---|---|---|---|---|
| DATA-SRC-001 | Dataset registry | `data/registry/real-datasets.json`, blob `033982c43d517b41dec1d440be47db8718573520` | Four external datasets are registered; every `checksumSha256` is `null` | `REPOSITORY_FACT` | 2026-09-02 |
| DATA-SRC-002 | Receipt requirement | `docs/data/REAL_DATASET_INGESTION.md@c099581` | The guide requires controlled receipts under `data/registry/receipts/` | `REPOSITORY_FACT` | 2026-09-02 |
| DATA-SRC-003 | Receipt location | GitHub contents lookup at `c099581` | `data/registry/receipts/` is absent | `RECEIPT_MISSING` | 2026-09-02 |
| DATA-SRC-004 | VBO committed material | `data/vbo/@c099581` | Five VBO-related files are committed, including a 40,128,716-byte JSON payload | `REPOSITORY_FACT` | 2026-09-02 |
| DATA-SRC-005 | Regional directory | `backend/db/seeds/local-directory-lorient.ts`, blob `6781aa6a58ae136ed5ae24ffa2715bd28cd66a56` | The header gives aggregate source claims; all 41 rows have `sourceId: null` | `REPOSITORY_FACT` | 2026-09-02 |
| DATA-SRC-006 | Live OSM queries | `apps/web/lib/osm-spots.ts@c099581` | The app sends queries to the public `overpass-api.de` endpoint | `REPOSITORY_FACT` | 2026-09-02 |
| DATA-SRC-007 | Map rendering | `apps/web/components/bretagne-map/MapboxMap.tsx`, blob `6ff422b58b3f3dd150ebfb5bca4a93974ca3bd0e` | Mapbox attribution controls are enabled and an OSM text label is present in popup content | `REPOSITORY_FACT` | 2026-09-02 |
| DATA-SRC-008 | Mapbox dependency | `apps/web/package.json`, blob `b756236889653be70b3b01dff5200afe65261aff` | The web app declares `mapbox-gl@^3.24.0` | `REPOSITORY_FACT` | 2026-09-02 |
| DATA-SRC-009 | Account wording | `docs/STACK_GAPS.md`, blob `c46c21646ac133305b7316e23cc81bf8761a75ac` | Documentation says “token Cédric”; it does not prove current account authority | `UNVERIFIED_CLAIM` | 2026-09-02 |
| DATA-SRC-010 | Breiz catalogue | `apps/web/lib/data/breiz/sourceRegistry.ts`, blob `fc53eec3f4ad8f03f898cd5074f62d758e4da4fe` | Nine sources are catalogued; eight have `license: null`; two null-licence catalogue sources are enabled | `REPOSITORY_FACT` | 2026-09-02 |
| DATA-SRC-011 | Supply-chain workflow | `.github/workflows/security-supply-chain.yml`, blob `fefae2e0b05f6b22636f6f1005e25016c60f4fd7` | CI generates CycloneDX/SPDX SBOM artifacts but performs no explicit dependency-licence disposition | `REPOSITORY_FACT` | 2026-09-02 |

Repository review role for DATA-SRC-001 through DATA-SRC-011: `candidate evidence reviewer`. These rows establish only the narrow facts stated.

## 5. Official-source checks

Official pages were checked on 2026-09-02. A live page can change; closure requires a retained, dated receipt or controlled snapshot where permitted.

| Official ID | Source | Official pointer | Observation | State | Remaining boundary |
|---|---|---|---|---|---|
| DATA-OFFICIAL-001 | Mendeley dog movement V4 | https://data.mendeley.com/datasets/vxhx934tbn/4 | Page identifies version 4, DOI `10.17632/vxhx934tbn.4`, CC BY 4.0, and requests citation of the associated publication | `SOURCE_CONFIRMED` | Payload file identity, checksum, receipt and EMOPET transformation evidence missing |
| DATA-OFFICIAL-002 | Mendeley dog posture V1 | https://data.mendeley.com/datasets/mpph6bmn7g/1 | Page identifies version 1, DOI `10.17632/mpph6bmn7g.1`, CC BY 4.0, and requests citation of the associated publication | `SOURCE_CONFIRMED` | Payload file identity, checksum, receipt and EMOPET transformation evidence missing |
| DATA-OFFICIAL-003 | Vertebrate Breed Ontology | https://github.com/monarch-initiative/vertebrate-breed-ontology | Official Monarch Initiative repository declares CC-BY 4.0 | `SOURCE_CONFIRMED` | Exact release/commit and committed-payload equivalence missing |
| DATA-OFFICIAL-004 | ANMV/Anses dataset | https://www.data.gouv.fr/datasets/base-de-donnees-publique-des-medicaments-veterinaires-autorises-en-france-1 | Official catalogue identifies Anses as producer and displays “Creative Commons Attribution” | `SOURCE_CONFIRMED` | Exact resource, retrieval timestamp, legal-code/version receipt and checksum missing |
| DATA-OFFICIAL-005 | OpenStreetMap copyright/licence | https://www.openstreetmap.org/copyright | OSM data is published under ODbL; attribution and a clear licence pointer are required; database adaptation/distribution obligations depend on the use | `SOURCE_CONFIRMED` | EMOPET flows and derived outputs are not yet classified |
| DATA-OFFICIAL-006 | OSM attribution guidance | https://osmfoundation.org/wiki/Licence/Attribution_Guidelines | Guidance requires visible, legible attribution and accessible licence information appropriate to the medium | `SOURCE_CONFIRMED` | Rendered web/mobile evidence is absent |
| DATA-OFFICIAL-007 | Mapbox GL JS licence | https://github.com/mapbox/mapbox-gl-js/blob/main/LICENSE.txt | Current releases are governed by Mapbox terms for use with relevant Mapbox products and an active account; embedded v1.13-and-earlier material has a separate BSD notice | `SOURCE_CONFIRMED` | Exact installed package, product terms and intended-use review remain open |
| DATA-OFFICIAL-008 | Mapbox terms | https://www.mapbox.com/legal/tos | Terms govern account authority, API keys and usage-based charges | `SOURCE_CONFIRMED` | Account holder, accepted version, billing and token custody remain open |

Official-source reviewer role: `candidate source reviewer`. Source confirmation is not a product-use authorization.

## 6. External dataset register

| Item ID | Dataset and intended repository use | Version evidence | Licence evidence | Payload/checksum receipt | Attribution/citation | Owner role | Current state | Next action |
|---|---|---|---|---|---|---|---|---|
| DATASET-001 | Movement Sensor Dataset for Dog Behavior Classification; R&D and IMU feature validation | DOI/version fixed at V4 in registry and official page | CC-BY-4.0 source label confirmed | `RECEIPT_MISSING` | Registry text exists; implementation evidence absent | Data/Research owner | `OPEN` | Record every retrieved file, SHA-256, date, storage, transformation and required publication citation |
| DATASET-002 | Inertial sensor dataset for Dog Posture Recognition; R&D and preprocessing validation | DOI/version fixed at V1 in registry and official page | CC-BY-4.0 source label confirmed | `RECEIPT_MISSING` | Registry text exists; implementation evidence absent | Data/Research owner | `OPEN` | Record every retrieved file and keep associated-code licensing separate |
| DATASET-003 | Vertebrate Breed Ontology; canonical identifiers, synonyms and cross-references | Registry says `controlled-at-retrieval`, not an immutable release | CC-BY-4.0 source label confirmed | `RECEIPT_MISSING` despite committed payload | Generic attribution text exists; product/distribution evidence absent | Data owner | `OPEN` | Bind committed payload and all derivatives to exact upstream release/commit and SHA-256 |
| DATASET-004 | ANMV/Anses reference data; official identifiers and record normalization | Registry says `v2-current-at-retrieval`, not an immutable resource identity | Catalogue label confirmed; exact legal-code/version receipt open | `RECEIPT_MISSING` | Registry text exists; output evidence absent | Data/Product owner | `OPEN` | Resolve exact resource URL/version, licence URI, weekly retrieval receipt and field-level use |

For every future retrieval, the minimum receipt is:

| Receipt field | Requirement |
|---|---|
| Dataset ID | Stable EMOPET identifier |
| Upstream identity | Publisher, canonical page, DOI/release/commit and exact resource URL |
| Retrieval | UTC timestamp, method, tool/version and operator role |
| Integrity | Upstream filename, byte count and SHA-256 |
| Licence | SPDX-like identifier where exact, legal-code/terms URL and retained date |
| Attribution | Required wording, citation, link and placement |
| Use | EMOPET purpose, transformations, models/outputs affected and distribution classes |
| Custody | Controlled payload location and derived-file pointers |
| Reviewer | Role, date, narrow finding and unresolved limitations |

## 7. VBO committed-payload traceability

| File | Git blob at `c099581` | Size (bytes) | Current upstream receipt | Current state |
|---|---:|---:|---|---|
| `data/vbo/vbo.json` | `902e7457b8a31ff3256d253ad13592a7ce9e54fa` | 40,128,716 | None recorded | `RECEIPT_MISSING` |
| `data/vbo/breed_canonical.json` | `9bf42bad1f523bc71c7f8adf06cab21704290337` | 848,521 | Transformation receipt not recorded | `OPEN` |
| `data/vbo/breed_canonical_insert.sql` | `5c15e3af0170175ed8170611438ef5290728bec1` | 1,052,766 | Transformation receipt not recorded | `OPEN` |
| `data/vbo/dataset_version_insert.sql` | `a197f1590fd3efb3cdcbdfd17c0974971a729f42` | 255 | Generation/version receipt not recorded | `OPEN` |
| `data/vbo/fci_unmatched.json` | `8b443cc753cb69bd3978d025c82fb5f1a348fe14` | 1,422 | Transformation receipt not recorded | `OPEN` |

Git blob identifiers prove repository object identity only. They do not replace a SHA-256 receipt tied to the retrieved upstream payload.

DATA-LIC-G2 closure also requires the command/script version, parameters, input checksum, output checksums, operator date and expected attribution for every generated derivative.

## 8. Lorient directory evidence disposition

No business names, addresses, coordinates, telephone numbers or other row-level content are duplicated in this control document.

### Aggregate snapshot findings

| Field | Observed value |
|---|---:|
| Header claim | “45+ entries”; sources named as Ordre des Vétérinaires, OSM and Pages Jaunes |
| Actual entry count | 41 |
| `source = ordre_veterinaires` | 14 |
| `source = manual` | 20 |
| `source = osm` | 7 |
| `source = pages_jaunes` | 0 |
| `sourceId = null` | 41 |
| Non-null `ratingAvg` | 40 |
| `verified = true` | 25 |
| Obvious placeholder telephone patterns | 7 |

### Evidence finding

The header is an aggregate narrative, not item-level provenance. It does not establish:

- which source supplied each field;
- whether a row is real, synthetic, manually composed or combined;
- the origin and reuse basis of each rating/count;
- what `verified: true` means or who performed the verification;
- whether an address/contact/coordinate remains current;
- whether any row was derived from PagesJaunes.

The absence of a row-level `pages_jaunes` label does not prove that PagesJaunes data was or was not used.

### Current disposition

`REPRESENTATION AS A VERIFIED PUBLIC OR PRODUCTION DIRECTORY = HOLD`

The existing seed is not deleted by this register. Before production-facing use, each row must receive one of these dispositions:

| Disposition | Required evidence |
|---|---|
| `CONTROLLED_EXTERNAL_SOURCE` | Per-field or row-level source ID/URL, retrieval date, applicable terms/licence, allowed use and reviewer |
| `OWNER_SUPPLIED` | Controlled declaration, scope, date and publication authority |
| `SYNTHETIC_DEMO` | Explicit synthetic marker; no representation as a real verified provider; no unsupported rating or verification flag |
| `REMOVE_OR_REPLACE` | Recorded reason and authorized follow-up change |

Ratings, review counts and `verified` flags must be assessed separately from basic listing fields.

## 9. OpenStreetMap and Overpass control matrix

| Flow | Current repository behavior | Evidence gap | Current state | Required owner |
|---|---|---|---|---|
| Live POI lookup | Web code queries `https://overpass-api.de/api/interpreter` | Provider policy, expected volume, timeout/cache/fallback and production-service decision not recorded | `OPEN` | Engineering |
| OSM attribution | Code comments mention OSM contributors; map component enables Mapbox attribution control and adds popup text | Rendered, clickable, legible attribution and ODbL link not captured | `OPEN` | Product/Frontend |
| Local caching | Exact persistence duration and reuse flow not established here | Cache/database classification and expiry not recorded | `OPEN` | Engineering/Data |
| Export or API response | No controlled flow classification recorded | Attribution and database-rights treatment for redistributed results not recorded | `OPEN` | Engineering + licensing review |
| Derived directory | Regional directory includes seven rows labelled `osm` without source IDs | Upstream object IDs, field provenance, retrieval date and modification history absent | `HOLD` | Data owner |
| Future analytics/model use | No authority selected | Input/output/database classification not recorded | `OPEN` | Data/Research + licensing review |

DATA-LIC-G4 cannot close from a source-code string alone. It requires rendered evidence for each supported surface and a data-flow disposition for query, cache, export and derivative uses.

## 10. Mapbox service-authority register

| Control item | Repository fact | Required evidence | State |
|---|---|---|---|
| Package | `mapbox-gl@^3.24.0` is declared | Exact lockfile-resolved version and bundled licence/notice review | `OPEN` |
| Hosted product | Code uses `mapbox://styles/mapbox/outdoors-v12` | Intended product/use, plan and terms/product-terms snapshot | `OPEN` |
| Account authority | `docs/STACK_GAPS.md` says “token Cédric” | Legal account holder, organization, authorized signer/admin and account custody | `UNVERIFIED_CLAIM` |
| Billing | Not established in this register | Plan, billing owner, limits, monitoring and budget authority | `OPEN` |
| Token | `NEXT_PUBLIC_MAPBOX_TOKEN` is used; no value is recorded here | Scope, URL restrictions, owner, rotation date and incident/revocation owner | `OPEN` |
| Attribution | `attributionControl: true` is present | Rendered attribution, links, overlays and supported viewport evidence | `OPEN` |
| Data handling | Current terms describe service data handling | Applicable privacy/data-processing review for the actual integration | `OPEN` |
| Exit/change plan | Not established | Provider change/export/cache implications and responsible owner | `OPEN` |

No account or token value may be added to this register.

## 11. Breiz source-control register

The registry comment correctly states that inclusion does not authorize copying. That structural warning is preserved, but it is not an evidence receipt.

| Source ID | Enabled | Repository licence field | Access mode | Current state | Required next control |
|---|---:|---|---|---|---|
| `bcd-becedia` | No | `null` | manual review | `OPEN` | Item-level rights/permission and attribution |
| `bretania` | No | `null` | OAI-PMH | `OPEN` | Record-level rights statement and institution provenance |
| `region-bretagne-open-data` | Yes | `null` | API | `OPEN` | Dataset ID, returned licence, update/retrieval dates and checksum where available |
| `geobretagne` | No | `null` | OGC | `OPEN` | Layer-level publisher/licence and service terms |
| `patrimoine-bzh` | No | `null` | metadata | `OPEN` | Item-level metadata/media rights |
| `pop-culture` | No | `null` | metadata | `OPEN` | Field/text/media rights split and attribution |
| `data-gouv-fr` | Yes | `null` | API | `OPEN` | Dataset/resource-specific licence and immutable receipt |
| `sirene` | No | Conditional Open Licence wording | API | `OPEN` | Exact current source, field scope, legal text and privacy/publication disposition |
| `datatourisme` | No | `null` | API | `OPEN` | Provider- and record-level licence/attribution |

For enabled sources, a connector must fail closed for storage/publication when item-level evidence is missing. Catalogue metadata alone must not be promoted to a full-text or media reuse authority.

Minimum per-item provenance fields:

- source registry ID;
- publisher and canonical item/dataset URL;
- source item ID and immutable version where available;
- retrieval and source-update timestamps;
- licence/rights statement plus URI;
- allowed storage, transformation, display and redistribution classes;
- attribution text and placement;
- checksum for retrieved payload where practical;
- expiry/recheck date;
- connector/version and reviewer.

## 12. Software dependency licence control

The existing workflow provides useful SBOM artifacts and security-advisory evidence. It does not record a licensing disposition by itself.

DATA-LIC-G7 requires an exact candidate-head inventory that includes direct and transitive dependencies for all workspaces and shipped artifacts.

| Control | Required evidence | Current state |
|---|---|---|
| Exact dependency graph | Lockfile/candidate-head identity and package/version list | `OPEN` |
| Declared licence data | Machine-readable package licence expressions plus source pointers | `OPEN` |
| Unknown/custom entries | Manual package-source and licence-file review | `OPEN` |
| Copyleft/reciprocal entries | Use/link/distribution analysis and required action | `OPEN` |
| Notice obligations | Generated NOTICE/attribution bundle tied to shipped artifact | `OPEN` |
| Source-offer obligations | Applicable decision and controlled delivery process | `OPEN` |
| Fonts/assets/native binaries | Separate inventory beyond JavaScript package metadata | `OPEN` |
| Firmware/toolchain SDKs | Inventory when the complete firmware build exists | `OPEN` |
| Reviewer/disposition | Dated owner, limitations and `GO | HOLD | REMEDIATE` result | `OPEN` |

Do not infer absence of a licence family from package names or from a lockfile that does not carry authoritative licence text.

## 13. Gate closure evidence

### DATA-LIC-G1 — Dataset identity and retrieval receipts

Close only when all four dataset rows have exact resource/version identity, SHA-256, retrieval receipt, licence/legal-code pointer, attribution/citation and actual-use review.

### DATA-LIC-G2 — VBO payload and derivative traceability

Close only when the committed payload and every derivative are reproducibly bound to an exact upstream release/commit and input/output checksums.

### DATA-LIC-G3 — Local-directory row provenance

Close only when all 41 rows are supported by item-level evidence or explicitly classified as synthetic/demo, and ratings, review counts, contact fields, coordinates and `verified` flags have separate dispositions.

### DATA-LIC-G4 — OSM/Overpass use classification

Close only after every query/cache/export/derivative flow is classified, the service architecture is approved, and attribution/licence links are verified in rendered surfaces.

### DATA-LIC-G5 — Mapbox service authority

Close only after account/signing authority, accepted terms/product terms, billing, intended volume, token custody/restrictions, attribution and applicable data-handling review are recorded.

### DATA-LIC-G6 — Breiz item-level source controls

Close only when enabled connectors retain item-level rights evidence and fail closed when required evidence is absent or expired.

### DATA-LIC-G7 — Dependency licence inventory

Close only when exact-head direct/transitive packages and shipped assets have a reviewed inventory, required notices are generated, and unknown/custom/reciprocal entries have dispositions.

### DATA-LIC-G8 — Controlled review and release disposition

Close only after Product/Engineering confirms actual flows, qualified review covers relied-upon obligations, residual gaps stay visible, and the named authority selects a dated disposition.

## 14. Closure record template

Do not complete this section until DATA-LIC-G1 through G8 have evidence-backed dispositions.

- Review date: `OPEN`
- Candidate head reviewed: `OPEN`
- Data owner review: `OPEN`
- Engineering/runtime-flow review: `OPEN`
- Product attribution review: `OPEN`
- Account/billing authority review: `OPEN`
- Qualified licensing/legal review: `OPEN`
- Privacy/data-handling review where applicable: `OPEN`
- Residual gaps: `OPEN`
- Disposition: `GO | HOLD | REMEDIATE — NOT SELECTED`
- Authorized product/distribution classes: `NONE SELECTED`
- Next mandatory review: `OPEN`

## 15. Current disposition

`OFFICIAL SOURCE LABELS = PARTIALLY CONFIRMED`  
`IMMUTABLE RETRIEVAL RECEIPTS = NOT ESTABLISHED`  
`LORIENT DIRECTORY PRODUCTION REPRESENTATION = HOLD`  
`OSM/OVERPASS PRODUCT-USE DISPOSITION = OPEN`  
`MAPBOX PRODUCTION AUTHORITY = OPEN`  
`BREIZ ITEM-LEVEL RIGHTS ENFORCEMENT = OPEN`  
`DEPENDENCY LICENCE DISPOSITION = OPEN`  
`PRODUCT OR RELEASE AUTHORITY = NOT GRANTED`  
`G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN`

This register permits controlled evidence collection. It does not convert an official licence label, repository metadata or a public endpoint into automatic product authority.
