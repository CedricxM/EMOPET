# EMOPET dependency licence evidence review — 2026-09-10

**Status:** `EVIDENCE_INVENTORY_AVAILABLE / REVIEW_OPEN / NOT_LEGAL_CLEARANCE`  
**Parent gate:** `DATA-LIC-G7` / issue #116  
**Repository head reviewed:** `fea9f754669a9f44781b57a6012faf277349ce61`  
**Toolchain:** pnpm `10.33.0`

## Purpose

Record the exact-head dependency licence metadata captured by CI without converting package metadata into legal clearance, redistribution authority, notice completeness, or a product-release decision.

This record is evidence intake only. It does not replace review of upstream licence texts, bundled notices, binary/runtime distribution, service terms, source-offer duties, attribution obligations, or the actual EMOPET distribution model.

## CI evidence

Security workflow run `34450694886` generated artifact:

- name: `dependency-license-inventory-fea9f754669a9f44781b57a6012faf277349ce61`;
- artifact id: `10141416548`;
- artifact digest: `sha256:21d2fde2edfc54d93378c9353796b5cd5f84a6f452539e1aa98441032356f71d`;
- embedded `dependency-licenses.json` SHA-256: `95733d8fa3403017e7eda46916df6b2da85b4cf7e9428f4104b751866bed8fc8`;
- metadata classification: `EVIDENCE_INVENTORY_NOT_LEGAL_CLEARANCE`.

The inventory contains **1,072 package records across 18 licence labels**.

## Licence-label distribution observed

| Licence label reported by pnpm | Package records |
| --- | ---: |
| MIT | 872 |
| ISC | 60 |
| Apache-2.0 | 59 |
| BSD-2-Clause | 25 |
| BSD-3-Clause | 25 |
| BlueOak-1.0.0 | 11 |
| Unlicense | 4 |
| MPL-2.0 | 3 |
| 0BSD | 2 |
| BSD | 2 |
| CC0-1.0 | 2 |
| `(BSD-2-Clause OR MIT OR Apache-2.0)` | 1 |
| `(BSD-3-Clause OR GPL-2.0)` | 1 |
| `(MIT OR CC0-1.0)` | 1 |
| `Apache 2.0` | 1 |
| CC-BY-4.0 | 1 |
| LGPL-3.0-or-later | 1 |
| Python-2.0 | 1 |

No `UNKNOWN` licence label appears in this pnpm inventory. That fact is useful for triage but is not evidence that every licence declaration is accurate, complete, compatible with EMOPET's use, or accompanied by every required notice.

## Review queue created from the inventory

The following entries require deliberate review because their obligations or metadata interpretation are not safely reducible to a generic permissive-package assumption:

| Reported licence label | Package(s) observed | Required review disposition |
| --- | --- | --- |
| LGPL-3.0-or-later | `@img/sharp-libvips-linux-x64@1.3.3` | Review bundled libvips/runtime distribution and applicable LGPL notice/source-relocation obligations for the actual shipped artifact. |
| MPL-2.0 | `axe-core@4.11.4`; `lightningcss@1.27.0/1.32.0`; `lightningcss-linux-x64-gnu@1.27.0/1.32.0` | Review file-level MPL obligations and whether any covered files/binaries are redistributed in EMOPET deliverables. |
| `(BSD-3-Clause OR GPL-2.0)` | `node-forge@1.4.0` | Record the licence election relied upon and retain the corresponding notice/evidence. Do not treat the dual label as an automatic GPL obligation or automatic BSD clearance. |
| CC-BY-4.0 | `caniuse-lite@1.0.30001782/1.0.30001810` | Review attribution/redistribution handling for the actual use and bundled artifact. |
| `BSD` | `mapbox-gl@3.24.0`; `readline@1.3.0` | Resolve ambiguous package metadata against upstream authority. For Mapbox in particular, issue #116's separate service/product-terms gate remains controlling; this package label does not establish Mapbox production authority. |
| `Apache 2.0` | `qrcode-terminal@0.11.0` | Normalize/verify identifier against upstream text and retain required notice evidence. |
| Python-2.0 | `argparse@2.0.1` | Verify upstream licence text and notice handling for the actual distributed dependency set. |

Permissive-labelled packages still require notice/attribution review where their licence requires it. This table is a triage queue, not an exhaustive legal-obligation list.

## DATA-LIC-G7 state

`DATA-LIC-G7 = EVIDENCE_INVENTORY_AVAILABLE / REVIEW_OPEN`

What is now proven at this repository head:

- an exact-head machine-readable pnpm licence inventory is generated in CI;
- the evidence is bound to commit, pnpm version, artifact id/digest and JSON SHA-256;
- the inventory is retained as a workflow artifact;
- the repository does not present that inventory as legal clearance.

Still required before G7 closure:

- review upstream licence authority for ambiguous/non-permissive/dual-labelled entries;
- verify distribution paths and whether optional/platform binaries are actually shipped;
- retain required notices/attributions/source-offer evidence where applicable;
- reconcile Mapbox package metadata with the separate contractual/service review in #116;
- record a dated reviewer and disposition for the exact release candidate dependency graph;
- repeat the inventory on any dependency/lock change used for release.

## Boundary

This document is **not legal sign-off**, **not licence clearance**, **not a release authorization**, and does not close `G-THIRD-PARTY-DATA-RIGHTS-01`.
