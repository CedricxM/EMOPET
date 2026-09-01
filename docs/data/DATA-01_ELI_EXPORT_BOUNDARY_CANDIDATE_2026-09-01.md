# DATA-01 — ELI export boundary candidate

Status: **CANDIDATE / NOT PRODUCT-LEGAL CLOSURE**  
Date: 2026-09-01

## Purpose

Prevent the Guardian portability/export surface from becoming an accidental bypass around the current ELI publication gate.

This candidate does not decide the complete Data Act product-data matrix and does not close `G-DATA-ACT-PRODUCT-DATA-01`.

## Mechanical boundary implemented

The persistence schema may contain internal ELI variables. Guardian-facing export is therefore serialized through a dedicated disclosure boundary rather than spreading the persisted database row into JSON/CSV.

Current candidate behavior:

- `valence` is not emitted to the Guardian export;
- `arousal` and `load` are emitted only when `gateStatus === PUBLISH`;
- `DEGRADE`, `REJECT`, and unknown/future gate values fail closed for latent values;
- confidence, gate status, sensor reliability, timestamps and provenance may remain present to explain publication/withholding;
- CSV is generated from the already-filtered export envelope, not directly from persistence rows.

## Regression evidence

Tests must prove both structural and value-level non-leakage:

1. JSON serializer output contains no `valence` field/value.
2. Non-PUBLISH JSON output contains no `arousal`, `load`, or `valence` fields.
3. PUBLISH CSV may contain authorized `arousal`/`load`, but not the persisted `valence` value.
4. DEGRADE/REJECT/unknown-gate CSV contains none of the persisted latent values.
5. The route delegates inferred serialization to `serializeEliForGuardianExport` and must not reintroduce a `...row` persistence-schema spread.

## Explicit non-decisions

This candidate does **not** establish that inferred/derived ELI values are mandatory Data Act Chapter II product data. It does not authorize broader rights-request disclosure of internal variables. It does not define retention. It does not modify ELI persistence, scientific validity, thresholds, or the publication authority itself.

Any later decision to disclose additional internal derived variables requires an explicit controlled policy change plus matching JSON and CSV regression tests.
