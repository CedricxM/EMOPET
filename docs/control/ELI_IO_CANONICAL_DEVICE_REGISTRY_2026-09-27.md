# ELI-IO canonical mobile device-registry resolver

**Issue:** #122  
**Date:** 2026-09-27  
**Status:** `REGISTRY IDENTITY DELIVERED IN CANDIDATE / PHYSICAL BLE BINDING NOT ESTABLISHED`

## Purpose

The forwarding contract from #641 requires a canonical backend `devices.id`.
A `react-native-ble-plx` device identifier is explicitly not acceptable as
that identity.

This slice adds a read-only Owner-scoped bridge between the selected dog and
the backend device registry.

## Backend projection

`GET /api/dogs/:dogId/devices`

Returns only active bound registry rows:
- canonical `devices.id`;
- dog id;
- MAT/TAG type;
- firmware version;
- v6 capability flag.

It does not expose:
- MAC address;
- credentials;
- manufacturing identity;
- proof-of-possession material;
- Device Trust evidence.

Detached rows with `unbound_at != null` are excluded.

## Mobile resolver

The mobile client validates the response and resolves TAG registry state:

- zero active TAGs -> `NONE_FOUND`;
- one active TAG -> `AVAILABLE`;
- more than one -> `AMBIGUOUS`.

The mobile resolver never picks the first TAG silently.

## Critical trust boundary

A unique canonical registry TAG for a dog is still **not proof** that the
currently connected BLE peripheral is that TAG.

Therefore:
- BLE runtime ids remain transport-local;
- registry UUID and BLE peer are not cryptographically linked;
- `physicalDeviceAuthenticationEstablished = false`;
- Device Trust #66 remains required before network persistence;
- #643 remains the backend hard stop.

## What remains open

This slice does not:
- POST feature candidates;
- select freshness/uncertainty policy values;
- implement offline/retry queues;
- authenticate the physical BLE peripheral;
- activate network persistence;
- establish end-to-end delivery.
