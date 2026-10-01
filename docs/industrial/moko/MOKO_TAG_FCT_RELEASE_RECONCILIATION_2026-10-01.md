# EMOPET TAG Phase 0 — FCT release reconciliation

**Date:** 2026-10-01  
**Issues:** #480, #580  
**Status:** `POST-ROUTING RECONCILIATION / FCT INPUTS PARTIAL / NO FIXTURE PURCHASE AUTHORITY`

## 1. Purpose

This record reconciles the 2026-09-29 MOKO simple-fixture input contract with the later TAG supplier handoff performed on 2026-09-30.

The 2026-09-29 document remains historical authority for the FCT structure and supplier ownership boundary. Its statements that the controlled routed PCB was absent and routing remained HOLD describe the state on that date and must not be read as the current TAG routing status.

This document does not authorize fabrication, fixture purchase, tooling, production release or supplier payment.

## 2. Evidence boundary

The controlled communications record states that on 2026-09-30 EMOPET sent MOKO an updated TAG fabrication/assembly package after routing and file checks. The supplier communication described Gerbers, BOM and supporting fabrication files as included and stated that programming/test files would follow separately.

Repository evidence must not infer the byte-level contents of the supplier ZIP solely from the email. Supplier acceptance, DFM approval, purchase order and manufacturing release remain separate events.

Therefore:

- `TAG_ROUTING_STATUS_FOR_FCT = POST_ROUTING_PACKAGE_SENT`
- `SUPPLIER_PACKAGE_CONTENT_AUTHORITY = COMMUNICATION_EVIDENCE_ONLY_UNTIL_CONTROLLED_ARTIFACT_RECONCILIATION`
- `PROGRAMMING_TEST_PACKAGE = NOT_YET_RELEASED`
- `FIXTURE_DESIGN_RELEASE = HOLD`
- `FIXTURE_PURCHASE_AUTHORITY = NONE`

## 3. Existing FCT authority retained

The sequence defined in `MOKO_TAG_SIMPLE_FIXTURE_INPUT_PACKAGE_2026-09-29.md` remains the baseline:

- FCT-00 identity/setup
- FCT-01 unpowered safety/contact
- FCT-02 controlled power-up
- FCT-03 programming/firmware identity
- FCT-04 host/modem UART
- FCT-05 modem power sequencing
- FCT-06 BMI270 I2C sanity
- FCT-07 microphone digital-interface sanity
- FCT-08 NTC electrical-path sanity
- FCT-09 charging-path basic sanity
- FCT-10 deterministic result sealing

Existing controlled engineering criterion retained for Phase 0: nRF9151 VDD must remain at or above 3.0 V during the tested representative sequence, with no modem reset/brownout and no protection/switch trip.

No additional numeric factory limits are introduced by this reconciliation.

## 4. Delta required before fixture-design release

| Artifact | State on 2026-10-01 | Release rule |
|---|---|---|
| exact PCB revision identity | REQUIRED | bind to the controlled PCB used for the 2026-09-30 supplier package |
| exact BOM revision identity | REQUIRED | bind to the same PCB/package revision |
| native DRC receipt | REPORTED COMPLETE IN SUPPLIER COMMUNICATION; CONTROLLED RECEIPT LINK REQUIRED | record path/hash or controlled evidence reference |
| physical test-point map | OPEN | derive only from controlled final PCB, never screenshots/inference |
| fixture datum/keep-outs | OPEN | derive from controlled PCB/mechanical authority |
| firmware test image | OPEN | bind commit/build/hash and compatible hardware revision |
| deterministic test commands | OPEN | freeze UART/BMI270/audio/NTC/charging commands and expected responses |
| pass/fail matrix | PARTIAL | retain approved limits; leave unsupported thresholds TBD/engineering-observation-only |
| operator SOP | OPEN | generated only after scripts, wiring and limits are coherent |
| output schema | PREPARED | use FCT-10 schema from the 2026-09-29 contract |
| first-article validation | NOT RUN | requires physical fixture + engineering unit |

## 5. Required physical test-point artifact

Create `physical_test_points.csv` only from the controlled PCB authority with the existing schema:

```csv
test_point_id,pcb_ref,net_name,side,x_mm,y_mm,contact_type,max_voltage,measurement_role,required_for_test,notes
```

Minimum functions to map where physically exposed by the released board:

- ground/reference;
- input power;
- host 3V3;
- SWDIO/SWDCLK/reset as applicable;
- host/modem UART;
- nRF9151 VDD;
- nRF9151 VDD_GPIO;
- NTC excitation/measurement path as applicable;
- charging input/status as applicable.

LTE/GNSS RF is not silently converted into a pogo/simple-FCT criterion. Specialist RF/GNSS validation remains a separate Phase-0 lane.

## 6. Programming/test release package

The next supplier handoff should be revisioned as one coherent package:

```text
TAG_FCT_<revision>/
├── 00_RELEASE_MANIFEST/
├── 01_TEST_POINT_MAP/
├── 02_STATION_SETUP/
├── 03_SCRIPTS/
├── 04_LIMITS/
├── 05_OPERATOR_SOP/
├── 06_OUTPUT_SCHEMA/
└── 07_FIRST_ARTICLE_VALIDATION/
```

The release manifest must bind at minimum:

- PCB revision;
- BOM revision;
- firmware commit/build/hash;
- test-script revision/hash;
- limits revision;
- test-point-map revision;
- fixture-interface revision.

No private device key, production signing key or reusable manufacturing secret belongs in this package.

## 7. Device-trust boundary

FCT-03 proves only programming and firmware identity. It must not imply authenticated device trust.

Manufacturing provisioning remains governed by the separate M0-M8 flow in `docs/security/DEVICE_IDENTITY_MANUFACTURING_PROVISIONING_2026-09-27.md`. Physical proof/debug evidence and backend activation remain separate controlled gates.

## 8. First-article gate

Before repeated fixture execution is authoritative:

1. MOKO returns editable fixture drawings/CAD, BOM and wiring/interface definition;
2. every fixture contact is reconciled against the released test-point map;
3. scripts, firmware and limits are hash/revision matched;
4. a reviewed engineering unit completes the sequence;
5. known or deliberate safe failure cases demonstrate that FAIL paths work;
6. repeated insertion/execution demonstrates stable results;
7. raw station logs are retained;
8. deviations are resolved or explicitly accepted.

A fixture is not validated merely because it can produce PASS.

## 9. Current decision

The immediate hardware-control task is no longer to design another TAG routing candidate.

The next controlled work is:

`CONTROLLED PCB/BOM/DRC IDENTITY -> PHYSICAL TEST-POINT MAP -> FCT FIRMWARE/SCRIPTS -> LIMITS/SOP -> MOKO FIXTURE DESIGN -> FIRST ARTICLE -> FIVE-PROTOTYPE PHYSICAL CAMPAIGN`

Until those inputs are bound to the same revision:

`MOKO_SIMPLE_FIXTURE_CAPABILITY = CONFIRMED`

`FCT_LOGICAL_CONTRACT = PREPARED`

`FCT_PHYSICAL_RELEASE = HOLD`

`TAG_PHASE0_PHYSICAL_EVIDENCE = OPEN`
