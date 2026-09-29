# DEVICE-TRUST-ID-11 — PSA identity-key slots + enrollment receipt

**Issue:** #659  
**Parents:** #657 / #648 / #66  
**Date:** 2026-09-27  
**Status:** `DUAL SLOT NAMESPACE SELECTED / ENROLLMENT CONTRACT CANDIDATE / ROTATION RUNTIME OPEN`

## Why slots are separate from credential versions

A PSA key id is a persistent storage address.

A credential version is the logical server-side identity/version used by the
challenge/verification protocol.

They are not interchangeable.

EMOPET must never use:
- `credentialVersion % 2`;
- credential version as PSA key id;
- slot id as credential version.

## Reserved application block

PSA reserves `0x00000001..0x3fffffff` for application/user persistent key ids.

EMOPET reserves:

- Device Trust block: `0x00010000..0x0001000F`;
- identity slot A: `0x00010000`;
- identity slot B: `0x00010001`;
- `0x00010002..0x0001000F`: reserved for future Device Trust authority only.

No unrelated application feature may consume this block.

## Dual-slot rotation model

At most:
- one identity credential is ACTIVE;
- one identity credential is PENDING_PROOF.

Typical rotation:

1. active credential remains in slot A;
2. manufacturing/runtime authority selects empty slot B;
3. #658 provisioner creates the new key in B;
4. public enrollment receipt is sent/stored as PENDING_PROOF;
5. fresh proof-of-possession succeeds;
6. final M5 debug/APPROTECT evidence is verified;
7. backend performs one atomic cutover transaction:
   - old slot A credential: `ACTIVE -> REVOKED_PENDING_ERASE`;
   - new slot B credential: `PENDING_PROOF -> ACTIVE`;
8. only a later explicit lifecycle authority may erase/reuse slot A.

The same works with A/B reversed.

The order above is intentional. The database enforces one ACTIVE credential per
device, so a rotation implementation must not attempt to activate the new
credential before revoking the old one in the same locked transaction.

Activation/cutover implementation authority: #721.

## Enrollment receipt

The shared receipt contains public metadata only:

- schema/protocol version;
- positive credential version;
- slot A/B;
- numeric PSA key id;
- P-256 / ECDSA-SHA256 authority;
- 65-byte SEC1 uncompressed public key encoded base64url;
- firmware version;
- hardware revision;
- bootstrap revision;
- `PENDING_PROOF` state;
- `privateKeyExported = false`;
- explicit note that canonical backend device-principal binding is still
  required.

The receipt does not claim that FICR DEVICEID, BLE id or MAC is the canonical
device principal.

## What remains open

This contract does not implement:
- durable backend enrollment persistence;
- ACTIVE credential mutation / atomic rotation cutover (#721);
- M4/M5 manufacturing evidence authority;
- key destruction after revocation;
- rotation/RMA runtime;
- HUK/Secure Storage target evidence;
- Device Data Trust;
- telemetry persistence.

The only automatic destruction still authorized is #658 rollback of a newly
created key from the same failed provisioning attempt.
