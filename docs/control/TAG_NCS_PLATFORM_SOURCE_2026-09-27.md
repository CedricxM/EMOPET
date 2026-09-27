# TAG NCS/Zephyr platform source candidate

**Issue:** #625  
**Parent:** #122  
**Date:** 2026-09-27  
**Status:** `SOURCE CANDIDATE / G1 + PARTIAL G3 / TARGET BUILD + BOARD + HARDWARE OPEN`

## Platform authority

The selected firmware family is Nordic **nRF Connect SDK / Zephyr**.

The repository pins `sdk-nrf@v3.4.0` through
`firmware/collar/ncs/west.yml`.

This is a versioned source decision, not proof that a target has been built or
flashed.

## Temporary compile harness

Until a verified MS88SF3 board definition exists, the only named compile
harness is:

`nrf52840dk/nrf52840`

That board may prove application/source compatibility with the nRF52840 family.
It must never be cited as the EMOPET production board.

G2 remains open for:
- MS88SF3 HF/LF clock authority;
- flash/RAM authority;
- GPIO/pinmux;
- UART to nRF9151;
- sensor buses/ADC;
- SWD;
- module-specific antenna assumptions.

## GATT source candidate

The source registers the proprietary UUID authority delivered by #626:

- EMOPET primary service;
- SensorFrame notify characteristic;
- feature-summary notify characteristic.

The feature-summary notification calls:

`tag_feature_summary_encode_activity_variability()`

from the #623 firmware transport implementation.

There is no second serializer in the Zephyr layer.

## Runtime responsibilities deliberately not invented

The GATT module accepts a fully populated
`tag_activity_feature_summary_input_t`.

It does not generate:
- `boot_session_id`;
- per-boot `sequence`;
- monotonic `window_end_ms`;
- UTC;
- Device Trust credentials.

Those remain G4/G5/#66 authorities.

## Current evidence ceiling

Repository CI can currently prove:
- source/config/manifest coherence;
- exact UUID authority;
- pinned NCS release;
- GATT source uses notify characteristics;
- canonical serializer reuse;
- historical UUID aliases remain quarantined;
- no latent ELI fields enter firmware.

Repository CI does **not** currently contain the NCS toolchain and therefore
does not claim a clean Zephyr target build.

Before G7/G8 can close, retain:
- clean NCS build log;
- exact target/board;
- toolchain/NCS version;
- flashed firmware commit;
- representative MS88SF3/module revision;
- central discovery capture;
- over-air feature-summary bytes;
- host parser confirmation.

## Non-claims

This source candidate does not close:
- Device Trust #66;
- real MS88SF3 board authority;
- secure boot/signed OTA;
- real BLE over-air delivery;
- RF/antenna feasibility;
- `activity_variability -> arousal` science #87;
- latent ELI runtime #118.
