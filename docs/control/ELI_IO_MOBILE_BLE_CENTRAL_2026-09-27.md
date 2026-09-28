# Mobile BLE central runtime — SensorFrame + feature-summary

**Issue:** #122  
**Date:** 2026-09-27  
**Status:** `MOBILE CENTRAL CANDIDATE / PERIPHERAL GATT + BACKEND FORWARDING OPEN`

## Decision

The mobile application now has a real foreground BLE central candidate based on
`react-native-ble-plx`.

The previous `apps/mobile/src/services/ble.ts` implementation was a placeholder
that logged scan/subscription intent without creating a `BleManager`, connecting,
discovering services or monitoring characteristics.

This candidate replaces that placeholder.

## Native configuration

`apps/mobile/app.json` registers the `react-native-ble-plx` Expo config plugin.

Existing platform declarations remain:
- iOS `NSBluetoothAlwaysUsageDescription`;
- Android `BLUETOOTH_SCAN`;
- Android `BLUETOOTH_CONNECT`;
- Android `ACCESS_FINE_LOCATION` for the existing location-dependent product
  surfaces.

This is a native module. Expo Go is not a runtime authority for this path; a
native development/production build is required.

## Runtime scope

The mobile BLE service now owns:
- Android runtime permission requests;
- Bluetooth-powered-on check;
- foreground scan filtered to the EMOPET service UUID;
- duplicate scan-result suppression;
- connection to the selected react-native-ble-plx device id;
- service/characteristic discovery;
- SensorFrame notification monitoring;
- feature-summary notification monitoring;
- canonical binary parsing/CRC validation via `@emopet/ble-protocol`;
- subscription removal and device disconnect.

## Characteristic split

The active identifiers use a proprietary 128-bit UUID namespace. Historical `0000EAxx-0000-1000-8000-00805F9B34FB` aliases are superseded and must not be used for live GATT.

Existing SensorFrame characteristic:
`66ae0c98-a8ce-4319-b47d-f09fa88d4d83`

Reserved versioned feature-summary characteristic:
`01141d55-a776-4091-b068-83f0804d8781`

The latter is controlled by `BLE_CHAR_FEATURE_SUMMARY` in `@emopet/shared`.

Reserving and consuming this UUID on the central side does **not** prove that the
current TAG firmware exposes that GATT characteristic. The peripheral side
remains open.

## Identity boundary

The identifier returned by react-native-ble-plx is a transport/runtime device id.

It must not be promoted into physical-device trust:
- Android may expose an address-like identifier;
- iOS does not expose a MAC address in the same way;
- successful connection and CRC-valid parsing do not prove manufacturer/device
  credential identity.

Physical-device authentication remains #66.

## Feature-summary boundary

A received feature-summary notification is passed through
`parseActivityVariabilityFeatureFrame()`.

That parser proves only the controlled wire contract:
- header/version/source/feature;
- length;
- enums/ranges;
- semantic shape;
- XOR CRC.

It does not authorize:
- arousal/valence/load;
- emotion/stress/wellbeing;
- dog binding by itself;
- clock-anchor production;
- physical-device attestation.

## Still open

This candidate does not implement:
- TAG peripheral GATT service/characteristic registration;
- real firmware notification calls;
- mobile feature forwarding to the backend;
- production boot-session generation;
- production UTC clock-anchor generation;
- reconnect/offline queue semantics;
- background BLE operation;
- physical-device trust (#66);
- latent ELI mapping (#87/#118).

Therefore the end-to-end statement remains false:

`real TAG -> BLE -> mobile -> backend`

The delivered candidate covers only the central/mobile side of that chain.
