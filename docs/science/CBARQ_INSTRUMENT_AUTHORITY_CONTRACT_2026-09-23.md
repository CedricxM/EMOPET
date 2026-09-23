# C-BARQ instrument authority contract

**Status:** `CONTROLLED / FAIL-CLOSED / LICENCE NOT ESTABLISHED`  
**Date:** 2026-09-23  
**Owning issue:** #540 / `CBARQ-INSTRUMENT-01`

This contract defines how EMOPET may represent authority to use a C-BARQ instrument without storing or reproducing protected questionnaire wording.

It does **not** grant a C-BARQ licence, identify the final licensable French version, authorize digital/commercial embedding, authorize scoring, or imply Penn/Serpell endorsement.

## 1. Canonical authority record

The controlled repository record is:

`config/science/cbarq-instrument-authority.json`

It separates:

- instrument owner / authority;
- instrument code and exact version;
- language;
- translation revision and source;
- form variant;
- scoring version and method authority;
- administration protocol version;
- licence reference;
- effective / expiry dates;
- permitted use contexts.

No item wording belongs in this contract.

## 2. Form-variant states

Allowed authority states are:

- `FULL_AUTHORIZED`;
- `AUTHORIZED_SHORT_FORM`;
- `RESEARCH_VARIANT`;
- `UNREVIEWED`.

The 63-item EFA result reported in the 2025 French study remains:

`FRENCH_2025_EFA_63 = NOT_AUTHORIZED_SHORT_FORM`

It must not become `AUTHORIZED_SHORT_FORM` without explicit instrument authority.

## 3. Fail-closed runtime rule

The evaluator is:

`backend/api/services/cbarq-instrument-authority.ts`

Use is denied unless all authority relevant to the requested capability matches exactly.

At minimum, every request requires:

- repository runtime default = `DENY_UNLESS_EXACT_AUTHORITY_MATCH`;
- authority status = `AUTHORIZED`;
- exact instrument version;
- authorized licence with a non-empty authority reference;
- licence currently effective and not expired where dates are supplied;
- exact authorized language + translation revision/source;
- authorized form variant;
- explicit permission for the requested capability.

Scoring additionally requires an authorized scoring method and exact scoring version.

Questionnaire administration additionally requires an authorized administration protocol and exact protocol version.

Unknown, absent or malformed authority fails closed.

## 4. Capability authority

The current contract distinguishes permission for:

- product display;
- research administration;
- item-level storage;
- scoring/subscale computation;
- repeated administration;
- derivative displays;
- export/publication.

Persistence of a field in PostgreSQL does not imply any of these permissions.

## 5. Current checked-in disposition

Until Penn/instrument authority answers the open licensing questions:

- instrument legal authority: `UNCONFIRMED`;
- current licensable French version: `UNKNOWN`;
- French translation revision: `UNKNOWN`;
- product display: `UNREVIEWED / DENY`;
- item-level storage: `UNREVIEWED / DENY`;
- scoring: `UNREVIEWED / DENY`;
- repeated administration: `UNREVIEWED / DENY`;
- derivative display: `UNREVIEWED / DENY`;
- export/publication: `UNREVIEWED / DENY`;
- 63-item EFA derivative: `NOT_AUTHORIZED_SHORT_FORM`.

This is deliberate. A future licence response should update the authority record rather than bypassing the evaluator.

## 6. Penn decisions still required

Finalization still requires authoritative answers on:

- current licensable French instrument/version;
- whether it matches the revised French wording used in the 2025 study;
- digital/commercial embedding rights;
- item-level storage;
- scoring/subscale rights and official missing/NA handling;
- repeated longitudinal administration;
- derivative displays;
- short-form availability/validation;
- publication/export restrictions;
- effective dates, expiry and licence reference.

## 7. Scientific boundary

This contract governs permission to administer/store/score/display an instrument. It does not make C-BARQ latent-state ground truth and does not authorize C-BARQ -> ELI mapping.

The separate authorities remain:

- #539 / behavioural -> ELI mapping firewall;
- #541 / prospective external-criterion validation design;
- #479 / canonical ELI runtime/science owner;
- `docs/science/EMOPET_CBARQ_UPENN_SCIENTIFIC_AUTHORITY_2026-09-23.md`.

## 8. Current gate

`CBARQ_INSTRUMENT_CONTRACT = IMPLEMENTED`

`EMOPET_CBARQ_LICENCE = NOT_ESTABLISHED`

`PRODUCTION_CBARQ_USE = FAIL_CLOSED`

`FRENCH_2025_EFA_63 = NOT_AUTHORIZED_SHORT_FORM`

`PENN_LICENSING_RESPONSE_REQUIRED_FOR_AUTHORIZATION = TRUE`
