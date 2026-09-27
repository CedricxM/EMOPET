# ELI-IO feature forwarding gate — candidate only

**Issue:** #122 / #635  
**Date:** 2026-09-27  
**Status:** `FORWARDING CANDIDATE GATE DELIVERED IN SOURCE / POLICY + REGISTRY BINDING + NETWORK ROUTE OPEN`

## Purpose

After #640, mobile can capture a BOOT_ANCHOR_V1 timing sample.

That is still not enough to forward a feature safely.

Before a feature may become a network request, the client-side transport layer
must prove:

- the feature and anchor belong to the same boot session;
- the anchor is still fresh on the same monotonic runtime timeline;
- the anchor uncertainty is inside an explicitly authorised ceiling;
- a canonical backend-registry device UUID is already known;
- the BLE runtime identifier is not promoted into product identity.

## Canonical gate

Authority:

`packages/ble-protocol/src/feature-forwarding.ts`

Function:

`buildActivityFeatureForwardingCandidate(...)`

The function performs no network IO.

It returns either:
- a versioned `activity-feature-forwarding-v1` candidate; or
- an explicit fail-closed reason.

## Identity boundary

The input is named:

`canonicalDeviceId`

and must validate as a UUID.

The output contract contains:
- `dogId`;
- canonical `deviceId`;
- versioned activity feature frame;
- BOOT_ANCHOR_V1 evidence.

It deliberately contains **no** `bleDeviceId`.

This prevents the react-native-ble-plx transport identifier from silently
becoming the backend security/data principal.

Device Trust remains #66.

## Freshness authority

`CapturedBootAnchorV1` now retains:

`capturedMonotonicMs`

which is the local monotonic instant after the correlated response was received.

Anchor age is computed only as:

`currentMonotonicMs - capturedMonotonicMs`

Wall UTC is not used to decide freshness.

## No invented thresholds

The gate has no defaults for:
- maximum anchor age;
- maximum anchor uncertainty.

Both must be supplied explicitly by the caller.

Current repository authority records:

`forwardingPolicyValuesSelected = false`

Therefore the source can prove the gate semantics without pretending product
thresholds have already been scientifically/operationally selected.

## Still open

This slice does not deliver:
- a canonical mobile registry-binding source for `deviceId`;
- selected max-anchor-age value;
- selected max-uncertainty value;
- POST/backend ingestion route;
- mobile network request;
- retry/offline queue;
- real target-hardware evidence;
- Device Trust;
- latent ELI.

`mobileToBackendForwardingImplemented` remains false.

`networkFeatureIngestionActivated` remains false.

`endToEndPath` remains false.
