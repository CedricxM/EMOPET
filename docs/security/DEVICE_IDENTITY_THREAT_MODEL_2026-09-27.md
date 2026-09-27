# DEVICE-TRUST-ID-02 — P0 device identity threat model

**Issue:** #648  
**Parent:** #66  
**Date:** 2026-09-27  
**Status:** `P0 THREAT MODEL / ARCHITECTURE STILL UNSELECTED / RUNTIME BLOCKED`

## 1. Protected assets

The P0 device-identity architecture must protect:

- the device authentication root/private key;
- any derived proof key;
- the canonical backend device principal;
- the enrolled verifier/credential version;
- server challenge state and replay state;
- manufacturing evidence linking one physical device to one backend principal;
- production debug/SWD state;
- revocation/lost/RMA state.

FICR `DEVICEID`, BLE addresses, BLE runtime ids, CRC, boot-session ids and
transport sequence values are identifiers/provenance only. They are not secrets
and cannot authenticate a device.

## 2. P0 adversaries

The selected architecture must fail closed against:

1. a remote attacker replaying captured BLE/network traffic;
2. a malicious or compromised mobile client fabricating telemetry;
3. an Owner account attempting to bind a different physical device by supplying
   identifiers only;
4. a stolen/lost physical TAG being replayed after revocation;
5. a debugger/SWD attacker attempting straightforward memory/key extraction;
6. a manufacturing operator or fixture reusing one credential across devices;
7. a backend/API caller replaying an old proof or challenge;
8. an RMA/rework path accidentally resurrecting a revoked credential.

## 3. P0 physical attack boundary

P0 requires resistance to ordinary debug/SWD readout and software-accessible
secret extraction when production protections are enabled.

P0 does **not** claim resistance to invasive semiconductor laboratory attacks
(decapsulation, focused-ion-beam, microprobing or equivalent). If product risk
later requires that class, Candidate C or another hardware-isolation design must
be re-evaluated.

This is a scope boundary, not a claim that invasive extraction is impossible.

## 4. nRF52840 constraints

Source-backed constraints for the selected MS88SF3/nRF52840 target:

- Arm CryptoCell CC310 is available;
- nRF52840 has no KMU;
- nRF52840 supports KDR as its HUK type;
- Nordic recommends KDR/HUK for nRF52840;
- HUK/KDR is a **derivation root only** and must never be the application proof
  key directly;
- the no-KMU path uses protected flash + CryptoCell loading;
- FICR DEVICEID is a factory-programmed 64-bit identifier, not an authenticator;
- APPROTECT can block debugger read/write access to CPU registers and
  memory-mapped addresses;
- ERASEALL/recovery behavior must be included in production/RMA policy.

Official references:
- https://nrfconnectdocs.nordicsemi.com/ncs/latest/nrf/libraries/security/hw_unique_key.html
- https://nrfconnectdocs.nordicsemi.com/ncs/latest/nrf/security/key_storage.html
- https://docs.nordicsemi.com/r/bundle/ps_nrf52840/page/cryptocell.html
- https://docs.nordicsemi.com/r/bundle/ps_nrf52840/page/ficr.html
- https://docs.nordicsemi.com/r/bundle/ps_nrf52840/page/dif.html

## 5. Trust boundaries

### Device boundary
Only a cryptographic proof generated using device-unique secret/private-key
authority may establish physical-device possession.

### Mobile boundary
The mobile app is a transport/orchestration client. It is not a root of trust.
A compromised mobile app must not be able to fabricate a valid physical-device
proof from public identifiers.

### Backend boundary
The backend owns:
- canonical device principal;
- enrollment state;
- credential version;
- challenge issuance;
- replay/single-use state;
- revocation/rebind/RMA authority.

### Manufacturing boundary
Fixtures/operators may provision and collect evidence only through a defined
flow. No process may use one reusable application proof key across multiple
devices.

## 6. Mandatory proof properties

Whichever A/B/C architecture wins, the proof contract must bind:

- protocol/version;
- canonical device principal;
- credential/key version;
- unpredictable server challenge;
- operation/purpose domain;
- freshness/expiry;
- single-use or replay state;
- proof bytes;
- explicit refusal reason.

A proof for one purpose must not silently authorize another purpose.

## 7. Debug/SWD production dependency

Before a device leaves controlled manufacturing:

- production debug policy must be explicitly selected;
- APPROTECT state must be part of the provisioning receipt;
- any temporary factory-debug state must not be confused with production state;
- rework/RMA requiring debug access must define whether the device is erased,
  reprovisioned and assigned a new credential version;
- a device that loses its protected credential/root must not retain backend
  trust through DEVICEID/MAC/registry identity alone.

## 8. Negative requirements

The selected design must prove these fail:

- valid DEVICEID + wrong/no proof;
- valid BLE id/MAC + wrong/no proof;
- valid CRC + wrong/no proof;
- valid registry row + wrong/no proof;
- replayed proof;
- proof for expired challenge;
- proof for another canonical device principal;
- proof after credential revocation;
- proof after RMA credential replacement.

## 9. Architecture selection impact

This threat model does not select A, B or C.

It makes selection evidence comparable:
- A must show KDR-derived application proof keys never expose/use KDR directly;
- B must show private-key-at-rest/debug exposure is acceptable on a no-KMU SoC;
- C must justify BOM/fixture/supply-chain impact against the agreed P0 threat
  boundary.

Network telemetry persistence remains blocked.
