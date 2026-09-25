# EMOPET Device Trust master

**Issue:** #66  
**Date:** 2026-09-25  
**Status:** `PRE-PRODUCTION / FAIL-CLOSED / NOT IMPLEMENTED`

This document defines the security boundaries that MAT/TAG must satisfy before either device can be treated as a trusted Product principal.

It is an architecture contract, not evidence of secure boot, pairing resistance, key injection, command signing or OTA safety.

## 1. Core rule

A database row, BLE MAC address, advertising name, QR code or possession of a raw BLE command is **not** device identity.

The Product trust chain must be:

`manufacturing identity -> proof of possession -> server claim authority -> Guardian/dog binding -> rotating/revocable device credential -> signed/fresh command/update authority`

## 2. Manufacturing identity

Each production device needs a canonical principal independent of its BLE address.

Required properties:

- globally unique device principal;
- hardware-bound or otherwise non-trivially cloneable credential;
- production provisioning receipt;
- key/version identifier without exposing private material;
- manufacturing batch / hardware revision / firmware bootstrap provenance;
- revocation status.

Open implementation choices include MCU-backed key storage, secure element, or another controlled hardware identity. No choice is made here.

## 3. First claim

A first claim must require all of:

1. authenticated Guardian session;
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

- Guardian unbind;
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
- canonical Guardian/dog authorization;
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

## 8. OTA / firmware

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

## 9. Database consequence

The current `devices.mac_address` field is an operational identifier only.

It must not become the canonical security principal.

A future persistence slice will need, at minimum, explicit device-principal/credential/lifecycle entities rather than overloading the current device row with secret-bearing fields.

No private keys, claim secrets, recovery codes or raw production credentials belong in Git.

## 10. Threat QA

Before gate closure, exercise at least:

- claim a device belonging to another Guardian;
- clone/spoof MAC address;
- replay an old claim;
- replay a signed command;
- command correct type to wrong device;
- stale/offline command after revocation;
- factory reset then attempt unauthorized reclaim;
- stolen device after Guardian revocation;
- rollback to vulnerable firmware;
- interrupted OTA;
- compromised update signing key;
- credential rotation failure;
- device clock rollback;
- duplicate/resynced telemetry after reconnect.

## 11. Current machine-readable authority

`config/security/device-trust-authority.json`

The command-boundary types live at:

`packages/ble-protocol/src/commands/authority.ts`

They intentionally do not implement signing or verification.

## 12. Closure rule

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
