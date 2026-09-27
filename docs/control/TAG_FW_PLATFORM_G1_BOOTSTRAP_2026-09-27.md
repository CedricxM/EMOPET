# TAG firmware platform G1 bootstrap

**Issue:** #625  
**Date:** 2026-09-27  
**Status:** `G1 CANDIDATE / NCS-ZEPHYR BOOTSTRAP / DK COMPILE HARNESS ONLY`

## Selected platform

EMOPET selects **Nordic nRF Connect SDK / Zephyr** for the MS88SF3 / nRF52840
TAG runtime.

The G1 baseline is pinned to **nRF Connect SDK v3.4.1 LTS**.

The v3.4.x line is the first nRF Connect SDK LTS series. This repository pins an
exact patch release for reproducibility and requires an explicit authority
change before moving to another v3.4.x patch.

## Workspace bootstrap

From a clean parent directory:

```sh
git clone <EMOPET repository URL> emopet
west init -l emopet/firmware/collar/zephyr
west update
west zephyr-export
west build -p always -b nrf52840dk/nrf52840 emopet/firmware/collar/zephyr
```

The west manifest pins the NCS source revision. No developer-machine checkout of
an arbitrary SDK is the authority.

## Compile harness boundary

The initial build target is:

`nrf52840dk/nrf52840`

This is a **compile harness only** because it provides the same nRF52840 SoC
class and a maintained Zephyr board target.

It is not the EMOPET production board and must never be presented as proof of:
- MS88SF3 clock correctness;
- production pin mapping;
- UART wiring to nRF9151;
- I2C/SPI/ADC routing;
- antenna/module behavior;
- flash/SWD production programming;
- physical TAG feasibility.

Those remain G2 / hardware evidence work.

## G1 application scope

The G1 source:
- resolves as a Zephyr application;
- enables Bluetooth peripheral support;
- initializes the Bluetooth stack;
- emits a boot log on successful initialization.

It intentionally does **not** register the EMOPET GATT service yet.

No:
- proprietary service UUID registration;
- SensorFrame characteristic;
- feature-summary characteristic;
- `bt_gatt_notify`;
- command surface;
- claim/binding flow;
- secure boot / OTA;
- production time/boot-session authority

is introduced in G1.

## Why GATT stays out of this slice

#626 has already established the correct proprietary 128-bit UUID authority.

The next GATT slice must consume that authority exactly. Mixing platform
bootstrap, custom-board definition and GATT delivery in one PR would make it
impossible to distinguish:
- platform/toolchain failure;
- board-definition failure;
- BLE attribute-table failure;
- transport payload failure.

G1 therefore stops after platform bootstrap.

## Release truth

A successful static G1 control check proves repository/platform coherence only.

Until a clean NCS toolchain build and later representative MS88SF3 evidence are
captured, EMOPET must not claim:
- a production TAG firmware build;
- a flashed MS88SF3 target;
- live EMOPET peripheral GATT;
- real TAG BLE notification delivery.

The canonical state remains:

`DO_NOT_CLAIM_MS88SF3_TARGET_BUILD_OR_LIVE_GATT`.
