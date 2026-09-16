# INT-01 — Forensic replay manifest (CI / repository safety foundation)

`STATUS = ANALYSIS ONLY / NO CONTROL PROMOTED / NOT RELEASE AUTHORITY`

Controlled record. Documentation only. This file promotes no security control, changes no
workflow, no dependency and no runtime code.

Parent integration control issue: #246
INT-00 control-plane PR: #247 (DRAFT, not modified by this record)
Candidate source PR: #224 (DRAFT, UNMERGED, NOT RELEASE AUTHORITY, not modified by this record)

---

## 1. Purpose

Issue #246 freezes PR #224 as a **candidate evidence/source branch** and forbids direct merge of
its ~464 commits. INT-01 is the first reconstructed slice: the CI / repository safety foundation.

This manifest answers one question and only that question:

> Which security / CI changes present on the PR #224 candidate head should later be replayed onto
> `main` as a focused INT-01 slice, and which must not?

It is a provenance and dependency investigation. It is not an implementation plan, not an
approval, and not evidence that any replay will be green. Implementation is handled separately.

Explicit scope boundary: this record classifies changes. It does not apply them.

---

## 2. Exact main / base SHA

```
main = 51bfdde694903c7f0e4b759ae8914c1d18f15810
```

Local verification: `git rev-parse main` at investigation time returned the same SHA.
Branch for this record: `chore/int01-replay-manifest-2026-09-15`, created directly from that SHA
(not from PR #224, not from PR #247).

---

## 3. Exact PR #224 source SHA

```
candidate head = 7e0d90445a3cf03b094d7037aa6addbfa6f2cc19
branch         = experience-hardening-2026-09-06
```

Confirmed by `git fetch origin experience-hardening-2026-09-06` → `FETCH_HEAD` =
`7e0d90445a3cf03b094d7037aa6addbfa6f2cc19`, and by the GitHub Actions API, which reports the same
`head_sha` for the known-green candidate runs listed in §13.

---

## 4. Investigation method

Evidence sources, in order of authority used here:

1. **Git object evidence.** `git diff 51bfdde…7e0d9044` restricted to `.github/`, `tools/`,
   `scripts/`, `docs/security/`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.gitleaks.toml`;
   per-path `git log` to attribute each change to exact candidate commits;
   `git cat-file -e <main-sha>:<path>` to prove presence/absence of each dependency on `main`.
2. **GitHub Actions API evidence.** Workflow run and job listings, plus raw job logs, for the
   candidate head, for the INT-00 branch, and for the in-flight INT-01 branch.
3. **Static reading of the audit scripts themselves**, extracting the repository paths each script
   reads, then testing each of those paths against `main`.

Anti-fabrication rule applied throughout: where git or Actions evidence does not establish a fact,
this record writes **UNKNOWN** rather than inferring it. Repository-level settings (CodeQL default
setup, branch protection, required checks) are **not** stored in git and are therefore treated as
unproven from this repository alone unless an Actions log states them.

No file outside `docs/strategy/INT01_REPLAY_MANIFEST_2026-09-15.md` was modified.

### 4.1 Observed baseline: what `main`'s own security workflow does today

Run `34954885132` (PR #247, branch `chore/pr224-integration-plan-2026-09-15`, head
`bddd8f390ea9155efdec503af01f79add440c702`, 2026-09-15) is a **documentation-only PR derived from
`main`**. It is therefore the cleanest available measurement of `main`'s current CI posture.

| Job | Conclusion | Note |
|---|---|---|
| `dependency-audit` | **FAILURE** | fails at `Enforce high/critical dependency gate` |
| `CodeQL JavaScript/TypeScript (best effort)` | **FAILURE** | fails at `analyze` (see §8) |
| `Generate CycloneDX/SPDX SBOM` | **FAILURE** | fails installing Syft (see §9) |
| `Dependency remediation regression` | success | |
| `Semgrep SAST` | success | |
| `Secret scan` | success | |
| `Release provenance gate` | success | |

The four `p0-db-*` jobs did not run: their `on.pull_request.paths` filters did not match a
docs-only change.

**Consequence for INT-01:** `main`'s "Security supply chain" workflow is **red today, on `main`'s
own content, for at least two deterministic reasons.** Any INT-01 replay branch inherits them
unless they are addressed. This is the single most important planning fact in this manifest.

**Reproduced independently (added after initial drafting).** This manifest's own PR (#254, head
`86c13bc0bc01116f39b3178387e06fffaeece3c5`, a one-Markdown-file diff from `main`) produced run
`35056251880`: `dependency-audit` `104666962583` **FAILURE** with the identical blocking advisory
set, and `CodeQL JavaScript/TypeScript (best effort)` `104666962723` **FAILURE** with the
byte-identical configuration-conflict error. Everything else was green.

That third run also **corrects the SBOM row above**: `Generate CycloneDX/SPDX SBOM` `104666962821`
**passed** on this `main`-derived head with the same action pin. The SBOM failure on the #247 head
was therefore transient rather than a standing `main` defect (§9), so `main`'s standing failure set
is **two**, not three. `dependency-audit` and the legacy `codeql` job are the deterministic ones.

---

## 5. File-by-file replay table

Dispositions: `REPLAY_INT01`, `DEFER_LATER_SLICE`, `SUPERSEDED`, `EVIDENCE_ONLY`,
`NEEDS_HUMAN_DECISION`.

### 5.1 `.github/workflows/security-supply-chain.yml`

Changed as a whole file; the analysis below is **per hunk**, because the hunks have different
dispositions and must not be replayed as one unit.

#### 5.1.1 Permissions block

| Field | Value |
|---|---|
| Path | `.github/workflows/security-supply-chain.yml` (top-level `permissions:`) |
| Change | `+actions: read`, `+checks: read`, `security-events: write` → `read` |
| Candidate commits | `218da3b` (adds `actions: read`), `5171c5d` (drops advanced-upload write), `dff582b`/`2273b95` (alert inventory reads) |
| Problem addressed | Least-privilege: the workflow no longer uploads SARIF, so `security-events: write` is unnecessary; it now *reads* Actions runs and code-scanning alerts, which needs `actions: read` + `security-events: read` |
| Belongs in INT-01 | Yes — but **only together with** §5.1.5 |
| Depends on AUTH / DB / runtime / later slice | No |
| Replayable independently on main | **No.** Dropping `security-events: write` while the legacy `analyze` step still exists would break SARIF upload for a different reason than today's. Bound to §5.1.5. |
| CI that must pass after replay | Whole `Security supply chain` workflow on a fresh head |
| If omitted | Workflow keeps an unused write scope; the CodeQL evidence job cannot read the Actions/alerts APIs |
| Does NOT prove | That branch protection or required-checks configuration is correct — that is repository settings, **UNKNOWN** from git |
| **Disposition** | **REPLAY_INT01** (bundled with §5.1.5) |

#### 5.1.2 Job `dependency-license-inventory`

| Field | Value |
|---|---|
| Path | `.github/workflows/security-supply-chain.yml`, job `dependency-license-inventory` |
| Candidate commits | `fa333ba` (2026-09-10, introduces), `9f40a3d` (2026-09-10, binds evidence metadata to PR head SHA) |
| Problem addressed | No exact-head, hash-pinned record of the dependency licence surface existed; the job captures `pnpm licenses list --json` + SHA-256 + metadata, explicitly classified `EVIDENCE_INVENTORY_NOT_LEGAL_CLEARANCE` |
| Belongs in INT-01 | Yes |
| Depends on AUTH / DB / runtime / later slice | **No.** Uses only `pnpm install --frozen-lockfile` and `pnpm licenses list`. Reads no application source. |
| Replayable independently on main | **Yes** — conditional on `pnpm install --frozen-lockfile` succeeding (see §7.1) |
| CI that must pass after replay | `Security supply chain / Dependency licence evidence inventory (not clearance)` |
| If omitted | No exact-head licence evidence; licence posture stays unmeasured and undated |
| Does NOT prove | Licence **compatibility**, legal clearance, or redistribution rights. The job's own metadata says so. It is an inventory, not a clearance. |
| **Disposition** | **REPLAY_INT01** |

#### 5.1.3 Job `authority-gates`

| Field | Value |
|---|---|
| Path | `.github/workflows/security-supply-chain.yml`, job `authority-gates` (9 steps) |
| Candidate commits | `725aec2`, `b54ffec`, `aeeecd9`, `63a6bc3`, `c199d23`, `8d14690`, `46e0d63`, `ece93bc` (full mapping in §6.4) |
| Problem addressed | Static, fail-closed enforcement of rights, privacy, content, professional-sharing and CRA-readiness invariants |
| Belongs in INT-01 | **Partially.** One step yes, eight steps no. See §5.4 and §7.2. |
| Depends on AUTH / DB / runtime / later slice | **Yes, heavily** — see §7.2 |
| Replayable independently on main | **No, as a whole job** |
| **Disposition** | **SPLIT** — `cra-srp:audit` step → `REPLAY_INT01`; all eight remaining steps → `DEFER_LATER_SLICE` |

#### 5.1.4 Job `semgrep-sast`, `secret-scan`, `provenance-note`, `sbom`, `dependency-audit`, `security-regression`

| Field | Value |
|---|---|
| Change between main and candidate | **None.** `git diff` shows no hunk touching these jobs. |
| Candidate commits | n/a — byte-identical at both SHAs |
| **Disposition** | **EVIDENCE_ONLY** — nothing to replay. `dependency-audit` is red on `main` because of *lockfile content*, not workflow content (§7.1). The SBOM job failed once for an *external* reason and has since passed twice on the same pin (§9). |

#### 5.1.5 Job `codeql` — legacy advanced path → managed-evidence verification

| Field | Value |
|---|---|
| Path | `.github/workflows/security-supply-chain.yml`, job `codeql` |
| Change | Replaces `github/codeql-action/init` + `analyze` with a Node verifier that requires a successful **GitHub-managed** CodeQL run for the exact head, plus a zero-open-alert inventory; check name preserved; `continue-on-error` removed; `timeout-minutes: 12` added |
| Candidate commits | `ee7cc37`, `218da3b`, `58e4423`, `9fa2aed`, `5171c5d`, `dff582b`, `2273b95`, `04d6d3a`, `e64b117` (full chain in §6.2) |
| Problem addressed | The legacy advanced path **cannot** upload SARIF while default setup is enabled (§8); it was either silently non-blocking or hard-failing. The replacement makes CodeQL a real blocking gate by verifying the managed run instead of duplicating it. |
| Belongs in INT-01 | Yes — this is the core of INT-01's CodeQL work |
| Depends on AUTH / DB / runtime / later slice | **No application dependency.** But see the settings dependency below. |
| Replayable independently on main | **Conditionally.** It is file-independent of product code, but it hard-depends on a **repository setting**: CodeQL default setup enabled with *exactly* `actions`, `c-cpp`, `javascript-typescript`, `python`. That list is hard-coded in `requiredJobs`. It is **not** in git → **UNKNOWN** from this repository whether it is configured identically for `main`-based branches. |
| CI that must pass after replay | `Security supply chain / CodeQL JavaScript/TypeScript` **and** a green managed `dynamic/github-code-scanning/codeql` run on the same head |
| If omitted | CodeQL stays as it is on `main` today: a job that always fails with a configuration error and blocks nothing useful (§8) |
| Does NOT prove | Absence of vulnerabilities. It proves that the managed analysis *ran successfully* for the exact commit and reported **zero open CodeQL alerts for that target**. Zero alerts is not a security guarantee; it is a tool result at one point in time, with that tool's query suite and known limits. |
| **Disposition** | **REPLAY_INT01**, with a flagged settings dependency (§15, Q1) |

#### 5.1.6 Supporting scripts for §5.1.5

| Path | Candidate commits | Disposition |
|---|---|---|
| `scripts/security/verify-codeql-default-setup.mjs` | `5171c5d`, `dff582b`, `2273b95`, `04d6d3a`, `e64b117` | **REPLAY_INT01** (new file on `main`; no runtime dependency; uses only Node built-ins + `fetch`) |
| `scripts/security/verify-codeql-default-setup.test.mjs` | `5171c5d`, `dff582b`, `2273b95`, `e64b117` | **REPLAY_INT01** (pure `node --test`, no install needed; runs before the verifier in the job) |

Both files are absent from `main` (`git cat-file -e` → absent). Neither imports application code.

### 5.2 `.github/workflows/p0-db-baseline.yml`

| Field | Value |
|---|---|
| Change | +81/−28. Path filters widened to AUTH / professional-share / sensors / data-export / community / privacy configs; migrations applied by `find … | sort` loop instead of a hard-coded 0001–0004 list; `EMOPET_DB_INTEGRATION_TEST` env added; new steps: ID-01 referential integrity, AUTH-01 route integration, Community feed integration, PRIV-DISC-01 subject discovery |
| Candidate commits | `957546d`, `20bae53`, `9c74d47`, `9820cb0`, `b2af634`, `54f0af7`, `f014bd8`, `a02f1db`, `bcb6050`, `294560a`, `7569c73`, `dbe7524`, `1641105`, `ce57ed7` |
| Problem addressed | Migration application that does not silently skip new migrations; DB-backed proof for AUTH, community, privacy discovery |
| Depends on | **AUTH (INT-02), Community (INT-06), Privacy/export (INT-04), and migrations 0006–0013** |
| Replayable independently on main | **No.** `main` contains migrations `0001`–`0005` only. The new steps invoke `backend/test/auth-routes-postgres.test.mjs`, `auth-session-concurrency.test.mjs`, `community-feed.integration.test.mjs`, `subject-discovery-postgres.test.mjs`, `id-01-referential-integrity.sql` — none of which exist on `main`. |
| If omitted | The DB baseline keeps `main`'s narrower coverage; no INT-01 control is lost |
| Does NOT prove | Production database safety, migration reversibility, or data-loss behaviour under real load |
| **Disposition** | **DEFER_LATER_SLICE** → INT-02 (AUTH parts), INT-04 (privacy parts), INT-06 (community parts). The `find | sort` migration-loop hunk is the only genuinely generic improvement, and it is **inert on `main`** (it enumerates the same 0001–0005 set), so it carries no INT-01 value on its own. |

### 5.3 `.github/workflows/p0-db-upgrade-rehearsal.yml` and `.github/workflows/p0-db-authority-parity.yml`

| Field | Value |
|---|---|
| Status on main | **Absent.** Both are new files on the candidate. |
| Candidate commits | Rehearsal: `a4bf647`, `f85e844`, `3cc24dd` (all 2026-09-13). Parity: `3160d59`, `85181af`, `7efc903` (all 2026-09-13). |
| Problem addressed | Rehearsal: populated-database upgrade proof across the migration chain, including a fail-closed proof that `0013` *refuses* to run against non-canonical identity rows. Parity: fingerprint comparison between checked-in historical migrations and freshly generated Drizzle authority. |
| Depends on | `backend/db/migrations/0012_*.sql`, `0013_*.sql`, `backend/db/baseline-draft/**`, and eight `backend/test/migration-*.sql` / `*-fingerprint.sql` fixtures — **all absent from `main`** (verified individually) |
| Replayable independently on main | **No.** Both workflows would either never trigger (path filters match nothing on `main`) or fail immediately on missing SQL fixtures. |
| If omitted | No upgrade-rehearsal or schema-parity proof — but there is nothing on `main` for them to prove |
| Does NOT prove | Production upgrade safety; these run on disposable PostgreSQL with synthetic seed data |
| **Disposition** | **DEFER_LATER_SLICE** → the slice that brings migrations 0006–0013 (INT-02 onward). Replaying the workflow files without their fixtures would add red checks with zero security value. |

### 5.4 `scripts/security/` — CRA and professional-sharing audits

| Path | Candidate commits | Reads | On main | Disposition |
|---|---|---|---|---|
| `scripts/security/cra-srp-readiness-audit.mjs` | `c199d23` (2026-09-10), `af4268f` (2026-09-10, fixes negation false positives) | 3 documents only: `docs/security/CRA_SRP_LAUNCH_CRITICAL_2026-09-10.md`, `docs/security/INCIDENT_LOG_TEMPLATE.md`, `docs/security/CRA_INCIDENT_RESPONSE.md` | absent | **REPLAY_INT01** — with its three documents |
| `scripts/security/professional-share-authority-audit.mjs` | `6a2aa94`, `b790369`, `9820cb0`, `07bd11c`, `7ab3fd7`, `aa12d0b`, `00bd465`, `5a906b4`, `ccbbdec`, `0b2373f`, `4cc6b98`, `75dbae2` | 17 paths across `backend/api/services/professional-share-*`, `backend/db/schema/professional-sharing.ts`, migrations `0006`/`0009`, `packages/shared/**`, `apps/mobile/**` | **all absent** | **DEFER_LATER_SLICE** → INT-05 |

The CRA audit is a genuine repository-owned static gate: it is a marker check over three controlled
security documents and reads **no application source at all**. Of its three inputs,
`CRA_INCIDENT_RESPONSE.md` and `INCIDENT_LOG_TEMPLATE.md` already exist on `main` but lack the
markers the audit requires; `CRA_SRP_LAUNCH_CRITICAL_2026-09-10.md` is absent. All three come from
commit `c199d23`.

### 5.5 `scripts/privacy/**`, `scripts/data/**`, `scripts/content/**`, `scripts/mobile-home-authority-audit.mjs`

| Path | Candidate commits | Blocking dependency on main | Disposition |
|---|---|---|---|
| `scripts/privacy/consent-defaults-audit.mjs` | `63a6bc3` | `apps/mobile/src/store/preferences.ts` present, but the audit asserts candidate-era default values | **DEFER_LATER_SLICE** → INT-04 |
| `scripts/privacy/privacy-audio-audit.mjs` | `8d14690` | `packages/ble-protocol/src/feature-boundary.ts` **absent** | **DEFER_LATER_SLICE** → INT-03/INT-04 |
| `scripts/privacy/privacy-location-audit.mjs` | `46e0d63` | `apps/mobile/app/settings/behavior.tsx`, `backend/test/sensor-runtime.integration.test.mjs` | **DEFER_LATER_SLICE** → INT-04 |
| `scripts/privacy/processors-transfers-audit.mjs` | `ece93bc` | `config/privacy/runtime-egress-inventory.json` **absent**, `apps/web/lib/mapbox-rights.ts` **absent** | **DEFER_LATER_SLICE** → INT-07 |
| `scripts/data/rights-gate-audit.mjs` | rights chain | `docs/control/EMOPET_THIRD_PARTY_DATA_RIGHTS_REGISTER_v0.2.md` **absent**, `apps/web/lib/mapbox-rights.ts` **absent** | **DEFER_LATER_SLICE** → INT-07 |
| `scripts/data/dataset-rights-release-audit.mjs` | rights chain | `data/registry/receipts/**` | **DEFER_LATER_SLICE** → INT-07 |
| `scripts/data/vbo-committed-snapshot-audit.mjs` | rights chain | `data/vbo/committed-snapshot-evidence.json` **absent** | **DEFER_LATER_SLICE** → INT-07 |
| `scripts/data/register-dataset-file.mjs` | rights chain | dataset registry runtime | **DEFER_LATER_SLICE** → INT-07 |
| `scripts/mobile-home-authority-audit.mjs` | `b54ffec` | `apps/mobile/app/devices.tsx` **absent** | **DEFER_LATER_SLICE** → INT-09 |
| `scripts/content/legacy-freemium-authority-audit.mjs` | `aeeecd9` | `backend/db/seeds/freemium-templates-*` | **DEFER_LATER_SLICE** → INT-06/INT-08 |
| `scripts/ingest_vbo.ts` (2-line change) | rights chain | runtime ingestion script | **DEFER_LATER_SLICE** → INT-07 |

Every one of these is a *real* control. None of them is an INT-01 control, because each one asserts
invariants about code that does not exist on `main`. Replaying any of them into INT-01 would make
INT-01 fail for reasons that belong to INT-03 through INT-09.

### 5.6 `tools/security/evaluate-pnpm-audit.mjs`

| Field | Value |
|---|---|
| Change | **None.** Byte-identical at `51bfdde` and `7e0d9044`. |
| **Disposition** | **EVIDENCE_ONLY** — no replay. Note its two hard-coded `image-size` exceptions expire `2026-11-30T23:59:59Z`; after that date the gate blocks on them with no code change. That is a scheduled future failure, recorded here, not an INT-01 action. |

### 5.7 `.gitleaks.toml`

| Field | Value |
|---|---|
| Status on main | **Absent** (new file on candidate) |
| Candidate commit | `453bd4d` (2026-09-12, "ci(security): allowlist reviewed gitleaks false positive") |
| Content | One fingerprint: `143b99bb566738d1719840d910f7ccc1850129cc:ARCHITECTURE.md:generic-api-key:170` |
| Key finding | Commit `143b99b` is **not an ancestor of `main`** (`git merge-base --is-ancestor` → false). The fingerprint would not match anything on a `main`-derived branch. |
| Evidence that it is unnecessary | `Secret scan` is **green** on the `main`-derived INT-00 branch (run `34954885132`, job `104334429445`) with no `.gitleaks.toml` present |
| If omitted | Nothing. The allowlist addresses a finding that only exists in candidate history. |
| Does NOT prove | Absence of secrets in history |
| **Disposition** | **DEFER_LATER_SLICE** — replay it only alongside whichever slice brings commit `143b99b`'s `ARCHITECTURE.md` content. Adding it to INT-01 would introduce an allowlist entry that suppresses nothing, which is worse than no file. |

### 5.8 `.github/workflows/lockfile-refresh.yml`

| Field | Value |
|---|---|
| Lifecycle | Added `b4390be` (2026-09-09) → modified `be94730`, `6c79f63`, `e810531` → **removed `2a954b6`** (2026-09-09) |
| Status at candidate head | **Absent** — deliberately deleted by its own author on the same day |
| Purpose while it existed | One-shot regeneration of `pnpm-lock.yaml` from controlled workspace overrides, uploaded as an artifact rather than committed to the branch |
| **Disposition** | **SUPERSEDED** — do not replay. Recorded here because it is direct evidence of *how* the lockfile in §7.1 was produced, which matters for reproducing the remediation correctly. |

### 5.9 `docs/security/**`

| Path | Candidate commits | Disposition |
|---|---|---|
| `docs/security/CRA_SRP_LAUNCH_CRITICAL_2026-09-10.md` (new, +164) | `c199d23` | **REPLAY_INT01** (required input to the CRA audit) |
| `docs/security/CRA_INCIDENT_RESPONSE.md` (+171/−…) | `c199d23` | **REPLAY_INT01** (required markers) |
| `docs/security/INCIDENT_LOG_TEMPLATE.md` (+25) | `c199d23` | **REPLAY_INT01** (required fields) |
| `docs/security/CRA_SRP_OPERATOR_HANDOFF_CHECKLIST_2026-09-10.md` (new, +84) | `c199d23` | **REPLAY_INT01** (same commit; carry for coherence) |

These are documentation. They record an **organisational readiness posture**, not a technical
control, and not CRA compliance.

---

## 6. Commit provenance

### 6.1 Attribution method

Every commit below was obtained with
`git log --format='%h %ad %s' --date=short 51bfdde..7e0d9044 -- <path>` against the fetched
candidate branch. Full bodies were read with `git log -1 --format='%B'` where the message carries
forensic content. No commit in this section is inferred, reconstructed, or paraphrased from a PR
description.

### 6.2 CodeQL chain (chronological, with the reasoning each commit records)

| Commit | Date | Subject | What it tells us |
|---|---|---|---|
| `ee7cc37` | 2026-09-09 | ci: make best-effort CodeQL non-blocking but visible | Moves `continue-on-error` from job level to the `analyze` step and prints the outcome to the step summary. The author was already working around a failing upload. |
| `218da3b` | 2026-09-10 | CI-01: make CodeQL analysis upload a blocking gate | Removes `continue-on-error` entirely, renames the check (drops "best effort"), adds `actions: read`. |
| `58e4423` | 2026-09-10 | ci: preserve CodeQL SARIF when code scanning upload fails | Body: *"Keep the analysis/upload gate blocking and retain exact-run evidence for #74."* Adds `output: codeql-results` + artifact upload. **The subject line is direct authorial evidence that the upload was failing.** |
| `9fa2aed` | 2026-09-10 | ci: preserve distinct CodeQL evidence on reruns | Adds `-attempt-${{ github.run_attempt }}` to the artifact name so a rerun cannot overwrite prior evidence. |
| `5171c5d` | 2026-09-10 | ci: gate Security on verified CodeQL default setup results | **The pivot.** Body states: *"The enabled GitHub default setup successfully uploads analysis, while advanced uploads conflict with that configuration."* Introduces the verifier + its test, requires all four language jobs, removes the now-unused advanced-upload permission. |
| `dff582b` | 2026-09-13 | ci(security): gate native CodeQL findings | Extends the verifier from "did it run" to "are there open alerts". |
| `2273b95` | 2026-09-14 | ci(security): verify CodeQL alerts directly | Queries the code-scanning alerts REST API directly (`pr=` or `ref=` target). |
| `04d6d3a` | 2026-09-14 | ci(security): surface CodeQL alert locations | Adds `formatCodeqlAlert` so failures name rule + `path:line`. |
| `e64b117` | 2026-09-14 | fix(ci): tolerate CodeQL jobs API propagation lag | Adds `codeqlJobEvidenceState` + retry-until-deadline. The code comment records the cause: GitHub can mark the aggregate run completed seconds before its jobs endpoint is consistent. |

### 6.3 Dependency remediation chain — **overrides and lockfile are one unit**

| Commit | Date | Files touched | Content |
|---|---|---|---|
| `fa756ca` | 2026-09-08 | `pnpm-workspace.yaml` | `fast-uri` 3.1.5→3.1.7, adds `browserslist` 4.28.7 |
| `629801d` | 2026-09-08 | `pnpm-workspace.yaml` | `minimumReleaseAgeExclude` for the quarantined patch releases |
| `f93e874` | 2026-09-08 | `pnpm-workspace.yaml` | adds `trustPolicyExclude: [semver@6.3.1]` (Babel legacy 6.x range) |
| `776b45c` | 2026-09-08 | `pnpm-lock.yaml` **only** | +53/−46 — lockfile for the three commits above |
| `b4390be` | 2026-09-09 | `pnpm-workspace.yaml`, `.github/workflows/lockfile-refresh.yml`, `backend/test/dog-crud.integration.test.mjs`, `backend/test/health-runtime-truth.test.mjs` | `@xmldom/xmldom` 0.8.13→**0.8.15**, `sharp` 0.35.0→**0.35.4**, `js-yaml` 4.3.1→**4.3.2** — **mixed with a backend test relocation** |
| `f6d1a3a` | 2026-09-09 | `pnpm-workspace.yaml` | temporary `undici-types` trust exception |
| `90ebdb5` | 2026-09-09 | `pnpm-workspace.yaml` | removes that temporary exception |
| `63f21eb` | 2026-09-09 | `pnpm-lock.yaml` **only** | +151/−144 — lockfile for `b4390be`…`90ebdb5` |
| `2a954b6` | 2026-09-09 | `.github/workflows/lockfile-refresh.yml` | deletes the temporary workflow |

`b4390be` is the **only** commit in this chain that is not cleanly separable: it carries the three
advisory-closing overrides *and* an unrelated relocation of a DB-backed runtime test between
`health-runtime-truth.test.mjs` and `dog-crud.integration.test.mjs`. A replay must take the
`pnpm-workspace.yaml` hunk and leave the two `backend/test/**` hunks behind.

### 6.4 Authority-gate chain (for the deferred slices' benefit)

`725aec2` (rights + professional sharing), `b54ffec` (mobile Home), `aeeecd9` (legacy freemium),
`63a6bc3` (consent defaults), `c199d23` + `af4268f` (CRA SRP), `8d14690` (raw audio),
`46e0d63` (location), `ece93bc` (processor/transfer egress). Each adds one `authority-gates` step
plus its script in the same or an adjacent commit.

---

## 7. Dependency / coupling analysis

### 7.1 The dependency-audit failure on `main`, and why a lockfile-only replay cannot fix it

`main`'s `dependency-audit` job fails today. Run `34954885132`, job `104334429273`,
step `Enforce high/critical dependency gate`, `2026-09-15T09:52:44Z`, exit code 1. The evaluator
printed these **blocking** high-severity advisories:

| Module | GHSA | Path | Patched |
|---|---|---|---|
| `@xmldom/xmldom` (8 advisories) | needing ≥0.8.14: `GHSA-w2rr-34g9-rvrj`, `GHSA-4w3w-2rp5-g8jm` · needing ≥0.8.15: `GHSA-c7q8-3ch8-vqpv`, `GHSA-27p8-2357-5qqv`, `GHSA-8344-3jmq-59r6`, `GHSA-x4fp-j954-r2f4`, `GHSA-965w-775f-mr7g`, `GHSA-93r5-fhx6-vmg9` | `apps__mobile>expo>@expo/cli>@expo/plist>@xmldom/xmldom` | ≥0.8.15 covers all 8 |
| `sharp` | `GHSA-rgj7-g3m4-5g8c` | `apps__web>next>sharp` | ≥0.35.4 |
| `js-yaml` | `GHSA-2883-xcg3-v3hh` | `apps__mobile>expo>@expo/cli>@expo/xcpretty>js-yaml` | ≥4.3.2 |

and accepted the two path-bounded, expiring `image-size` exceptions.

*Enumeration note:* the initial draft of this table listed six `@xmldom/xmldom` advisories plus
"one requiring ≥0.8.14", from a truncated log tail. The complete set is **eight**, fully
enumerated above, confirmed on run `35056526071` job `104667780589`. The remediation is
unchanged — the single override `@xmldom/xmldom: 0.8.15` closes all eight — so no disposition,
slice assignment or Step 0 content changes. Corrected for evidence accuracy.

**The remediation is not in `package.json`.** `package.json` is byte-identical between `main` and
the candidate — same scripts (minus the nine audit scripts), same `devDependencies`, same
`packageManager`. The fix lives in **`pnpm-workspace.yaml` `overrides`**:

```
"@xmldom/xmldom": 0.8.13 → 0.8.15
"sharp@>=0.34.0 <0.35.0": 0.35.0 → 0.35.4
js-yaml: 4.3.1 → 4.3.2
fast-uri: 3.1.5 → 3.1.7
+ browserslist: 4.28.7
+ trustPolicyExclude: [semver@6.3.1]
minimumReleaseAgeExclude: [js-yaml@4.3.1] → [fast-uri@3.1.7, browserslist@4.28.7]
```

**Direct evidence that lockfile-only replay fails.** *Historical — 2026-09-15 morning. See the
resolution note at the end of this subsection for the current state of PR #249.* The INT-01 branch
`chore/int-01-security-baseline-2026-09-15` (PR #249) at that time replayed `776b45c` and then
`63f21eb` as lockfile-only commits. Result, run `34957448675`, head
`921928d8c383b1f370f9de4d5734e1cf7e217e36`, `2026-09-15T10:21:03Z`:

- job `104342811266` `dependency-audit` — step `Install exact locked dependency graph`
  (`pnpm install --frozen-lockfile`) **FAILURE**;
- job `104342810955` `Dependency remediation regression` — step `pnpm install --frozen-lockfile`
  **FAILURE**, every downstream step skipped, `Enforce regression gate` failure.

Both preceding runs on that branch (`34957354575`, `34957247090`) also failed.

**Conclusion.** The lockfile and `pnpm-workspace.yaml` are a single atomic unit. Replaying the
lockfile without the paired overrides produces a lockfile that does not satisfy
`--frozen-lockfile` against `main`'s workspace configuration, and converts a *meaningful* audit
failure into a *meaningless* install failure — strictly worse, because the audit no longer runs at
all. This is recorded as a finding, not as an instruction to edit either file; neither
`package.json` nor `pnpm-lock.yaml` was touched by this record.

**Resolved on 2026-09-15 evening — PR #249 is no longer failing.** #249 subsequently reconciled
`pnpm-workspace.yaml` and `pnpm-lock.yaml` atomically, replaying each lockfile commit only after
verifying its parent lock blob matched the target state, and aligned the workspace overrides to the
15 September advisory floors (`@xmldom/xmldom` `0.8.15`, `sharp` `0.35.4`, `js-yaml` `4.3.2`,
`fast-uri` `3.1.7`, `browserslist` `4.28.7`). On head `21cf495c517a292bea072fde7b8ea4e6d558ac00`,
frozen-lockfile install, the dependency gate and the full regression job all pass
(run `35014465139`). The three failing runs above are **historical evidence for why the atomic
pairing is required** — they are not the current state of #249, and nothing in this document should
be read as saying #249 is still failing.

### 7.2 `authority-gates` coupling, step by step

| Step | Script | Blocking absent path on `main` | Owning slice |
|---|---|---|---|
| `rights:audit` | 3 scripts | `data/vbo/committed-snapshot-evidence.json`, `docs/control/EMOPET_THIRD_PARTY_DATA_RIGHTS_REGISTER_v0.2.md`, `apps/web/lib/mapbox-rights.ts` | INT-07 |
| `professional-share:audit` | 1 script | `backend/api/services/professional-share-access.ts`, `backend/db/schema/professional-sharing.ts`, `docs/control/EMOPET_OWNER_PROFESSIONAL_SHARING_v0.1.md`, migrations `0006`/`0009` | INT-05 |
| **`cra-srp:audit`** | 1 script | **none — reads 3 documents only** | **INT-01** |
| `consent-defaults:audit` | 1 script | asserts candidate-era defaults in `apps/mobile/src/store/preferences.ts` | INT-04 |
| `privacy-audio:audit` | 1 script | `packages/ble-protocol/src/feature-boundary.ts` | INT-03/INT-04 |
| `privacy-location:audit` | 1 script | `apps/mobile/app/settings/behavior.tsx`, `backend/api/routes/feature-progress.ts` (present but candidate-era) | INT-04 |
| `processors-transfers:audit` | 1 script | `config/privacy/runtime-egress-inventory.json`, `apps/web/lib/mapbox-rights.ts` | INT-07 |
| `mobile-home:audit` | 1 script | `apps/mobile/app/devices.tsx` | INT-09 |
| `legacy-freemium:audit` | 1 script | `backend/db/seeds/freemium-templates-*` | INT-06/INT-08 |

**One step out of nine is INT-01 material.**

### 7.3 `package.json` script coupling

The `authority-gates` job invokes `pnpm <name>:audit`. The candidate's `package.json` declares
nine such scripts; `main`'s declares none. Any replay of any `authority-gates` step therefore
requires a corresponding `package.json` `scripts` entry. For the INT-01 subset that is exactly one
line:

```
"cra-srp:audit": "node scripts/security/cra-srp-readiness-audit.mjs"
```

This manifest does **not** make that edit. It is recorded as a required input for the implementing
slice.

### 7.4 CodeQL settings coupling

`scripts/security/verify-codeql-default-setup.mjs` hard-codes:

```js
const workflowPath = 'dynamic/github-code-scanning/codeql';
const requiredJobs = ['Analyze (actions)', 'Analyze (c-cpp)',
                      'Analyze (javascript-typescript)', 'Analyze (python)'];
```

This couples INT-01 to a repository setting that is not versioned. If default setup is ever
reconfigured to a different language set, the verifier fails closed on a *configuration* change
rather than a *security* change. That is defensible behaviour for a security gate, but it must be
a conscious decision (§15, Q1).

### 7.5 Slice-dependency summary

| Dependency | INT-01 replay set |
|---|---|
| AUTH (INT-02) | **None** |
| Database schema / migrations | **None** |
| Application runtime (web / mobile / backend) | **None** |
| Community (INT-06) | **None** |
| Guardian / professional sharing (INT-05) | **None** |
| Breiz / external rights (INT-07) | **None** |
| Repository settings (CodeQL default setup) | **Yes — hard dependency, unversioned** |
| `pnpm-workspace.yaml` + `pnpm-lock.yaml` as an atomic pair | **Yes** |
| `package.json` scripts (one line) | **Yes** |

---

## 8. CodeQL forensic findings

### 8.1 Which workflows and configurations exist

| Path | Where | Status |
|---|---|---|
| `codeql` job inside `.github/workflows/security-supply-chain.yml` | git, on `main` | the **legacy/transitional advanced path** |
| `dynamic/github-code-scanning/codeql` | GitHub-managed, **not in git** | the **managed default-setup path** |
| A standalone `codeql.yml` workflow or `.github/codeql/*` config | — | **has never existed.** `git log --all --diff-filter=A --name-only -- '.github/workflows/*codeql*' '.github/codeql*'` returns nothing. |

So "legacy CodeQL setup" on `main` means precisely: one job, inside the security workflow, running
`github/codeql-action/init` + `analyze` pinned at `db488ddef3bf6cb639b32c2e9a7c0a7ea8271d28`
(v4.37.8), `languages: javascript-typescript`, `continue-on-error: true`.

### 8.2 Which path failed, and the exact failure reason

**The legacy advanced path failed.** Verbatim, from run `34954885132`, job `104334429358`
(`CodeQL JavaScript/TypeScript (best effort)`), step 4:

```
2026-09-15T09:53:24.2050453Z Successfully uploaded results
2026-09-15T09:53:29.3940634Z Analysis upload status is failed.
2026-09-15T09:53:29.3971834Z ##[error]Code Scanning could not process the submitted SARIF file:
CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled
2026-09-15T09:53:31.2474527Z CodeQL job status was configuration error.
```

Note the sequence precisely: CodeQL **extracted, analysed, exported SARIF and transmitted it
successfully**. The failure is entirely on GitHub's ingestion side, and GitHub itself classifies it
as `configuration error`.

### 8.3 Was the failure caused by configuration?

**Yes — evidenced, not inferred.** Two independent sources agree:

1. GitHub's own error string names the cause: advanced-configuration analyses cannot be processed
   while default setup is enabled.
2. Commit `5171c5d` (2026-09-10) records the same conclusion contemporaneously and independently:
   *"The enabled GitHub default setup successfully uploads analysis, while advanced uploads
   conflict with that configuration."*

### 8.4 Duplication between workflows

**Confirmed and quantified.** On the candidate head both paths ran against
`7e0d90445a3cf03b094d7037aa6addbfa6f2cc19` at the same time:

- managed run `34870076326` (`path: dynamic/github-code-scanning/codeql`, `event: dynamic`,
  4 jobs) — `Analyze (python)` `104063499028`, `Analyze (javascript-typescript)` `104063499420`,
  `Analyze (c-cpp)` `104063499435`, `Analyze (actions)` `104063499634`, **all success**, each with
  a successful `Perform CodeQL Analysis` step;
- the in-workflow `codeql` job `104063518879` in run `34870082065`.

The managed path covers **four** languages including `javascript-typescript`; the legacy path
covered **one**, `javascript-typescript`. So on the candidate head the legacy path's coverage was a
strict subset of the managed path's — while still competing with it for SARIF ingestion. The
candidate's fix removes the duplicate *analysis* and keeps the check *name*, deliberately: the
workflow comment says so, and preserving the name preserves any required-status-check
configuration that references it.

### 8.5 Permissions

`main`'s workflow grants `security-events: write` — correct for the legacy path (SARIF upload),
and unused by it in practice since the upload is rejected downstream. The candidate reduces it to
`security-events: read` and adds `actions: read` + `checks: read`, matching what the verifier
actually calls (`/actions/runs`, `/actions/runs/{id}/jobs`, `/code-scanning/alerts`).

**Permissions were not the cause of the failure.** The log shows `Successfully uploaded results`
before the rejection — the token was sufficient to transmit. The rejection is a server-side
configuration conflict.

### 8.6 Repository settings

CodeQL default setup is **enabled**, with `actions`, `c-cpp`, `javascript-typescript` and `python`.
Evidence: the four named managed jobs above, plus GitHub's rejection message which asserts default
setup is enabled.

**Corroborated on a `main`-derived head (added after initial drafting).** This manifest's own PR
(#254, head `86c13bc0bc01116f39b3178387e06fffaeece3c5`, a one-Markdown-file diff from `main`)
produced managed run `35056246000` with the same four language jobs — `Analyze (actions)`
`104666947212`, `Analyze (c-cpp)` `104666947022`, `Analyze (python)` `104666947220`,
`Analyze (javascript-typescript)` `104666947239` — **all success**, while the legacy advanced job
`104666962723` on the same head failed with the byte-identical configuration-conflict error.

This establishes two things that candidate-head evidence alone could not: default setup is enabled
with the **same four languages** for `main`-derived branches, and the legacy path's conflict is not
specific to candidate content. It does **not** establish the remaining items below.

**UNKNOWN from repository evidence:**
- when default setup was enabled, and by whom;
- whether the language selection is stable over time, or differs for `push` events on `main`
  (only `pull_request` heads have been observed);
- whether `CodeQL JavaScript/TypeScript` is configured as a **required** status check on `main`
  (branch-protection settings are not in git and were not queried);
- whether managed CodeQL is configured to run on `push` to `main` as well as on `pull_request`.

### 8.7 External GitHub failure?

**No.** No 5xx, no timeout, no service-degradation signature in the CodeQL logs. The failure is a
deterministic, reproducible configuration rejection. Contrast with §9, which *is* an external
failure and looks completely different.

### 8.8 Conclusion, stated conservatively

The evidence establishes that **the legacy advanced path cannot currently upload SARIF** while
default setup is enabled, and that this is a configuration conflict, not a permissions problem, not
a code problem, and not a GitHub outage.

The evidence **does not** establish that the legacy path is obsolete. Per the standing instruction,
the managed path passing is not sufficient grounds for removal. Nothing in this record deletes or
modifies CodeQL.

### 8.9 What evidence would be required before removing or replacing the legacy path

All of the following, before any removal:

1. A repository-settings export, or a screenshot/API capture, proving default setup is enabled for
   the **target branch** (`main`), with its exact language list — not only for PR heads.
2. Proof that the managed path runs on the **events INT-01 needs** (at minimum `pull_request` and
   `push` to `main`), with run IDs for each event type.
3. A query-suite comparison: default setup's suite vs. the advanced configuration's effective
   suite, demonstrating no loss of coverage for `javascript-typescript` — including whether
   default setup uses `default` or `security-extended`. **Currently UNKNOWN.**
4. The branch-protection / required-checks configuration, proving which check name is required, so
   that renaming or removing a job cannot silently drop a required gate.
5. At least one fresh green run of the replacement verifier on a **`main`-derived** head — the
   candidate-head evidence in §13 does not transfer.
6. A recorded decision on §15 Q1 (what should happen when default setup's language list changes).

Until all six exist, the correct disposition is *replace the job body, preserve the check name,
delete nothing* — which is exactly what the candidate does.

---

## 9. SBOM forensic findings

### 9.1 The failure

Run `34954885132`, job `104334429405` (`Generate CycloneDX/SPDX SBOM`), step 3
(`Generate CycloneDX SBOM with Syft`), `2026-09-15T09:52:23Z`. Verbatim:

```
2026-09-15T09:52:23.0237270Z [debug] http_download(url=https://github.com/anchore/syft/releases/download/v1.42.3/syft_1.42.3_checksums.txt)
2026-09-15T09:52:23.3373090Z [error] received HTTP status=500 for url='https://github.com/anchore/syft/releases/download/v1.42.3/syft_1.42.3_checksums.txt'
2026-09-15T09:52:23.3449762Z [error] could not download asset for os='linux' arch='amd64' format='tar.gz'
2026-09-15T09:52:23.3460526Z [error] failed to install syft
2026-09-15T09:52:23.3503551Z ##[error]The process '/usr/bin/sh' failed with exit code 1
```

Steps 4 and 5 (SPDX generation, artifact upload) were skipped. Total job duration: 8 seconds.

### 9.2 Precise localisation of the HTTP 500

The 500 came from **`github.com` serving a release asset** — specifically the Syft checksums file
for `v1.42.3` — during the `anchore/sbom-action` installer's bootstrap. It did **not** come from
an Anchore API, from Syft's own execution, or from the repository.

The failure occurred **before Syft was installed**, therefore before any repository content was
read. No manifest was parsed. The repository's own state had no opportunity to influence the
outcome.

### 9.3 Determination: A, B, or C?

**B — the failure appears to have been external/transient.** The evidence is unusually clean:

| Evidence | Detail |
|---|---|
| The 500 is server-attributed | `received HTTP status=500` from a `github.com` release-asset URL, not from the workflow or from Syft |
| It precedes any repository interaction | installer bootstrap, before Syft binary exists |
| The same pinned action succeeded on the candidate | run `34870082065`, job `104063518720`, 2026-09-14T16:40:50–16:40:58Z, both formats generated and uploaded |
| **The same pinned action succeeded ~28 minutes later** | run `34957448675`, job `104342811085`, 2026-09-15T10:20:54–10:21:00Z, on the in-flight INT-01 branch — **both SBOM steps success, artifact uploaded** |

That last row is decisive. Same action SHA (`e22c389904149dbc22b58101806040fa8d37a610`), same Syft
version (`v1.42.3`), same repository, same day, a different branch — and it worked. A configuration
cause would not self-resolve in 28 minutes without a configuration change.

**Ruled out — A (repository configuration):** the workflow, the action pin and the Syft version are
byte-identical between `main` and the candidate (§10), and identical between the failing run and
the succeeding run 28 minutes later.

**Not C:** the evidence is sufficient for this specific failure.

### 9.4 Residual finding — fragility, not misconfiguration

The SBOM gate has a hard, unpinned-by-checksum dependency on GitHub release-asset availability at
job runtime. A transient upstream 500 turns a green branch red with no local cause. This is a
**resilience** observation about the control's delivery mechanism.

**No weakening or removal of the SBOM gate is proposed, and none is performed.** Recorded as an
open question (§15, Q4) — any retry or vendoring change is itself a supply-chain decision requiring
its own review, not a side effect of INT-01.

### 9.5 What this does NOT prove

- Not that every SBOM failure is transient. Exactly one failure was investigated in full.
- Not that the generated SBOM is complete or accurate. Syft's coverage of a pnpm workspace monorepo
  was **not** validated here — **UNKNOWN**.
- Not that SBOM artifacts are retained, signed, or attested. The job uploads them as ordinary
  workflow artifacts with default retention. There is **no attestation, no signing and no
  provenance binding** on either `main` or the candidate.

### 9.6 Provenance / attestation controls — scope correction

The task brief lists "provenance / attestation controls". The evidence does not support the premise
that such controls exist. What exists, on both `main` and the candidate, is the `provenance-note`
job:

```yaml
- name: Assert release signing policy exists
  run: test -f docs/security/SUPPLY_CHAIN_SECURITY.md
```

That is a **file-existence check on a policy document**. It is not attestation, not signing, not
SLSA provenance, and not a build-integrity control. It is unchanged between `main` and the
candidate, so there is nothing to replay — and nothing to claim. Recorded so that no later reader
mistakes a green `Release provenance gate` for cryptographic provenance.

---

## 10. Security workflow comparison

`main:51bfdde` vs `candidate:7e0d9044`, `.github/workflows/security-supply-chain.yml`,
net +102/−… across four hunks.

### 10.1 Independently replayable repository security controls

| Control | Why independent | Caveat |
|---|---|---|
| CodeQL managed-evidence verification (§5.1.5 + §5.1.6) | Verifier reads only the GitHub API; imports no application code | Hard-depends on a repository **setting** (§7.4) |
| Permissions tightening (§5.1.1) | Pure workflow metadata | Must ship with the CodeQL job change |
| Dependency licence evidence inventory (§5.1.2) | Needs only a successful `pnpm install`; reads no application source | Blocked until §7.1 is resolved |
| CRA SRP readiness audit (§5.4, §5.9) | Marker check over three documents; zero application reads | Needs one `package.json` script line |

### 10.2 Changes that depend on later product / runtime code

| Control | Depends on |
|---|---|
| 8 of 9 `authority-gates` steps | mobile, web, backend, BLE package, DB seeds/migrations, control documents, data registry — see §7.2 |
| `p0-db-baseline.yml` additions | AUTH, community, privacy-discovery tests + migrations 0006–0013 |
| `p0-db-upgrade-rehearsal.yml` | migrations 0012/0013, `baseline-draft/**`, 6 fixture SQL files |
| `p0-db-authority-parity.yml` | 3 fingerprint SQL files + migrations 0006–0013 |
| `.gitleaks.toml` | an `ARCHITECTURE.md` revision not reachable from `main` |

### 10.3 Unchanged between the two heads

`dependency-audit`, `security-regression`, `semgrep-sast`, `secret-scan`, `sbom`,
`provenance-note`, and `tools/security/evaluate-pnpm-audit.mjs`. The `dependency-audit` and `sbom`
jobs are red on `main` today for reasons that are **not** in workflow content (§7.1, §9).

---

## 11. Proposed minimal INT-01 replay set

> **Reconciliation status (added 2026-09-16, see §16).** This section records the replay set
> *proposed by the forensic pass*. PR #249 has since implemented the INT-01 slice and is green on
> its exact head. Steps 0 and 1 are **implemented there**; Steps 2 and 3 are **out of INT-01 scope**
> per issue #248 and the resolved §15 Q6. The per-step analysis is retained as provenance — it is
> the rationale for what #249 carries and what it deliberately excludes — but it is no longer a
> to-do list. Current implementation authority is #249, not this section.

Ordered. Each step is independently reviewable. Nothing here is applied by this record.

### Step 0 — Precondition: unblock `pnpm install --frozen-lockfile`

| | |
|---|---|
| Replay | `pnpm-workspace.yaml` hunks from `fa756ca`, `629801d`, `f93e874`, `b4390be` (workspace hunk only), `f6d1a3a`, `90ebdb5`; then `pnpm-lock.yaml` from `776b45c` and `63f21eb` |
| **Do not replay** | `b4390be`'s `backend/test/**` hunks; `.github/workflows/lockfile-refresh.yml` (`SUPERSEDED`, §5.8) |
| Verification before push | `pnpm install --frozen-lockfile` must succeed **locally**, then `node tools/security/evaluate-pnpm-audit.mjs` must report zero blocking advisories |
| Rationale | Without this, `dependency-audit` stays red and every later step is unmeasurable (§7.1) |
| Risk | Highest-risk step in INT-01: it changes the resolved dependency graph. The candidate proves these exact overrides resolve — but on candidate content, not on `main` content. |
| **Status** | **IMPLEMENTED in PR #249** at head `21cf495c517a292bea072fde7b8ea4e6d558ac00`. The risk noted above was discharged on `main` content: `pnpm install --frozen-lockfile` and the dependency gate both pass (run `35014465139`, job `104534273182` — *Dependency vulnerability gate: PASS*, 2 accepted `image-size` exceptions, 0 blocking). |

### Step 1 — CodeQL alignment

Replay `scripts/security/verify-codeql-default-setup.mjs` and its `.test.mjs` at their `e64b117`
state; replace the `codeql` job body; apply the permissions change. Delete nothing.

**Status: IMPLEMENTED in PR #249**, which replays both verifier files by exact candidate blob and
keeps read-only permissions (`actions: read`, `security-events: read`). Verified green: run
`35014465139` job `104534273287`, plus managed run `35014460005` on the same head.

**Observed divergence, recorded for review.** The forensic pass recommended preserving the check
name `CodeQL JavaScript/TypeScript`, because candidate commit `5171c5d` preserved it deliberately
and a renamed check can silently drop a required status check. #249's job is named
**`CodeQL default setup evidence`**. That is a defensible, more accurate name for what the job now
does, and the rename is not a defect — but whether any branch-protection rule still references the
old name is **U2**, which remains UNKNOWN. Worth confirming before INT-01 is promoted.

### Step 2 — Dependency licence evidence inventory

Replay the `dependency-license-inventory` job at its `9f40a3d` state. No other change.

**Status: NOT IN INT-01.** Issue #248 scopes INT-01 to CodeQL ownership (INT-01A), dependency
remediation (INT-01B) and SBOM resilience (INT-01C). A licence evidence inventory is none of those.
The finding stands on its own merits — the job is genuinely independent of product code (§5.1.2) —
and is available to whichever slice later takes up licence evidence. Do not enlarge a green INT-01
to absorb it.

### Step 3 — CRA SRP readiness gate

Replay from `c199d23` + `af4268f`: `scripts/security/cra-srp-readiness-audit.mjs`, the four
`docs/security/**` documents, one `package.json` script line, and a **single-step**
`authority-gates` job containing only `cra-srp:audit`. The job name must be honest — the
candidate's name enumerates nine gate families and would be false with one step.

**Status: NOT IN INT-01 — superseded by resolved §15 Q6.** Issue #248 lists *CRA human readiness*
under explicit **Non-scope**. The forensic finding is unchanged and remains valuable: `cra-srp:audit`
is the one `authority-gates` step with zero application-code coupling (§5.4, §7.2), so it is
replayable whenever its owning slice runs. It is preserved here as **evidence for the dedicated CRA
work tracked under #239**, not as INT-01 work. Do not add it to a now-green INT-01 implementation.

### Step 4 — Fresh CI, then stop

Run the full matrix (§13) on the INT-01 head. Do not add scope to reach green.

**Status: SATISFIED for stage 1** (see resolved §15 Q3). Run `35014465139` is green 7/7 on
`21cf495c517a292bea072fde7b8ea4e6d558ac00`. Stage 2 — `main` green after merge — is untested and
remains a precondition for promotion, not for acceptance.

### Explicitly NOT in the minimal set

The eight non-CRA `authority-gates` steps and their scripts; all three `p0-db-*` workflow changes;
`.gitleaks.toml`; `.github/workflows/lockfile-refresh.yml`; every `scripts/privacy/**`,
`scripts/data/**`, `scripts/content/**` file; `scripts/mobile-home-authority-audit.mjs`;
`scripts/security/professional-share-authority-audit.mjs`.

---

## 12. Deferred changes and destination slice

| Change | Destination | Blocking prerequisite |
|---|---|---|
| `professional-share:audit` + script | **INT-05** | `backend/api/services/professional-share-*`, schema, migrations 0006/0009 |
| `rights:audit` (3 scripts) + `register-dataset-file.mjs` + `ingest_vbo.ts` | **INT-07** | data registry, VBO snapshot evidence, rights register, `mapbox-rights.ts` |
| `processors-transfers:audit` | **INT-07** | `config/privacy/runtime-egress-inventory.json` |
| `privacy-audio:audit` | **INT-03 / INT-04** | `packages/ble-protocol/src/feature-boundary.ts` |
| `privacy-location:audit` | **INT-04** | mobile settings surfaces, sensor runtime tests |
| `consent-defaults:audit` | **INT-04** | candidate-era mobile preference defaults |
| `mobile-home:audit` | **INT-09** | `apps/mobile/app/devices.tsx` |
| `legacy-freemium:audit` | **INT-06 / INT-08** | `backend/db/seeds/freemium-templates-*` |
| `p0-db-baseline.yml` AUTH steps | **INT-02** | `backend/test/auth-*.test.mjs`, AUTH routes/services |
| `p0-db-baseline.yml` community step | **INT-06** | `community-feed.integration.test.mjs` |
| `p0-db-baseline.yml` privacy/ID-01 steps | **INT-04** | `subject-discovery-postgres.test.mjs`, `id-01-referential-integrity.sql` |
| `p0-db-upgrade-rehearsal.yml` | **INT-02+** | migrations 0012/0013 + 6 fixtures |
| `p0-db-authority-parity.yml` | **INT-02+** | 3 fingerprint SQL files + migrations 0006–0013 |
| `.gitleaks.toml` | slice carrying `143b99b` | the `ARCHITECTURE.md` revision it fingerprints |

`SUPERSEDED`, replay to no slice: `.github/workflows/lockfile-refresh.yml`.

---

## 13. Required fresh CI matrix

### 13.1 Candidate-head evidence — scope-limited

These runs are evidence **about `7e0d90445a3cf03b094d7037aa6addbfa6f2cc19` only**:

| Workflow | Run ID | Result | Verified here |
|---|---|---|---|
| Security supply chain | `34870082065` | success | Yes — 9/9 jobs success, job IDs `104063518593`…`104063519031` |
| P0 DB baseline | `34870082023` | success (per #246) | Not independently re-verified in this record |
| P0 DB upgrade rehearsal | `34870082095` | success (per #246) | Not independently re-verified in this record |
| P0 DB authority parity | `34870082094` | success (per #246) | Not independently re-verified in this record |
| GitHub-managed CodeQL | `34870076326` | success | Yes — 4/4 language jobs success |

**These are not evidence that `main` is green, that any replay will be green, or that any control
works on `main` content.** §4.1 shows `main`'s own posture is red on two deterministic counts.

### 13.2 Required on the INT-01 replay head

| # | Check | Must be | Why |
|---|---|---|---|
| 1 | `Security supply chain / dependency-audit` | **green** | Proves Step 0 actually closed the `@xmldom/xmldom`, `sharp`, `js-yaml` advisories |
| 2 | `Security supply chain / Dependency remediation regression` | green | Proves the override change did not break typecheck, tests or the web build |
| 3 | `Security supply chain / Dependency licence evidence inventory (not clearance)` | green + artifact present | Step 2 |
| 4 | `Security supply chain / CodeQL JavaScript/TypeScript` | green | Step 1 |
| 5 | Managed `dynamic/github-code-scanning/codeql`, same head, 4/4 language jobs | green | Precondition for #4; must be checked as a **separate run**, not inferred from #4 |
| 6 | `Security supply chain / Semgrep SAST` | green | No regression |
| 7 | `Security supply chain / Secret scan` | green | Confirms `.gitleaks.toml` is genuinely unnecessary (§5.7) |
| 8 | `Security supply chain / Generate CycloneDX/SPDX SBOM` | green | Must be green **on the INT-01 head**; a repeat 500 (§9) needs one re-run before any other conclusion |
| 9 | `Security supply chain / Release provenance gate` | green | Trivially green; claims nothing (§9.6) |
| 10 | `Security supply chain / <CRA-only authority job>` | green | Step 3 |
| 11 | `P0 DB baseline` | **must not be newly triggered** | INT-01 touches no `backend/db/**` path; if it triggers, the slice has leaked scope |

### 13.3 Local pre-push verification

Before any push: `pnpm install --frozen-lockfile`; `node tools/security/evaluate-pnpm-audit.mjs`;
`node --test scripts/security/verify-codeql-default-setup.test.mjs`;
`node scripts/security/cra-srp-readiness-audit.mjs`; `pnpm typecheck`; `pnpm test`.

### 13.4 Standing rule

Fresh CI on the INT-01 head is the **only** admissible evidence for INT-01. No candidate-head run
may be cited as INT-01 evidence in any status, PR body, or record.

---

## 14. Explicit non-claims

This record does **not** claim, and must not be cited as claiming:

1. That any change is approved for merge. Everything here is `DRAFT / UNMERGED / NOT RELEASE AUTHORITY`.
2. That PR #224 is safe to merge. Issue #246 forbids it; nothing here relaxes that.
3. That the INT-01 replay set will pass CI. No replay has been executed or validated.
4. That `main` is currently green. §4.1 proves the opposite on two deterministic counts.
5. That the candidate's green runs transfer to `main`. They do not (§13.1).
6. That zero CodeQL alerts means the code is secure. It means one tool found nothing open at one
   commit, with that tool's suite and limits.
7. That SBOM generation proves dependency completeness, licence compliance, or supply-chain
   integrity. Syft coverage of this pnpm monorepo was not validated — **UNKNOWN**.
8. That the `provenance-note` job provides attestation, signing or build provenance. It checks that
   a file exists (§9.6).
9. That the CRA documents establish CRA compliance. They record an organisational posture; the
   audit checks that required markers are present, not that the underlying obligations are met.
10. That the legacy CodeQL path is obsolete or should be removed. §8.9 lists the six evidence items
    required first. Nothing here deletes or modifies CodeQL.
11. That the SBOM gate should be weakened, retried, or bypassed. §9.4 raises fragility as a
    question, not a proposal.
12. That the dependency-audit exceptions are permanently acceptable. Both `image-size` exceptions
    expire `2026-11-30T23:59:59Z` and will then block (§5.6).
13. That any repository setting (branch protection, required checks, CodeQL default-setup scope)
    has been verified. None was queried — **UNKNOWN** (§8.6).
14. That the commit attributions here are exhaustive of all candidate history. They are exhaustive
    **for the paths investigated**, over the range `51bfdde..7e0d9044`.
15. That green CI proves product, scientific, physical or legal validity. Per `CLAUDE.md`:
    code present ≠ physical proof; synthetic test ≠ bench validation; bench ≠ animal validation.

### 14.1 What PR #249's green exact-head evidence does NOT prove

Added with the §16 reconciliation. #249 being green is now the most over-readable fact in this
document, so its limits are stated as explicitly as the rest.

Two boundaries govern everything below:

> **candidate evidence ≠ promoted `main` state**
>
> **green CI ≠ release authority**

A green exact head on #249 does **not** establish:

1. production security, or the absence of vulnerabilities — it establishes that the configured
   gates passed on one commit, with those tools' suites and limits;
2. that `main` is or will be green. #249 is DRAFT and UNMERGED; stage 2 of Q3 (fresh post-merge
   verification of `main`) is untested by construction;
3. physical-device, MAT/TAG hardware, scientific or animal validity — no such evidence exists in
   any CI run cited here;
4. legal clearance or third-party rights clearance;
5. CRA operational or human readiness. #248 places CRA human readiness out of INT-01 scope
   entirely (Q6);
6. branch-protection correctness, which remains unverified — sharpened by the check-name
   divergence in §16.3 (**U2**);
7. that PR #224 is safe to merge. #246's freeze is unchanged by anything in this record;
8. release or production readiness, or any merge authorisation. Both #249 and #254 remain
   `DRAFT / UNMERGED / NOT RELEASE AUTHORITY`.

The two remaining HIGH advisories on #249 are **explicit, path-bounded, expiring risk
acceptances** (`GHSA-w3rx-r6r6-pgpr`, `GHSA-5p2g-fcmc-qvqq`, expiring
`2026-11-30T23:59:59Z`) — they are **not** claimed as fixed, and they begin blocking after that
date with no code change (§5.6, **U7**).

---

## 15. Unknowns and questions requiring human decision

### UNKNOWN — not establishable from repository evidence

| # | Unknown |
|---|---|
| U1 | When CodeQL default setup was enabled and by whom. **Partially resolved** (§8.6): the same four languages are confirmed green on a `main`-derived PR head, run `35056246000`. Stability over time, and behaviour on `push` to `main`, remain UNKNOWN. |
| U2 | Whether `CodeQL JavaScript/TypeScript` is a **required** status check on `main` (branch protection not in git, not queried). **Sharper after the reconciliation pass:** PR #249 names its job `CodeQL default setup evidence`, so if the old name is a required check anywhere, the rename must be reflected in branch protection before promotion. Still UNKNOWN. |
| U3 | Whether managed CodeQL runs on `push` to `main`, or only on `pull_request` |
| U4 | Default setup's query suite (`default` vs `security-extended`) and whether it matches the legacy advanced configuration's effective coverage for `javascript-typescript` |
| U5 | Whether the `@xmldom/xmldom` / `sharp` / `js-yaml` override bumps introduce behavioural change in `expo` or `next` on **`main`'s** dependency graph — proven only on candidate content |
| U6 | Whether Syft's SBOM output covers all pnpm workspace packages correctly |
| U7 | Whether the `image-size` risk acceptance has an owner and a renewal process before its 2026-11-30 expiry |
| U8 | ~~Exact relationship between this manifest's INT-01 scope and PR #249~~ — **RESOLVED 2026-09-16, see §16.** #254 is the forensic record (provenance, rationale, exclusions); #249 is the canonical focused INT-01 implementation candidate carrying exact-head evidence. They are complementary; neither supersedes the other. #249 is DRAFT / OPEN / UNMERGED at head `21cf495c517a292bea072fde7b8ea4e6d558ac00`, green on run `35014465139`. The earlier failing runs `34957247090` / `34957354575` / `34957448675` are historical (§7.1), not current. |
| U9 | Whether GitHub's release-asset 500 (§9) correlates with a published incident — no status-page evidence was gathered |

### Questions requiring a human decision

> **All six resolved on 2026-09-16** by the PR author, recorded in §16. Each entry below states the
> decision and keeps the original analysis beneath it, so the reasoning that produced the question
> stays auditable alongside the answer.

**Q1 — CodeQL language-list coupling. RESOLVED 2026-09-16 — option (a).** Keep the verifier
fail-closed on all four configured languages (`actions`, `c-cpp`, `javascript-typescript`,
`python`). Rationale of record: a future intentional Default Setup change *should* make the verifier
fail until the coverage change is explicitly reviewed, rather than silently reducing coverage.
Supporting evidence: all four managed jobs pass on `main`-derived heads — run `35014460005` (#249)
and run `35056246000` (#254). U4 (query-suite equivalence) is not resolved by this decision.

*Original analysis, retained:* options were (a) keep hard-coded fail-closed; (b) require only
`javascript-typescript`, matching the legacy path's actual coverage; (c) derive the list from the
managed run. The forensic pass recommended (a) for the same reason it was chosen.

**Q2 — Step 0 sequencing. RESOLVED 2026-09-16 — do not split.** Dependency remediation stays
inside INT-01; no separate INT-01a PR is to be created.

*The forensic pass recommended splitting, and that recommendation is now obsolete.* It rested on
#249 being unable to reconcile the lockfile — which was true of the 2026-09-15 morning state and is
no longer true. #249 has since demonstrated that `pnpm-workspace.yaml` and `pnpm-lock.yaml` can be
reconciled atomically alongside the CodeQL ownership work while preserving frozen-lockfile
reproducibility and earning fresh green CI (run `35014465139`). Re-splitting work already
demonstrated green would add process without adding evidence.

**Q3 — Does `main` being red block INT-01 acceptance? RESOLVED 2026-09-16 — two-stage
definition.**

1. **Technical acceptance:** exact-head PR green, evaluated before any merge decision.
2. **Promotion effectiveness:** if INT-01 is later promoted, `main` must be re-verified after merge
   and green post-merge before promotion counts as effective.

PR #249 currently satisfies **stage 1 only** and remains DRAFT / UNMERGED. Stage 2 is untested.

*Original framing, retained:* `main` is red on `dependency-audit`,
`codeql` and `sbom` today (§4.1). Is INT-01 accepted when it is green on its own head, or must
`main` be green post-merge? This changes the definition of done. **Needs an explicit decision.**

**Q4 — SBOM installer fragility. RESOLVED 2026-09-16 — option (a), no change.** Treat the
Anchore/Syft HTTP 500 as transient evidence unless repetition establishes a deterministic problem.
Add no custom retry, no vendoring and no weakening now.

Evidence supporting the classification: the same pinned action has passed on every subsequent
observed run — candidate head (`34870082065`), #249 (`35014465139`, job `104534273160`, both
CycloneDX and SPDX), and repeatedly on #254's heads (`35056251880`, `35056526071`, `35056656025`).
One failure, many successes, no configuration difference between them.

*Original framing, retained:* options were (a) accept, re-run manually; (b) add a bounded retry;
(c) pin/vendor the Syft binary by checksum. (b) and (c) are themselves supply-chain decisions
requiring their own review; the standing instruction forbids weakening the gate.

**Q5 — Relationship to PR #249. RESOLVED 2026-09-16 — complementary, neither supersedes the
other.**

| PR | Role |
|---|---|
| **#254** (this record) | forensic record: provenance, rationale, dependency coupling, exclusions |
| **#249** | canonical focused INT-01 implementation candidate, carrying exact-head evidence |

#254 does **not** supersede #249, and #249 does not make #254 redundant: the manifest is what
explains *why* #249 carries what it carries and excludes what it excludes. Both remain DRAFT.

*The original framing — "a branch named for INT-01 already exists and is failing" — described the
2026-09-15 morning state and is superseded.* #249 is green on its exact head (§7.1 resolution note,
§16).

**Q6 — `authority-gates` / CRA. RESOLVED 2026-09-16 — do not add either to INT-01.** The naming
question is moot because the job is not being added: issue #248 scopes INT-01 to CodeQL ownership,
dependency remediation and SBOM, and lists *CRA human readiness* under explicit **Non-scope**.

The forensic finding is preserved rather than discarded: `cra-srp:audit` is the single
`authority-gates` step with no application-code coupling (§5.4, §7.2), which makes it cleanly
replayable by its owning slice. It is retained as **evidence for the dedicated CRA work tracked
under #239**. Do not enlarge a now-green INT-01 implementation after acceptance.

*Original framing, retained:* replaying one of nine steps under the candidate's nine-family job name
would misrepresent coverage, so a single-step job would have needed an honest distinct name.

---

## 16. Reconciliation pass — 2026-09-16

### 16.1 Why this section exists

§15 was written during the forensic pass on 2026-09-15, when PR #249 was failing. #249 advanced the
same day, which made parts of §15 stale. This pass reconciles the record to the verified current
state, on request from the PR author (comment `5692236762` on #254), and is **documentation-only**.

Per §4's anti-fabrication rule, none of the state below was transcribed from that request. Every
claim was re-verified against the GitHub API before being written here. Where the request and the
primary source agreed, the source is cited; where the pass found something the request did not
mention, it is recorded too (§16.3).

### 16.2 Verified current state of PR #249

| Claim | Verification | Result |
|---|---|---|
| DRAFT / OPEN / UNMERGED | PR API | `state: open`, `draft: true`, `merged: false`, `mergeable_state: clean` |
| Head `21cf495c517a292bea072fde7b8ea4e6d558ac00` | PR API `head.sha` | confirmed |
| Base is exact `main` | PR API `base.sha` | `51bfdde694903c7f0e4b759ae8914c1d18f15810` — confirmed |
| Focused changed-file boundary | PR API | 5 files, 6 commits, +568/−202 |
| Security supply chain run `35014465139` PASS | run + job API | `conclusion: success`, **7/7 jobs success** |
| Managed CodeQL run `35014460005` PASS | run API | `conclusion: success`, `path: dynamic/github-code-scanning/codeql`, `head_sha` matches |
| All four managed CodeQL languages pass | jobs API, verified individually | `Analyze (actions)` `104534259376`, `Analyze (c-cpp)` `104534259333`, `Analyze (javascript-typescript)` `104534259369`, `Analyze (python)` `104534259038` — 4/4 success, each with `Perform CodeQL Analysis` successful on `21cf495c…`. Checked per-job rather than inferred from the run-level conclusion, since Q1's fail-closed decision rests on the four-language set specifically. |
| 0 open CodeQL alerts | job `104534273287` | verifier step success; the verifier fails closed on any open alert, so success *is* the evidence |
| Dependency audit HIGH 2 / CRITICAL 0 / blocking 0 | job `104534273182` log | `Dependency vulnerability gate: PASS`, two accepted `image-size` exceptions, no blocking list |
| CycloneDX + SPDX both pass | job `104534273160` | both Syft steps success, artifact uploaded |
| Issue #248 scopes INT-01 and excludes CRA | issue API | INT-01A/B/C = CodeQL, dependency, SBOM; *CRA human readiness* listed under **Non-scope** |

All ten verified. The `image-size` exceptions remain explicit, path-bounded, expiring risk
acceptances — not claimed fixes, and they still block after `2026-11-30T23:59:59Z` (§5.6, U7).

### 16.3 Found during verification, not stated in the request

**#249's CodeQL check is named `CodeQL default setup evidence`,** not `CodeQL JavaScript/TypeScript`.
The forensic pass had recommended preserving the old name because candidate commit `5171c5d`
preserved it deliberately, specifically so a rename could not silently drop a required status check.
The new name is more accurate for what the job now does and is not a defect — but it sharpens **U2**:
if the old name is referenced by any branch-protection rule, that rule needs updating before
promotion. Recorded in §11 Step 1 and in the U2 row.

### 16.4 What this pass did NOT change

- No forensic history was rewritten. The 2026-09-15 failing runs remain in §7.1 as the evidence for
  *why* the workspace/lockfile pairing must be atomic, explicitly marked historical.
- No disposition in §5, no coupling finding in §7, and no CodeQL or SBOM conclusion in §8–§9 was
  altered — the reconciliation touched §7.1's framing, §11's status, §15, and this section.
- The non-claims in §14 stand unchanged, including that green CI proves no product, scientific,
  physical or legal validity, and that no repository setting has been verified.
- Nothing was merged, and no workflow, dependency, lockfile or runtime file was modified.

### 16.5 Remaining open items after this pass

All six §15 questions are now resolved. Still open:

- **U1** (partial), **U2**, **U3**, **U4** — repository settings and CodeQL query-suite equivalence;
- **U5** — behavioural effect of the override bumps on `main`'s graph, now evidenced by #249's green
  typecheck/tests/web build but not by runtime observation;
- **U6** — Syft coverage of the pnpm workspace;
- **U7** — owner and renewal process for the `image-size` acceptance before 2026-11-30;
- **U9** — whether the release-asset 500 correlates with a published incident;
- **Stage 2 of Q3** — `main` green post-merge, untested by construction.

---

## Appendix A — Evidence index

| Reference | What it proves | Where used |
|---|---|---|
| Run `34870082065`, jobs `104063518593`–`104063519031` | 9/9 security jobs green on candidate head | §13.1 |
| Run `34870076326`, jobs `104063499028`/`104063499420`/`104063499435`/`104063499634` | 4/4 managed CodeQL language jobs green on candidate head | §8.4, §13.1 |
| Run `35056246000`, jobs `104666947212`/`104666947022`/`104666947220`/`104666947239` | 4/4 managed CodeQL language jobs green on a **`main`-derived** head | §8.6, U1 |
| Run `35056251880`, job `104666962723` | legacy CodeQL fails with the identical configuration conflict on a `main`-derived head | §8.6 |
| Run `35056251880`, job `104666962583` | `main` dependency gate blocking reproduced on a second `main`-derived head | §4.1, §7.1 |
| Run `35056251880`, job `104666962821` | SBOM **green** on a `main`-derived head, same action pin — third data point for the transient finding | §9.3 |
| PR #249 API: `draft: true`, `mergeable_state: clean`, head `21cf495c…`, 5 files | #249 is DRAFT/UNMERGED and focused | §16.2, U8 |
| Run `35014465139`, 7/7 jobs success on `21cf495c…` | INT-01 implementation green on its exact head | §7.1, §11, §16.2 |
| Run `35014465139`, job `104534273182` | `Dependency vulnerability gate: PASS`, 0 blocking, 2 `image-size` exceptions | §7.1, §16.2 |
| Run `35014465139`, job `104534273160` | CycloneDX + SPDX both pass on #249's head | §9.3, Q4 |
| Run `35014465139`, job `104534273287` | managed-CodeQL evidence verifier passes fail-closed | §16.2 |
| Run `35014460005` | managed CodeQL success on `21cf495c…`, `pr=249` | §16.2, Q1 |
| Run `35014460005`, jobs `104534259376`/`104534259333`/`104534259369`/`104534259038` | 4/4 managed CodeQL languages (`actions`, `c-cpp`, `javascript-typescript`, `python`) pass on #249's exact head | §16.2, Q1 |
| Issue #248 | INT-01 scope = CodeQL + dependency + SBOM; CRA human readiness is Non-scope | Q6, §11 Step 3 |
| Run `34954885132`, job `104334429358` | Legacy CodeQL rejected: default setup conflict, `configuration error` | §8.2, §8.3 |
| Run `34954885132`, job `104334429405` | SBOM: HTTP 500 on GitHub release asset, Syft install failed | §9.1, §9.2 |
| Run `34954885132`, job `104334429273` | `main` dependency gate blocking on xmldom/sharp/js-yaml | §7.1 |
| Run `34954885132`, job `104334429445` | Secret scan green on `main`-derived branch without `.gitleaks.toml` | §5.7 |
| Run `34957448675`, jobs `104342811266`, `104342810955` | Lockfile-only replay → `--frozen-lockfile` failure | §7.1 |
| Run `34957448675`, job `104342811085` | SBOM green 28 min after the 500, same action pin | §9.3 |
| `git diff 51bfdde 7e0d9044 -- .github/ tools/ scripts/` | 19 files, +3006/−28 | §5 |
| `git cat-file -e 51bfdde:<path>` per dependency | presence/absence on `main` | §5, §7.2 |
| `git merge-base --is-ancestor 143b99b 51bfdde` → false | gitleaks fingerprint unreachable from `main` | §5.7 |
| `git log --all --diff-filter=A -- '.github/workflows/*codeql*'` → empty | no standalone CodeQL workflow ever existed | §8.1 |
| Commit `5171c5d` body | contemporaneous authorial statement of the CodeQL conflict | §6.2, §8.3 |
| Commit `b4390be` file list | security override mixed with backend test relocation | §6.3 |

---

*Controlled record — EMOPET integration control plane. Documentation only.*
*Created 2026-09-15 under issue #246. Source candidate: PR #224 @ `7e0d9044`. Base: `main` @ `51bfdde`.*
