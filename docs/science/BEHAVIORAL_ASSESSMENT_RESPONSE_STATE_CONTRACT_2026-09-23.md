# EMOPET behavioural assessment response-state contract

**Status:** `CONTROLLED DATA / SCIENCE CONTRACT`  
**Date:** 2026-09-23  
**Gate:** `BEHAV-DATA-01`

## Purpose

Behavioural questionnaire states must preserve applicability and observation truth. They are not interchangeable and must never be collapsed to a numeric score by convenience.

## Canonical response states

- `answered` — the respondent supplied a valid instrument response. `response_value` is required and may legitimately be `0` when the instrument scale permits zero.
- `not_applicable` — the situation cannot meaningfully apply in the administration context. Example class: a household-interaction question in a genuinely single-dog household. `response_value = NULL`.
- `not_observed` — the situation could apply, but the respondent has not had a meaningful opportunity to observe it. `response_value = NULL`.
- `skipped` — the respondent intentionally chose not to answer. `response_value = NULL`.
- `missing` — the expected response is absent because of incomplete capture, interruption or technical/data missingness. `response_value = NULL`.

## Non-equivalence rule

`not_applicable != not_observed != skipped != missing != answered(0)`

No product, scoring, analytics or research path may silently coerce a non-answered state to `0`.

## Administration-context snapshot

Behavioural applicability can depend on household context. The assessment therefore may preserve a snapshot containing:

- `household_dog_count`;
- `multi_dog_household`;
- `cohabitation_context`;
- `administration_context_version`;
- `context_captured_at`.

These fields describe context **at administration time**. Historical rows are intentionally nullable and must not be backfilled from the dog's current household state.

When both `household_dog_count` and `multi_dog_household` are known, they must agree:

- count = 1 -> `multi_dog_household = false`;
- count >= 2 -> `multi_dog_household = true`.

## C-BARQ boundary

This contract contains no C-BARQ item wording and grants no right to reproduce, score or commercially administer C-BARQ. It is instrument-agnostic infrastructure informed by the controlled scientific authority:

`docs/science/EMOPET_CBARQ_UPENN_SCIENTIFIC_AUTHORITY_2026-09-23.md`

## Scientific rationale

The 2025 French C-BARQ validation study reinforces that non-response, non-applicability and lack of observable opportunity must not be treated as behavioural absence. Dog-rivalry applicability is one concrete example, but the contract applies to any future licensed or research behavioural instrument.
