# BLE UUID authority — proprietary 128-bit namespace

**Date:** 2026-09-27  
**Parent:** #625 / #122  
**Status:** `CONTROLLED / PRE-PERIPHERAL-GATT`

## Decision

EMOPET custom GATT service and characteristic identifiers use controlled,
proprietary 128-bit UUIDs.

The historical values:

- `0000EA01-0000-1000-8000-00805F9B34FB`;
- `0000EA02-0000-1000-8000-00805F9B34FB`;
- `0000EA03-0000-1000-8000-00805F9B34FB`;
- `0000EA04-0000-1000-8000-00805F9B34FB`;
- `0000EA05-0000-1000-8000-00805F9B34FB`;

are **superseded for live GATT**.

They are aliases in the Bluetooth SIG Base UUID space and must not be used as
arbitrary vendor UUIDs unless the corresponding Assigned Numbers are obtained.

## Active mapping

| Surface | UUID |
|---|---|
| EMOPET service | `e4e2e9a3-39c8-4140-aba9-c4e37713f59a` |
| SensorFrame | `66ae0c98-a8ce-4319-b47d-f09fa88d4d83` |
| OTA | `17780ee9-7def-4b89-aea5-e7a27deaf95c` |
| Config | `8d5fa4ff-d1fa-49c3-9ce4-2e8865e4d478` |
| Feature summary | `01141d55-a776-4091-b068-83f0804d8781` |

The machine-readable authority is
`config/ble/uuid-authority-v1.json`.

## Scope

This migration changes GATT attribute identity only.

It does not change:
- BLE SensorFrame bytes;
- feature-summary frame bytes;
- CRC;
- feature contract;
- ELI semantics;
- Device Trust;
- OTA security authority.

## Compatibility

No live TAG peripheral GATT implementation exists in the repository at this
decision point. Therefore no deployed current-repository peripheral contract is
being broken.

The mobile central and all future peripheral code must use the active mapping
exactly.

## Gate

`G-BLE-UUID-NAMESPACE-01 = CONTROLLED / ACTIVE 128-BIT UUIDS SELECTED / TARGET GATT NOT YET IMPLEMENTED`
