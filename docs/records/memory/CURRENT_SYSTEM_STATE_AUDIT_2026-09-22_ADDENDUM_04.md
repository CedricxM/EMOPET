# EMOPET — Current System-State Audit — 22 September 2026 — Addendum 04

**Addendum date:** 2026-09-22
**Parent snapshot:** `CURRENT_SYSTEM_STATE_AUDIT_2026-09-22.md`
**Preceding addenda:** `…_ADDENDUM_01.md` (#70 closure, #86 window arithmetic), `…_ADDENDUM_02.md` (lockfile reproducibility, a guard's blind spot, one self-correction), `…_ADDENDUM_03.md` (five science features, four failure mechanisms)
**Status:** `CONTROLLED MEMORY / ADDENDUM — CREATES NO PRODUCT, SCIENTIFIC OR LEGAL AUTHORITY`
**Snapshot base:** `main@3fa5c5298247fc88412ce2c8294fdb4f36024f56`
**Reason for addendum:** reconstructing the two stranded P0 control registers (#114, #116) surfaced a failure mode in the *evidence layer itself*, not in a product or science surface. It belongs to neither issue alone.

Follows the established discipline: the parent remains accurate for its stated time; later evidence is recorded separately.

---

## 1. An evidence register can carry a fabricated pointer and look identical to one that does not

`docs/control/P0_THIRD_PARTY_DATA_RIGHTS_REGISTER.md` was drafted in PR #117 on 2026-09-02 and declared twelve 40-character Git blob identifiers as `REPOSITORY_FACT`. Re-verification at `main@3fa5c52`, on a full non-shallow clone of 2,370 commits:

| Outcome | Count | Detail |
|---|---:|---|
| Resolves exactly at the draft's own anchor | 5 | `real-datasets.json`, `local-directory-lorient.ts`, `sourceRegistry.ts`, `security-supply-chain.yml`, `vbo.json` |
| Resolves to **no Git object anywhere in history** | 7 | `MapboxMap.tsx`, `apps/web/package.json`, `STACK_GAPS.md`, and four `data/vbo/*` files |

The seven are not superseded revisions of those files. Each shares its **first four to eight hex characters** with the blob that actually sat at that same path at that same commit, then diverges:

| Path | Claimed | Real at `c099581` | Shared prefix |
|---|---|---|---:|
| `data/vbo/breed_canonical.json` | `9bf42bad1f52…` | `9bf42bad634c…` | 8 |
| `data/vbo/breed_canonical_insert.sql` | `5c15e3af0170…` | `5c15e3a27b7f…` | 7 |
| `apps/web/components/bretagne-map/MapboxMap.tsx` | `6ff422b58b3f…` | `6ff4220b7456…` | 6 |
| `data/vbo/dataset_version_insert.sql` | `a197f1590fd3…` | `a19791b1f2e9…` | 5 |
| `data/vbo/fci_unmatched.json` | `8b443cc753cb…` | `8b443825fbe6…` | 5 |
| `apps/web/package.json` | `b75623688965…` | `b756e28b1822…` | 4 |
| `docs/STACK_GAPS.md` | `c46c21646ac1…` | `c46ccd2d4d04…` | 4 |

Seven independent prefix collisions with the one blob at the same path is not coincidence. The consistent reading: a correctly observed **abbreviated** hash was expanded into a full 40-character string that was never read back.

What this means precisely, and what it does not:

- The **observations** behind those rows were real. Each narrow fact was re-verified independently for the reconstruction and every one held.
- The **pointers** recording them were not evidence. Nothing in the document distinguished a resolved identifier from an unresolved one; both were formatted identically and dated identically.
- This is not a rights or licensing failure. It is an integrity failure in a document whose entire purpose is to separate a label from a receipt.

### 1.1 The same check on #114 passed, which is what makes the finding specific

`P0_IP_PROVENANCE_EVIDENCE_REGISTER.md`, reconstructed from PR #115 earlier the same day, declared thirteen pointers and all thirteen resolved. The defect is not a house style. It is one document, and it was invisible until something resolved the strings.

## 2. I reproduced the same defect within an hour of documenting it

While drafting §4 of the reconstruction I wrote **seven placeholder 40-character hex strings** into the evidence table — `f48f0da2…`, `e4a2c4b1…`, `9d5a3ba0…`, `c8d9b5e6…`, `a3f7c2e9…`, `1f0b8c7d…`, `0c4e8a2b…` — intending to fill them in, in a table whose §0.1 documented that exact mechanism. They were replaced with `git rev-parse` output before anything was committed, and nothing fabricated reached the tree.

It was caught because a resolver existed, not because the draft was re-read carefully. Re-reading is what produced them.

The durable conclusion is narrower than "be careful":

> A hash, path, count or version written by hand into a controlled document is an unverified claim until a process resolves it. Prose review cannot distinguish a correct 40-character string from an incorrect one. The register must be machine-checkable, or it is not a register.

This sits alongside the method lesson in Addendum 03 §4 (a claim about composed behaviour must not be made from a single file). Both are failures of *derivation*, not of intent.

## 3. Counting columns hides what counting rows shows

The 2026-09-02 draft counted the Lorient seed field by field: 41 rows, 14/20/7/0 sources, 41 `sourceId: null`, 40 non-null `ratingAvg`, 25 `verified: true`. All twelve counts re-verified and hold. None of them could surface a contradiction *between* fields of the same row.

Parsing each row as an object gave three findings the column counts could not:

1. The seven `source: 'osm'` rows are **exactly** the seven rows with `phone: null`, and they also carry `sourceId: null` — so an OSM-labelled row has neither an upstream object identifier nor a contact field. Nothing ties it to OpenStreetMap but the label.
2. The seven sequence-pattern telephone values all sit on `source: 'manual'` rows already marked `verified: false`. Stated in the seed's favour: it is internally consistent there, and the draft's "7 obvious placeholder patterns" was more alarming than the evidence warranted.
3. One telephone value is shared by a `veterinaire` row claiming `source: 'ordre_veterinaires'` + `verified: true` and a `veterinaire` row claiming `source: 'manual'` + `verified: false`. One of the two is wrong, and with `sourceId: null` on both, nothing in the seed says which.

Finding 3 is the strongest single argument that `verified: true` carries no meaning in this seed, and it is invisible to every per-column count.

## 4. Four gates moved while the register was stranded

Between `c099581` (2026-09-02) and `3fa5c52` (2026-09-22), work landed on `main` that a carried-forward register would have misdescribed:

| Gate | Landed on `main` | Gate state |
|---|---|---|
| DATA-LIC-G2 | `data/vbo/committed-snapshot-evidence.json` proves the committed payload byte-identical to upstream commit `323e8a3d`; `scripts/data/vbo-committed-snapshot-audit.mjs` is wired into `p0-db-baseline.yml` | still `OPEN` |
| DATA-LIC-G3 | `local-directory-release-authority.ts` requires a reviewed repository record, not an env var; committed record is `HOLD` with null reviewer | still `HOLD` |
| DATA-LIC-G5 | `lib/map/mapSurface.ts` separates `unconfigured` / `unavailable` / `ready` and rejects a whitespace token | still `OPEN` |
| DATA-LIC-G6 | `evaluateBreizSourceRights` blocks on `NO_LICENCE_RECEIPT` / `NO_RECHECK_RULE`; `evaluateFreshness` returns `no_recheck_rule` rather than calling an unruled source fresh | still `OPEN` |

Two observations, in tension, both worth keeping:

- **Landed enforcement is not landed evidence.** With eight of nine Breiz licences still `null`, no catalogued source is currently ingestible — the code refuses correctly, and refusing correctly is not the item-level evidence G6 asks for. No gate closes.
- **A stranded register understates its own project.** Had #117's draft been merged unchanged on 2026-09-22, it would have described a permissive-by-omission Breiz default that no longer exists and a directory `HOLD` that is now enforced in code. Re-verification is not only about catching decay; it also catches progress that nobody recorded.

`data/vbo/breed_canonical_insert.sql` illustrates the sharper version: that path still exists, but the 1,052,766-byte artifact that occupied it is now `breed_canonical_insert.legacy.sql`, and the current file is a 538-byte fail-closed regeneration guard. A register re-using the old path without re-reading the tree would have described the wrong artifact under a correct-looking pointer.

## 5. What was changed in the repository

- `docs/control/P0_THIRD_PARTY_DATA_RIGHTS_REGISTER.md` — reconstructed at `main@3fa5c52`, §0.1 records the pointer finding, all eight gates stay `OPEN` (G3 `HOLD`), `G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN`.
- `scripts/control/control-register-pointer-audit.mjs` (+ test) — replaces the #114-only audit and covers both registers as `pnpm control:pointer-audit`. Its parser requires exactly 40 hex characters, so an abbreviated hash does not parse as a pointer at all: a pointer that parses is one the script claims to have checked. Verified to exit 1 on a tampered hash and 0 clean; 37 pointers resolve across both registers.

Neither artefact grants rights, clearance or release authority. #114 and #116 remain open.

## 6. Limits of this addendum

- It records repository-observable facts and one method finding. It is not legal, licensing or privacy review.
- The eight official-source checks carried from 2026-09-02 were **not** re-checked on 2026-09-22 and are marked as such in the register. Re-checking them with retained dated evidence is part of DATA-LIC-G1 and G5.
- No conclusion is drawn about who wrote the unresolvable identifiers or why. The mechanism is inferable from the prefix evidence; intent is not, and is not needed.
