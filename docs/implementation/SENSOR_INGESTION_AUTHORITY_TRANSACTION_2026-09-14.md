# Sensor-summary mutation authority transaction — 2026-09-14

Status: IMPLEMENTED CANDIDATE / DRAFT PR #224 / NOT DEVICE→ELI ACTIVATION

## Purpose

Close mutation-authority and provenance gaps in the bounded PostgreSQL sensor-summary ingestion path without activating the wider device→ELI data plane.

The route persists approved hourly summary fields only, validates canonical device↔dog/source binding, copies firmware version from the server-side device registry, rejects raw-audio/exact-location hitchhiking fields and supports idempotent producer retries.

The first hardening slice closed a temporal race: Owner authority and device binding had previously been checked by separate unlocked reads before persistence. A dog ownership transfer or device rebinding could therefore commit after a successful precheck but before the summary insert.

The follow-up slice closes two additional request-contract gaps: a durable acknowledgement can no longer be created without a canonical device UUID plus producer retry key, and a source cannot submit fields assigned to the other device class.

## Transaction boundary

`POST /api/sensors/summaries` now performs the authoritative mutation decision inside one bounded PostgreSQL transaction:

1. resolve the authenticated user from server context;
2. require a producer-generated `ingestionId` and canonical `deviceId` before entering persistence;
3. reject MAT/TAG cross-source field attribution before persistence;
4. lock the target dog row `FOR SHARE`;
5. verify the transaction-current Owner;
6. lock the matching device row `FOR SHARE` and verify device↔dog/source binding;
7. snapshot firmware version from that locked server-side device row;
8. insert the summary or resolve the existing idempotent retry inside the same transaction;
9. commit before returning the success acknowledgement.

The transaction applies a local `lock_timeout` of 5 seconds and `statement_timeout` of 10 seconds. A stale administrative transaction can therefore make ingestion fail retryably rather than strand the request indefinitely. Timeout/error paths return the sanitized Product V1 database-unavailable response and persist no partial summary.

This gives ownership transfer and device rebinding a deterministic order relative to ingestion. If a conflicting authority mutation already owns the row lock, ingestion waits and rechecks the committed state. If ingestion owns the shared lock first, the authority mutation waits until persistence commits.

## Provenance and source contract

Every newly acknowledged Product V1 summary must now carry:

- `ingestionId`: the producer retry key used for idempotent create/replay semantics;
- `deviceId`: the canonical server-registered EMOPET device UUID;
- `source`: `MAT` or `TAG`, which must match the locked device registry row.

The server still derives firmware lineage itself. A request cannot self-assert `firmwareVersionAtIngest`.

Source-specific fields are fail-closed:

- MAT-only: `matPresenceMinutes`, `respiratoryRate`, `weightKg`, `positionChanges`;
- TAG-only: `activityMinutes`, `distanceKm`, `vocalEvents`, `vocalEnergyMean`, `postureDistribution`, `agitationEvents`;
- shared environmental fields remain `temperatureC` and `humidityPct`.

This is a transport/provenance rule only. It does not validate the scientific meaning, calibration or downstream inference fitness of those fields.

## Cache boundary

All `/api/sensors/**` responses now carry `Cache-Control: private, no-store`, including success and failure responses. This covers sensor summaries, baseline projections, fail-closed ELI endpoints and presence placeholders so household/animal telemetry is not delegated to intermediary/browser cache authority.

## Concurrency and runtime evidence

`backend/test/sensor-ingestion-authority-concurrency.integration.test.mjs` exercises actual PostgreSQL lock contention:

- an ownership transfer acquires the dog row first, then the former Owner's ingestion waits, observes the new Owner after commit, returns `404 not_found`, and persists no summary;
- a device rebind acquires the device row first, then ingestion waits, observes that the device is no longer bound to the requested dog/source, returns `400 SENSOR_DEVICE_BINDING_INVALID`, and persists no summary;
- stable Owner/device authority still persists normally and snapshots firmware from the server registry.

`backend/test/sensor-ingestion-liveness.integration.test.mjs` proves the bounded wait and idempotency behavior:

- a blocked authority row reaches the bounded timeout and fails retryably with no persistence;
- concurrent identical requests for one `ingestionId` converge to one creation plus one replay and one row;
- concurrent conflicting payloads for one `ingestionId` converge to one creation plus one explicit conflict and one row.

`backend/test/sensor-runtime.integration.test.mjs` additionally proves:

- missing `ingestionId` or `deviceId` is rejected before persistence;
- MAT/TAG cross-source fields are rejected before persistence;
- raw audio and exact-location hitchhiking fields remain rejected;
- server receive time remains distinct from producer event time;
- all sensor-surface responses exercised by the suite are `private, no-store`;
- historical ELI rows still do not become an authoritative live ELI producer.

## Preserved boundaries

This slice does not widen collected data or activate downstream inference. In particular it does not:

- accept raw household audio;
- accept exact location fields;
- treat MAC address as the request-side device principal;
- authenticate the physical device or establish a device-trust credential;
- implement BLE transport or mobile subscription;
- define the parsed-frame → canonical feature transform;
- define a feature/envelope schema version or calibration identity;
- activate ELI inference or an `eli_states` producer;
- resolve disputed feature/science semantics;
- authorize raw-stream cloud storage.

Historical database rows may still contain nullable provenance columns because the runtime gate is being hardened without rewriting unknown historical evidence. The Product V1 create route is the authority for new acknowledgements.

## Remaining gates

This transaction and provenance slice advances the runtime-foundation and DATA-01 ingestion evidence, but the wider device→ELI path remains open under #68, #118 and #122. Device trust/security authority, parsed-frame→feature authority, feature/envelope version provenance, calibration semantics, ELI orchestration and scientific gates remain separate.

No merge or release authority is implied.
