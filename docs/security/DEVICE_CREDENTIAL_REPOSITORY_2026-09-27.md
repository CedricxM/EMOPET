# DEVICE-TRUST-ID-12 — durable public credential enrollment

**Issue:** #661  
**Parents:** #648 / #657 / #659 / #66  
**Date:** 2026-09-27  
**Status:** `PENDING_PROOF PERSISTENCE CANDIDATE / ACTIVE TRANSITION ABSENT`

## Purpose

Persist the public credential handoff delivered by #660 without treating
enrollment as proof of possession.

The canonical relation is:

`backend devices.id -> credential version -> public P-256 key -> lifecycle state`

No BLE id, MAC address or FICR identifier can substitute for `devices.id`.

## Database authority

`device_identity_credentials` stores only public/security metadata:

- canonical device UUID;
- logical credential version;
- lifecycle state;
- A/B PSA slot metadata;
- public P-256 key, base64url canonical SEC1 uncompressed;
- firmware/hardware/bootstrap provenance;
- timestamps.

It stores no private key, seed, HUK/KDR material or signing secret.

An empty physical slot is represented by **absence of a credential row**.

## Enrollment rule

The service accepts:
- explicit canonical `devices.id`;
- validated `device-identity-enrollment-receipt-v1`.

It:
1. locks the device row;
2. requires a canonical TAG principal;
3. decodes and validates the 65-byte SEC1 public key;
4. refuses duplicate credential version;
5. refuses occupied slot;
6. refuses a second pending credential;
7. inserts `PENDING_PROOF`.

There is no enrollment branch that writes `ACTIVE`.

## Concurrency and lifecycle

Database partial unique indexes enforce:
- max one ACTIVE row per device;
- max one PENDING_PROOF row per device.

A unique device+slot index keeps a slot occupied until a future explicit erase
lifecycle removes the durable row.

This PR does not implement that erase.

## Verifier compatibility

The repository exposes a read-only ACTIVE resolver compatible with #653/#654.

Since this gate owns no activation mutation, a newly enrolled credential is
invisible to that resolver.

## Hard stops

Still blocked:
- PENDING_PROOF -> ACTIVE;
- proof-driven activation;
- challenge/verify HTTP routes;
- revocation/destruction;
- slot reuse;
- Device Data Trust;
- telemetry persistence;
- HUK/MS88SF3 target proof.
