# DEVICE-TRUST-ID-09 — bounded PSA P-256 signer primitive

**Parent:** #648 / #66  
**Date:** 2026-09-27  
**Status:** `SOURCE PRIMITIVE / OPAQUE KEY ID ONLY / KEY STORAGE OPEN / NOT ACTIVATED`

## Purpose

Close one ambiguity only: how the selected nRF52840 device signs the exact
`EMOPET_DEVICE_POP_FIXED_BINARY_V1` bytes delivered by #655.

This slice does not decide how the private key is generated, persisted or
protected at rest.

## Crypto contract

The source primitive:

1. receives an already-provisioned opaque PSA key id;
2. checks that the resolved key is:
   - an ECC key pair;
   - secp256r1 / P-256;
   - 256 bits;
   - allowed for `SIGN_HASH`;
   - constrained to `PSA_ALG_ECDSA(PSA_ALG_SHA_256)`;
3. builds the canonical #655 preimage;
4. hashes it with SHA-256;
5. signs the digest with `psa_sign_hash()`;
6. requires exactly 64 output bytes.

PSA ECDSA output is the raw concatenation `r || s`, matching the backend
P1363 verifier contract.

## Deliberate non-authorities

The signer source contains no:
- `psa_generate_key()`;
- `psa_import_key()`;
- `psa_export_key()`;
- `psa_destroy_key()`;
- key lifetime/storage selection;
- hard-coded key id;
- private-key byte array.

The caller must supply an existing key id from a future separately authorized
provisioning/storage path.

## nRF52840 security boundary

nRF52840 uses CryptoCell CC310 and does not have KMU. Nordic documents KDR as
the supported/recommended HUK type on nRF52840.

That does not, by itself, prove how an application P-256 private key is safely
persisted. HUK/KDR-backed at-rest protection and representative MS88SF3
extraction/debug/erase evidence therefore remain open.

## Current evidence ceiling

Repository CI proves:
- source contract shape;
- exact PSA algorithm/key-policy gates;
- reuse of the canonical C preimage builder;
- no key-management authority is smuggled into the signer;
- no runtime call activates the signer.

Repository CI does not currently prove an NCS target build of this primitive.

## Next gate

Before runtime activation:
- select and implement key generation/storage/provisioning;
- bind credential version ↔ opaque key id;
- export/enroll only the public key;
- prove lifecycle/rotation/revocation/RMA behavior;
- run a representative MS88SF3 sign → backend verify vector.

Device Data Trust and telemetry persistence remain blocked.
