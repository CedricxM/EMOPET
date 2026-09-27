# DEVICE-TRUST-ID-05 — versioned P-256 challenge/response contract

**Issue:** #648  
**Parent:** #66  
**Date:** 2026-09-27  
**Status:** `DATA CONTRACT SELECTED / RUNTIME NOT IMPLEMENTED / TARGET PROOF REQUIRED`

## 1. Purpose

This document defines the first versioned proof-of-possession challenge/response
contract after the P0 architecture selection in #651.

It does **not** implement:
- challenge issuance;
- device signing;
- backend verification;
- replay storage;
- Device Data Trust success;
- telemetry persistence.

## 2. Initial purpose

V1 authorizes exactly one proof purpose:

`DEVICE_DATA_TELEMETRY_INGRESS`

Purpose code: `0x01`.

A proof created for telemetry ingress must never silently authorize:
- first claim/bind;
- transfer/rebind;
- privileged commands;
- OTA/update authority.

Those future purposes require separate purpose codes and authority updates.

## 3. Challenge envelope

JSON/API boundary:

- `schemaVersion = device-pop-challenge-v1`;
- `protocolVersion = 1`;
- canonical backend `deviceId` UUID;
- positive uint32 `credentialVersion`;
- bounded purpose;
- server-generated `challengeId` UUID;
- 32-byte CSPRNG nonce encoded base64url without padding;
- backend-owned `issuedAt`;
- backend-owned `expiresAt`;
- `signingContract = EMOPET_DEVICE_POP_FIXED_BINARY_V1`.

The exact production TTL is deliberately **not selected here**.

The only contract invariant is:
`expiresAt > issuedAt`.

TTL ceilings, challenge-store cleanup and rate/attempt policy remain separate
implementation authority.

## 4. Canonical signing preimage

Do not sign JSON.

The device signs SHA-256 over this fixed binary sequence:

1. ASCII domain separator `EMOPET_DEVICE_POP_V1`;
2. protocol version — uint8;
3. purpose code — uint8;
4. canonical device principal UUID — 16 raw RFC4122/network-order bytes;
5. credential version — uint32 big-endian;
6. challenge id UUID — 16 raw RFC4122/network-order bytes;
7. nonce — 32 raw bytes;
8. issued-at Unix milliseconds — uint64 big-endian;
9. expires-at Unix milliseconds — uint64 big-endian.

This removes:
- JSON key-order ambiguity;
- whitespace ambiguity;
- integer text ambiguity;
- DER/signature representation ambiguity.

## 5. Signature

Selected signature:
- ECDSA;
- P-256 / secp256r1;
- SHA-256;
- output encoding = IEEE P1363 raw `r || s`;
- `r` = 32-byte big-endian;
- `s` = 32-byte big-endian;
- total = 64 bytes;
- API representation = unpadded base64url.

DER signatures are not accepted by this contract.

## 6. Backend public-key authority

The response never supplies its own verifier key.

The backend loads the active enrolled public key using:

`canonical device principal + credential version`.

Selected public-key representation for enrollment:
SEC1 uncompressed P-256 point, 65 bytes:

`0x04 || X(32) || Y(32)`.

A mobile-supplied key, BLE id, MAC, DEVICEID or registry row alone cannot replace
the enrolled verifier.

## 7. Replay and freshness invariants

Backend owns challenge state.

Minimum required semantics:
- challenge id identifies one server-issued challenge;
- stored challenge is bound to device principal, credential version and purpose;
- response fields must match stored challenge;
- backend time owns expiry;
- device wall clock is not trusted for expiry;
- successful verification consumes the challenge atomically;
- consumed challenge replay is rejected;
- expired challenge is rejected;
- revoked/replaced credential is rejected;
- invalid signature authorizes nothing.

The exact failed-attempt consumption/rate-limit policy remains open.

## 8. Response envelope

Response carries:
- `schemaVersion = device-pop-response-v1`;
- protocol version;
- device principal;
- credential version;
- purpose;
- challenge id;
- `signatureFormat = ECDSA_P256_SHA256_P1363_64`;
- 64-byte signature as base64url without padding.

Nonce/timestamps are not trusted from the response. The backend reconstructs the
preimage from stored server-side challenge state.

## 9. Fail-closed boundaries

Still blocked:
- Device Data Trust runtime;
- claim/bind runtime;
- network telemetry persistence;
- trusted commands;
- production secure boot/OTA trust;
- target key generation/trusted-storage proof;
- target challenge/sign/verify proof.

No route should return trusted-device success merely because this contract exists.

## 10. Required next evidence

Before runtime activation:
1. backend challenge-state schema and issuer;
2. on-device PSA P-256 signer behind the selected trusted-storage model;
3. backend P-256 verifier;
4. replay/expiry negative tests;
5. wrong-device/wrong-credential/wrong-purpose tests;
6. revoked/replaced credential tests;
7. representative MS88SF3 post-reboot proof;
8. APPROTECT + firmware-integrity evidence;
9. separate #122 network-ingestion activation decision.

