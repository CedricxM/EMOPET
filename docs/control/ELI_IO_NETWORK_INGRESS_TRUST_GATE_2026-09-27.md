# ELI-IO network ingress candidate — Device Trust hard stop

**Issues:** #122 / #66  
**Date:** 2026-09-27  
**Status:** `ROUTE CANDIDATE / SERVER REGISTRY CHECK / DEVICE TRUST FAIL-CLOSED / NO PERSISTENCE`

## Why this slice exists

The mobile transport can now:
- parse the feature summary;
- capture BOOT_ANCHOR_V1;
- build a forwarding candidate that requires a canonical backend device UUID.

The backend already owns durable feature persistence.

The missing security fact is whether the BLE peripheral that produced the frame
is physically the canonical device principal represented by that UUID.

A database row binding is necessary, but it is not proof of possession.

## Candidate route

`POST /api/sensors/features/activity-variability`

The route accepts the strict shared:

`activity-feature-forwarding-v1`

contract.

It performs no persistence.

## Server authority sequence

Before any future write, the backend now requires:

1. authenticated Owner;
2. Owner owns the dog;
3. canonical `devices.id` exists;
4. that row is a TAG bound to the same dog;
5. Device Data Trust verifier authenticates the physical principal;
6. separate network-ingestion activation.

The current #66 verifier deliberately returns:

`DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED`

for every otherwise valid request.

## Double gate

Even if a future verifier starts returning trusted evidence, this route still
returns:

`FEATURE_NETWORK_INGESTION_NOT_ACTIVATED`

and does not call:
- `ingestActivityVariabilityTransportFrame`;
- `persistActivityVariabilityFeatureObservation`;
- `sensor_feature_observations`.

This forces Device Trust delivery and network-ingestion activation to be two
separate reviews.

## Identity boundary

The server rechecks the canonical UUID against:
- Owner;
- dog;
- device type = TAG.

The BLE transport identifier is not present in this network authority.

Transport replay data such as boot session and sequence are supplied to the
future trust verifier as evidence context, but the Device Trust authority
explicitly says replay provenance is **not authentication**.

## Still open

- manufacturing identity architecture;
- proof of possession;
- production credential injection/rotation/revocation;
- real Device Data Trust verifier;
- selected forwarding freshness/uncertainty policies;
- mobile registry binding source;
- actual POST client;
- persistence activation;
- target hardware security evidence.

The end-to-end path remains false.
