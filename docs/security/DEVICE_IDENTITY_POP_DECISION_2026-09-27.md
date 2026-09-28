# DEVICE-TRUST-ID-01 — manufacturing identity + proof-of-possession decision pack

**Issue:** #648  
**Parent:** #66  
**Date:** 2026-09-27  
**Status:** `EVALUATION ONLY / NO ARCHITECTURE SELECTED / RUNTIME BLOCKED`

## 1. Decision to make

EMOPET needs one production device-principal architecture that can prove a
physical MAT/TAG possesses device-unique cryptographic authority.

This document does **not** choose that architecture. It creates the comparison
surface and evidence requirements needed to choose one.

The current network feature-ingress path must continue to return
`DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED` until this gate has real
target-hardware proof.

## 2. Hardware facts that constrain the choice

For the selected TAG SoC, nRF52840:

- Arm CryptoCell CC310 is available;
- a Key Management Unit (KMU) is not available;
- the nRF Connect SDK Hardware Unique Key path supports KDR on nRF52840;
- the HUK/KDR value is a derivation root, not an application MAC/encryption key;
- on the no-KMU nRF52840 path, the boot chain loads the key into CryptoCell and
  the backing flash page is protected according to the supported HUK flow;
- FICR `DEVICEID` is a factory-programmed unique identifier. EMOPET treats it
  as an identifier only, never as proof of possession.

Official references:
- https://nrfconnectdocs.nordicsemi.com/ncs/latest/nrf/libraries/security/hw_unique_key.html
- https://nrfconnectdocs.nordicsemi.com/ncs/latest/nrf/security/key_storage.html
- https://docs.nordicsemi.com/r/bundle/ps_nrf52840/page/ficr.html

## 3. Candidate A — KDR/HUK-derived symmetric proof of possession

**State:** EVALUATE, NOT SELECTED.

Possible shape:

`KDR/HUK root -> purpose-separated derived key -> challenge MAC -> server verification`

Attractive properties:
- uses the nRF52840-supported HUK/KDR path;
- application authentication key can be derived rather than stored as raw
  plaintext key material;
- challenge-response can be compact.

Questions that must be answered before selection:
- exact supported PSA/HUK derivation path on the pinned NCS line;
- KDF/domain label;
- challenge format and entropy;
- proof algorithm family;
- backend enrollment representation;
- whether backend stores corresponding device secret material, a wrapped
  verifier, or another controlled representation;
- revocation/rotation/RMA implications;
- how manufacturing receipts prove device uniqueness.

Hard rule:
**KDR/HUK itself is never the application proof key.**

## 4. Candidate B — device-specific asymmetric proof of possession

**State:** EVALUATE, NOT SELECTED.

Possible shape:

`device private key -> challenge signature -> server public-key verification`

Attractive properties:
- backend need not hold the device private key;
- enrollment can bind a public verifier to the canonical device principal.

nRF52840-specific caution:
- nRF52840 has no KMU;
- do not assume Nordic's KMU-backed Identity Key library architecture from
  nRF5340/nRF91 applies unchanged;
- private-key-at-rest protection therefore needs a dedicated threat/storage
  analysis for nRF52840.

Questions:
- supported PSA algorithm family on the pinned target build;
- on-device key generation vs manufacturing import;
- persistent-key storage and erase/debug threat;
- public-key enrollment receipt;
- rotation/revocation;
- performance, energy and code-size cost.

## 5. Candidate C — external secure element

**State:** EVALUATE, NOT SELECTED.

Use only if the agreed threat model requires stronger hardware isolation than
the nRF52840-only design can provide.

This is not a software-only toggle. It affects:
- TAG BOM;
- PCB/routing;
- power;
- fixture/provisioning process;
- vendor/supply-chain risk;
- firmware drivers;
- certification and production test scope.

The current TAG BOM does not contain an approved secure element.

## 6. Explicit non-authorities

None of the following may authenticate a device by itself or in combination
without a cryptographic proof tied to the selected device principal:

- BLE runtime id;
- BLE MAC/address;
- FICR DEVICEID;
- backend `devices.id`;
- boot-session id;
- transport sequence;
- valid CRC.

These can support lookup, replay control and provenance. They are not secrets.

## 7. Proof-of-possession contract requirements

Whichever architecture is selected, the future contract must bind proof to:

- protocol/version;
- canonical device principal;
- unpredictable server challenge;
- challenge expiry;
- single-use/replay state;
- operation/purpose domain;
- relevant Owner/dog claim context where applicable;
- key/credential version;
- explicit failure codes.

Do not define algorithm-specific wire bytes before the architecture decision.

## 8. Manufacturing lifecycle requirements

The ADR must define:

1. when the device root/private key is generated or injected;
2. whether any party outside the device ever knows it;
3. how the canonical backend principal is enrolled;
4. the evidence/receipt captured at manufacture;
5. fixture access and operator boundaries;
6. debug/SWD state during and after provisioning;
7. failed provisioning and rework;
8. RMA/service replacement;
9. credential rotation;
10. revocation/lost/stolen handling;
11. factory-reset interaction.

## 9. Decision matrix

Score with evidence, not preference:

| Dimension | A: HUK/KDR symmetric | B: asymmetric | C: secure element |
|---|---|---|---|
| nRF52840 hardware fit | to assess | to assess | requires BOM change |
| secret extraction resistance | to assess | to assess | to assess |
| backend secret exposure | to assess | potentially lower | to assess |
| manufacturing complexity | to assess | to assess | higher surface |
| rotation/revocation | to assess | to assess | to assess |
| RMA/rework | to assess | to assess | to assess |
| power/latency | measure | measure | measure |
| code/flash cost | measure | measure | measure |
| MOKO fixture impact | define | define | substantial |
| target-hardware proof | required | required | required |

No numerical winner exists yet.

## 10. Closure rule

#648 remains OPEN until all of these exist:

- device-identity threat model;
- selected architecture and rationale;
- manufacturing provisioning flow;
- backend enrollment model;
- versioned proof wire contract;
- replay/freshness policy;
- rotation/revocation/rebind/RMA lifecycle;
- debug/SWD production dependency;
- negative tests;
- representative target-hardware proof.

Closing #648 still does not automatically activate #122. Network persistence has
its own explicit activation gate.
