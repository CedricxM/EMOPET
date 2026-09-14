# EMOPET — Third-Party Data & Service Rights Register v0.1

**Status:** CONTROLLED / NON-CONCLUSIVE / HOLD-AWARE  
**Initial date:** 2026-09-06  
**Last reconciled:** 2026-09-13  
**Parent gate:** #116 (`G-THIRD-PARTY-DATA-RIGHTS-01`)  
**Snapshot preserved:** `main@c099581ff8aed1e619f72ab38898fc05833b7c66`  
**Current composed candidate:** `experience-hardening-2026-09-06@9b1bf1c1c58d1274ab5d4ee13fecdac6c92e493c`  
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

A public URL, a repository licence label, an environment variable, or an `enabled: true` flag is **not** product-use authorization.

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
| DATA-LIC-G2 | VBO upstream/derivative traceability | COMMITTED_SNAPSHOT_TRACEABILITY_PROVEN / UPSTREAM_RECEIPT_OPEN | Data/Science | bind the committed snapshot to an exact immutable upstream release and independent retrieval receipt |
| DATA-LIC-G3 | Local-directory row provenance | HOLD / RUNTIME_ENFORCED | Product/Data | keep production representation disabled until row-level evidence or explicit reviewed classification exists |
| DATA-LIC-G4 | OSM/Overpass flow + attribution | OPEN | Product/Engineering | classify query/cache/export flows and review provider/service use |
| DATA-LIC-G5 | Mapbox account/terms/token authority | OPEN | Founder/Product/Engineering | record account, billing, terms snapshot, token custody and rendered attribution evidence |
| DATA-LIC-G6 | Breiz item-level source controls | OPEN | Product/Data | require item-level rights evidence and fail closed when absent |
| DATA-LIC-G7 | Dependency licence inventory | EVIDENCE_INVENTORY_AVAILABLE / REVIEW_OPEN | Engineering + qualified reviewer | review ambiguous/non-permissive/dual-labelled entries, notice obligations and exact distribution paths |
| DATA-LIC-G8 | Controlled review + release disposition | OPEN | Founder + qualified reviewer | dated GO/HOLD/REMEDIATE with residual gaps visible |

`G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN`

No partial engineering proof above changes the aggregate gate to `GO`.

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

- Source family: Vertebrate Breed Ontology (VBO)
- Source pointer recorded by the committed snapshot evidence: `http://purl.obolibrary.org/obo/vbo.json`
- Repository licence label: `CC-BY-4.0`
- Official-source state from #116: `SOURCE_CONFIRMED`
- Committed payload: `data/vbo/vbo.json`
- Committed payload size: `40,128,716` bytes
- Committed payload SHA-256: `09da44412ed43ee271e407a83401275ada85483e2199273203c8404b84c093de`
- Repository version tag: `09da44412ed4`
- Canonical derivative: `data/vbo/breed_canonical.json`
- Derived record count: `1,575`
- Dataset-version SQL: `data/vbo/dataset_version_insert.sql`
- Transform source: `scripts/ingest_vbo.ts`
- Machine-readable evidence: `data/vbo/committed-snapshot-evidence.json`
- Upstream immutable release: still `null`
- Independent upstream retrieval receipt: `RECEIPT_MISSING`

Commit `9b1bf1c1c58d1274ab5d4ee13fecdac6c92e493c` adds a fail-closed audit that recomputes the committed payload SHA-256 and reconciles it with the evidence file, dataset-version SQL, canonical derivative count/provenance and transform markers. The evidence explicitly keeps `claimsUpstreamReleaseEquivalence=false` and `claimsProductUseClearance=false`.

**Controlled classification:**

`DATA-LIC-G2 COMMITTED SNAPSHOT TRACEABILITY = PROVEN CANDIDATE`  
`DATA-LIC-G2 UPSTREAM IMMUTABLE RECEIPT = OPEN`

This proves internal repository consistency for the committed snapshot. It does not prove byte-equivalence to a particular upstream immutable release and does not authorize product use or redistribution.

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

The current composed Hono implementation in `backend/api/routes/directory.ts` enforces three explicit runtime modes:

1. default: `HOLD`, returning a typed 503 before directory rows are served;
2. explicit non-production demo: `EMOPET_LOCAL_DIRECTORY_DEMO=1`, with unsupported rating/verification claims sanitized and output marked `UNVERIFIED_DEMO`;
3. reviewed release switch: `EMOPET_LOCAL_DIRECTORY_RELEASE_GATE=GO`, which is an operator gate and must not be interpreted as proof that the underlying rights/provenance review occurred.

Current implementation requirements remain:

1. raw legacy seed must not be treated as a verified normal runtime source by default;
2. explicit demo output must suppress unsupported `verified` and rating claims;
3. production representation must remain on HOLD until the evidence review authorizes the release switch;
4. demo access must remain explicit and visibly marked `UNVERIFIED_DEMO`;
5. future production rows require item-level source pointer + evidence state.

`DATA-LIC-G3 = HOLD / RUNTIME_ENFORCEMENT_PRESENT / ROW-LEVEL EVIDENCE OPEN`.

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

Security/SBOM output remains supporting evidence only, but an exact-head dependency-licence inventory is produced and preserved by the Security workflow.

### Historical evidence checkpoint — 2026-09-10

- `docs/control/EMOPET_DEPENDENCY_LICENSE_EVIDENCE_REVIEW_2026-09-10.md`;
- reviewed dependency head: `fea9f754669a9f44781b57a6012faf277349ce61`;
- Security workflow run: `34450694886`;
- artifact id: `10141416548`;
- artifact digest: `sha256:21d2fde2edfc54d93378c9353796b5cd5f84a6f452539e1aa98441032356f71d`;
- embedded inventory SHA-256: `95733d8fa3403017e7eda46916df6b2da85b4cf7e9428f4104b751866bed8fc8`;
- inventory size: 1,072 package records across 18 reported licence labels;
- metadata classification: `EVIDENCE_INVENTORY_NOT_LEGAL_CLEARANCE`.

No `UNKNOWN` label was reported by pnpm in that checkpoint. This narrows discovery but does not prove licence accuracy, compatibility, notice completeness or product-use authority.

### Exact-head revalidation — 2026-09-13

On composed head `9b1bf1c1c58d1274ab5d4ee13fecdac6c92e493c`:

- Security supply-chain run `34756777134` / run #739: `PASS`;
- job `Dependency licence evidence inventory (not clearance)`: `PASS`;
- exact-head artifact: `dependency-license-inventory-9b1bf1c1c58d1274ab5d4ee13fecdac6c92e493c`;
- artifact id: `10317921425`;
- artifact digest: `sha256:f327cb9a3eab494485fe6493ff208b0f78a7ad0283e2d9e108f23ab425512dc6`;
- rights/product/privacy authority job, including `Enforce third-party data rights gate`: `PASS`.

The revalidation proves that the evidence-generation and current rights-gate machinery still execute successfully on the composed candidate. It is not a new licence disposition.

Focused review queue remains:

- `@img/sharp-libvips-linux-x64@1.3.3` (`LGPL-3.0-or-later`);
- MPL-labelled `axe-core` and `lightningcss` packages;
- dual-labelled `node-forge@1.4.0` (`BSD-3-Clause OR GPL-2.0`);
- CC-BY-labelled `caniuse-lite`;
- ambiguous `BSD` metadata including `mapbox-gl@3.24.0`;
- non-normalized/less-common identifiers requiring upstream verification and notice review.

Mapbox remains separately controlled by DATA-LIC-G5; the package metadata label does not establish service/contract authority.

Still required before G7 closure:

- upstream licence-text verification for ambiguous/non-permissive/dual-labelled entries;
- actual release/distribution-path classification, including platform-specific binaries;
- applicable attribution/notice/source-offer retention;
- transitive-package review where obligations require it;
- named reviewer + dated disposition on the exact release-candidate graph;
- rerun on any release dependency/lock change.

State: `EVIDENCE_INVENTORY_AVAILABLE / REVIEW_OPEN`.

## 8. Exact-head engineering evidence — 2026-09-13

The VBO traceability candidate and the existing rights/licence controls are green together on head `9b1bf1c1c58d1274ab5d4ee13fecdac6c92e493c`:

- P0 DB baseline validation run `34756777122` / #359: PASS;
- P0 DB upgrade rehearsal run `34756777133` / #21: PASS;
- P0 DB authority parity run `34756777138` / #12: PASS;
- Security supply chain run `34756777134` / #739: PASS.

Within Security #739, dependency audit, workspace typecheck/tests, web build, Semgrep, Gitleaks, CodeQL evidence, rights/privacy/product gates, dependency-licence evidence, SBOM and release provenance all passed.

This is candidate engineering evidence only. It does not close DATA-LIC-G1 through G8, legal review, service-account authority, human review or release authority.

## 9. Evidence schema for future receipts

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

## 10. Current release statement

As of 2026-09-13:

- the two Mendeley datasets and ANMV resource still lack completed immutable retrieval receipts/checksums in the controlled registry;
- the committed VBO payload now has machine-checked internal snapshot/derivative traceability, but the exact immutable upstream release and independent retrieval receipt remain OPEN;
- the Lorient seed remains `HOLD`; the runtime boundary is enforced, but row-level provenance and rights review are not complete;
- OSM/Overpass runtime/service classification is not fully reviewed;
- Mapbox account/terms/token authority is not evidenced in-repo;
- Breiz source catalogue inclusion is not release authorization;
- exact-head dependency licence evidence is generated successfully, but licence/notice/distribution review remains open.

Therefore:

`G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN`

This document narrows accidental use, preserves engineering evidence and records partial gate progress. It does not close #116.