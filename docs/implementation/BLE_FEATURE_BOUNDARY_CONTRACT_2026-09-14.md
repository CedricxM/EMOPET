# BLE → feature boundary contract — 14 September 2026

Status: IMPLEMENTED CANDIDATE / DRAFT PR #224 / NOT FEATURE EXTRACTION / NOT ELI ACTIVATION

## Purpose

Advance #122 (`ELI-IO-01`) without inventing the unresolved MAT/TAG parsed-frame → canonical feature transform.

The repository already distinguishes raw BLE bytes, parsed MAT/TAG frames, shared `FeatureVector`, `FeatureIngestionEnvelope`, persisted sensor summaries and ELI input. The remaining contract risk at this slice was structural: a `ParsedBleSensorFrame` shape alone did not prove that the value came through the canonical BLE parser before a future extractor consumes it.

## Implemented boundary

`packages/ble-protocol` now exposes an opaque `VerifiedParsedBleFrame` type.

The only repository constructor added for that proof is `parseProtocolVerifiedSensorFrame(raw)`. It delegates to the existing canonical `parseSensorFrame`, then attaches the compile-time proof after the parser has accepted:

- BLE header;
- protocol version;
- MAT/TAG source discriminator;
- exact source-specific frame length;
- CRC.

A plain `ParsedBleSensorFrame` is intentionally not assignable to `VerifiedParsedBleFrame` by normal TypeScript assignment. A verified frame remains assignable to the parsed-frame contract. `BleFeatureBoundaryCompileTimeProof` keeps those two invariants under workspace typecheck.

`BleFeatureBoundaryTypes` names the adjacent verified parsed-frame and `FeatureIngestionEnvelope` contracts in one module. It is deliberately a type map, not a transformation function.

## What this proof does not mean

`VerifiedParsedBleFrame` is protocol-parse evidence only. It does **not** prove or authorize:

- physical-device authentication or Device Trust #66;
- canonical device↔dog binding;
- firmware authenticity or completeness;
- device-boot time → wall-clock/event-time mapping;
- clock reset, wrap or reconnect semantics;
- calibration identity or calibration validity;
- feature units, formulas, windows, coverage or null semantics;
- feature-contract versioning;
- scientific validity or an ELI publication decision.

The opaque brand must therefore not be treated as a general trusted-device or science-validity token.

## Deliberately absent transform

No implementation has been added that converts one or more `VerifiedParsedBleFrame` values into `FeatureExtractionResult`, `FeatureIngestionEnvelope`, persisted sensor summaries or `EliInput`.

The type boundary explicitly allows a future reviewed extractor to aggregate multiple verified frames, buffer windows or abstain. It does not encode one-frame→one-envelope behavior.

That transformation remains blocked on the unresolved authorities already recorded in #118/#122, including authoritative conversion location, time/identity provenance, feature semantics/versioning and conformance vectors.

## Gate impact

This slice strengthens `ELI-IO-G1` naming/boundary evidence and creates a compile-time prerequisite for future `ELI-IO-G6` conformance work.

It does not close:

- `ELI-IO-G2` authoritative conversion location;
- `ELI-IO-G3` time and identity provenance;
- `ELI-IO-G4` feature contract/version;
- `ELI-IO-G6` end-to-end deterministic conformance;
- any #86/#87 science gate;
- #118 canonical ELI runtime activation.

`G-ELI-DEVICE-INPUT-CONTRACT-01` remains OPEN.

No merge, release or production authority is implied.
