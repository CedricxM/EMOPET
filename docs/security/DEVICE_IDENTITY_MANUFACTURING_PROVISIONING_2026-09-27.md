# DEVICE-TRUST-ID-03 — manufacturing provisioning sequence

**Issue:** #648  
**Parent:** #66  
**Date:** 2026-09-27  
**Status:** `COMMON MANUFACTURING FLOW / ARCHITECTURE-SPECIFIC CRYPTO STEP OPEN`

## Goal

Define the common production sequence that A/B/C must fit before selecting an
algorithm.

This is not a factory work instruction yet. Exact commands, fixture transport,
key algorithms and production credentials remain open.

## Common sequence

### M0 — incoming target identity
- read part/module revision;
- read FICR DEVICEID for traceability only;
- record PCB/module/test-fixture revision;
- do not mark the device authenticated.

### M1 — approved firmware state
- flash the approved production/bring-up image for the selected provisioning
  stage;
- record firmware commit/version and build receipt;
- verify the expected MS88SF3/nRF52840 target, not only the DK harness.

### M2 — create device cryptographic authority
Architecture-specific branch:
- **A:** generate/provision KDR/HUK using the supported nRF52840 flow, then
  derive a purpose-separated application proof key;
- **B:** generate the device private key on-device where feasible and export only
  the public verifier;
- **C:** provision/initialize the approved secure element and obtain its public
  verifier/identifier.

No architecture is selected by this document.

### M3 — canonical backend enrollment
Create exactly one active credential enrollment bound to:
- canonical backend device principal;
- hardware trace identifier(s);
- credential architecture/version;
- verifier or server-side secret reference as selected by the ADR;
- manufacturing lot/fixture receipt;
- state = `PROVISIONING_PENDING_PROOF`.

Do not use DEVICEID/MAC as the credential.

### M4 — challenge proof before release
The backend/test authority issues a fresh single-use challenge.

The physical device must produce a valid proof under the architecture selected
later.

A failed proof is a provisioning failure, not a warning.

### M5 — production debug/SWD state
- apply the selected production debug policy;
- verify APPROTECT/debug state;
- capture the state in the receipt;
- repeat challenge proof after the final debug-state transition if that
  transition could erase/reinitialize protected material.

### M6 — activate credential
Only after M4/M5 succeed:
- transition enrollment to `ACTIVE`;
- record credential version and activation receipt;
- permit future claim/bind or telemetry authentication to reference that
  credential.

This step still does not activate #122 network persistence by itself.

### M7 — failed provisioning/rework
On any failure:
- device must remain non-active in backend trust;
- reusable fixture/operator secrets must not become device credentials;
- if root/private-key state is uncertain, erase/reprovision and increment
  credential version;
- record disposition.

### M8 — RMA/replacement
A replacement/reworked device must not inherit trust only because the old
DEVICEID/MAC/device row exists.

Required:
- revoke old credential;
- create new credential version or new physical-device principal according to
  the future ADR;
- complete fresh proof;
- update binding only through server authority.

## Receipt fields required

Every completed provisioning receipt must eventually include:

- canonical device principal;
- FICR DEVICEID as trace metadata only;
- module/PCB revision;
- firmware build/version;
- credential architecture/version;
- provisioning fixture/tool version;
- challenge id/hash reference;
- proof result;
- final debug/APPROTECT state;
- operator/station identity;
- timestamp;
- disposition = active / rejected / rework / RMA.

No raw device root/private key belongs in the receipt.

## Open architecture-specific decisions

Still open:
- exact KDF/label/MAC or signature scheme;
- challenge bytes/TTL;
- backend verifier/secret representation;
- credential rotation;
- factory secret custody;
- secure-element part if C wins;
- exact SWD recovery/RMA rule.

These are inputs to the ADR, not reasons to bypass the common sequence.
