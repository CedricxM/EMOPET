# EMOPET — Dependency Licence Inventory Control Record — 2026-09-10

**Status:** `EVIDENCE INVENTORY / REVIEW OPEN / NOT LEGAL CLEARANCE / NOT RELEASE AUTHORITY`  
**Parent gate:** #116 `DATA-LIC-G7 — Dependency licence inventory`  
**PR:** #224  
**Normal package manager:** `pnpm 10.33.0`

## 1. Purpose

Preserve an exact-lock, machine-readable inventory of licence metadata reported for the installed dependency graph, without converting package metadata into legal clearance.

The Security supply-chain workflow now runs a dedicated `Dependency licence evidence inventory (not clearance)` job. It performs a frozen install, executes `pnpm licenses list --json`, hashes the resulting JSON, records the evidence commit/package-manager/time/classification, and uploads the result as a 30-day workflow artifact.

The evidence SHA is explicitly bound to `${{ github.event.pull_request.head.sha || github.sha }}` rather than relying on `GITHUB_SHA`, because pull-request workflows may expose a synthetic merge commit through `GITHUB_SHA`.

## 2. Initial inventory snapshot

Initial successful inventory job: Security run `34449197972`, job `102780754663`.

Artifact generated from the unchanged dependency lock on PR #224:

- artifact id: `10140838882`;
- artifact name: `dependency-license-inventory-fa333bad9f969f2ca765160fe8aedbddd4c6d29e`;
- artifact archive digest: `sha256:c20a37fe3bffcabff541ba14518fce55ea705461f8b59998e9e4048254878b7a`;
- archive payload: `dependency-licenses.json`, `dependency-licenses.sha256`, `dependency-licenses.metadata.txt`.

The first metadata implementation used `GITHUB_SHA`, which represented the pull-request synthetic merge commit rather than the branch head. Commit `9f40a3ddad357495e59a964c7d402f060c620986` corrects that provenance field. The inventory content itself came from the same frozen dependency lock; the first artifact remains historical evidence, not the canonical exact-head provenance record.

## 3. Metadata inventory summary

The initial JSON reports **18 licence-label buckets**, **1,217 package-version rows**, and **1,068 unique package names**.

| Reported licence label | Package names | Package-version rows | Classification |
| --- | ---: | ---: | --- |
| MIT | 872 | 993 | routine inventory; notices/use review still applies |
| Apache-2.0 | 59 | 62 | routine inventory; notices/use review still applies |
| BSD-3-Clause | 25 | 26 | routine inventory; notices/use review still applies |
| ISC | 60 | 74 | routine inventory; notices/use review still applies |
| BSD-2-Clause | 25 | 26 | routine inventory; notices/use review still applies |
| BlueOak-1.0.0 | 11 | 11 | review label/source text |
| Unlicense | 4 | 4 | review label/source text |
| MPL-2.0 | 3 | 5 | review distribution/modification obligations for actual use |
| CC-BY-4.0 | 1 | 2 | review attribution and distribution context |
| CC0-1.0 | 2 | 2 | review source text/notice context |
| 0BSD | 2 | 2 | routine inventory; notice review still applies |
| BSD | 2 | 2 | normalize/verify exact upstream licence text |
| LGPL-3.0-or-later | 1 | 1 | targeted distribution/linkage review required |
| Python-2.0 | 1 | 1 | targeted exact-text/notice review required |
| `(BSD-3-Clause OR GPL-2.0)` | 1 | 1 | select/document applicable licence path for actual distribution |
| `Apache 2.0` | 1 | 1 | normalize label against upstream licence text |
| `(BSD-2-Clause OR MIT OR Apache-2.0)` | 1 | 1 | document applicable path where relevant |
| `(MIT OR CC0-1.0)` | 1 | 3 | document applicable path where relevant |

These are package-manager-reported metadata labels. They are not a legal interpretation of the package, the linked native binary, or EMOPET's distribution obligations.

## 4. Targeted review queue

The following entries are surfaced for human review because their reported metadata is non-routine, multi-licence, non-canonical, attribution-sensitive, or potentially relevant to distributed native assets. Inclusion here does **not** mean the package is prohibited or non-compliant.

| Reported label | Observed package(s) | Required review |
| --- | --- | --- |
| LGPL-3.0-or-later | `@img/sharp-libvips-linux-x64@1.3.3` | verify upstream licence/material distributed with the native binary, actual EMOPET distribution path, notices/source obligations as applicable |
| Python-2.0 | `argparse@2.0.1` | verify exact upstream licence text and notice requirements |
| MPL-2.0 | `axe-core@4.11.4`; `lightningcss@1.27.0`; `lightningcss@1.32.0` and platform package rows | classify actual distributed/modified files and required notices/source availability as applicable |
| CC-BY-4.0 | `caniuse-lite` package rows | verify attribution/licence treatment for the actual use/distribution context |
| BSD | `mapbox-gl@3.24.0`; `readline@1.3.0` | verify exact upstream licence text; Mapbox service/account/terms authority remains separately governed by DATA-LIC-G5 |
| `(BSD-3-Clause OR GPL-2.0)` | `node-forge@1.4.0` | record chosen/applicable licence path for the distributed use, if applicable |
| `Apache 2.0` | `qrcode-terminal@0.11.0` | normalize metadata label against exact upstream licence text |
| multi-licence buckets | affected package rows in JSON | document selected/applicable licence path where the distribution model requires it |

## 5. What this evidence proves

It proves only that, on the captured dependency graph:

- the repository can produce a machine-readable licence-metadata inventory from a frozen installation;
- the evidence can be hashed and retained as a CI artifact;
- the inventory can be regenerated for subsequent PR/main commits;
- non-routine metadata labels can be surfaced for review instead of being hidden inside an SBOM.

It does **not** prove:

- that every metadata label is correct;
- that all required licence texts/notices are present in distributable artifacts;
- that a licence choice has been made for every dual/multi-licensed dependency;
- that copyleft/file-level obligations have been classified correctly;
- that service terms, accounts, API usage, datasets or third-party content rights are cleared;
- that a lawyer or designated licensing authority has reviewed the result;
- that EMOPET is ready for production or distribution.

## 6. DATA-LIC-G7 remaining work

Before `DATA-LIC-G7` can be marked resolved:

1. preserve a successful corrected exact-head inventory artifact whose internal metadata names the actual PR head SHA;
2. map package rows to actual distributed/runtime surfaces rather than treating every dev/transitive package identically;
3. verify upstream licence text for the targeted review queue and any metadata anomalies;
4. inventory required licence/NOTICE/source-offer/attribution material for distributable artifacts;
5. explicitly review dual/multi-licence selections where applicable;
6. retain the resulting notices in the relevant web/mobile/backend/distribution packaging path;
7. obtain dated review and `GO | HOLD | REMEDIATE` disposition from the designated authority;
8. rerun/review the inventory whenever the controlled dependency graph changes materially.

## 7. Gate state

`DATA-LIC-G7-INVENTORY = CANDIDATE EVIDENCE AVAILABLE`

`DATA-LIC-G7-REVIEW-DISPOSITION = OPEN`

`G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN`

This record deliberately advances evidence collection without claiming legal clearance.
