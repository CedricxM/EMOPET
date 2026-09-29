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
Create exactly one **candidate credential enrollment** bound to:
- canonical backend device principal;
- hardware trace identifier(s);
- credential architecture/version;
- verifier or server-side secret reference as selected by the ADR;
- manufacturing lot/fixture receipt;
- state = `PENDING_PROOF`.

On initial manufacturing there may be no ACTIVE credential yet. During rotation,
the existing ACTIVE credential remains authoritative while the new candidate is
PENDING_PROOF.

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

### M6 — activate credential / atomic cutover
Only after the controlled M4/M5 evidence succeeds:

**Initial activation, with no current ACTIVE credential**
- transition the candidate `PENDING_PROOF -> ACTIVE`;
- record credential version and activation receipt.

**Rotation, with an existing ACTIVE credential**
- lock the canonical device and relevant credential rows;
- re-verify the expected ACTIVE and PENDING_PROOF versions;
- transition old `ACTIVE -> REVOKED_PENDING_ERASE`;
- transition new `PENDING_PROOF -> ACTIVE`;
- use one cutover timestamp/receipt;
- commit both mutations atomically.

The database already permits at most one ACTIVE credential per device, so
“activate new, then revoke old” is not a valid rotation algorithm.

Implementation authority belongs to #721; PR #723 is the current candidate and supersedes closed #722. Software-only caller assertions
such as `proofPassed=true` or `approtectVerified=true` must never substitute for
the controlled M4/M5 physical/manufacturing evidence path.

This step still does not activate #122 network persistence or Device Data Trust
by itself.

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
- credential rotation runtime implementation under #721;
- M4/M5 durable evidence/receipt authority;
- factory secret custody;
- secure-element part if C wins;
- exact SWD recovery/RMA rule.

These are inputs to the ADR, not reasons to bypass the common sequence.
