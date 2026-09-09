# PNPM historical trust baseline migration — controlled design evidence

## Status

**PHASE A CANDIDATE COMPLETE / PHASE B DECISION PACKAGE PREPARED / NOT AUTHORIZED**

Gate: `G-PNPM-HISTORICAL-TRUST-MIGRATION-01 = OPEN`.

This document supports #106, which was opened after #105 reached its bounded STOP condition while #101 remained blocked. It does **not** authorize a fresh dependency resolution, a lockfile rewrite, a trust-policy relaxation, a `browserslist` override, a migration exception, or any audit exception.

## 1. Controlled baseline

The migration analysis is anchored to the controlled `main` baseline observed when #106 was opened:

- repository commit: `c099581ff8aed1e619f72ab38898fc05833b7c66`;
- `pnpm-lock.yaml` Git blob SHA: `1c5392596508047eea6d64f861abd648ed9a7666`;
- `pnpm-workspace.yaml` Git blob SHA: `d43c2b9ba214f3237a027ac136a81d6b3c923eec`;
- lock format: `lockfileVersion: '9.0'`;
- trust policy: `trustPolicy: no-downgrade`;
- minimum release age: `10080` minutes;
- exotic subdependencies: blocked (`blockExoticSubdeps: true`).

The baseline does not persist a `trustPolicyExclude`, `trustLockfile`, or `trustPolicyIgnoreAfter` bypass. The existing `minimumReleaseAgeExclude` entry for `js-yaml@4.3.1` is a release-age exception and is **not** authority for a trust-policy migration exception.

## 2. Finite baseline-lock trust-downgrade inventory

The bounded #105 pnpm 10.33.0 diagnostics surfaced five distinct selectors before the STOP condition was invoked. Their current locked versions and integrity values were verified directly from the controlled lock.

A later read-only batch verifier under #106 removed the unresolved “one failure at a time” inventory problem:

- probe branch: `sec/trust-baseline-batch-inventory-probe`;
- authoritative probe commit: `7c6767f7105e62a5474b83770fa5bbd19d34a1aa`;
- workflow run: `33621009815`;
- Node: `v22.13.1`;
- diagnostic verifier: pnpm `11.24.0`;
- verifier command class: existing lock only, `--frozen-lockfile --lockfile-only --ignore-scripts`;
- project package-manager auto-switch disabled only for the diagnostic invocation with pnpm v11 `--pm-on-fail=ignore`;
- lock entries checked: **1427**;
- aggregated trust failures: **5**;
- post-probe dependency/policy `git diff --exit-code`: **PASS / no mutation**;
- workflow artifact id: `9842905248`;
- artifact digest: `sha256:b8bca8e4df3899660bc1875f99f8de7b0cdb30786546f3f93d767b166ad6bc37`.

The batch verifier reported exactly the same five selectors independently observed by the bounded pnpm 10.33.0 diagnostics:

| Selector | Locked integrity | Evidence status | Expected migration movement |
|---|---|---|---|
| `undici-types@6.21.0` | `sha512-iwDZqg0QAGrg9Rav5H4n0M64c3mkR59cJ6wQp+7C4nI0gsmExaedaYLNO44eT4AtBBwjbTiGPMlt2Md0T9H9JQ==` | baseline lock verified + pnpm 10 observed + pnpm 11 batch verified | none |
| `eslint-import-resolver-typescript@3.10.1` | `sha512-A1rHYb06zjMGAxdLSkN2fXPBwuSaQ0iO5M/hdyS0Ajj1VBaRp0sPD3dn1FhME3c/JluGFbwSxyCfqdSbtQLAHQ==` | baseline lock verified + pnpm 10 observed + pnpm 11 batch verified | none |
| `ua-parser-js@1.0.41` | `sha512-LbBDqdIC5s8iROCUjMbW1f5dJQTEFB1+KO9ogbvlb3nm9n4YHa5p4KTvFPWvh2Hs8gZMBuiB1/8+pdfe/tDPug==` | baseline lock verified + pnpm 10 observed + pnpm 11 batch verified | none |
| `semver@6.3.1` | `sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==` | baseline lock verified + pnpm 10 observed + pnpm 11 batch verified | none |
| `semver@5.7.2` | `sha512-cBznnQ9KjJqU67B52RMC65CMarK2600WFnbkcaiwWq3xy/5haFJlshgnpjovMVJ+Hff49d8GEn0b87C5pDQ10g==` | baseline lock verified + pnpm 10 observed + pnpm 11 batch verified | none |

### Inventory classification

The five-selector set is now a **finite Phase-A candidate inventory complete with respect to all 1427 entries of the controlled baseline lock under pinned pnpm 11.24.0 lockfile verification**. It is fully corroborated by the five independent selectors already observed under pnpm 10.33.0 before #105 stopped the sequential retry loop.

This completeness statement is deliberately scoped. It does **not** prove that a pnpm 10.33.0 fresh resolution will encounter no additional trust-policy condition outside the already-locked baseline entries. It also does not make the five selectors an approved `trustPolicyExclude` list.

Only run `33621009815` is authoritative batch-inventory evidence. Earlier probe attempts that executed pnpm 10.33.0 through the project version pin, or failed pnpm 11 engine prerequisites, are diagnostic history and are not inventory authority.

The corresponding machine-readable record is `docs/security/pnpm-trust-baseline-observed.json`.

## 3. Isolation attempts already disproven

#105 established that the obvious “narrow” pnpm 10.33.0 resolution strategies do not provide a safe isolation boundary for this shared-lock workspace:

1. a full fresh lock-only resolution entered the historical trust baseline and stopped on downgrade evidence;
2. a mobile-focused attempt, including a temporary `recursiveInstall: false` diagnostic, still traversed the shared workspace resolution surface;
3. a targeted recursive `browserslist@4.28.7` update still entered the wider workspace trust baseline.

Those experiments must not be repeated to build a dynamically expanding exclusion list. The batch verifier now provides the finite baseline-lock inventory without continuing that prohibited loop.

## 4. Prohibited migration shortcuts

The following remain **not authorized**:

- globally disabling or weakening `trustPolicy: no-downgrade`;
- setting `trustLockfile: true` simply to permit the historical lock to drive a fresh resolution;
- adding `trustPolicyExclude` selectors one-by-one as pnpm reports the next failure;
- treating the five Phase-A selectors as a persistent repository exception list;
- using `trustPolicyIgnoreAfter` as a broad historical cutoff without a separately reviewed authority change;
- manually editing or splicing package snapshots into `pnpm-lock.yaml`;
- committing a `browserslist` override without a correctly generated and reviewed lockfile;
- suppressing the HIGH audit finding in #101 while a patched version exists;
- combining unrelated dependency refreshes with the historical trust migration.

## 5. Two-phase migration approach

### Phase A — finite inventory and authority

**Candidate evidence status: COMPLETE FOR REVIEW.**

The bounded method question is resolved by the read-only full-lock batch verifier. Each candidate historical selector now has:

- exact selector (`name@version`);
- exact baseline integrity from the controlled lock;
- independent pnpm 10.33.0 downgrade observation;
- full-lock pnpm 11.24.0 batch-verification corroboration;
- explicit expectation of **no movement** during the migration.

Phase A is not the same thing as exception authorization. The finite inventory must still be reviewed as part of the one-time migration design before any bypass is used.

### Phase B — one controlled migration run

**DECISION PACKAGE PREPARED / NOT AUTHORIZED by this document.**

If explicitly approved, one bounded migration experiment may use the five-selector set only as a finite, migration-scoped exception manifest. The experiment must keep the normal repository policy strict and may not persist the exception manifest into the final repository state.

The proposed target change is deliberately narrow:

- add the #101 remediation forcing `browserslist` to exact `4.28.7` for the first controlled attempt;
- regenerate the shared lock using the repository toolchain pnpm `10.33.0`;
- permit only the five pre-reviewed historical selectors to pass the trust-downgrade check during that one generation attempt;
- require those five historical entries to remain byte-equivalent in version + integrity;
- reject all unreviewed package movement before any commit.

The migration experiment must STOP if pnpm 10.33.0 reports a trust downgrade outside the pre-reviewed five-selector manifest. Such a result would disprove the current Phase-A sufficiency for fresh resolution and must return to #106 for review rather than expanding exclusions dynamically.

## 6. Phase-B decision contract

This section is a **review package**, not an approval record. Until an authorized reviewer records a positive decision, every field below remains proposed only and `migrationAuthorized=false` remains authoritative.

### 6.1 Decision requested

Choose exactly one disposition:

- **APPROVE_BOUNDED_EXPERIMENT** — authorize one controlled pnpm 10.33.0 lock-regeneration experiment using exactly the five Phase-A historical selectors as temporary generation-only trust exceptions and exact `browserslist@4.28.7` as the only intended dependency movement; or
- **HOLD** — perform no fresh lock resolution and keep #101 blocking release candidates while the migration design is reconsidered.

No third option silently authorizes broad trust relaxation, persistent exclusions, manual lock edits, or an audit waiver.

### 6.2 Preconditions for an approved experiment

All must be rechecked at experiment start:

1. baseline commit and lock/workspace blob SHAs still match the controlled values in section 1, or a new baseline reconciliation is performed before proceeding;
2. the Phase-A manifest still contains exactly five selectors and all five exact version/integrity pairs match the starting lock;
3. no `trustPolicyExclude`, `trustLockfile`, or `trustPolicyIgnoreAfter` migration bypass exists in the committed starting policy;
4. the only requested remediation target is `browserslist@4.28.7` for #101;
5. working tree is clean before temporary migration controls are introduced;
6. scripts are disabled during lock generation.

### 6.3 Generation-only exception handling

If `APPROVE_BOUNDED_EXPERIMENT` is recorded, the five selectors may be introduced as **temporary working-tree migration controls only** for the generation step. They must not be committed as persistent repository trust policy.

Before any candidate commit is created:

- remove every migration-only trust exception from the working tree;
- assert that normal committed policy is back to strict `trustPolicy: no-downgrade`;
- stage only the intentionally approved dependency-policy change required for `browserslist@4.28.7`, the correctly generated lockfile, and any separately approved evidence files;
- reject the candidate if the temporary exception mechanism cannot be removed cleanly before normal CI.

### 6.4 Hard STOP conditions

The experiment terminates without a migration commit if **any** of the following occurs:

- a trust downgrade is reported for a selector outside the five-item manifest;
- any of the five historical selectors changes version or integrity;
- `browserslist` does not resolve to `4.28.7` or another separately approved patched target;
- unrelated package movement occurs and cannot be mechanically isolated and reviewed before commit;
- a migration-only trust bypass remains in committed policy;
- fresh strict frozen install fails after temporary controls are removed;
- HIGH/CRITICAL audit remains blocking for #101;
- typecheck, tests, or web build regress;
- the generated lock cannot be reproduced from the reviewed procedure.

A STOP is evidence, not permission to broaden the exception set.

### 6.5 Mandatory evidence from the experiment

A Phase-B candidate may be reviewed only if it preserves:

- exact start commit and lock/workspace blob SHAs;
- exact pnpm and Node versions used;
- the pre-reviewed five-selector manifest digest/content;
- raw generation log;
- before/after package+integrity comparison for all five historical selectors;
- complete lock movement inventory, not only a textual diff excerpt;
- `pnpm why browserslist` or equivalent dependency-path evidence after generation;
- machine-readable HIGH/CRITICAL audit result;
- strict post-generation frozen-install result with no migration-only trust bypass;
- workspace typecheck/tests and web build result;
- final `git diff` proving temporary migration trust controls are absent.

### 6.6 Approval record fields

An approval must identify a real reviewer and record all fields explicitly; blank or placeholder values are not approval:

- `decision`: `APPROVE_BOUNDED_EXPERIMENT` or `HOLD`;
- `reviewer`: named human reviewer;
- `reviewedAt`: timestamp;
- `baselineCommit`: controlled baseline accepted for the run;
- `manifestCount`: must be `5` for the current proposal;
- `browserslistTarget`: `4.28.7` unless separately revised;
- `authorizationScope`: one experiment only;
- `notes`: optional constraints.

This document deliberately does **not** populate those approval fields.

## 7. Lock-diff acceptance controls

No generated migration lock may be committed until machine-readable comparison proves all of the following:

1. every approved historical exception candidate retains its authorized version and integrity;
2. `browserslist` resolves to a version satisfying the #101 patched boundary (`>=4.28.7`);
3. no unrelated package movement is silently accepted;
4. any unavoidable unrelated lock churn is enumerated and separately justified before commit;
5. normal repository configuration returns to strict `trustPolicy: no-downgrade` with no broad persistent migration bypass;
6. `pnpm install --frozen-lockfile`, HIGH/CRITICAL dependency audit, workspace typecheck, workspace tests, and web build all pass from the committed result.

## 8. Candidate evidence package for a future migration PR

A migration PR should provide, at minimum:

- the baseline commit and lock blob SHA listed above;
- the reviewed finite migration exception manifest, if an exception mechanism is authorized;
- a before/after `name@version + integrity` comparison for every manifest entry;
- a bounded lockfile diff summary;
- dependency-path evidence showing the remediated `browserslist` path;
- machine-readable HIGH/CRITICAL audit evidence;
- complete regression CI evidence;
- confirmation that migration-only trust controls are absent from normal repository configuration after generation.

## 9. Current decision

`G-PNPM-HISTORICAL-TRUST-MIGRATION-01` remains **OPEN**.

The original Phase-A finite-inventory engineering question is resolved by bounded, read-only evidence. The project has a five-selector candidate inventory complete for the controlled baseline lock under the pinned pnpm 11.24.0 verifier and corroborated by pnpm 10.33.0 observations.

The Phase-B decision contract is now prepared, but **no human approval is recorded and no migration exception or lock regeneration is authorized**. The next state change must be an explicit `APPROVE_BOUNDED_EXPERIMENT` or `HOLD` decision against the controlled baseline and five-selector manifest. #101 remains blocking until an authorized migration can produce a strict-CI-clean patched lock; #74 CodeQL remains unrelated and separate.
