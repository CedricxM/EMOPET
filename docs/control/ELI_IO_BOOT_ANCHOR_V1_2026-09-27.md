# BOOT_ANCHOR_V1 — TAG monotonic time to mobile UTC

**Issue:** #635  
**Parent:** #122  
**Date:** 2026-09-27  
**Status:** `SOURCE IMPLEMENTED / TARGET EVIDENCE OPEN / FORWARDING NOT AUTHORIZED`

## Problem

A feature-summary frame carries device-local monotonic `windowEndMs`.

The backend can resolve it to UTC only when it has an explicit anchor from the
same boot session.

Feature notification receive time is not a valid substitute. Delivery may be
delayed, disconnected, retried or later backfilled.

## Clock-sample characteristic

The TAG exposes one read-only proprietary characteristic:

`7c2c7cc8-91a8-58c1-a38a-2f9b9929f5d5`

Wire frame, 11 bytes:

| Offset | Field |
|---:|---|
| 0 | header `0xEC` |
| 1 | version `1` |
| 2..5 | `bootSessionId` uint32 LE |
| 6..9 | current monotonic `deviceMs` uint32 LE |
| 10 | XOR CRC |

No UTC exists on the TAG.

## Mobile midpoint capture

The mobile records:
- `beforeUtcMs`;
- performs the GATT read;
- `afterUtcMs`.

Then:

`anchorUtc = before + floor(RTT / 2)`

and:

`uncertaintyMs = ceil(RTT / 2) + 2`

The extra 2 ms covers millisecond timestamp quantization and integer midpoint
rounding.

Reads above 1500 ms RTT fail closed.

If an expected feature boot-session id is supplied and does not match the
clock sample, capture fails closed.

## Trust boundary

Clock synchronization is not Device Trust.

A coherent boot-session + CRC-valid clock sample does not authenticate the
physical TAG, prove dog binding or provide proof of possession. #66 remains
authoritative.

## Evidence ceiling

Repository CI can prove:
- TypeScript codec semantics;
- firmware C codec semantics;
- byte-for-byte C ↔ TypeScript parity;
- proprietary UUID consistency;
- GATT source registration;
- mobile midpoint/RTT implementation;
- no receive-time shortcut;
- no UTC generation on TAG.

Still open:
- clean target build receipt;
- real MS88SF3 flash;
- over-air clock read;
- real mobile RTT distribution;
- anchor age ceiling for forwarding;
- mobile→backend forwarding;
- physical-device trust.

Therefore this PR does not yet activate network feature ingestion.
