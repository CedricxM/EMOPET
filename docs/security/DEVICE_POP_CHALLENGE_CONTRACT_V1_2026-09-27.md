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

## 10. Source issuer primitive — current boundary

A backend source primitive now exists at:

`backend/api/security/device-pop-challenge-issuer.ts`

It can construct a contract-valid telemetry challenge **only** when the caller
injects:
- an ACTIVE canonical-device credential resolver;
- an atomic challenge `createIfAbsent` store;
- an explicit future `expiresAt` selected by another policy authority.

The primitive has:
- no default TTL;
- no default credential repository;
- no default challenge/replay store;
- no HTTP route;
- no verifier;
- no Device Data Trust success path.

Durable credential/challenge persistence is intentionally deferred while the
active migration sequence ends at 0019 and the parallel World draft owns the
candidate 0020 prefix. Device Trust must not create a competing active 0020
migration merely to advance this slice.

## 11. Required next evidence

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



## 12. Backend verifier primitive — current boundary

A backend source primitive now exists at:

`backend/api/security/device-pop-verifier.ts`

It verifies only the telemetry-purpose PoP v1 contract and requires injected:
- server-side challenge lookup + atomic consume authority;
- ACTIVE enrolled credential resolver for canonical device + credential version;
- backend time authority.

The verifier:
- validates the strict response contract;
- loads the challenge by server-side challenge id;
- rejects consumed or expired challenges before trust success;
- requires response device/version/purpose/challenge fields to match stored state;
- reconstructs `EMOPET_DEVICE_POP_FIXED_BINARY_V1` from stored challenge state;
- accepts only 65-byte SEC1 uncompressed P-256 public-key enrollment;
- verifies ECDSA P-256 / SHA-256 with raw IEEE P1363 64-byte signature;
- atomically consumes the challenge only after a valid signature;
- rejects replay/race if the atomic consume loses;
- returns a cryptographic-proof receipt whose `deviceDataTrustAuthorized` and
  `telemetryPersistenceAuthorized` fields remain false.

It has:
- no HTTP route;
- no default credential repository;
- no default challenge/replay store;
- no Device Data Trust success path;
- no network telemetry write.

Invalid signatures do not consume the challenge. The failed-attempt
consumption/rate-limit policy therefore remains a separate open implementation
authority.

Durable credential/challenge persistence and target-device signing remain
required before runtime activation.


## 13. Device-side preimage builder — current boundary

Portable TAG-side C source now exists at:

`firmware/collar/main/security/device_pop_preimage.{h,c}`

It owns only deterministic serialization of
`EMOPET_DEVICE_POP_FIXED_BINARY_V1`.

The builder:
- emits exactly 106 bytes;
- fixes protocol version = 1;
- fixes purpose code = telemetry ingress only;
- accepts RFC4122/network-order raw device UUID bytes;
- encodes credential version as uint32 big-endian;
- accepts raw challenge UUID + 32-byte nonce;
- encodes issued/expires Unix milliseconds as uint64 big-endian;
- rejects zero credential version;
- rejects non-future expiry;
- owns no private-key handle and calls no crypto/signing API.

Security CI compiles the C source with strict warnings and compares its output
byte-for-byte with the backend verifier helper
`buildDevicePopSigningPreimageV1()`.

This closes cross-language preimage ambiguity only.

Still open:
- PSA P-256 signer;
- private-key generation/storage;
- trusted-storage/HUK integration;
- device challenge transport;
- representative MS88SF3 sign/verify proof.
