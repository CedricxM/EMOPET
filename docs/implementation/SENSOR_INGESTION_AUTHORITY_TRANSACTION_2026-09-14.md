# Sensor-summary mutation authority transaction — 2026-09-14

Status: IMPLEMENTED CANDIDATE / DRAFT PR #224 / NOT DEVICE→ELI ACTIVATION

## Purpose

Close a mutation-authority race in the bounded PostgreSQL sensor-summary ingestion path.

The existing route already persisted summaries, validated canonical device↔dog/source binding, copied firmware version from the server-side device registry, rejected raw-audio/exact-location hitchhiking fields and supported idempotent producer retries. The remaining gap was temporal: Owner authority and device binding were checked by separate unlocked reads before persistence.

A dog ownership transfer or device rebinding could therefore commit after a successful precheck but before the summary insert.

## Transaction boundary

`POST /api/sensors/summaries` now performs the authoritative mutation decision inside one PostgreSQL transaction:

1. resolve the authenticated user from server context;
2. lock the target dog row `FOR SHARE`;
3. verify the transaction-current Owner;
4. when `deviceId` is present, lock the matching device row `FOR SHARE` and verify device↔dog/source binding;
5. snapshot firmware version from that locked server-side device row;
6. insert the summary or resolve the existing idempotent retry inside the same transaction;
7. commit before returning the success acknowledgement.

This gives ownership transfer and device rebinding a deterministic order relative to ingestion. If a conflicting authority mutation already owns the row lock, ingestion waits and rechecks the committed state. If ingestion owns the shared lock first, the authority mutation waits until persistence commits.

## Concurrency evidence

`backend/test/sensor-ingestion-authority-concurrency.integration.test.mjs` exercises actual PostgreSQL lock contention:

- an ownership transfer acquires the dog row first, then the former Owner's ingestion waits, observes the new Owner after commit, returns `404 not_found`, and persists no summary;
- a device rebind acquires the device row first, then ingestion waits, observes that the device is no longer bound to the requested dog/source, returns `400 SENSOR_DEVICE_BINDING_INVALID`, and persists no summary;
- stable Owner/device authority still persists normally and snapshots firmware from the server registry.

## Preserved boundaries

This slice does not change the approved sensor-summary field schema or widen collected data. In particular it does not:

- accept raw household audio;
- accept exact location fields;
- make `deviceId` or `ingestionId` mandatory;
- treat MAC address as the request-side device principal;
- implement BLE transport or mobile subscription;
- define the parsed-frame → canonical feature transform;
- activate ELI inference or an `eli_states` producer;
- resolve disputed feature/science semantics;
- authorize raw-stream cloud storage.

## Remaining gates

This mutation transaction advances the runtime-foundation and DATA-01 ingestion evidence, but the wider device→ELI path remains open under #68, #118 and #122. Device trust/security authority, firmware completeness, canonical feature/version provenance, ELI orchestration and scientific gates remain separate.

No merge or release authority is implied.
