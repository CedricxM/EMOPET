# EMOPET — P0 Third-Party Data and Service-Rights Evidence Register

Status: `P0 CONTROLLED EVIDENCE INTAKE / OPEN / NOT LEGAL SIGN-OFF / NOT RELEASE AUTHORITY`
Control date: `2026-09-22`
Snapshot boundary: `main@3fa5c5298247fc88412ce2c8294fdb4f36024f56`
Work item: [#116 — DATA-LIC-01](https://github.com/CedricxM/EMOPET/issues/116)
Related provenance register: `docs/control/P0_IP_PROVENANCE_EVIDENCE_REGISTER.md` ([#114](https://github.com/CedricxM/EMOPET/issues/114))
Pointer self-check: `pnpm control:pointer-audit`

## 0. Reconstruction provenance and pointer re-verification

This register was first drafted in [PR #117](https://github.com/CedricxM/EMOPET/pull/117) on 2026-09-02, anchored to
`main@c099581ff8aed1e619f72ab38898fc05833b7c66`. That PR never merged. The draft stayed
in an unmerged branch while `main` advanced, so #116 held a gate whose evidence base lived
nowhere in the tree.

Nothing from that draft was carried forward on trust. Every pointer and every count was
re-observed against the snapshot boundary above before it was written here.

### 0.1 Blob-pointer re-verification

The 2026-09-02 draft declared twelve 40-character Git blob identifiers. Re-verification
produced two distinct outcomes, and the difference matters more than the drift.

| # | Path | Blob claimed in PR #117 | Actual blob at `c099581` (the draft's own anchor) | Verdict |
|---|---|---|---|---|
| 1 | `data/registry/real-datasets.json` | `033982c43d51…3520` | `033982c43d51…3520` | `VERIFIED_POINTER` |
| 2 | `backend/db/seeds/local-directory-lorient.ts` | `6781aa6a58ae…6a56` | `6781aa6a58ae…6a56` | `VERIFIED_POINTER` |
| 3 | `apps/web/lib/data/breiz/sourceRegistry.ts` | `fc53eec3f4ad…da4fe` | `fc53eec3f4ad…da4fe` | `VERIFIED_POINTER` |
| 4 | `.github/workflows/security-supply-chain.yml` | `fefae2e0b05f…4fd7` | `fefae2e0b05f…4fd7` | `VERIFIED_POINTER` |
| 5 | `data/vbo/vbo.json` | `902e7457b8a3…54fa` | `902e7457b8a3…54fa` | `VERIFIED_POINTER` |
| 6 | `apps/web/components/bretagne-map/MapboxMap.tsx` | `6ff422b58b3f…3bd0e` | `6ff4220b7456…5c9eb` | `UNRESOLVABLE_POINTER` |
| 7 | `apps/web/package.json` | `b75623688965…61aff` | `b756e28b1822…607a30` | `UNRESOLVABLE_POINTER` |
| 8 | `docs/STACK_GAPS.md` | `c46c21646ac1…a75ac` | `c46ccd2d4d04…3dfc9` | `UNRESOLVABLE_POINTER` |
| 9 | `data/vbo/breed_canonical.json` | `9bf42bad1f52…90337` | `9bf42bad634c…91db4` | `UNRESOLVABLE_POINTER` |
| 10 | `data/vbo/breed_canonical_insert.sql` | `5c15e3af0170…8bec1` | `5c15e3a27b7f…b6847` | `UNRESOLVABLE_POINTER` |
| 11 | `data/vbo/dataset_version_insert.sql` | `a197f1590fd3…729f42` | `a19791b1f2e9…22763` | `UNRESOLVABLE_POINTER` |
| 12 | `data/vbo/fci_unmatched.json` | `8b443cc753cb…8fe14` | `8b443825fbe6…fd682` | `UNRESOLVABLE_POINTER` |

Seven of the twelve claimed identifiers resolve to **no Git object anywhere in this
repository's history** (2,370 commits, full non-shallow clone, `git cat-file -t` on each).
They are not superseded revisions of those files: a different revision would not share a
leading prefix with the blob that actually sat at that same path at that same commit. Each
unresolvable identifier shares its first four to eight hex characters with the real blob and
then diverges.

The consistent reading is that a correctly observed *abbreviated* hash was expanded into a
full 40-character string that was never read back. The observation behind each row was
real; the identifier recording it was not.

Consequences, recorded rather than smoothed over:

1. Rows 6 through 12 of the 2026-09-02 draft carried a `REPOSITORY_FACT` state on a
   pointer that could not be resolved. The narrow facts in those rows were re-verified
   independently for this register (§4) and held. The **pointers** did not.
2. The draft offered no way to tell a checked identifier from an unchecked one. Both
   classes were formatted identically and dated identically.
3. A register whose purpose is to separate a label from a receipt reproduced, in its own
   evidence column, exactly the failure it was built to catch.

Durable rule for this document and for `P0_IP_PROVENANCE_EVIDENCE_REGISTER.md`:

> A blob identifier is written only from the output of `git rev-parse HEAD:<path>` at the
> declared snapshot boundary, never abbreviated in the source of truth, and never expanded
> by hand. `pnpm control:pointer-audit` re-checks every declared pointer in both registers
> and fails on drift. A pointer no process re-checks is a dated claim, not evidence.

### 0.2 What changed on `main` between the two anchors

Re-verification also established that four gates moved while the draft sat unmerged. A
register carried forward unchanged would have understated the tree and left landed
enforcement invisible.

| Gate | Movement observed at `main@3fa5c52` | Gate state |
|---|---|---|
| DATA-LIC-G2 | `data/vbo/committed-snapshot-evidence.json` proves byte equivalence to an immutable upstream commit; a CI-enforced audit guards it | still `OPEN` |
| DATA-LIC-G3 | `backend/db/seeds/local-directory-release-authority.ts` makes production publication require a reviewed repository record, not an environment variable | still `HOLD` |
| DATA-LIC-G5 | `apps/web/lib/map/mapSurface.ts` distinguishes unconfigured / unavailable / ready and refuses a blank token | still `OPEN` |
| DATA-LIC-G6 | `evaluateBreizSourceRights` enforces fail-closed source rights; `sourceProvenance.ts` refuses to call a source fresh with no recheck rule | still `OPEN` |

No gate closes. Landed enforcement is not landed evidence, and this register does not
convert one into the other.

## 1. Purpose and authority boundary

This register records repository-observable facts, official-source checks and missing
evidence for third-party data, regional directory content, mapping services, regional-source
ingestion and software dependencies.

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

Do not commit confidential contracts, account screenshots, tokens, personal contact records
or restricted legal material here. Use non-sensitive control identifiers and custody
pointers. No business name, address, coordinate or telephone number from the Lorient seed is
duplicated into this document.

## 2. Evidence-state vocabulary

| State | Meaning |
|---|---|
| `SOURCE_CONFIRMED` | The official publisher/source and its displayed licence or terms label were checked on the stated date. This does not authorize EMOPET's use. |
| `REPOSITORY_FACT` | The fact was directly observed at the snapshot boundary. |
| `VERIFIED_POINTER` | A declared path/blob pair was resolved at the snapshot boundary and is re-checkable by `pnpm control:pointer-audit`. |
| `UNRESOLVABLE_POINTER` | A declared identifier resolves to no object in the repository. The underlying fact may still hold; the pointer does not support it. |
| `RECEIPT_MISSING` | An immutable retrieval/version/checksum/attribution receipt has not been recorded. |
| `TOOLING_PRESENT_EVIDENCE_ABSENT` | A mechanism to produce the required evidence exists in the tree and has produced none. |
| `ENFORCEMENT_LANDED_EVIDENCE_OPEN` | Code now refuses the permissive default, and the item-level evidence it would read is still absent. |
| `UNVERIFIED_CLAIM` | Repository text makes a claim that lacks a supporting item-level pointer. |
| `HOLD` | Do not use or represent the item in the stated product context until the gate is resolved. |
| `NOT_APPLICABLE` | A bounded, recorded rationale establishes that the requested control does not apply. |
| `OPEN` | Review or evidence remains incomplete. |

The words `CLEARED`, `COMPLIANT`, `LICENSED`, `APPROVED` and `RELEASED` must not be used as
aggregate conclusions unless the exact scope, reviewer, evidence and date are recorded.

## 3. Gate summary

| Gate | Required outcome | State | Closing authority |
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

## 4. Repository evidence re-verified at the snapshot boundary

Each row below was re-observed on 2026-09-22 against `main@3fa5c52`. The blob column is the
output of `git rev-parse HEAD:<path>` and is machine-re-checked.

| Evidence ID | Path | Blob at snapshot | Narrow fact established | State |
|---|---|---|---|---|
| DATA-SRC-001 | `data/registry/real-datasets.json` | `033982c43d517b41dec1d440be47db8718573520` | Four external datasets are registered; all four `checksumSha256` values are `null` | `REPOSITORY_FACT` |
| DATA-SRC-002 | `docs/data/REAL_DATASET_INGESTION.md` | `c9891dac67c0886725dca407ac1370896d39e5b9` | The guide requires controlled receipts under `data/registry/receipts/` and documents the command that writes them | `REPOSITORY_FACT` |
| DATA-SRC-003 | `scripts/data/register-dataset-file.mjs` | `ac21dfa7f5702055ac3183cbaad8232a8d8d5e87` | Receipt-writing tooling exists: it computes SHA-256, byte size and a `emopet-dataset-receipt-v1` record | `TOOLING_PRESENT_EVIDENCE_ABSENT` |
| DATA-SRC-004 | `data/registry/real-datasets.json` | `033982c43d517b41dec1d440be47db8718573520` | `data/registry/` contains only this file; `data/registry/receipts/` is absent, so the tooling of DATA-SRC-003 has produced no receipt | `RECEIPT_MISSING` |
| DATA-SRC-005 | `backend/db/seeds/local-directory-lorient.ts` | `6781aa6a58ae136ed5ae24ffa2715bd28cd66a56` | The header gives aggregate source claims; all 41 rows carry `sourceId: null` | `REPOSITORY_FACT` |
| DATA-SRC-006 | `backend/db/seeds/local-directory-release-authority.ts` | `7c643b2b43c10e5c2162054814c1b468a8e85c7e` | Production directory publication requires a reviewed authority record; the committed record is `HOLD` with a null reviewer and null evidence revision | `REPOSITORY_FACT` |
| DATA-SRC-007 | `apps/web/lib/osm-spots.ts` | `357d4a46e9384b3ae24619b24e1878731924ca28` | The app queries the public `https://overpass-api.de/api/interpreter` endpoint, capped at 120 results per query; successful loads (including a legitimately empty one) are held in a process-lifetime in-memory `Map` keyed on the bbox rounded to two decimals, with no expiry and no persistence; a failure returns `unavailable` and is not cached | `REPOSITORY_FACT` |
| DATA-SRC-008 | `apps/web/components/bretagne-map/MapboxMap.tsx` | `6e0a20d3605da5cfac8dd13876ce5b3ca480a524` | `attributionControl: true` is set, the style is `mapbox://styles/mapbox/outdoors-v12`, and popup content appends a plain-text `- OpenStreetMap` label | `REPOSITORY_FACT` |
| DATA-SRC-009 | `apps/web/lib/map/mapSurface.ts` | `3d2eebaba8b138ad5681d9a7770627ca55a4c4a4` | A blank or whitespace Mapbox token resolves to `unconfigured`; `unavailable` and `unconfigured` are distinct user-visible states | `REPOSITORY_FACT` |
| DATA-SRC-010 | `apps/web/package.json` | `8d49c8df5564ba54c1cd06cfbfc157f14dd5e12d` | The web app declares `mapbox-gl@^3.24.0` and `@types/mapbox-gl@^3.5.0` | `REPOSITORY_FACT` |
| DATA-SRC-011 | `docs/STACK_GAPS.md` | `8cace0c76f4982da3cba7038ec8e15215cf44bff` | The stack table says `Mapbox GL (token Cédric)`; this does not establish current legal account authority | `UNVERIFIED_CLAIM` |
| DATA-SRC-012 | `apps/web/lib/data/breiz/sourceRegistry.ts` | `53cd0e4878929bf5624c30814e1db7ad1a23d041` | Nine sources are catalogued; eight carry `license: null`; the two enabled sources (`region-bretagne-open-data`, `data-gouv-fr`) are both null-licence | `REPOSITORY_FACT` |
| DATA-SRC-013 | `apps/web/lib/data/breiz/sourceRegistry.ts` | `53cd0e4878929bf5624c30814e1db7ad1a23d041` | `evaluateBreizSourceRights` blocks ingestion on `SOURCE_DISABLED`, `NO_LICENCE_RECEIPT`, `NO_RECHECK_RULE` or `PARTNER_PERMISSION_REQUIRED`; `canStoreFullText` now derives from it | `ENFORCEMENT_LANDED_EVIDENCE_OPEN` |
| DATA-SRC-014 | `apps/web/lib/data/breiz/sourceProvenance.ts` | `b4dd3109d7a02c15aba6910d56548b0705d3007f` | `evaluateFreshness` returns `no_recheck_rule` where a recheck rule is absent, and `isFresh` is true only for `fresh` | `REPOSITORY_FACT` |
| DATA-SRC-015 | `.github/workflows/security-supply-chain.yml` | `e21e3e1ec510f9716c6ce424b4d40baf33ef261e` | CI generates CycloneDX and SPDX SBOM artifacts with Syft; no step records a dependency-licence disposition | `REPOSITORY_FACT` |
| DATA-SRC-016 | `.github/workflows/p0-db-baseline.yml` | `2c8e7e1b9af8f46888544aff0a4d59751058665b` | CI runs `scripts/data/vbo-committed-snapshot-audit.mjs`, so the VBO traceability record is guarded against silent drift | `REPOSITORY_FACT` |

Repository review role for DATA-SRC-001 through DATA-SRC-016: `candidate evidence reviewer`.
These rows establish only the narrow facts stated.

## 5. Official-source checks

Official pages were checked on **2026-09-02** and were **not re-checked on 2026-09-22**.
They are carried here as dated observations, not as current readings. A live page can change;
closure requires a retained, dated receipt or controlled snapshot where permitted.

| Official ID | Source | Official pointer | Observation (2026-09-02) | State | Remaining boundary |
|---|---|---|---|---|---|
| DATA-OFFICIAL-001 | Mendeley dog movement V4 | https://data.mendeley.com/datasets/vxhx934tbn/4 | Page identifies version 4, DOI `10.17632/vxhx934tbn.4`, CC BY 4.0, and requests citation of the associated publication | `SOURCE_CONFIRMED` (not re-checked 2026-09-22) | Payload file identity, checksum, receipt and EMOPET transformation evidence missing |
| DATA-OFFICIAL-002 | Mendeley dog posture V1 | https://data.mendeley.com/datasets/mpph6bmn7g/1 | Page identifies version 1, DOI `10.17632/mpph6bmn7g.1`, CC BY 4.0, and requests citation of the associated publication | `SOURCE_CONFIRMED` (not re-checked 2026-09-22) | Payload file identity, checksum, receipt and EMOPET transformation evidence missing |
| DATA-OFFICIAL-003 | Vertebrate Breed Ontology | https://github.com/monarch-initiative/vertebrate-breed-ontology | Official Monarch Initiative repository declares CC-BY 4.0 | `SOURCE_CONFIRMED` (not re-checked 2026-09-22) | Exact release identity still open; see §7 for the immutable-commit equivalence now proven |
| DATA-OFFICIAL-004 | ANMV/Anses dataset | https://www.data.gouv.fr/datasets/base-de-donnees-publique-des-medicaments-veterinaires-autorises-en-france-1 | Official catalogue identifies Anses as producer and displays "Creative Commons Attribution" | `SOURCE_CONFIRMED` (not re-checked 2026-09-22) | Exact resource, retrieval timestamp, legal-code/version receipt and checksum missing |
| DATA-OFFICIAL-005 | OpenStreetMap copyright/licence | https://www.openstreetmap.org/copyright | OSM data is published under ODbL; attribution and a clear licence pointer are required; database adaptation/distribution obligations depend on the use | `SOURCE_CONFIRMED` (not re-checked 2026-09-22) | EMOPET flows and derived outputs are not yet classified |
| DATA-OFFICIAL-006 | OSM attribution guidance | https://osmfoundation.org/wiki/Licence/Attribution_Guidelines | Guidance requires visible, legible attribution and accessible licence information appropriate to the medium | `SOURCE_CONFIRMED` (not re-checked 2026-09-22) | Rendered web/mobile evidence is absent |
| DATA-OFFICIAL-007 | Mapbox GL JS licence | https://github.com/mapbox/mapbox-gl-js/blob/main/LICENSE.txt | Current releases are governed by Mapbox terms for use with relevant Mapbox products and an active account; embedded v1.13-and-earlier material has a separate BSD notice | `SOURCE_CONFIRMED` (not re-checked 2026-09-22) | Exact installed package, product terms and intended-use review remain open |
| DATA-OFFICIAL-008 | Mapbox terms | https://www.mapbox.com/legal/tos | Terms govern account authority, API keys and usage-based charges | `SOURCE_CONFIRMED` (not re-checked 2026-09-22) | Account holder, accepted version, billing and token custody remain open |

Official-source reviewer role: `candidate source reviewer`. Source confirmation is not a
product-use authorization. Re-checking these eight pages, with retained dated evidence, is
part of DATA-LIC-G1 and DATA-LIC-G5 closure.

## 6. External dataset register

| Item ID | Dataset and intended repository use | Version evidence | Licence evidence | Payload/checksum receipt | Attribution/citation | Owner role | State | Next action |
|---|---|---|---|---|---|---|---|---|
| DATASET-001 | Movement Sensor Dataset for Dog Behavior Classification; R&D and IMU feature validation | DOI/version fixed at V4 in registry and official page | CC-BY-4.0 source label confirmed 2026-09-02 | `RECEIPT_MISSING` | Registry text exists; implementation evidence absent | Data/Research owner | `OPEN` | Run `scripts/data/register-dataset-file.mjs` on every retrieved file and retain the receipt |
| DATASET-002 | Inertial sensor dataset for Dog Posture Recognition; R&D and preprocessing validation | DOI/version fixed at V1 in registry and official page | CC-BY-4.0 source label confirmed 2026-09-02 | `RECEIPT_MISSING` | Registry text exists; implementation evidence absent | Data/Research owner | `OPEN` | Same, and keep associated-code licensing separate from dataset licensing |
| DATASET-003 | Vertebrate Breed Ontology; canonical identifiers, synonyms and cross-references | Registry says `controlled-at-retrieval`; §7 now binds the payload to an immutable upstream commit | CC-BY-4.0 source label confirmed 2026-09-02 | `RECEIPT_MISSING` despite proven byte equivalence | Generic attribution text exists; product/distribution evidence absent | Data owner | `OPEN` | Retain an independent upstream retrieval receipt and prove historical transform identity |
| DATASET-004 | ANMV/Anses reference data; official identifiers and record normalization | Registry says `v2-current-at-retrieval`, not an immutable resource identity | Catalogue label confirmed 2026-09-02; exact legal-code/version receipt open | `RECEIPT_MISSING` | Registry text exists; output evidence absent | Data/Product owner | `OPEN` | Resolve exact resource URL/version, licence URI, retrieval receipt and field-level use |

The receipt mechanism is no longer the gap. `scripts/data/register-dataset-file.mjs` already
computes SHA-256, byte size and a structured `emopet-dataset-receipt-v1` record, and
`docs/data/REAL_DATASET_INGESTION.md` documents the command. It has never been run against a
retrieved payload: `data/registry/receipts/` does not exist and all four `checksumSha256`
values are `null`. Available tooling is not evidence.

Minimum receipt content for every future retrieval:

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

`data/vbo/` holds eight files at the snapshot boundary, three more than the five recorded on
2026-09-02. The 2026-09-02 draft's four VBO blob identifiers were all unresolvable (§0.1);
the identifiers below were read from the tree.

| Evidence ID | Path | Blob at snapshot | Size (bytes) | Current state |
|---|---|---|---|---|
| VBO-FILE-001 | `data/vbo/vbo.json` | `902e7457b8a31ff3256d253ad13592a7ce9e54fa` | 40,128,716 | Byte-equivalent to upstream; upstream retrieval receipt still `RECEIPT_MISSING` |
| VBO-FILE-002 | `data/vbo/breed_canonical.json` | `9bf42bad634c4b4660db4209ab9700c260491db4` | 848,521 | Derivative; historical transform identity `NOT_PROVEN_FROM_RETAINED_RECEIPT` |
| VBO-FILE-003 | `data/vbo/dataset_version_insert.sql` | `a19791b1f2e914234eda7586cc94056906022763` | 255 | Derivative; generation receipt not retained |
| VBO-FILE-004 | `data/vbo/fci_unmatched.json` | `8b443825fbe6ab51639b335cded794fc693fd682` | 1,422 | Derivative; transformation receipt not retained |
| VBO-FILE-005 | `data/vbo/breed_canonical_insert.sql` | `146d9cad68b949f4450992a87f466b3e664eac8b` | 538 | Fail-closed regeneration guard, not a generated artifact |
| VBO-FILE-006 | `data/vbo/breed_canonical_insert.legacy.sql` | `5c15e3a27b7f62249bf29945e742aa950fdb6847` | 1,052,766 | Pre-INT-03B artifact retained for audit; explicitly not execution authority |
| VBO-FILE-007 | `data/vbo/committed-snapshot-evidence.json` | `f4da926366bbb0f30d960403fd5d2686dd463a24` | 2,835 | Traceability record; see below |
| VBO-FILE-008 | `data/vbo/README.md` | `a59016f5ce63db662e2c8b1827e15fb8e4626caa` | 988 | States the SQL authority split and its own limits |

The file that sat at `data/vbo/breed_canonical_insert.sql` on 2026-09-02 (blob
`5c15e3a27b7f…`) is now at `breed_canonical_insert.legacy.sql`; the current
`breed_canonical_insert.sql` is a different, much smaller fail-closed guard. A register that
re-used the old path without re-reading the tree would have described the wrong artifact.

### What `committed-snapshot-evidence.json` establishes

- `payloadSha256` = `09da44412ed43ee271e407a83401275ada85483e2199273203c8404b84c093de` for 40,128,716 bytes.
- `upstreamImmutableCommitByteEquivalenceStatus` = `PROVEN_GIT_BLOB_MATCH` against
  `monarch-initiative/vertebrate-breed-ontology@323e8a3dbdb13696b41408f0f2f70454ba37b6f6`
  (2026-03-26, signature verified). The committed EMOPET payload is byte-identical to
  upstream `vbo.json` at that commit.
- `derivedRecordCount` = 1,575 for `breed_canonical.json`.
- `scripts/data/vbo-committed-snapshot-audit.mjs` re-checks this record and is wired into
  `.github/workflows/p0-db-baseline.yml`. It passes at the snapshot boundary.

### What it explicitly does not establish

Its own `limitations` field, preserved here rather than paraphrased away:

- `claimsUpstreamReleaseEquivalence` = `false` — the immutable commit is not promoted to a release.
- `claimsProductUseClearance` = `false`.
- `upstreamRetrievalReceiptStatus` = `RECEIPT_MISSING` — the byte match does not replace an independently retained receipt.
- `transformScriptHistoricalIdentityStatus` = `NOT_PROVEN_FROM_RETAINED_RECEIPT` — the script that originally produced the committed derivatives is a repository pointer, not a proven identity.
- `observedRetrievedAtFromCommittedDerivatives` = `2026-04-03T13:15:25.288Z`, inherited from derivative provenance, not independently retained.

This is a genuine advance on the 2026-09-02 position, where nothing bound the payload to any
upstream object. DATA-LIC-G2 nonetheless stays `OPEN`: byte equivalence answers *what was
committed*, and the gate also asks *what was retrieved, by whom, under which retained
receipt, and through which transform*.

Git blob identifiers prove repository object identity only. They do not replace a SHA-256
receipt tied to a retrieved upstream payload.

## 8. Lorient directory evidence disposition

No business name, address, coordinate, telephone number or other row-level content is
duplicated in this control document.

### Aggregate snapshot findings, re-counted 2026-09-22

| Field | Observed value |
|---|---:|
| Header claim | "45+ entries"; sources named as Ordre des Vétérinaires, OSM and Pages Jaunes |
| Actual entry count | 41 |
| `source: 'ordre_veterinaires'` | 14 |
| `source: 'manual'` | 20 |
| `source: 'osm'` | 7 |
| `source: 'pages_jaunes'` | 0 |
| `sourceId: null` | 41 |
| Non-null `ratingAvg` | 40 |
| `verified: true` | 25 |
| `verified: false` | 16 |
| Telephone fields present | 41 |
| `phone: null` | 7 |
| Telephone fields carrying a value | 34 |
| Distinct telephone values | 33 |

All twelve counts carried from 2026-09-02 were re-verified and hold.

### Three contact-field findings the aggregate counts had not stated

Each row was parsed as an object so that a field could be read against the other fields of
the same row. The 2026-09-02 draft counted fields column by column, which is why none of
these appeared.

1. **The seven `osm` rows are exactly the seven rows with `phone: null`.** No row labelled
   `osm` carries a telephone value, and every row carrying one is labelled `manual` (20) or
   `ordre_veterinaires` (14). Those same seven rows also carry `sourceId: null`, so an
   OSM-labelled row has neither an upstream object identifier nor a contact field — nothing
   ties it to OpenStreetMap beyond the label itself. This is the row-level gap behind the
   `HOLD` on the derived-directory flow in §9.

2. **Seven telephone values are built from a strictly ascending two-digit sequence, and all
   seven sit on `source: 'manual'` rows with `verified: false`.** The pattern is a French
   mobile prefix followed by four two-digit groups whose digits run consecutively upward with
   wraparound, the groups stepping by one per row. The 2026-09-02 draft recorded "7 obvious
   placeholder telephone patterns" without stating the criterion, so the count could not be
   reproduced or contested. Stated plainly in the seed's favour: these rows do not claim to
   be verified, and the seed is internally consistent here. The criterion is recorded instead
   of the values, because this document does not duplicate seed contact fields even when they
   appear synthetic — being unable to prove a number is unassigned is itself a reason not to
   copy it. Re-derive the count with:

   ```bash
   grep -cE "phone: '06( [0-9]{2}){4}'" backend/db/seeds/local-directory-lorient.ts
   ```

   At the snapshot boundary that command returns `7`, and all seven matches belong to the
   pattern class described.

3. **One telephone value is shared by two rows, and the two rows disagree about their own
   provenance.** 34 rows carry a telephone value and only 33 values are distinct. The
   repeated value appears once on a `veterinaire` row labelled `source: 'ordre_veterinaires'`
   with `verified: true`, and once on a `veterinaire` row labelled `source: 'manual'` with
   `verified: false`. One of the two is wrong about its contact field, or the second
   duplicates the first, and with `sourceId: null` on both there is nothing in the seed that
   says which. A row asserting verification against a professional register while sharing its
   telephone number with an unverified manual row is the clearest single case for why
   `verified: true` cannot be relied upon at all here. No address is duplicated anywhere in
   the seed.

### Evidence finding

The header is an aggregate narrative, not item-level provenance. It does not establish:

- which source supplied each field;
- whether a row is real, synthetic, manually composed or combined;
- the origin and reuse basis of each rating/count;
- what `verified: true` means or who performed the verification;
- whether an address/contact/coordinate remains current;
- whether any row was derived from PagesJaunes.

The absence of a row-level `pages_jaunes` label does not prove that PagesJaunes data was or
was not used. Conversely, 25 rows assert `verified: true` while all 41 carry
`sourceId: null`, so no row records what was verified or against what.

### Current disposition

`REPRESENTATION AS A VERIFIED PUBLIC OR PRODUCTION DIRECTORY = HOLD`

This is now enforced rather than only stated.
`backend/db/seeds/local-directory-release-authority.ts` requires a `GO` disposition **and** a
non-empty evidence revision, reviewer role and non-future review date before production
publication is authorized. The committed record is:

```
disposition: 'HOLD', evidenceRevision: null, reviewedAt: null, reviewerRole: null
```

with the reason `Row-level provenance, permitted-use basis and unsupported historical claims
remain open under #116.` Two tests in `backend/test/local-directory-release-authority.test.mjs`
assert that an environment variable alone cannot authorize release and that the demo path
strips unsupported claims.

The existing seed is not deleted by this register. Before production-facing use, each row must
receive one of these dispositions:

| Disposition | Required evidence |
|---|---|
| `CONTROLLED_EXTERNAL_SOURCE` | Per-field or row-level source ID/URL, retrieval date, applicable terms/licence, allowed use and reviewer |
| `OWNER_SUPPLIED` | Controlled declaration, scope, date and publication authority |
| `SYNTHETIC_DEMO` | Explicit synthetic marker; no representation as a real verified provider; no unsupported rating or verification flag |
| `REMOVE_OR_REPLACE` | Recorded reason and authorized follow-up change |

Ratings, review counts and `verified` flags must be assessed separately from basic listing
fields. Three dispositions follow directly from the findings above: the seven
sequence-pattern rows are `SYNTHETIC_DEMO` candidates and already carry `verified: false`;
the seven `osm` rows cannot be dispositioned as `CONTROLLED_EXTERNAL_SOURCE` while they carry
no upstream object identifier; and the two rows sharing one telephone value must be resolved
against each other before either is published, since one of them is wrong.

## 9. OpenStreetMap and Overpass control matrix

| Flow | Behavior at snapshot | Evidence gap | State | Required owner |
|---|---|---|---|---|
| Live POI lookup | Web code queries `https://overpass-api.de/api/interpreter` with a 20 s server-side timeout and `out center 120` | Provider usage policy, expected request volume and production-service decision not recorded; the 120-result cap is an undocumented truncation of what a viewport actually contains | `OPEN` | Engineering |
| Local caching | Process-lifetime in-memory `Map`, no expiry, no persistence, cleared only by a test helper; only successful loads are cached, a failure stays retryable, and an empty area is cached as empty rather than as a failure | Cache keys round the bbox to two decimals, so different viewports share an entry — acceptable for display, unassessed for anything derived from it; unbounded growth and cross-request reuse inside a server process not assessed; no database or disk persistence exists to classify | `OPEN` | Engineering/Data |
| OSM attribution | `osm-spots.ts` carries `Données ouvertes © contributeurs OpenStreetMap (ODbL)` as a source comment; `MapboxMap.tsx` enables `attributionControl` and appends a plain-text `- OpenStreetMap` popup label | No rendered, clickable, legible attribution and no ODbL link captured on any surface; the only attribution test on `main` covers Breiz answers, not the map | `OPEN` | Product/Frontend |
| Export or API response | No controlled flow classification recorded | Attribution and database-rights treatment for redistributed results not recorded | `OPEN` | Engineering + licensing review |
| Derived directory | Seven seed rows labelled `osm` carry no source IDs | Upstream object IDs, field provenance, retrieval date and modification history absent | `HOLD` | Data owner |
| Future analytics/model use | No authority selected | Input/output/database classification not recorded | `OPEN` | Data/Research + licensing review |

DATA-LIC-G4 cannot close from a source-code string. A comment naming ODbL is a developer
note, not attribution to a user. Closure requires rendered evidence per supported surface and
a data-flow disposition for query, cache, export and derivative uses.

## 10. Mapbox service-authority register

| Control item | Repository fact at snapshot | Required evidence | State |
|---|---|---|---|
| Package | `mapbox-gl@^3.24.0` and `@types/mapbox-gl@^3.5.0` are declared | Exact lockfile-resolved version and bundled licence/notice review | `OPEN` |
| Hosted product | Style `mapbox://styles/mapbox/outdoors-v12` is used | Intended product/use, plan and terms/product-terms snapshot | `OPEN` |
| Account authority | `docs/STACK_GAPS.md` says `token Cédric` | Legal account holder, organization, authorized signer/admin and account custody | `UNVERIFIED_CLAIM` |
| Billing | Not established in this register | Plan, billing owner, limits, monitoring and budget authority | `OPEN` |
| Token handling | `resolveMapboxToken` treats missing, empty and whitespace-only tokens as `unconfigured`, and the surface distinguishes `unavailable` from `unconfigured` | Scope, URL restrictions, owner, rotation date and incident/revocation owner | `OPEN` |
| Token custody | `NEXT_PUBLIC_MAPBOX_TOKEN` is read at build/runtime; no value appears in the repository or here | Custody record and rotation procedure | `OPEN` |
| Attribution | `attributionControl: true` is present | Rendered attribution, links, overlays and supported viewport evidence | `OPEN` |
| Data handling | Current terms describe service data handling | Applicable privacy/data-processing review for the actual integration | `OPEN` |
| Exit/change plan | Not established | Provider change/export/cache implications and responsible owner | `OPEN` |

The `mapSurface.ts` work closes a user-facing failure mode the 2026-09-02 draft had not
identified: a revoked, invalid or over-quota token produced no `load` event and therefore no
message, leaving an empty bordered rectangle indefinitely. Its own comment records that this
is not theoretical precisely because DATA-LIC-G5 leaves token custody and rotation open.
None of that supplies account, billing or attribution authority.

No account or token value may be added to this register.

## 11. Breiz source-control register

| Source ID | Enabled | Licence field | Access mode | State | Required next control |
|---|---:|---|---|---|---|
| `bcd-becedia` | No | `null` | manual review | `OPEN` | Item-level rights/permission and attribution |
| `bretania` | No | `null` | OAI-PMH | `OPEN` | Record-level rights statement and institution provenance |
| `region-bretagne-open-data` | **Yes** | `null` | API | `OPEN` | Dataset ID, returned licence, update/retrieval dates and checksum where available |
| `geobretagne` | No | `null` | OGC | `OPEN` | Layer-level publisher/licence and service terms |
| `patrimoine-bzh` | No | `null` | metadata | `OPEN` | Item-level metadata/media rights |
| `pop-culture` | No | `null` | metadata | `OPEN` | Field/text/media rights split and attribution |
| `data-gouv-fr` | **Yes** | `null` | API | `OPEN` | Dataset/resource-specific licence and immutable receipt |
| `sirene` | No | `Licence Ouverte / Open Licence where applicable` | API | `OPEN` | Exact current source, field scope, legal text and privacy/publication disposition |
| `datatourisme` | No | `null` | API | `OPEN` | Provider- and record-level licence/attribution |

The single non-null licence value is conditional on its face (`where applicable`) and belongs
to a disabled source. Both enabled sources carry no licence receipt.

### The permissive default is now closed

On 2026-09-02 the registry described rights without applying them: `license` was `null` on
eight of nine entries, two of them enabled, and no code read the field. The default was
permissive by omission. At the snapshot boundary:

- `evaluateBreizSourceRights` returns explicit blockers — `SOURCE_DISABLED`,
  `NO_LICENCE_RECEIPT`, `NO_RECHECK_RULE`, `PARTNER_PERMISSION_REQUIRED` — and permits
  ingestion only when the list is empty. With eight null licences, no catalogued source is
  currently ingestible.
- `canStoreFullText` no longer reads `usagePolicy` alone. A source flagged
  `FULL_TEXT_ALLOWED` with no licence would previously have been cleared to store full text.
  No registry entry carries that flag today, so the defect was latent rather than reached —
  it was waiting for the first source to set it.
- `evaluateFreshness` distinguishes `no_recheck_rule` from `stale`: absence of a rule no
  longer reads as compliance. `isFresh` is true only for `fresh`.
- `apps/web/lib/data/breiz/__tests__/sourceRights.test.ts` and `answerAttribution.test.ts`
  hold these behaviours.

This is enforcement, not evidence. `DATA-SRC-013` is therefore
`ENFORCEMENT_LANDED_EVIDENCE_OPEN` and DATA-LIC-G6 stays `OPEN`: the gate asks for
item-level rights evidence, and the code now correctly refuses to act in its absence.

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

Catalogue metadata alone must not be promoted to a full-text or media reuse authority.

## 12. Software dependency licence control

Unchanged since 2026-09-02, and re-verified: no `NOTICE`, `COPYING`, third-party licence
inventory or generated attribution bundle is tracked anywhere in the tree. No `LICENSE` file
is tracked either — recorded as an observation, not as a recommendation, since selecting a
repository-wide licence is outside this register's authority (§1).

The supply-chain workflow provides CycloneDX and SPDX SBOM artifacts and security-advisory
evidence. An SBOM is an inventory input, not a licensing disposition.

DATA-LIC-G7 requires an exact candidate-head inventory covering direct and transitive
dependencies for all workspaces and shipped artifacts.

| Control | Required evidence | State |
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

Do not infer absence of a licence family from package names or from a lockfile that does not
carry authoritative licence text.

## 13. Gate closure evidence

### DATA-LIC-G1 — Dataset identity and retrieval receipts

Close only when all four dataset rows have exact resource/version identity, SHA-256,
retrieval receipt, licence/legal-code pointer, attribution/citation and actual-use review.
The receipt tooling already exists; running it is the missing step.

### DATA-LIC-G2 — VBO payload and derivative traceability

Byte equivalence to an immutable upstream commit is proven and CI-guarded. Close only when an
independently retained upstream retrieval receipt exists and every derivative is
reproducibly bound to input/output checksums with a proven transform identity.

### DATA-LIC-G3 — Local-directory row provenance

A release-authority record now blocks production publication and is `HOLD`. Close only when
all 41 rows are supported by item-level evidence or explicitly classified as synthetic/demo,
and ratings, review counts, contact fields, coordinates and `verified` flags have separate
dispositions. The seven `osm` rows, the seven sequence-pattern rows and the two rows sharing
one telephone value must each be dispositioned before any row is represented as verified.

### DATA-LIC-G4 — OSM/Overpass use classification

Close only after every query/cache/export/derivative flow is classified, the service
architecture is approved, and attribution/licence links are verified in rendered surfaces. A
source comment naming ODbL does not count.

### DATA-LIC-G5 — Mapbox service authority

Token resolution and failure messaging are handled. Close only after account/signing
authority, accepted terms/product terms, billing, intended volume, token custody/restrictions,
attribution and applicable data-handling review are recorded.

### DATA-LIC-G6 — Breiz item-level source controls

Fail-closed enforcement has landed and is tested. Close only when enabled connectors retain
item-level rights evidence — that is, when the enforcement has something to read.

### DATA-LIC-G7 — Dependency licence inventory

Close only when exact-head direct/transitive packages and shipped assets have a reviewed
inventory, required notices are generated, and unknown/custom/reciprocal entries have
dispositions.

### DATA-LIC-G8 — Controlled review and release disposition

Close only after Product/Engineering confirms actual flows, qualified review covers
relied-upon obligations, residual gaps stay visible, and the named authority selects a dated
disposition.

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

`OFFICIAL SOURCE LABELS = PARTIALLY CONFIRMED (2026-09-02, NOT RE-CHECKED)`
`IMMUTABLE RETRIEVAL RECEIPTS = NOT ESTABLISHED`
`VBO UPSTREAM BYTE EQUIVALENCE = PROVEN, RECEIPT STILL MISSING`
`LORIENT DIRECTORY PRODUCTION REPRESENTATION = HOLD, NOW ENFORCED IN CODE`
`OSM/OVERPASS PRODUCT-USE DISPOSITION = OPEN`
`MAPBOX PRODUCTION AUTHORITY = OPEN`
`BREIZ ITEM-LEVEL RIGHTS ENFORCEMENT = LANDED, EVIDENCE OPEN`
`DEPENDENCY LICENCE DISPOSITION = OPEN`
`PRODUCT OR RELEASE AUTHORITY = NOT GRANTED`
`G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN`

This register permits controlled evidence collection. It does not convert an official licence
label, repository metadata, landed enforcement code or a public endpoint into automatic
product authority.

## 16. Self-check

`pnpm control:pointer-audit` re-resolves every `VERIFIED_POINTER` declared in this register
and in `P0_IP_PROVENANCE_EVIDENCE_REGISTER.md`, and exits non-zero on drift. A PASS proves
only that the declared paths still carry the declared blobs. It is not rights review, not
clearance and not release authority; every gate above stays `OPEN` regardless of its result.

On a drift failure: re-verify the underlying fact first, then update the row **and** its
snapshot boundary. Do not overwrite a hash to make the audit pass — that is the failure §0.1
documents.
