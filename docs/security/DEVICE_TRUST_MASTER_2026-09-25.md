# EMOPET Device Trust master

**Issue:** #66  
**Date:** 2026-09-25  
**Status:** `PRE-PRODUCTION / FAIL-CLOSED / NOT IMPLEMENTED`

**Current-main reconciliation — 2026-09-27:** Owner terminology is canonical. The repository now has bounded feature-transport replay/time/quality provenance on main (#606–#611), but those controls are attribution/data-contract evidence only and do not establish physical-device authentication. Device Trust remains the separate authority for hardware identity, claim/bind, command trust and OTA security.

This document defines the security boundaries that MAT/TAG must satisfy before either device can be treated as a trusted Product principal.

It is an architecture contract, not evidence of secure boot, pairing resistance, key injection, command signing or OTA safety.

## 1. Core rule

A database row, BLE MAC address, advertising name, QR code or possession of a raw BLE command is **not** device identity.

The Product trust chain must be:

`manufacturing identity -> proof of possession -> server claim authority -> Owner/dog binding -> rotating/revocable device credential -> signed/fresh command/update authority`

## 2. Manufacturing identity

**Current P0 architecture gate:** #648 `DEVICE-TRUST-ID-01`.

The source-backed evaluation authority lives at:

`config/security/device-identity-pop-evaluation-v1.json`

with the selected ADR at:

`docs/security/DEVICE_IDENTITY_POP_ADR_2026-09-27.md`.

P0 selects **device-specific asymmetric proof of possession using
ECDSA/SHA-256 on secp256r1 (P-256)**.

The private key is generated on-device and the backend enrolls only the public
key. Production trust still requires HUK-backed private-key storage, NSIB,
APPROTECT/debug evidence, secure boot/signed firmware dependencies and
representative MS88SF3 target proof. Device Data Trust remains fail-closed.

Each production device needs a canonical principal independent of its BLE address.

Required properties:

- globally unique device principal;
- hardware-bound or otherwise non-trivially cloneable credential;
- production provisioning receipt;
- key/version identifier without exposing private material;
- manufacturing batch / hardware revision / firmware bootstrap provenance;
- revocation status.

Selected P0 implementation direction is on-device P-256 private key + backend public-key enrollment. External secure element remains an escalation path if the nRF52840 target cannot satisfy the agreed threat boundary.

## 3. First claim

A first claim must require all of:

1. authenticated Owner session;
2. target device discovery;
3. proof the claimant has the physical device or its controlled claim secret;
4. proof from the device principal;
5. server-side claim nonce with short expiry;
6. single-use claim transaction;
7. explicit dog binding;
8. auditable receipt.

A MAC address match is not proof of possession.

## 4. Rebind / transfer / factory reset

Rebind and transfer are security-sensitive lifecycle operations, not ordinary settings changes.

A safe design must distinguish:

- Owner unbind;
- ownership transfer;
- lost/stolen revocation;
- service/RMA;
- factory reset;
- credential rotation.

The current BLE factory-reset bytes `FE DE AD` are only a legacy payload marker. They do not authorize a reset.

Factory reset must never silently clear server-side ownership or revive a revoked device principal.

## 5. Lost / stolen / compromised device

Required recovery state machine:

- `ACTIVE`
- `LOST`
- `REVOKED`
- `TRANSFER_PENDING`
- `SERVICE`
- `RETIRED`

At minimum, marking a device lost/revoked must block new trusted commands and new authoritative data acceptance after the revocation boundary, subject to explicit offline-buffer semantics.

Recovery must not rely on a password-only or MAC-only path.

## 6. Command authorization

Every protected Product command eventually needs a signed/fresh authority envelope containing at least:

- canonical device principal;
- canonical Owner/dog authorization;
- command id/type;
- nonce;
- monotonic sequence/counter;
- issued-at;
- expiry;
- policy version;
- key version;
- cryptographic signature/MAC appropriate to the selected architecture.

Firmware must verify freshness and target binding before execution.

High-risk commands include:

- factory reset;
- credential rotation;
- ownership/rebind actions;
- geofence changes;
- OTA install/activation.

The package now explicitly marks the existing BLE command builders as:

`UNAUTHENTICATED_PAYLOAD_ONLY`

## 7. Replay and offline/resync

A trusted path must define:

- command replay rejection;
- sensor/event replay identity;
- sequence wrap/reset behavior;
- device clock reset behavior;
- bounded offline queue;
- resync ordering;
- duplicate handling;
- server revocation versus queued offline data;
- fail-safe behavior when trust state is stale.

## 8. Telemetry ingestion trust

A canonical backend `devices.id` row proves registry binding, not that the BLE
peer that supplied a frame is physically that device.

Before network telemetry can become durable Product data, the server must require:

- authenticated Owner/dog authority;
- canonical TAG registry binding;
- physical-device authentication / proof tied to the canonical principal;
- revocation-aware trust state;
- transport replay provenance as supporting evidence only.

Boot session, sequence, CRC and a canonical database UUID do **not** become
authentication when combined.

The current network-ingress candidate under #122 therefore fails closed through
`DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED` before persistence. A second,
separate activation gate remains required even after a Device Trust verifier is
implemented.

## 9. OTA / firmware

Required before release:

- secure boot or equivalent boot authenticity control;
- signed image validation;
- anti-rollback policy;
- development/production key separation;
- production key custody and rotation;
- interrupted-update recovery;
- version compatibility policy;
- vulnerability remediation/update channel;
- firmware SBOM/version evidence;
- affected-version/incident mapping.

Current repository status remains:

- secure boot: OPEN;
- firmware signing: OPEN;
- anti-rollback: OPEN;
- OTA distribution: OPEN.

## 10. Database consequence

The current `devices.mac_address` field is an operational identifier only.

It must not become the canonical security principal.

A future persistence slice will need, at minimum, explicit device-principal/credential/lifecycle entities rather than overloading the current device row with secret-bearing fields.

No private keys, claim secrets, recovery codes or raw production credentials belong in Git.

## 11. Threat QA

Before gate closure, exercise at least:

- claim a device belonging to another Owner;
- clone/spoof MAC address;
- replay an old claim;
- replay a signed command;
- command correct type to wrong device;
- stale/offline command after revocation;
- factory reset then attempt unauthorized reclaim;
- stolen device after Owner revocation;
- rollback to vulnerable firmware;
- interrupted OTA;
- compromised update signing key;
- credential rotation failure;
- device clock rollback;
- duplicate/resynced telemetry after reconnect.

## 12. Current machine-readable authority

`config/security/device-trust-authority.json`

The command-boundary types live at:

`packages/ble-protocol/src/commands/authority.ts`

They intentionally do not implement signing or verification.

## 13. Closure rule

#66 cannot close on documentation alone.

Closure needs Founder + Security/Privacy + Firmware/Backend decisions and real target evidence for:

- manufacturing key/identity architecture;
- claim/pairing resistance;
- rebind/loss recovery;
- command anti-replay;
- secure boot;
- signed OTA;
- anti-rollback;
- recovery;
- abuse/device-security testing.
