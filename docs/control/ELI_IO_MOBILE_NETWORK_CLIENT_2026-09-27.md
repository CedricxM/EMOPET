# ELI-IO mobile feature POST client

**Issue:** #122  
**Date:** 2026-09-27  
**Status:** `NETWORK CLIENT CANDIDATE / NO SUCCESS AUTHORITY / NO AUTO-FORWARDING`

## Purpose

The backend now exposes a fail-closed network-ingress candidate route (#643),
and the mobile can resolve a canonical backend TAG registry id (#646).

This slice adds a bounded POST client for an
`activity-feature-forwarding-v1` candidate that has **already passed** the
#641 forwarding gate.

## Client boundary

`apps/mobile/src/services/activity-feature-network.ts`

The client:
- validates the candidate again before network IO;
- POSTs only the versioned forwarding contract;
- preserves backend hard-stop error codes;
- treats network failure separately;
- performs no policy selection;
- performs no BLE identity inference;
- performs no automatic retry or offline queue.

## No success contract yet

There is intentionally **no** current client result with:
- `accepted: true`;
- `persisted: true`.

The backend route cannot persist under current authority.

Even if a future backend change accidentally returns 2xx before a versioned
success contract is approved, this client returns:

`UNEXPECTED_SUCCESS_RESPONSE`

and still reports:
- `accepted: false`;
- `persisted: false`.

## Known controlled backend outcomes

The client recognizes:
- `FEATURE_DEVICE_BINDING_INVALID`;
- `DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED`;
- `FEATURE_NETWORK_INGESTION_NOT_ACTIVATED`;
- `PRODUCT_DATABASE_OPERATION_UNAVAILABLE`;
- Owner auth/not-found responses.

## Still open

This slice does not:
- choose max anchor age;
- choose max anchor uncertainty;
- build the #641 forwarding candidate;
- automatically forward BLE frames;
- retry or buffer offline;
- authenticate the physical BLE peer;
- activate network persistence;
- define a successful-ingestion response.

Therefore `mobileToBackendForwardingImplemented` remains false. The repository
has a network client primitive, not an active forwarding pipeline.
