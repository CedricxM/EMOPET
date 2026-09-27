# TAG firmware platform reconciliation — #625

**Date:** 2026-09-27  
**Status:** `CANONICAL AUTHORITY RECONCILIATION / NO NEW HARDWARE CLAIM`

## Why this reconciliation exists

Two overlapping platform candidates were merged concurrently:

- #627 created `firmware/collar/zephyr` and
  `config/firmware/tag-platform-authority-v1.json`;
- #628 created the more complete `firmware/collar/ncs` GATT scaffold and
  `config/firmware/tag-platform-v1.json`.

Keeping both would create two active firmware-platform authorities.

## Canonical choice

The active platform authority is now:

`config/firmware/tag-platform-v1.json`

with application source:

`firmware/collar/ncs`

The duplicate #627 application/config/guard are removed from active main.
Their merged commit remains historical provenance.

## NCS version

The canonical manifest pins:

`nrfconnect/sdk-nrf@v3.4.0`

and records it as the LTS baseline.

The previously merged #627 `v3.4.1` pin is superseded by this current
authority rather than retained as a second source of truth.

## Transport-time correction

The initial #628 GATT scaffold created:
- `boot_session_id` inside Bluetooth initialization;
- `sequence` inside the GATT module;
- `window_end_ms = k_uptime_get_32()` at notification time.

The last behavior is not safe as a general measurement contract.

A delayed notification, reconnect or future backfill can happen after the
measurement window has ended. Send time therefore cannot be silently promoted
to measurement-window end.

The canonical GATT layer now accepts a fully populated
`tag_activity_feature_summary_input_t` from its caller.

Production authority for:
- boot-session generation/collision expectations;
- sequence reset/wrap;
- monotonic measurement-window end;
- reconnect/backfill semantics;

remains OPEN under #625 G4/G5.

## Maturity boundary

Current source may prove:
- one NCS/Zephyr application authority;
- proprietary service + characteristic registration source;
- canonical #623 serializer reuse;
- advertising source;
- no duplicate serializer;
- no latent ELI firmware semantics.

It still does not prove:
- an NCS target build in repository CI;
- an MS88SF3 board definition;
- flash on representative hardware;
- over-air notification capture;
- Device Trust;
- secure boot/signed OTA;
- RF/antenna behavior.

`real TAG -> BLE` remains **NOT DELIVERED**.
