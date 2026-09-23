# Behavioral assessment response-state contract

**Authority:** BEHAV-DATA-01 / #538  
**Status:** `CURRENT / FAIL-CLOSED DATA SEMANTICS`  
**Date:** 2026-09-23

This contract applies to behavioural-assessment responses independently of any particular licensed instrument.

## 1. Canonical response states

| State | Meaning | Numeric response |
|---|---|---|
| `answered` | The respondent supplied an answer on the instrument scale. | Required and within the declared scale bounds. Zero is a valid answer when the scale allows it. |
| `not_applicable` | The item/situation cannot meaningfully apply in the assessment-time context. | MUST be `NULL`. |
| `not_observed` | The situation could apply, but the respondent has not had a meaningful opportunity to observe it. | MUST be `NULL`. |
| `skipped` | The respondent chose not to answer/passed the item. | MUST be `NULL`. |
| `missing` | Data is absent because of incompleteness, interruption, import/technical loss, or unknown missingness. | MUST be `NULL`. |

## 2. Non-equivalence rule

The following values are never interchangeable:

`answered(0) != not_applicable != not_observed != skipped != missing`

No analytics, scoring, export, UI, research, ELI or machine-learning path may silently convert a non-answered state to numeric zero.

Any future imputation for research must be explicitly versioned, provenance-bearing and performed outside the raw response record. It must never overwrite the original response state.

## 3. Household-context snapshot

Applicability can depend on household context. Therefore each assessment may retain an assessment-time household snapshot:

- `household_dog_count`: nullable when unknown, otherwise >= 1;
- `multi_dog_household`: derived as `household_dog_count > 1` when the count is known;
- `household_context_version`: version of the context vocabulary/schema;
- `household_context_captured_at`: when the snapshot was obtained;
- `household_context`: bounded provenance/context metadata.

The household snapshot belongs to the assessment. It must not be recomputed later from mutable present-day household/profile state.

## 4. Scientific boundary

Household context controls applicability/provenance only. It does not by itself imply:

- rivalry;
- aggression;
- fear;
- anxiety;
- social compatibility;
- any latent emotional or clinical state.

No licensed questionnaire wording belongs in this contract or in the generic behavioural-assessment database tables.

## 5. C-BARQ / Penn boundary

When C-BARQ is involved, also read:

`docs/science/EMOPET_CBARQ_UPENN_SCIENTIFIC_AUTHORITY_2026-09-23.md`

This response-state contract does not grant a C-BARQ licence, scoring authority or production-use permission.
