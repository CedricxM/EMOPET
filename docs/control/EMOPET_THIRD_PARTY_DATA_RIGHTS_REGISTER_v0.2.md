# EMOPET — Third-Party Data & Service Rights Register v0.2

**Status:** CONTROLLED / NON-CONCLUSIVE / HOLD-AWARE  
**Date:** 2026-09-13  
**Parent gate:** #116 (`G-THIRD-PARTY-DATA-RIGHTS-01`)  
**Historical snapshot preserved:** `main@c099581ff8aed1e619f72ab38898fc05833b7c66`  
**Reconciliation baseline:** `experience-hardening-2026-09-06@5c61e0dabd15a4bab77de788c9e29c9c2d674feb`  
**Supersedes for current-state facts:** `EMOPET_THIRD_PARTY_DATA_RIGHTS_REGISTER_v0.1.md`  
**Authority:** NOT LEGAL SIGN-OFF / NOT RELEASE AUTHORITY

## 0. Purpose and evidence language

This register is the current operational ledger for #116. It records engineering evidence, missing receipts, runtime containment and remaining human/service/legal review without converting public availability or metadata into product-use authority.

A public URL, repository licence label, dataset catalogue flag, environment variable, source `enabled: true`, package licence string, or successful CI run is **not** product-use authorization.

Controlled evidence states remain:

- `SOURCE_CONFIRMED`
- `REPOSITORY_FACT`
- `RECEIPT_MISSING`
- `UNVERIFIED_CLAIM`
- `HOLD`
- `OPEN`

Final reviewed disposition remains limited to `GO | HOLD | REMEDIATE`.

`G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN`

## 1. Gate summary

| Gate | Scope | Current state | Engineering containment / evidence | Remaining closure work |
|---|---|---|---|---|
| DATA-LIC-G1 | Dataset identity + retrieval receipts | OPEN | receipt schema and receipt-first landing workflow present | controlled immutable landing receipts + SHA-256 for all external payloads |
| DATA-LIC-G2 | VBO upstream/derivative traceability | IMMUTABLE_UPSTREAM_MATCH_PROVEN / RECEIPT_OPEN | exact upstream Git commit and byte-identical Git blob proven; committed SHA-256 and derivatives audited | historical controlled retrieval receipt, release/product-use review |
| DATA-LIC-G3 | Local-directory row provenance | HOLD / RUNTIME_ENFORCED | production fails closed; explicit demo path sanitizes unsupported claims | row-level provenance/rights or reviewed synthetic/demo disposition |
| DATA-LIC-G4 | OSM/Overpass flow + attribution | OPEN / RUNTIME_CONTAINED | explicit gate, source pointers, persistent rendered attribution, bounded expiring memory cache | ODbL flow classification + approved provider/service policy + any export/persistent-cache review |
| DATA-LIC-G5 | Mapbox account/terms/token authority | OPEN / RUNTIME_GATED | token and explicit rights gate both required; attribution control retained | account, billing, terms, token custody, privacy and rendered evidence review |
| DATA-LIC-G6 | Breiz item/source controls | OPEN / FAIL_CLOSED | raw ingestion cannot self-authorize; mocks cannot publish; public retrieval requires registry rightsEvidence + GO; registry id survives vector metadata | actual source/item receipts and reviewed GO dispositions |
| DATA-LIC-G7 | Dependency licence inventory | EVIDENCE_INVENTORY_AVAILABLE / REVIEW_OPEN | exact-head inventory/SBOM/security evidence generated in CI | licence-text, notice, distribution-path and reviewer disposition |
| DATA-LIC-G8 | Controlled review + release disposition | OPEN | residual gaps remain explicit | named authority + qualified review + dated GO/HOLD/REMEDIATE |

No partial engineering proof above changes the aggregate gate to `GO`.

## 2. DATA-LIC-G1 — external dataset receipt state

### Dog movement — `10.17632/vxhx934tbn.4`

- exact registered dataset version: V4;
- repository licence label: `CC-BY-4.0`;
- source-confirmation state from #116: `SOURCE_CONFIRMED`;
- raw research payload is intentionally expected outside Git under the controlled external-data workflow;
- `receiptPath = null`;
- receipt-only `checksumSha256 = null`;
- current state: `RECEIPT_MISSING`.

No checksum may be inferred from metadata or a transformed/sample file. Closure requires controlled landing of the exact V4 payload and immediate receipt generation.

### Dog posture — `10.17632/mpph6bmn7g.1`

- exact registered dataset version: V1;
- repository licence label: `CC-BY-4.0`;
- source-confirmation state from #116: `SOURCE_CONFIRMED`;
- raw research payload is intentionally expected outside Git;
- `receiptPath = null`;
- receipt-only `checksumSha256 = null`;
- current state: `RECEIPT_MISSING`.

Associated code is a separate licence boundary and must not be copied merely because the dataset itself carries a reuse label.

### ANMV / Anses veterinary medicines

- official source family: data.gouv.fr / ANMV / Anses;
- repository licence label: `CC-BY`;
- source-confirmation state from #116: `SOURCE_CONFIRMED`;
- the upstream dataset is refreshed over time and the registered resource is not treated as immutable evidence;
- current state: `RECEIPT_MISSING_VERSION_NOT_IMMUTABLE`;
- checksum remains open until a specific controlled payload is selected and landed.

Reference data must not become treatment recommendation, prescription, diagnosis or treatment-change authority.

## 3. DATA-LIC-G2 — VBO corrected current state

The v0.1 statement that upstream byte-equivalence had not been proven is now superseded.

Current machine-readable evidence: `data/vbo/committed-snapshot-evidence.json`.

Verified repository facts:

- committed payload: `data/vbo/vbo.json`;
- payload bytes: `40,128,716`;
- payload SHA-256: `09da44412ed43ee271e407a83401275ada85483e2199273203c8404b84c093de`;
- repository version tag: `09da44412ed4`;
- derived canonical rows: `1,575`;
- immutable upstream repository commit: `323e8a3dbdb13696b41408f0f2f70454ba37b6f6`;
- upstream commit timestamp: `2026-03-26T14:43:34Z`;
- upstream GitHub commit signature state recorded by evidence: verified;
- committed EMOPET `vbo.json` Git blob: `902e7457b8a31ff3256d253ad13592a7ce9e54fa`;
- upstream `vbo.json` Git blob at that immutable commit: `902e7457b8a31ff3256d253ad13592a7ce9e54fa`;
- immutable-commit byte-equivalence state: `PROVEN_GIT_BLOB_MATCH`.

This proves the committed EMOPET VBO payload is byte-identical to `vbo.json` at that immutable upstream Git commit.

It does **not** prove or claim:

- that the matched commit is a formal upstream release;
- that the original historical download/retrieval event was independently retained;
- legal/product-use clearance;
- redistribution authority beyond a reviewed disposition.

Therefore the evidence intentionally retains:

- `claimsUpstreamReleaseEquivalence = false`;
- `claimsProductUseClearance = false`;
- `upstreamImmutableRelease = null`;
- `upstreamRetrievalReceiptStatus = RECEIPT_MISSING`.

`data/registry/real-datasets.json` keeps receipt-only `checksumSha256 = null` and stores the reconstructed committed-payload hash separately as `provenancePayloadSha256`. This prevents reconstructed provenance from masquerading as a historical controlled retrieval receipt.

`DATA-LIC-G2 = IMMUTABLE UPSTREAM COMMIT MATCH PROVEN / HISTORICAL RECEIPT OPEN / PRODUCT-USE REVIEW OPEN`.

## 4. Receipt and reconstructed-provenance boundary

`data/registry/receipts/README.md` and `docs/data/REAL_DATASET_INGESTION.md` define the controlled sequence:

1. resolve an exact immutable/versioned source;
2. land the exact payload in controlled storage;
3. register it before transformation;
4. compute/verify byte size and SHA-256;
5. retain receipt and registry evidence;
6. perform ingestion/normalisation;
7. keep rights disposition on HOLD until reviewed.

Historical timestamps must not be invented or backfilled from derivative metadata merely to make a receipt appear complete.

## 5. DATA-LIC-G3 — Lorient local directory

The historical seed remains non-authoritative because row-level source pointers, ratings, verification flags and some contact data were not adequately evidenced at the preserved snapshot.

Current runtime containment:

- default runtime state is `HOLD` and directory publication fails closed;
- `EMOPET_LOCAL_DIRECTORY_RELEASE_GATE=GO` is an operator switch only, not evidence by itself;
- explicit non-production demo mode returns `UNVERIFIED_DEMO`;
- demo seeding passes only through `getSanitizedDemoLocalDirectorySeed()`;
- demo output strips unsupported ratings, verification state and source authority;
- the master seed does not directly import the uncontrolled Lorient seed.

`DATA-LIC-G3 = HOLD / RUNTIME_ENFORCEMENT_PRESENT / ROW-LEVEL EVIDENCE OPEN`.

## 6. DATA-LIC-G4 — OpenStreetMap / Overpass

Runtime flow:

`Mapbox viewport -> gated public Overpass query -> bounded ephemeral bbox cache -> OSM POI markers`.

Current engineering containment:

- public Overpass use requires `NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE=GO`;
- every returned OSM POI carries source-element URL, attribution text and licence URL;
- marker popups retain item/source pointers;
- the map now renders persistent `© OpenStreetMap contributors` attribution whenever OSM POIs are displayed;
- the OSM/Overpass cache is process/browser memory only;
- cache TTL is five minutes;
- maximum cache size is 40 bbox entries with eviction;
- no persistent OSM database/export path is introduced by this module;
- the rights audit enforces these runtime markers.

Still OPEN:

- formal classification of live query, transient cache, any future persistent cache/export and derived-database flows;
- exact service/provider-use review for the selected Overpass architecture;
- rendered-product evidence across final supported clients.

`DATA-LIC-G4 = OPEN / RUNTIME_CONTAINMENT_PRESENT`.

## 7. DATA-LIC-G5 — Mapbox

Mapbox remains separately controlled from OSM data rights.

Current implementation requires both:

- non-empty `NEXT_PUBLIC_MAPBOX_TOKEN`;
- exact `NEXT_PUBLIC_EMOPET_MAPBOX_RIGHTS_GATE=GO`.

Mapbox attribution control remains enabled. The environment gate is operational containment only.

Still required:

- legal account holder;
- billing owner;
- accepted terms/product terms and date;
- intended plan/volume;
- token custody, scope and rotation;
- rendered attribution evidence;
- applicable privacy/data-processing review.

`DATA-LIC-G5 = OPEN / RUNTIME_GATED`.

## 8. DATA-LIC-G6 — Breiz regional-source authority

The source catalogue and publication authority are now separated at multiple boundaries.

### Central registry authority

`apps/web/lib/data/breiz/sourceRegistry.ts` remains the controlled catalogue. `enabled === true` does not authorize publication.

`isBreizSourceReleaseReady()` requires, at minimum:

- source enabled;
- rights evidence present;
- `evidenceState = SOURCE_CONFIRMED`;
- `disposition = GO`;
- non-empty immutable version;
- receipt pointer;
- attribution text;
- permitted-use summary;
- reviewer role;
- valid non-future review timestamp;
- valid non-expired recheck timestamp when configured.

### Raw/local ingestion containment

`ingestBreizDocuments()` cannot accept public authority directly from JSON/CSV/Markdown input:

- `public_answer_with_source` cannot self-promote through ingestion;
- imported content defaults/fails closed to `retrieval_only` unless a more restrictive mode applies;
- `source_verified` cannot self-promote through ingestion;
- imported content defaults/fails closed to `unknown` unless the supported pending-community state applies;
- an input-provided source-registry id is not promoted into controlled authority by generic ingestion.

### Retrieval containment

A chunk can enter a public sourced answer only when all are true:

- `allowed_usage = public_answer_with_source`;
- `reliability_level = source_verified`;
- `source_registry_id` is present;
- the registry source exists;
- `isBreizSourceReleaseReady(source)` passes at retrieval time.

Therefore an enabled catalogue source without complete reviewed rights evidence correctly produces abstention.

### Mock-corpus containment

Development mocks are not public-answer authority. The default mock corpus is `retrieval_only`/internal and cannot produce a public sourced answer.

### Vector-store authority preservation

`source_registry_id` is retained through chunk metadata and `exportChunksForVectorStore()`. Unbound mock content exports an explicit null registry binding rather than inventing authority.

The rights audit now guards the ingestion, retrieval, mock and vector-export invariants above.

Still OPEN:

- actual source/item immutable receipts;
- required attribution/terms evidence;
- permitted transformation/use review;
- reviewer identity/role and recheck schedule;
- item/source `GO` dispositions.

`DATA-LIC-G6 = OPEN / FAIL-CLOSED ENGINEERING BOUNDARY PRESENT`.

## 9. DATA-LIC-G7 — dependency licences

Security CI continues to produce machine-readable exact-head dependency licence evidence and CycloneDX/SPDX SBOMs. These are evidence inventories, not licence clearance.

Review remains OPEN for ambiguous, non-permissive, dual-labelled and notice/source-obligation cases, including actual release/distribution paths and platform-specific binaries. Mapbox service/account authority remains separately controlled by G5.

`DATA-LIC-G7 = EVIDENCE_INVENTORY_AVAILABLE / REVIEW_OPEN`.

## 10. Engineering verification state at reconciliation baseline

Before this v0.2 register commit, head `5c61e0dabd15a4bab77de788c9e29c9c2d674feb` had already reported successful exact-head execution for:

- third-party data rights gate, including the new G4/G6 regression markers;
- dependency audit;
- dependency licence evidence inventory;
- Semgrep;
- secret scan;
- CycloneDX/SPDX SBOM generation;
- release provenance gate.

At the time this register was authored, other exact-head jobs were still completing. No unfinished job is represented here as PASS.

The immediately preceding checkpoint `a60d87f98ee4def41ef66e5f01fd3adad0619dba` had additionally passed workspace typecheck and workspace tests, plus P0 DB upgrade rehearsal, DB authority parity and DB baseline validation.

CI success is engineering evidence only. It does not close legal, scientific, contractual, account-authority or human-review gates.

## 11. Receipt schema

Controlled receipts should preserve at minimum:

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

## 12. Current release statement

As of 2026-09-13:

- both Mendeley research datasets still lack controlled landing receipts/checksums in the registry;
- ANMV still lacks an immutable controlled payload receipt/checksum;
- VBO is byte-bound to an immutable upstream Git commit, but its historical controlled retrieval receipt and product-use review remain open;
- the Lorient directory remains HOLD despite runtime containment;
- OSM/Overpass has stronger rendered attribution and transient-cache containment, but flow/provider review remains open;
- Mapbox account/terms/billing/token/privacy evidence remains open;
- Breiz now fails closed across ingestion, mocks, retrieval and vector metadata, but no source gains release authority without actual reviewed rights evidence + GO;
- dependency evidence exists, but licence/notice/distribution review remains open;
- final controlled review/disposition remains open.

Therefore:

`G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN`

This register narrows accidental use, preserves current engineering evidence and makes residual gaps explicit. It is not legal sign-off and does not authorize release.