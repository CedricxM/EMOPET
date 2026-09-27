# TAG firmware platform + GATT authority reconciliation

**Issue:** #625  
**Date:** 2026-09-27  
**Status:** `CANONICAL SOURCE RECONCILED / NCS v3.4.1 LTS / TARGET BUILD EVIDENCE OPEN`

## Why this record exists

Two independently valid slices landed from the same earlier base:

- #627 established the later and therefore canonical platform bootstrap:
  - nRF Connect SDK / Zephyr;
  - **v3.4.1**;
  - `firmware/collar/zephyr`;
  - west manifest;
  - nRF52840 DK compile harness;
  - no live GATT yet.
- #628 established the GATT source slice:
  - EMOPET proprietary service;
  - SensorFrame characteristic;
  - feature-summary characteristic;
  - notification via the canonical firmware serializer;
  - boot-session / sequence / uptime transport provenance;
  - no synthetic sensor emission.

Because #628 had been authored before #627 appeared on `main`, it initially
landed under a second `firmware/collar/ncs` application and a second v3.4.0
platform JSON.

That state is not acceptable as a durable architecture: one physical TAG cannot
have two canonical SDK revisions and two canonical application roots.

## Reconciliation decision

The later platform authority from #627 wins for platform selection:

- NCS revision: **v3.4.1**;
- west authority: `firmware/collar/zephyr/west.yml`;
- application root: `firmware/collar/zephyr`;
- compile harness: `nrf52840dk/nrf52840` only;
- production MS88SF3 board authority: still OPEN.

The valid GATT implementation from #628 is migrated into that canonical
application:

- `firmware/collar/zephyr/src/emopet_ble_ids.h`;
- `firmware/collar/zephyr/src/emopet_gatt.h`;
- `firmware/collar/zephyr/src/emopet_gatt.c`;
- canonical sensor and feature serializer C sources composed by the Zephyr
  application CMake target.

## Superseded duplicate

The following duplicate runtime authority is removed from current source after
migration:

- `firmware/collar/ncs/**`;
- `config/firmware/tag-platform-v1.json`.

Their Git history remains the immutable delivery provenance for #628.

Current machine-readable authority is only:

`config/firmware/tag-platform-authority-v1.json`.

## Maturity after reconciliation

Implemented in source:
- deterministic west manifest pinned to NCS v3.4.1;
- Zephyr application;
- BLE peripheral initialization;
- proprietary EMOPET GATT service;
- SensorFrame + feature-summary characteristic registration;
- feature-summary notification through the canonical C serializer;
- non-security per-boot replay/session discriminator;
- device-local uptime window-end provenance;
- no synthetic feature emission.

Still **not proven**:
- an executed clean NCS target build;
- MS88SF3 custom board definition;
- flashed target;
- real BLE packet capture;
- real IMU producer integration;
- production clock-anchor exchange;
- physical-device authentication;
- secure boot / signed OTA.

Therefore:

`DO_NOT_CLAIM_MS88SF3_TARGET_BUILD_OR_LIVE_GATT`

remains the only valid release statement.
