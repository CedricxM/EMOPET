# ELI-IO — mobile activity-feature forwarding preflight

**Issue:** #122  
**Date:** 2026-09-29  
**Status:** `PREFLIGHT COMPOSITION IMPLEMENTED / PHYSICAL TRUST BLOCKED / NO NETWORK AUTHORITY`

## Purpose

Compose the already-delivered mobile prerequisites for the first
`activity_variability` forwarding slice without activating network delivery.

The preflight consumes:
- an already parsed versioned feature-summary frame;
- a captured `BOOT_ANCHOR_V1`;
- a canonical Owner/dog TAG registry resolution;
- explicit caller-supplied freshness and uncertainty ceilings.

It reuses the canonical `buildActivityFeatureForwardingCandidate()` gate.

## Result states

The preflight can return:

- `BLOCKED / CANONICAL_TAG_NOT_FOUND`;
- `BLOCKED / CANONICAL_TAG_AMBIGUOUS`;
- `BLOCKED / CANONICAL_TAG_DOG_MISMATCH`;
- `BLOCKED / FORWARDING_GATE_REJECTED`;
- `CANDIDATE_READY_TRUST_BLOCKED / PHYSICAL_DEVICE_AUTHENTICATION_NOT_ESTABLISHED`.

Even in the final state:

`networkSubmissionAuthorized = false`.

## Why a registry match is not enough

The canonical registry row identifies the backend device principal bound to the
Owner/dog relationship.

It does **not** prove that the currently connected BLE peripheral is physically
that device.

Therefore this slice does not promote:
- BLE device id;
- MAC address;
- parsed frame / CRC;
- boot-session id;
- registry uniqueness

into physical-device authentication.

That authority remains #66 / Device Trust.

## No hidden policy

The preflight carries no default for:
- maximum anchor age;
- maximum anchor uncertainty.

Both values must be supplied explicitly by a future authorised caller.

## No network side effect

The preflight:
- does not import `activity-feature-network.ts`;
- does not call `submitActivityFeatureCandidate()`;
- does not call `fetch()`;
- does not enqueue/retry/offline-buffer anything.

The existing POST client remains separately fail-closed, and the backend remains
blocked on Device Data Trust plus explicit network-ingestion activation.

## Gate

`MOBILE_FORWARDING_PREFLIGHT = IMPLEMENTED`

`MOBILE_TO_BACKEND_FORWARDING = NOT_IMPLEMENTED`

`PHYSICAL_DEVICE_AUTHENTICATION = NOT_ESTABLISHED`

`NETWORK_FEATURE_INGESTION = NOT_ACTIVATED`

`END_TO_END = OPEN`
