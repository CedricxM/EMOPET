# EMOPET TAG — nRF Connect SDK peripheral scaffold

**Parent:** #625  
**SDK baseline:** nRF Connect SDK v3.4.1 LTS  
**Status:** `SCAFFOLD CANDIDATE / DK COMPILE HARNESS ONLY / MS88SF3 BOARD AUTHORITY OPEN`

## Purpose

This directory is the **single canonical target-firmware runtime** for the TAG
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

Use nRF Connect SDK **v3.4.1 LTS**.

Controlled platform metadata lives in:

\`config/firmware/tag-platform-v1.json\`

The canonical source pin is also encoded in:

\`firmware/collar/ncs/west.yml\`

No stale v3.4.0 container digest is treated as current v3.4.1 authority. A 3.4.1 toolchain/build receipt must be captured separately before claiming a target build.

## Temporary compile harness

Until the MS88SF3 production board definition is independently verified, the
only allowed generic compile harness is:

`nrf52840dk/nrf52840`

Example from the controlled west workspace:

```sh
git clone <EMOPET repository URL> emopet
west init -l emopet/firmware/collar/ncs
west update
west zephyr-export
west build -p always -b nrf52840dk/nrf52840 emopet/firmware/collar/ncs
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

At Bluetooth initialization:
- `boot_session_id = sys_rand32_get()`;
- feature sequence starts at 0.

For a published physical feature:
- `window_end_ms = k_uptime_get_32()`;
- sequence increments only after a successful queued notification.

The random boot session is **not cryptographic identity**. It is replay/session
separation only. Device Trust remains #66.

The TAG does not invent UTC. Backend/mobile clock-anchor authority remains
separate.

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

\`real TAG -> BLE\` = **NOT PROVEN**.

## Authority consolidation — 2026-09-27

The concurrent G1 bootstrap under the former \`firmware/collar/zephyr\` path has
been consolidated into this \`firmware/collar/ncs\` root.

There must be one platform tree, one SDK pin, and one guard. Any future platform
change must update this README, \`tag-platform-v1.json\`, \`west.yml\`, and the
single \`tag-ncs-platform.test.mjs\` guard together.
