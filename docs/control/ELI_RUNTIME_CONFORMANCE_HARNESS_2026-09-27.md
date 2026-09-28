# ELI runtime conformance harness — current-main decision

**Issue:** #479  
**Parent:** #118  
**Date:** 2026-09-27  
**Status:** `CONFORMANCE HARNESS ONLY / NOT RUNTIME ACTIVATION / NOT RELEASE AUTHORITY`

## Decision

The historical #581 candidate mixed two different ideas:

1. proving that backend code can invoke the canonical `@emopet/eli-engine`; and
2. beginning a real ELI runtime slice.

Those are now separated.

This current-main successor authorizes only **software conformance**.

## What the harness may prove

The harness may exercise:

- the canonical engine package;
- veto behavior;
- IMU reliability/noise propagation;
- exact feature-contract version checks;
- dog/baseline coherence;
- provenance shape;
- abstention/fail-closed behavior.

The input is explicitly:

`CONFORMANCE_ONLY_SYNTHETIC`

and the source provenance is:

`SYNTHETIC_TEST_INJECTION`.

## What it may not become

The harness has no authority to:

- ingest a live TAG feature;
- write canonical ELI persistence;
- activate or select an API route;
- return an Owner-facing ELI observation;
- authorize a client to consume a result;
- convert green software tests into scientific validation.

Its result therefore hard-codes:

- `userProjection: null`;
- `persistenceWrite: null`;
- `apiRoute: null`.

## Why the real runtime remains blocked

### Transport

#589/#122 established that TAG firmware computes `activity_variability`, but BLE V1 does **not** serialize it.

Therefore no honest current path exists:

`TAG -> BLE -> backend activity_variability`.

A test-injected value cannot be described as that path.

### Science

#577/#87 records:

- the 30-minute ODBA-CV measurement contract is mechanically coherent;
- the positive `activity_variability -> arousal` relationship remains an unvalidated EMOPET hypothesis;
- the observation-model functional form and gain remain science/model authority questions.

The harness may execute that code for software conformance. It may not promote its internal latent state into Product truth.

### API

#590/#124 keeps `AVAILABLE` uninhabitable until a concrete Product/Science observation is authorized.

The existing owner-scoped ELI reads must therefore continue to return `501 eli_runtime_not_implemented`.

## Next true vertical slice

A real vertical slice is a separate decision and requires at minimum:

1. versioned transport for the selected feature;
2. device/dog/event-time/replay provenance;
3. authoritative backend feature ingestion;
4. explicit feature and baseline versions;
5. a publishable Product/Science observation type, or a deliberately non-latent physical observation;
6. persistence/read authority;
7. an API availability state transition;
8. one client consuming the authoritative projection without local recompute/fallback;
9. deterministic end-to-end vectors.

The recommended next product slice remains a **physical activity observation** before any arousal claim.

## Current disposition

`CANONICAL_ENGINE = packages/eli-engine`

`BACKEND_ENGINE_CONFORMANCE = AUTHORIZED`

`LIVE_FEATURE_INGESTION = NOT AUTHORIZED`

`ELI_PERSISTENCE = HOLD`

`ELI_API_ACTIVATION = HOLD`

`OWNER_PROJECTION = DISABLED`

`EXISTING_501 = MUST REMAIN`
