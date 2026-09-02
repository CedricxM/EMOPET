# PNPM historical trust baseline migration — controlled design evidence

## Status

**PHASE A CANDIDATE COMPLETE / PHASE B NOT AUTHORIZED**

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

**NOT AUTHORIZED by this document.**

A future reviewed migration mechanism may use the five-selector set only as a finite, migration-scoped candidate manifest. If an exact-selector trust exception is ultimately approved, it must be:

- finite before the run begins;
- exact-selector scoped;
- tied to the already locked version **and** integrity;
- used only in the controlled migration environment;
- absent from normal repository trust policy after generation;
- verified after generation to prove that every historical exception package retained its exact baseline version and integrity.

The migration experiment must STOP if pnpm 10.33.0 reports a trust downgrade outside the pre-reviewed five-selector manifest. Such a result would disprove the current Phase-A sufficiency for fresh resolution and must return to #106 for review rather than expanding exclusions dynamically.

## 6. Lock-diff acceptance controls

No generated migration lock may be committed until machine-readable comparison proves all of the following:

1. every approved historical exception candidate retains its authorized version and integrity;
2. `browserslist` resolves to a version satisfying the #101 patched boundary (`>=4.28.7`);
3. no unrelated package movement is silently accepted;
4. any unavoidable unrelated lock churn is enumerated and separately justified before commit;
5. normal repository configuration returns to strict `trustPolicy: no-downgrade` with no broad persistent migration bypass;
6. `pnpm install --frozen-lockfile`, HIGH/CRITICAL dependency audit, workspace typecheck, workspace tests, and web build all pass from the committed result.

## 7. Candidate evidence package for a future migration PR

A migration PR should provide, at minimum:

- the baseline commit and lock blob SHA listed above;
- the reviewed finite migration exception manifest, if an exception mechanism is authorized;
- a before/after `name@version + integrity` comparison for every manifest entry;
- a bounded lockfile diff summary;
- dependency-path evidence showing the remediated `browserslist` path;
- machine-readable HIGH/CRITICAL audit evidence;
- complete regression CI evidence;
- confirmation that migration-only trust controls are absent from normal repository configuration after generation.

## 8. Current decision

`G-PNPM-HISTORICAL-TRUST-MIGRATION-01` remains **OPEN**.

The original Phase-A finite-inventory engineering question is now resolved by bounded, read-only evidence. The project has a five-selector candidate inventory complete for the controlled baseline lock under the pinned pnpm 11.24.0 verifier and corroborated by pnpm 10.33.0 observations.

No migration exception or lock regeneration is authorized yet. The next gate is review and construction of a one-time Phase-B migration mechanism with exact-selector/integrity assertions and a hard STOP on any unreviewed trust downgrade or unrelated lock movement. #101 remains blocked until that migration can produce a strict-CI-clean patched lock; #74 CodeQL remains unrelated and separate.
