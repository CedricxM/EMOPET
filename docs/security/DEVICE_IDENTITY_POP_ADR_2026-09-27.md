# DEVICE-TRUST-ID-04 — P0 architecture decision record

**Issue:** #648  
**Parent:** #66  
**Date:** 2026-09-27  
**Decision:** `B — DEVICE-SPECIFIC ASYMMETRIC PROOF OF POSSESSION`  
**Algorithm family:** `ECDSA + SHA-256`  
**Curve:** `secp256r1 / P-256`  
**Runtime status:** `NOT IMPLEMENTED / TARGET PROOF REQUIRED / NETWORK PERSISTENCE BLOCKED`

## 1. Selected architecture

Each production MAT/TAG owns a device-specific asymmetric private key generated
on-device.

The backend enrolls only the corresponding public key, bound to:
- canonical backend device principal;
- credential version;
- manufacturing receipt;
- hardware/module revision;
- firmware/bootstrap provenance;
- revocation state.

Proof of possession will be a signature over a future versioned server challenge
contract.

This ADR selects the architecture and algorithm family. It does **not** define
the final wire bytes, TTL, nonce length or replay-store implementation yet.

## 2. Why B wins P0

### Compared with A — HUK/KDR-derived symmetric proof

A has excellent nRF52840 hardware fit and remains a technically viable fallback.

It is not the P0 primary architecture because verification requires the backend
to retain or recover symmetric secret authority per device.

That increases server-side secret blast radius:
- compromise of the verifier secret can enable device impersonation;
- secret backup/rotation/custody becomes a production security surface;
- manufacturing must transfer or establish shared secret authority.

B keeps the backend verifier public.

### Compared with C — external secure element

C provides stronger isolated-key options but changes the current product:
- BOM;
- PCB/routing;
- fixture;
- provisioning;
- supply chain;
- power/driver surface.

The current P0 threat model requires resistance to ordinary SWD/debug extraction
and remote/replay impersonation, but does not claim invasive silicon-lab attack
resistance.

C is therefore retained as an escalation path if the threat model is upgraded
or if representative nRF52840 evidence cannot satisfy the P0 boundary.

## 3. nRF52840 feasibility

Current Nordic documentation supports:
- PSA Crypto on nRF52840;
- ECDSA;
- secp256r1;
- SHA-256;
- HUK/KDR key derivation;
- HUK-backed trusted storage on nRF52840 with the required boot/storage setup.

Important limitation:
nRF52840 has no KMU and no TrustZone isolation.

Therefore the private key is not claimed to be enclave-isolated while in use.

P0 accepts this only with the production dependencies below.

Official references:
- https://nrfconnectdocs.nordicsemi.com/ncs/latest/nrf/security/crypto/crypto_supported_features.html
- https://nrfconnectdocs.nordicsemi.com/ncs/latest/nrf/samples/crypto/ecdsa/README.html
- https://nrfconnectdocs.nordicsemi.com/ncs/latest/nrf/libraries/security/hw_unique_key.html
- https://nrfconnectdocs.nordicsemi.com/ncs/latest/nrf/libraries/security/trusted_storage.html
- https://docs.nordicsemi.com/r/bundle/ps_nrf52840/page/dif.html

## 4. Device private-key lifecycle

Target design:

1. establish the supported nRF52840 KDR/HUK root;
2. enable HUK-derived trusted-storage protection;
3. generate the P-256 private key on-device through the approved PSA path;
4. never export the private key in production provisioning;
5. export/enroll only the public key;
6. store private key persistently under the approved trusted-storage path;
7. use the private key only for the versioned device-PoP purpose;
8. rotate by creating a new credential version and enrolling a new public key;
9. revoke the old credential server-side;
10. RMA/rework must run fresh proof before trust is restored.

## 5. Production dependencies before trust activation

Architecture selection does not authorize production trust.

Before Device Data Trust may return success, evidence must prove:

### D1 — NSIB/HUK path
- selected NCS target builds with the required HUK configuration;
- KDR generation/provisioning path is verified on representative hardware;
- HUK is never used directly as the application signing key.

### D2 — trusted storage
- persistent P-256 private key survives intended reboot lifecycle;
- at-rest protection uses HUK-derived trusted-storage authority;
- erase/rework behavior is measured.

### D3 — debug/SWD
- production APPROTECT policy is selected and verified;
- final debug state is captured in manufacturing receipt;
- ordinary SWD readout cannot recover private key material.

### D4 — firmware integrity
Before production authentication relies on the private key:
- secure boot/image authenticity must be enforced;
- production signing keys must be separated from development keys;
- OTA update authenticity/rollback policy must not permit arbitrary firmware to
  become a signing oracle.

### D5 — representative hardware proof
On representative MS88SF3/nRF52840 hardware:
- key generation;
- public-key enrollment;
- challenge signature;
- server verification;
- wrong-key rejection;
- replay rejection;
- revocation rejection;
- post-reboot proof;
- final APPROTECT state.

## 6. Backend credential model

Selected model:

`canonical device principal -> credential version -> P-256 public key -> state`

Minimum future state:
- `PROVISIONING_PENDING_PROOF`;
- `ACTIVE`;
- `REVOKED`;
- `REPLACED`.

The backend does not need the device private key.

## 7. What remains open

Still open under #648:
- exact challenge wire format;
- nonce/challenge size;
- TTL;
- replay persistence model;
- credential rotation cadence;
- rebind/RMA state transitions;
- target PSA/trusted-storage implementation;
- target hardware evidence.

Still blocked:
- Device Data Trust runtime;
- network telemetry persistence;
- claim/bind activation;
- trusted commands;
- OTA production authority.

## 8. Fallback rule

If target evidence shows that P-256 private-key storage/use on nRF52840 cannot
meet the P0 threat boundary, do not silently weaken the threat model.

Reopen the ADR and compare:
1. A with explicit backend symmetric-secret custody, or
2. C with an external secure element.

## 9. Decision summary

P0 selects **device-generated ECDSA P-256 proof of possession** because it:
- fits the current nRF52840 cryptographic capabilities;
- avoids backend storage of device private/shared proof secrets;
- fits the existing manufacturing/public-key enrollment model;
- avoids a current BOM change;
- can satisfy the agreed P0 physical/debug threat boundary if D1–D5 pass.

Selection is complete. Implementation and hardware proof are not.
