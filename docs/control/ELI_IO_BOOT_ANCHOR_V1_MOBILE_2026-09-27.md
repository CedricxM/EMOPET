# BOOT_ANCHOR_V1 — mobile capture authority

**Issue:** #635  
**Date:** 2026-09-27  
**Status:** `WIRE + TAG + MOBILE SOURCE IMPLEMENTED / PRODUCTION AUTHORITY OPEN`

## Current wire authority

Current main already owns the bounded #637 clock probe over the proprietary
Config characteristic:

- request: `0x14 + requestNonce uint32 LE`;
- response: `0xEC, v1, CLOCK_ANCHOR_RESPONSE, requestNonce, bootSessionId,
  deviceMs, CRC`.

The nonce is correlation only. It is not authentication, authorization,
freshness security or Device Trust.

The TAG returns device-local monotonic time only. It does not own UTC.

## Mobile source implementation

The mobile central now:

1. subscribes to Config notifications;
2. allocates a correlation nonce;
3. records wall-clock UTC and a separate monotonic timer immediately before the
   request;
4. writes the bounded `0x14` probe;
5. ignores Config responses with another nonce;
6. parses the matching response through `@emopet/ble-protocol`;
7. records the monotonic and wall clocks on response;
8. rejects a boot-session mismatch when a feature session is known;
9. constructs a `BOOT_ANCHOR_V1` candidate.

## Why two clocks

`Date.now()` is not used to measure RTT.

RTT is:

`monotonicAfterMs - monotonicBeforeMs`

Wall time is used only to place that bounded interval on UTC.

The implementation also compares wall elapsed time to monotonic elapsed time
and fails closed if they diverge by more than 100 ms, catching a meaningful
wall-clock adjustment during capture.

## UTC midpoint and uncertainty

Anchor UTC:

`wallBeforeUtcMs + floor(monotonicRttMs / 2)`

Total uncertainty:

`localWallClockUncertaintyMs`
`+ ceil(monotonicRttMs / 2)`
`+ ceil(wallMonotonicSkewMs)`
`+ 2 ms`

The local wall-clock uncertainty is mandatory input.

The source therefore does **not** pretend that BLE RTT alone describes absolute
UTC accuracy.

## Why production remains open

The repository does not yet own a production authority that can state the real
UTC uncertainty of the mobile clock.

Target evidence is also still absent:
- NCS target build receipt;
- MS88SF3 flash;
- over-air Config request/response capture;
- measured RTT distribution;
- mobile wall-clock accuracy evidence.

Therefore:
- `clockAnchorMobileCaptureImplemented = true` at source level;
- `productionClockAnchorImplemented = false`;
- mobile→backend feature forwarding remains unauthorized.

## Device Trust boundary

A matching nonce, boot session and CRC-valid response do not authenticate the
physical device.

#66 remains authoritative for physical-device identity and trust.

## Next gate

Before opening network feature ingestion, define:
- production source for `localWallClockUncertaintyMs`;
- maximum anchor age;
- refresh policy after reconnect;
- required boot-session match between anchor and feature;
- handling when the anchor expires or the device reboots.

No receive-time shortcut is allowed.
