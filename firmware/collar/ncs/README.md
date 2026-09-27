# EMOPET TAG — nRF Connect SDK peripheral scaffold

**Parent:** #625  
**SDK baseline:** nRF Connect SDK 3.4.0 LTS  
**Status:** `SCAFFOLD CANDIDATE / DK COMPILE HARNESS ONLY / MS88SF3 BOARD AUTHORITY OPEN`

## Purpose

This directory is the first explicit target-firmware runtime for the TAG
nRF52840/MS88SF3 workstream.

It provides:
- a Zephyr application;
- Bluetooth LE peripheral initialization;
- EMOPET service advertising;
- SensorFrame notify characteristic registration;
- feature-summary notify characteristic registration;
- feature-summary notification through the canonical C serializer;
- device-local boot-session / sequence / uptime provenance.

It deliberately does not fabricate sensor observations.

## SDK pin

Use nRF Connect SDK **v3.4.0 LTS**.

Controlled platform metadata lives in:

`config/firmware/tag-platform-v1.json`

The repository pin is the local `west.yml` manifest at `v3.4.0`.
No unverified container digest is treated as release authority.

## Temporary compile harness

Until the MS88SF3 production board definition is independently verified, the
only allowed generic compile harness is:

`nrf52840dk/nrf52840`

Initialize from the pinned local manifest, then build from an NCS v3.4.0 workspace:

```sh
west init -l firmware/collar/ncs
west update
west zephyr-export
west build -b nrf52840dk/nrf52840 firmware/collar/ncs \
  -d build/emopet-tag-dk
```

A successful DK build would prove source/API/toolchain coherence only.

It would **not** prove:
- MS88SF3 clock configuration;
- MS88SF3 GPIO/pin routing;
- PCB wiring;
- antenna/RF behavior;
- flash/debug/boot behavior on the module;
- production readiness.

## Production board gate

Do not add an `ms88sf3` board definition from memory.

The production board must be derived from controlled Minew/nRF52840 hardware
evidence and current TAG electrical authority. It must reconcile at minimum:
- HF/LF clock source/configuration;
- UART to nRF9151;
- BMI270 bus/interrupts;
- INMP441 interface;
- NTC ADC;
- SWD;
- power/enable signals;
- any board-specific flash/partition assumptions.

## BLE authority

UUIDs come from:

`config/ble/uuid-authority-v1.json`

No `0000EAxx-0000-1000-8000-00805F9B34FB` alias may return.

The feature-summary characteristic calls
`tag_feature_summary_encode_activity_variability()` directly.

No second serializer is permitted.

## Transport provenance

The GATT layer does **not** generate transport provenance.

The caller must supply:
- `boot_session_id`;
- per-boot `sequence`;
- the real monotonic `window_end_ms` for the measurement window.

This avoids a delayed notification or reconnect/backfill event replacing the
actual measurement-window end with send time.

Production policy for boot-session uniqueness, sequence reset/wrap and
monotonic-time ownership remains open under #625 G4/G5.

The TAG does not invent UTC. Backend/mobile clock-anchor authority remains
separate. Device Trust remains #66.

## What is still open

- real MS88SF3 board definition;
- NCS target build in CI;
- target flash;
- real IMU producer/task integration;
- real BLE capture from hardware;
- reconnect/offline queue;
- production clock-anchor exchange;
- Device Trust #66;
- secure boot/signed OTA;
- latent ELI/science #87/#118.

Until those exist:

`real TAG -> BLE` = **NOT PROVEN**.
