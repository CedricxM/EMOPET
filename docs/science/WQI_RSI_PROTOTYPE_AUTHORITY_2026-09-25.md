# WQI / RSI prototype-authority boundary

**Issue:** #91  
**Status:** `PROTOTYPE ONLY / NOT PRODUCT V1 AUTHORITY`  
**Date:** 2026-09-25

## Finding

The web dashboard contains deterministic demo values for WQI and RSI. The previous UI comments/text referred to `ELI v6 §7` and `§8`, but no controlled specification defining those sections has been recovered.

Therefore the current values remain presentation prototypes.

## WQI

Current mock weights:

- exercise: 0.40;
- exploration: 0.35;
- social: 0.25.

These weights are arithmetically coherent but have no recovered controlled Product/Science authority. Their presence in code and tests does not validate them.

## RSI

Historical prototype text describes:

- 24-hour routine pattern;
- cosine similarity versus a 14-day mean;
- 0–100 scaling;
- >=80 stable;
- <50 for three days as a signal.

The current web mock does **not** compute a real 24-hour cosine similarity. It generates a seeded presentation score. Therefore the mock is not even runtime evidence for the historical prototype algorithm.

## Repository disposition

Machine-readable authority:
`config/science/wqi-rsi-authority.json`.

UI copy now labels WQI/RSI parameters as demo/prototype semantics and removes the phantom §7/§8 authority implication.

## Before activation

A real Product path must define and version:

- feature sources and normalization;
- window/day/time-zone semantics;
- missing-data/abstention;
- baseline/cold-start policy;
- WQI weight rationale;
- RSI distance/similarity metric;
- RSI baseline update policy;
- threshold/persistence provenance;
- context/veto handling;
- backend authority;
- validation/calibration.

No production path may silently fall back to these mock values.
