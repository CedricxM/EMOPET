# INT-08 — Product / science / strategy documentation replay

**Date:** 2026-09-17  
**Status:** `REVIEW CANDIDATE / DOCUMENTATION ONLY / NO MERGE OR RELEASE AUTHORITY`  
**Tracker:** [#264](https://github.com/CedricxM/EMOPET/issues/264)  
**Parent:** [#246](https://github.com/CedricxM/EMOPET/issues/246)

## Source and scope

- Base `main`: `51bfdde694903c7f0e4b759ae8914c1d18f15810`.
- Frozen source #224: `7e0d90445a3cf03b094d7037aa6addbfa6f2cc19`.
- Branch: `docs/int08-authority-replay-2026-09-17`.
- Scope follows the #264 forensic matrix and its [reconciliation](https://github.com/CedricxM/EMOPET/issues/264#issuecomment-5695977493).
- The user authorized this bounded documentation reconstruction and a draft PR on 2026-09-17. This is not Founder approval of the candidate product/science decisions it preserves.

This slice copies ten controlled documents by exact source path. It also applies the source's
one-word `Guardian` → `Owner` prose correction to the existing Founder Strategic Locks.
The existing strategic decision, date and status are unchanged. No runtime, schema, dependency,
lockfile, workflow or repository setting is changed. PR #224 remains frozen source/evidence.

## Source manifest

| Path | Frozen source Git blob | Replay delta relative to source |
|---|---|---|
| `docs/control/EMOPET_CLAIMS_REGISTRY_v0.1.md` | `319e7a8986322ad9681866756f73ac1319869025` | 5 prose role corrections; dated terminology note; explicit reference paths |
| `docs/control/EMOPET_PRODUCT_AUTHORITY_MAP_v0.1.md` | `c9f7f7bbd8ee100e7e68ffefcab48588fc89f8d7` | Exact source copy |
| `docs/product/EMOPET_EXPERIENCE_DOCTRINE_v0.1.md` | `2703a645402358832ae0c517d9c44e83fc16bf23` | Exact source copy |
| `docs/product/EMOPET_SURFACE_NECESSITY_MATRIX_v0.1.md` | `bc2e3f2ff2bcacfde196f09817a73fb328960cdb` | Exact source copy |
| `docs/product/EMOPET_VETERINARY_SUMMARY_SCOPE_v0.1.md` | `1556d0cc6f3c681c27cb7864886d0102cc5b1d34` | Exact source copy |
| `docs/records/terminology/GUARDIAN_TO_OWNER_SUPERSESSION_2026-09-11.md` | `2f4b8d27a58bbe0fc1252c07e62375991d7b3ff2` | Source-snapshot scope note; 9 lineage references pinned to source |
| `docs/strategy/MAT_STRATEGIC_THESIS_LAUNCH_AUTHORITY_CANDIDATE_2026-09-08.md` | `cf962117859f3554692959da7d8e4598ac201ff6` | 1 prose role correction; dated terminology note |
| `docs/validation/EMOPET_ECOSYSTEM_CONTINUITY_90_DAY_PILOT_v0.1.md` | `93cf77a36e73ac18700567ad551814f35802fb8b` | 7 prose role corrections, including article agreement; dated terminology note |
| `docs/validation/EMOPET_MAT_INCREMENTAL_VALUE_PROTOCOL_v0.1.md` | `5dab1ce6c589fdc281dd6258f5620c49663821c8` | Exact source copy |
| `docs/validation/EMOPET_MAT_PHASE0_EVIDENCE_MAP_v0.1.md` | `efd5d53c88db46f2b103b555cd5f3d9f586105ad` | Exact source copy |

Founder Strategic Locks remains at `docs/strategy/FOUNDER_STRATEGIC_LOCKS_2026-09-07.md`.
Its resulting blob matches the source blob `70f88a0`; the only base-to-result change is the role word
in the relationship-first paragraph. This is terminology reconciliation, not a new approval.

## Reference and history boundary

The Experience Doctrine and Veterinary Summary Scope are included because #264's reconciliation
explicitly brings them into INT-08. The Owner terminology supersession record is also included.

That record's Phase C / Phase D completion statements describe **frozen #224**, not this branch
or delivered `main`. Its integration note makes this explicit. Nine source-only predecessor/successor
references are pinned to that exact source commit; all nine were checked against the source Git tree.
They are historical lineage pointers, not local implementation dependencies and not proof of delivery.
Professional-sharing runtime/persistence still belongs to INT-05. The historical SQL numbering is not
an allocation under the separate migration-ledger decision #258.

Other document references resolve locally. Active prose uses Owner; historical filenames, role-mapping
history and `G-GUARDIAN-*` evidence identifiers remain intact. Existing historical masters and Care
source documents are not globally rewritten by this slice.

## Evidence and decisions that remain open

| Control | Preserved state |
|---|---|
| Product Authority Map | `G-EMOPET-PRODUCT-AUTHORITY-MAP-01 = OPEN` |
| Claims control | `G-EMOPET-CLAIMS-CONTROL-01 = OPEN` |
| Experience Doctrine | `G-EMOPET-EXPERIENCE-DOCTRINE-01 = OPEN` |
| Surface necessity | `G-EMOPET-SURFACE-NECESSITY-01 = OPEN` |
| Veterinary Summary utility | `G-VETERINARY-SUMMARY-UTILITY-01 = NOT_TESTED` |
| MAT incremental value / #230 | `G-MAT-INCREMENTAL-VALUE-01 = OPEN`; protocol `NOT EXECUTED` |
| MAT Phase 0 | `G-MAT-PHASE0-EVIDENCE-MAP-01 = CONTROLLED_PLAN / EVIDENCE_NOT_EXECUTED` |
| MAT strategy/launch candidate | `CANDIDATE / OPEN / REQUIRES_FOUNDER_APPROVAL`; `NONE UNTIL APPROVED` |
| 90-day pilot / #231 | `G-EMOPET-90D-CONTINUITY-PILOT-01 = OPEN`; protocol `NOT STARTED` |

No MAT launch disposition is selected. No scientific endorsement, partnership, supplier manufacturing
release, legal clearance, clinical/scientific validation or surface release is created by this replay.
Issue states #230/#231 are checked on GitHub for the PR receipt, not inferred by the offline guard.

## Reproducible documentation checks

Run from the repository root with Node.js 20 or newer; no dependency installation is needed:

```sh
node scripts/docs/verify-int08-authorities.mjs
node --test scripts/docs/verify-int08-authorities.test.mjs
git -c core.whitespace=-blank-at-eol diff --check 51bfdde694903c7f0e4b759ae8914c1d18f15810
```

The guard checks eleven documents for controlled status/gate metadata, high-risk claim restrictions,
unexecuted Phase 0 tables, MAT zero-authority status, active terminology, stable historical identifiers
and local/pinned-source references. Negative tests demonstrate rejection of fabricated approvals/results,
claim promotion, hidden contradictory gates, missing doctrine, mutable source links and terminology drift.

The checker is a standalone review command, **not automatically wired into CI** in this slice.
The cross-domain `apps/web/lib/owner-terminology.test.ts` is deliberately not replayed.
Source Markdown hard line breaks (two trailing spaces) are retained. The whitespace command permits
those without changing Git configuration; script whitespace is also checked with default Git rules.

A PASS proves only the tested documentation constraints. It does not validate the product or replace
substantive review. Exact source hashes and the bounded terminology/reference delta provide the replay
provenance; the checker is not a general scientific-claim detector.

## Integration receipt

The draft PR records the commit SHA, local check results, observed GitHub CI outcomes and issue states.
Fresh CI belongs to this head; source-branch green checks cannot be borrowed. Any inherited baseline
failures remain explicit and must not be fixed by importing INT-01 or changing workflows in INT-08.

Keep DRAFT / UNMERGED. Closure of #264 and any promotion to `main` remain separate from this replay.
