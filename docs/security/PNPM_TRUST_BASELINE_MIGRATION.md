# PNPM historical trust baseline migration — controlled design evidence

## Status

**DESIGN / EVIDENCE ONLY — NO LOCK MIGRATION AUTHORIZED**

Gate: `G-PNPM-HISTORICAL-TRUST-MIGRATION-01 = OPEN`.

This document supports #106, which was opened after #105 reached its bounded STOP condition while #101 remained blocked. It does **not** authorize a fresh dependency resolution, a lockfile rewrite, a trust-policy relaxation, a `browserslist` override, or any audit exception.

## 1. Controlled baseline

The migration analysis is anchored to the current controlled `main` baseline observed when #106 was opened:

- repository commit: `c099581ff8aed1e619f72ab38898fc05833b7c66`;
- `pnpm-lock.yaml` Git blob SHA: `1c5392596508047eea6d64f861abd648ed9a7666`;
- `pnpm-workspace.yaml` Git blob SHA: `d43c2b9ba214f3237a027ac136a81d6b3c923eec`;
- lock format: `lockfileVersion: '9.0'`;
- trust policy: `trustPolicy: no-downgrade`;
- minimum release age: `10080` minutes;
- exotic subdependencies: blocked (`blockExoticSubdeps: true`).

The baseline does not persist a `trustPolicyExclude`, `trustLockfile`, or `trustPolicyIgnoreAfter` bypass. The existing `minimumReleaseAgeExclude` entry for `js-yaml@4.3.1` is a release-age exception and is **not** authority for a trust-policy migration exception.

## 2. Observed trust-downgrade selectors

The bounded #105 diagnostics surfaced five distinct selectors before the STOP condition was invoked. Their current locked versions and integrity values have now been verified directly from the controlled lock.

| Selector | Locked integrity | Evidence status |
|---|---|---|
| `undici-types@6.21.0` | `sha512-iwDZqg0QAGrg9Rav5H4n0M64c3mkR59cJ6wQp+7C4nI0gsmExaedaYLNO44eT4AtBBwjbTiGPMlt2Md0T9H9JQ==` | verified from baseline lock |
| `eslint-import-resolver-typescript@3.10.1` | `sha512-A1rHYb06zjMGAxdLSkN2fXPBwuSaQ0iO5M/hdyS0Ajj1VBaRp0sPD3dn1FhME3c/JluGFbwSxyCfqdSbtQLAHQ==` | verified from baseline lock |
| `ua-parser-js@1.0.41` | `sha512-LbBDqdIC5s8iROCUjMbW1f5dJQTEFB1+KO9ogbvlb3nm9n4YHa5p4KTvFPWvh2Hs8gZMBuiB1/8+pdfe/tDPug==` | verified from baseline lock |
| `semver@6.3.1` | `sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==` | verified from baseline lock |
| `semver@5.7.2` | `sha512-cBznnQ9KjJqU67B52RMC65CMarK2600WFnbkcaiwWq3xy/5haFJlshgnpjovMVJ+Hff49d8GEn0b87C5pDQ10g==` | verified from baseline lock |

### Inventory status

**NON-EXHAUSTIVE / INCOMPLETE.**

These five entries are the selectors observed before the controlled diagnostic STOP condition. They are **not** evidence that only five historical trust downgrades exist. This table must not be copied into `trustPolicyExclude` and must not be treated as an approved exception manifest.

The corresponding machine-readable observation record is `docs/security/pnpm-trust-baseline-observed.json`.

## 3. Isolation attempts already disproven

#105 has already established that the obvious “narrow” resolution strategies do not currently provide a safe isolation boundary for this shared-lock workspace:

1. a full fresh lock-only resolution entered the historical trust baseline and stopped on downgrade evidence;
2. a mobile-focused attempt, including a temporary `recursiveInstall: false` diagnostic, still traversed the shared workspace resolution surface;
3. a targeted recursive `browserslist@4.28.7` update still entered the wider workspace trust baseline.

Those experiments must not be repeated merely to discover selector six, seven, eight, and so on. The five-selector STOP condition was specifically introduced to prevent a dynamically expanding bypass list.

## 4. Prohibited migration shortcuts

The following are **not authorized** by this design candidate:

- globally disabling or weakening `trustPolicy: no-downgrade`;
- setting `trustLockfile: true` simply to permit the historical lock to drive a fresh resolution;
- adding `trustPolicyExclude` selectors one-by-one as pnpm reports the next failure;
- using `trustPolicyIgnoreAfter` as a broad historical cutoff without a separately reviewed authority change;
- manually editing or splicing package snapshots into `pnpm-lock.yaml`;
- committing a `browserslist` override without a correctly generated and reviewed lockfile;
- suppressing the HIGH audit finding in #101 while a patched version exists;
- combining unrelated dependency refreshes with the historical trust migration.

## 5. Required two-phase migration approach

### Phase A — finite inventory and authority

Before any migration run is authorized, the project must produce a **finite, pre-reviewed inventory** of historical packages that would require migration-only trust treatment.

For each proposed exception candidate, the inventory must contain:

- exact selector (`name@version`);
- exact baseline integrity from the controlled lock;
- reason it is considered historical and unchanged;
- evidence source used to classify the trust downgrade;
- explicit statement whether the package is expected to move during the migration.

The unresolved engineering question is currently:

> **How can the complete downgrade-selector inventory be obtained without reintroducing the prohibited one-failure-at-a-time retry loop?**

Until that question is answered with a bounded method, the migration is not authorized.

### Phase B — one controlled migration run

Only after Phase A is reviewed may a one-time migration mechanism be proposed. If an exact-selector trust exception is ultimately required, it must be:

- finite before the run begins;
- exact-selector scoped;
- tied to the already locked version **and** integrity;
- used only for the controlled migration environment;
- absent from normal repository trust policy after the migration;
- verified after generation to prove that every historical exception package retained its exact baseline version and integrity unless a separate movement was explicitly approved.

A candidate migration must fail if a supposedly historical exception package changes unexpectedly.

## 6. Lock-diff acceptance controls

No generated migration lock may be committed until machine-readable comparison proves all of the following:

1. every approved historical exception candidate retains its authorized version and integrity unless movement was separately approved;
2. `browserslist` resolves to a version satisfying the #101 patched boundary (`>=4.28.7`);
3. no unrelated package movement is silently accepted;
4. any unavoidable unrelated lock churn is enumerated and separately justified before commit;
5. normal repository configuration returns to strict `trustPolicy: no-downgrade` with no broad persistent migration bypass;
6. `pnpm install --frozen-lockfile`, HIGH/CRITICAL dependency audit, workspace typecheck, workspace tests, and web build all pass from the committed result.

## 7. Candidate evidence package for a future migration PR

A migration PR should provide, at minimum:

- the baseline commit and lock blob SHA listed above;
- the complete pre-reviewed migration exception manifest, if an exception mechanism is authorized;
- a before/after `name@version + integrity` comparison for every manifest entry;
- a bounded lockfile diff summary;
- dependency-path evidence showing the remediated `browserslist` path;
- machine-readable HIGH/CRITICAL audit evidence;
- complete regression CI evidence;
- confirmation that migration-only trust controls are absent from normal repository configuration after generation.

## 8. Current decision

`G-PNPM-HISTORICAL-TRUST-MIGRATION-01` remains **OPEN**.

The five verified historical observations are useful evidence, but they do not constitute a complete inventory and do not authorize a trust exception list. #101 remains blocked by the structural #105/#106 migration problem; #74 CodeQL remains unrelated and separate.
