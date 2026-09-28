# Activity variability — measurement / interpretation authority split

**Issue:** #87  
**Status:** `MEASUREMENT CONTRACT COHERENT / AFFECTIVE INTERPRETATION OPEN`  
**Date:** 2026-09-25

Machine-readable authority:

`config/science/activity-variability-authority.json`

## 1. What is settled mechanically

The TAG feature contract is internally coherent:

- 1 Hz ODBA;
- trailing 1800 s / 30 min window;
- at least 900 valid seconds;
- BODY_SHAKE-suppressed samples excluded;
- coefficient of variation implemented as sample standard deviation / mean;
- near-zero mean guard;
- null/NaN when coverage is insufficient.

This makes `activity_variability` a deterministic movement feature. It does **not** assign an emotional or welfare meaning.

## 2. What remains a hypothesis

The current ELI engine assumes that increasing `activity_variability` corresponds monotonically to increasing latent arousal.

That relationship is classified:

`EMOPET_HYPOTHESIS_UNVALIDATED`

The current cited ODBA literature does not establish:

- the 30-minute CV transform as an arousal marker;
- a monotonic direction;
- the coded gain;
- canine validity in EMOPET contexts.

## 3. Functional-form conflict

Two forms currently coexist:

- model document: additive `baseline + arousal * k2`, with `k2` unspecified;
- engine: proportional `baseline * (1 + 0.4 * arousal)`.

Neither is promoted as scientific authority by this record.

The implemented `0.4` is classified as:

`EMOPET_ENGINEERING_PARAMETER_UNVALIDATED`

until a controlled calibration/validation decision exists.

## 4. Validation contract before material ELI weight/public significance

Evidence must test at minimum:

1. within-dog repeatability of the 30-minute CV feature;
2. sensor placement / BODY_SHAKE / walk / play / household / age-size confounds;
3. incremental information beyond ODBA mean and activity minutes;
4. direction and shape of association with the selected arousal reference;
5. baseline dependence of additive versus proportional forms;
6. missingness and abstention behavior;
7. independent canine validation / holdout.

Synthetic software tests may verify implementation only. They are not scientific validation.

## 5. Current gate

`G-ACTIVITY-VARIABILITY-EVIDENCE-01 = MEASUREMENT_COHERENT / INTERPRETATION_UNVALIDATED / PRODUCTION_ACTIVATION_BLOCKED`
