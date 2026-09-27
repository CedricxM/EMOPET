# EMOPET TAG — nRF Connect SDK / Zephyr P0 runtime

Issue: #625  
Parent integration: #122  
Pinned baseline: **nRF Connect SDK 3.4.0 LTS**

## What this directory is

This is the first reproducible **source candidate** for the MS88SF3/nRF52840
TAG peripheral runtime.

It deliberately separates:

1. a temporary Nordic DK compile harness;
2. the future real MS88SF3 board authority;
3. target-hardware flash/over-air evidence.

The repository must not collapse those three states into one green checkbox.

## Version pin

`west.yml` imports `nrfconnect/sdk-nrf@v3.4.0`.

The version is pinned rather than floating on `main`.

## Clean workspace setup

From an external scratch workspace with an nRF Connect SDK compatible toolchain:

```bash
mkdir -p /tmp/emopet-ncs-workspace
cd /tmp/emopet-ncs-workspace

west init -l /absolute/path/to/EMOPET/firmware/collar/ncs
west update
west zephyr-export
```

## Compile harness

Until the MS88SF3 board definition is authored and verified, the only allowed
compile harness is:

```text
nrf52840dk/nrf52840
```

Example:

```bash
west build \
  -s /absolute/path/to/EMOPET/firmware/collar/ncs/app \
  -b nrf52840dk/nrf52840 \
  -d /tmp/emopet-tag-dk-build
```

A successful DK build is **not** production-board evidence.

## Current GATT source

The app source registers the controlled proprietary EMOPET service and:

- SensorFrame notify characteristic;
- feature-summary notify characteristic.

The feature-summary payload is not reimplemented in Zephyr. It calls the
canonical #623 serializer:

`tag_feature_summary_encode_activity_variability()`

## Still open before a real TAG BLE claim

- MS88SF3 custom board definition;
- HF/LF clock authority;
- flash/RAM layout authority;
- actual pinmux / UART / I2C / ADC authority;
- SWD bring-up;
- production boot-session/sequence policy;
- monotonic time + BOOT_ANCHOR_V1 production policy;
- target build evidence;
- target flash evidence;
- central discovery of the flashed module;
- over-air feature-summary capture;
- Device Trust #66.

Do not cite this source skeleton as proof of a flashed or validated collar.
