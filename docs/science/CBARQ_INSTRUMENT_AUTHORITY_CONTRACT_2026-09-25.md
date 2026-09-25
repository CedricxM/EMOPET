# C-BARQ instrument-authority contract

**Issue:** #540  
**Status:** `CURRENT CONTRACT / NO PRODUCTION INSTRUMENT AUTHORITY`  
**Authority context:** `docs/science/EMOPET_CBARQ_UPENN_SCIENTIFIC_AUTHORITY_2026-09-23.md`

This contract controls instrument identity, provenance and usage authority without storing or reproducing protected questionnaire wording.

## Canonical fields

A C-BARQ authority record must independently version:

- instrument owner;
- instrument code and version;
- language code;
- translation revision/source;
- form variant;
- scoring version/method;
- administration protocol version;
- licence/permission reference;
- allowed use contexts;
- effective/expiry dates where applicable.

Allowed form-variant states are:

- `FULL_AUTHORIZED`;
- `AUTHORIZED_SHORT_FORM`;
- `RESEARCH_VARIANT`;
- `UNREVIEWED`.

## Fail-closed rule

No production display, scoring, item-level storage, repeated administration, derivative display, research administration or publication/export permission is inferred from:

- publication of a validation paper;
- availability of a French translation;
- presence of scoring code;
- a historical prototype;
- correspondence that does not itself grant the requested right.

Each requested use must be explicitly authorized by the checked-in authority record.

The current repository configuration intentionally denies every use because written Penn/instrument authority has not yet been established.

## 63-item EFA firewall

The 63 items retained at the loading threshold in the 2025 French EFA remain:

`NOT_AUTHORIZED_SHORT_FORM`

They must not be represented as a validated or licensed short C-BARQ unless later instrument authority explicitly establishes that status.

## Protected wording boundary

The authority contract contains metadata only. It must not contain questionnaire item wording unless a later controlled licence expressly permits repository storage/reproduction.

## Current machine-readable authority

`config/science/cbarq-instrument-authority.json`

The corresponding evaluator is:

`scripts/control/cbarq-instrument-authority.mjs`

and its regression tests are:

`scripts/control/cbarq-instrument-authority.test.mjs`

## Penn decisions still required

The final authority remains blocked on written answers covering at minimum:

- current licensable French version and translation;
- product/digital embedding rights;
- item-level storage;
- scoring/subscale computation;
- repeated longitudinal administration;
- missing/NA handling;
- derivative displays;
- short-form authority;
- publication/export restrictions.

Until those are recorded, the checked-in state remains fail-closed.
