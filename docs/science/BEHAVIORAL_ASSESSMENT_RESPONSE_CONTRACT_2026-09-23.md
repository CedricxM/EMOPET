# Behavioral assessment response and administration-context contract

**Status:** `CONTROLLED DATA CONTRACT`  
**Date:** 2026-09-23  
**Owning issue:** #538 / `BEHAV-DATA-01`

This contract applies to EMOPET behavioural-assessment data independently of any specific licensed instrument.

It does not reproduce C-BARQ wording, grant a questionnaire licence, authorize a short form, validate ELI, or create any sensor-to-diagnosis mapping.

## 1. Response-state semantics

Exactly one response state applies to each presented item.

### `answered`

The respondent supplied a numeric response on the instrument's configured scale.

Rules:

- `response_value` MUST be non-null;
- `response_value` MUST be within `scale_min..scale_max`;
- `answered(0)` is a real observed response and is **not** missingness.

### `not_applicable`

The situation represented by the item does not apply to the dog / household / administration context.

Example:

- an item requiring interaction with another household dog in a single-dog household.

Rules:

- `response_value = NULL`;
- MUST NOT be converted to zero;
- applicability should be explainable from administration-time context where available.

### `not_observed`

The situation could apply, but the respondent has not had a meaningful opportunity to observe it.

Example:

- a multi-dog household where the relevant interaction has not occurred or has not been observed.

Rules:

- `response_value = NULL`;
- MUST NOT be collapsed into `not_applicable`;
- MUST NOT be converted to zero.

### `skipped`

The respondent was presented with the item and chose not to provide an answer.

Rules:

- `response_value = NULL`;
- MUST remain distinguishable from technical missingness and lack of observation.

### `missing`

No usable response is available because data are absent, incomplete, interrupted, corrupted, or otherwise unavailable.

Rules:

- `response_value = NULL`;
- MUST NOT imply the respondent selected zero or chose to skip.

## 2. Forbidden coercion

The following transformation is prohibited:

`not_applicable | not_observed | skipped | missing -> 0`

Scoring or analytics code must explicitly decide how each state is handled under the licensed/scientific scoring authority for the instrument version.

No generic EMOPET helper may silently impute these states.

## 3. Administration-context snapshot

Applicability can depend on context that changes over time. Therefore context used to interpret an assessment belongs to the assessment snapshot and must not be recomputed from current household state.

Current canonical fields:

- `administration_context_version`;
- `household_dog_count`;
- `multi_dog_household`;
- `cohabitation_context`;
- `context_captured_at`.

### Household consistency

When `household_dog_count` is known:

- it must be at least 1;
- `multi_dog_household` must be present;
- `multi_dog_household = (household_dog_count > 1)`.

### Snapshot provenance

If any administration-context value is stored:

- `administration_context_version` is required;
- `context_captured_at` is required.

Existing historical assessments may legitimately have no context snapshot. Missing historical context must remain unknown rather than being backfilled from present-day household state.

## 4. Instrument provenance

Assessment-level provenance supports:

- `instrument_code`;
- `instrument_version`;
- `instrument_language`;
- `translation_revision`;
- `license_reference`;
- `administration_mode`;
- `scientific_use_status`.

If `translation_revision` is present, `instrument_language` must also be present.

Questionnaire item wording must not be persisted in this generic contract.

## 5. Score provenance

Derived behavioural factor/subscale scores remain separate from raw responses.

A score must retain:

- source assessment;
- factor key;
- scoring method;
- scoring version;
- provenance;
- computation timestamp.

This contract does not authorize any behavioural score as an ELI prior. That authority belongs to #539 / `ELI-BEHAV-01`.

## 6. Export and internal-record rule

Any future behavioural-assessment export or internal scientific record that includes responses or scores should retain enough provenance to reconstruct:

- instrument/version;
- language/translation revision where present;
- administration mode;
- response state;
- administration-context snapshot;
- scoring method/version where scores exist.

Absence of a current export implementation is not permission to discard this provenance later.

## 7. Scientific authority

This contract is consistent with:

- `docs/science/EMOPET_CBARQ_UPENN_SCIENTIFIC_AUTHORITY_2026-09-23.md`;
- the French C-BARQ validation evidence controlled there;
- the repository rule that owner report, sensor observation, and ELI/model inference are separate evidence classes.

## 8. Current disposition

`NOT_OBSERVED_RESPONSE_STATE = FIRST_CLASS`

`NON_ANSWERED_TO_ZERO_COERCION = PROHIBITED`

`HOUSEHOLD_CONTEXT = ASSESSMENT_TIME_SNAPSHOT`

`CURRENT_HOUSEHOLD_RETROACTIVE_REWRITE = PROHIBITED`

`C_BARQ_ITEM_WORDING_IN_GENERIC_SCHEMA = PROHIBITED`

`QUESTIONNAIRE_TO_ELI_AUTHORITY = OUT_OF_SCOPE / #539`
