# ELI runtime — first physical movement vertical slice

**Issue:** #479  
**Parent:** #118  
**Date:** 2026-09-27  
**Status:** `BOUNDED VERTICAL SLICE CANDIDATE / PHYSICAL ONLY / NO LATENT ACTIVATION`

## Decision

The first real runtime candidate is deliberately **not** an arousal, valence, load,
stress, emotion or wellbeing observation.

It exposes one deterministic physical measurement already controlled by #122:

`activity_variability` = coefficient of variation of 1-second ODBA over a
30-minute window, contract `tag-activity-variability-cv30m-v1`.

The positive mapping `activity_variability -> arousal` remains an unvalidated
EMOPET hypothesis under #87 and is not used by this slice.

## Authority chain

`sensor_feature_observations`
→ Owner-scoped physical read
→ `@emopet/eli-engine::gatePhysicalMovementObservation`
→ publish or abstain
→ dedicated backend projection
→ `/api/sensors/eli/:dogId/physical-movement`
→ one mobile Owner card

The canonical technical runtime owner for this slice is `backend/api`.
The publication/abstention gate lives in `packages/eli-engine`.
The cross-surface response contract lives in `packages/shared`.
Mobile is a client only and performs no recomputation.

## Publish requirements

The engine gate publishes only when:

- observation status is `OBSERVED`;
- value is finite and non-negative;
- at least 900 / 1800 seconds are valid;
- quality is explicitly `VALID` or `DEGRADED`;
- feature-contract version matches exactly;
- firmware-at-ingest provenance exists;
- event time is resolved through `BOOT_ANCHOR_V1`;
- explicit event-time uncertainty exists.

Otherwise the result is `ABSTAIN`, projected as API `UNAVAILABLE`.

No missing quality/provenance field is filled with a default.

## Owner-facing copy boundary

The mobile surface may say only that movement variability was measured over the
30-minute TAG window. It must state that the measurement does not describe
emotion, stress or wellbeing.

The numeric value is a physical ODBA coefficient of variation, not an ELI score.

## What remains blocked

This slice does not authorize:

- generic `/eli/:dogId` availability;
- generic ELI history;
- latent EKF state publication;
- arousal, valence or load;
- contextual ELI inference without real context;
- firmware/BLE production-delivery claims;
- physical-device attestation;
- scientific validation.

Therefore the two generic ELI routes keep their existing
`501 eli_runtime_not_implemented`.

## Persistence decision

No new `eli_states` writer is created.

The authoritative persistence for this physical observation is the already
versioned `sensor_feature_observations` row. Creating a second persistence copy
would introduce two authorities for the same measurement and tempt latent fields
into a slice that explicitly does not authorize them.

## Test evidence required before promotion

- ELI-engine publish/abstain unit tests;
- workspace typecheck/tests;
- PostgreSQL generated-baseline integration proving Owner isolation,
  AVAILABLE/NONE_FOUND/UNAVAILABLE and provenance requirements;
- Security supply-chain checks;
- mobile build;
- generic ELI 501 regression guard.

A green software run proves runtime/data-contract conformance only. It is not
animal/scientific validation and does not prove real hardware delivery.
