# BOOT_ANCHOR_V1 BLE clock-anchor handshake

**Issue:** #122  
**Date:** 2026-09-27  
**Status:** `WIRE + TAG RESPONSE MERGED / MOBILE RTT CAPTURE CANDIDATE / BACKEND FORWARDING OPEN`

## Why this exists

The feature-summary frame carries `window_end_ms` as uint32 milliseconds since
the current device boot.

That value cannot be converted to UTC from BLE receive time without silently
assuming zero transport/reconnect delay.

The backend already requires an explicit `BOOT_ANCHOR_V1` authority. This
handshake provides the raw device/mobile evidence needed to construct one.

## Request

Written to the controlled Config characteristic:

```text
byte 0      command = 0x14
bytes 1..4  request_nonce uint32 little-endian
```

The nonce is correlation only. It is not authentication, authorization,
anti-replay security, key material or proof of possession.

## Response

Notification on the same Config characteristic:

```text
byte 0       0xEC
byte 1       transport version = 1
byte 2       message type = CLOCK_ANCHOR_RESPONSE (1)
bytes 3..6   request_nonce uint32 LE
bytes 7..10  boot_session_id uint32 LE
bytes 11..14 device_ms uint32 LE
byte 15      XOR CRC over bytes 0..14
```

The firmware captures `device_ms = k_uptime_get_32()` while handling the
request. That use is correct because this timestamp is the current clock anchor,
not a feature measurement-window timestamp.

## Mobile UTC interval

For a future mobile implementation:

1. capture local monotonic + wall-clock time immediately before the Config write;
2. receive and validate the matching nonce response;
3. capture local monotonic time immediately on response;
4. let `rttMs = receiveMonotonic - sendMonotonic`;
5. set anchor UTC to the wall-clock send time plus `rttMs / 2`;
6. set uncertainty to at least `ceil(rttMs / 2)` plus local timer
   quantisation if applicable.

Why this is fail-honest:

The device timestamp is captured after the request reaches the device and before
the response reaches the mobile. Therefore its UTC correspondence lies inside
the mobile-observed request/response interval without assuming symmetric radio
latency.

No hard-coded BLE-latency constant is needed.

## Session binding

The response includes the exact `boot_session_id` used by feature-summary
frames from the same firmware boot.

Backend resolution must reject:
- device mismatch;
- boot-session mismatch;
- stale/ambiguous uint32 lookback;
- missing/invalid uncertainty.

## Security boundary

The current Config characteristic probe is deliberately non-destructive.

It does not activate calibration, GPS, geofence, reset or any other historical
raw command.

A valid clock response still does not authenticate the physical device. Device
Trust remains #66.

## Current maturity

Merged via #637:
- TypeScript request builder;
- TypeScript response codec + CRC;
- C request parser;
- C response serializer;
- Config GATT write+notify handling for command 0x14 only;
- C ↔ TypeScript golden-byte parity.

Added by this mobile candidate:
- Config notification monitor installed before the probe write;
- monotonic send/receive RTT measurement;
- nonce correlation;
- midpoint UTC derivation;
- conservative half-RTT + timer-quantisation uncertainty;
- connection cleanup without disconnecting a pre-existing app connection;
- no canonical device id attached to the raw clock measurement.

Still open:
- binding the clock measurement to the canonical backend device registry identity;
- backend network feature-ingestion route;
- automatic feature forwarding only after that binding exists;
- real target build/flash and over-air evidence;
- physical-device authentication.

`productionClockAnchorImplemented` remains false until those downstream
authorities and real-device evidence exist.
