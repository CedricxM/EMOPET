# TAG activity feature-summary firmware writer

**Issue:** #122  
**Date:** 2026-09-27  
**Status:** `FIRMWARE WRITER CANDIDATE / LIVE BLE DELIVERY NOT CLAIMED`

## Decision

The first controlled physical feature, `activity_variability`, now has a
canonical device-side serializer candidate in C:

`firmware/collar/main/transport/activity_feature_summary.{h,c}`

It writes the same 27-byte versioned feature-summary frame already controlled by
`packages/ble-protocol/src/feature-summary.ts`.

This is deliberately **not** a claim that the TAG currently emits the frame over
a real BLE characteristic. The repository still has no collar BLE/GATT runtime
under `firmware/collar/main`.

## Sensor snapshot authority

The historical firmware API returned only a float or `NAN`. That shape could
not distinguish:

- insufficient 30-minute coverage;
- mean below the division guard.

The firmware now exposes `activity_variability_snapshot()` with:

- observation status;
- exact `valid_seconds`;
- physical value when observed;
- canonical null reason when not observed.

The old numeric `activity_variability_compute()` remains as a compatibility
wrapper.

## 30-minute boundary repair

The former scan included the exact lower timestamp boundary and could therefore
admit 1801 one-Hz samples for a nominal 1800-second window.

The canonical interval is now:

`(now - 1800 seconds, now]`

which caps the physical window at exactly 1800 one-Hz samples and matches the
transport/persistence maximum.

## Firmware frame semantics

The C writer fixes:

- header = `0xEB`;
- transport version = `1`;
- source = TAG `0x02`;
- feature id = activity variability `0x01`;
- feature-contract version = `0x01`;
- uint16 sequence;
- uint32 boot session id;
- uint32 window-end milliseconds;
- 1800-second window;
- valid-second count;
- OBSERVED / NOT_OBSERVED;
- canonical null reason;
- VALID / DEGRADED / SUPPRESSED quality;
- little-endian float32 value;
- XOR CRC.

It fails closed on semantic mismatches such as:

- observed value below 900 valid seconds;
- observed + SUPPRESSED quality;
- non-finite/negative observed value;
- insufficient-coverage null with >=900 valid seconds;
- mean-guard null with <900 valid seconds;
- valid seconds >1800.

## Cross-language conformance

`scripts/control/tag-feature-summary-firmware-conformance.test.mjs`:

1. compiles the firmware C modules and host fixture with strict warnings;
2. executes sensor snapshot boundary assertions;
3. obtains OBSERVED and NOT_OBSERVED C frames;
4. serializes the same vectors through `@emopet/ble-protocol`;
5. requires byte-for-byte hexadecimal equality.

The Security workflow runs this after building the canonical BLE protocol
package.

## What remains open

Still **not implemented / not proven**:

- a TAG BLE/GATT characteristic or notification owner for this feature frame;
- mobile BLE subscription and forwarding;
- production boot-session generation policy;
- production clock-anchor generation;
- reconnect/offline-buffer delivery;
- physical-device authentication (#66);
- real target-hardware emission evidence;
- scientific `activity_variability -> arousal` authority (#87);
- latent ELI activation.

Therefore this candidate advances:

`firmware measurement -> firmware serializer`

but does not yet prove:

`real TAG -> BLE -> mobile -> backend`.
