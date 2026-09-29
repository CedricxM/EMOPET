# EMOPET TAG Phase 0 — MOKO simple-fixture input package preparation

**Date:** 2026-09-29  
**Issue:** #580  
**Supplier:** MOKO Technology  
**Status:** `PREPARED INPUT CONTRACT / PHYSICAL TEST-POINT MAP BLOCKED / NO FIXTURE RELEASE / NO FABRICATION RELEASE`

## 1. Why this package exists

MOKO confirmed on 2026-09-28 that it can design the **physical simple test fixture itself** if EMOPET supplies:

1. complete test requirements;
2. test points;
3. scripts;
4. step-by-step procedure;
5. pass/fail criteria.

This record converts the controlled TAG engineering evidence already present in the repository into the input contract MOKO needs.

It deliberately does **not** invent physical pogo coordinates, pad references or fixture mechanics.

The controlled TAG KiCad source is not committed in this software repository, and the TAG command chain explicitly forbids fabricating a substitute. Therefore the physical test-point map remains a hard release blocker until a coherent controlled `.kicad_sch` + `.kicad_pcb` revision is available and source-coherence/native verification has passed.

## 2. Ownership boundary

### EMOPET owns and must freeze

- what is tested;
- logical electrical interfaces/nets;
- required test sequence;
- programming image / firmware identity;
- scripts or deterministic command protocol;
- measurement limits;
- PASS / FAIL / INCONCLUSIVE rules;
- output/log schema;
- approved physical test points from the final ECAD;
- revision control.

### MOKO may own within the confirmed simple-fixture scope

- physical jig/fixture mechanical design;
- pogo/connector implementation against the released test-point map;
- fixture BOM;
- fixture manufacture/assembly;
- wiring from approved test points to the defined instruments/interfaces;
- repeated execution on prototypes and later batches;
- fixture maintenance/manufacturing notes.

### Still outside MOKO simple-fixture authority unless separately agreed

- TAG schematic closure;
- PCB layout/routing;
- RF/antenna design;
- battery/PDN architecture;
- enclosure/acoustic design;
- specialist RF/GNSS/EMC validation;
- changing EMOPET pass/fail limits;
- silently substituting a different functional-test method.

## 3. Source-revision gate before fixture release

The fixture input package may move from `PREPARED` to `RELEASED_FOR_FIXTURE_DESIGN` only when all are recorded:

| Input | Current state |
|---|---|
| coherent TAG schematic revision | **BLOCKED / controlled KiCad not in repo** |
| coherent TAG PCB revision | **BLOCKED / controlled KiCad not in repo** |
| native ERC receipt for same schematic | **OPEN** |
| native DRC receipt for routed PCB where applicable | **OPEN** |
| BOM revision | **OPEN / final production BOM not frozen** |
| firmware test build + commit/hash | **OPEN** |
| exact physical test-point refs/coordinates | **BLOCKED BY PCB** |
| fixture datum/keep-out drawing | **BLOCKED BY PCB + MECHANICS** |
| released test script revision | **OPEN** |
| released limit/criteria revision | **PARTIAL / bounded criteria below** |

No fixture CAD should be approved against a mixed-version or inferred source package.

## 4. Controlled logical interface map available now

This section is **logical authority only**. It is not a physical pogo map.

| Function | Controlled logical evidence | Fixture implication | Physical test point |
|---|---|---|---|
| host rail | MS88SF3 VDD pad 31 + VDDH pad 32 → `3V3_CANDIDATE` | measure/observe host supply during bring-up | `TBD_FROM_FINAL_PCB` |
| NTC excitation | MS88SF3 P0.05 / pad 15 → `NTC_EXCITE` | exercise/observe NTC path if included in released FCT | `TBD_FROM_FINAL_PCB` |
| host UART TX | MS88SF3 P0.06 / pad 21 → nRF9151 RX | fixture may expose UART/log interface | `TBD_FROM_FINAL_PCB` |
| host UART RX | nRF9151 TX → MS88SF3 P0.08 / pad 26 | fixture may expose UART/control interface | `TBD_FROM_FINAL_PCB` |
| modem main-VDD gate | MS88SF3 P0.07 / pad 20 → nRF9151 main-VDD gate | sequence + timing evidence | `TBD_FROM_FINAL_PCB` |
| modem VDD_GPIO gate | MS88SF3 P0.17 / pad 41 → nRF9151 VDD_GPIO gate | sequence + timing evidence | `TBD_FROM_FINAL_PCB` |
| IMU primary bus | BMI270 primary I2C; SDO low selects address 0x68 | basic identity/bus sanity after firmware freeze | `TBD_FROM_FINAL_PCB` |
| microphone digital path | INMP441 single-mic candidate; left I2S channel | electrical interface sanity only; acoustic validation separate | `TBD_FROM_FINAL_PCB` |
| SWD/programming | required as a fixture/FCT capability | fixture must preserve safe programming/debug access | `TBD_FROM_FINAL_PCB` |
| modem rail | nRF9151 VDD | transient voltage capture for Phase-0 engineering evidence | `TBD_FROM_FINAL_PCB` |
| modem GPIO rail | nRF9151 VDD_GPIO | transient/sequencing capture | `TBD_FROM_FINAL_PCB` |
| charging input | logical two-contact `CHARGE_IN` direction exists | continuity/basic charging checks after geometry freeze | `BLOCKED_BY_POGO_MECHANICS` |
| LTE/GNSS RF | separate external-path Phase-0 direction | **not converted into simple fixture PASS**; specialist RF lane | `SPECIALIST_LAB` |

### UART caveat

The host UART **direction** is controlled. The exact nRF9151 GPIO pair has appeared as a current candidate (`P0.00/P0.01`) but remains subject to the final nRF9151 pin budget/layout conflict scan. Do not hard-wire the fixture around that candidate until the released schematic confirms it.

## 5. Proposed fixture execution sequence

This is the bounded simple-FCT sequence EMOPET can prepare before the physical test-point map exists.

### FCT-00 — identity and setup

1. scan/enter prototype serial or controlled device identifier;
2. record PCB revision;
3. record fixture revision;
4. record firmware/test-image revision;
5. record operator/station/date;
6. verify the test package revision matches the released manifest.

**PASS:** all required identities are present and mutually compatible.  
**FAIL:** wrong/missing revision or ambiguous unit identity.  
**Action:** do not continue on a mismatched package.

### FCT-01 — unpowered safety / fixture contact

Before energising:
- confirm fixture closure/contact detection where the fixture supports it;
- check expected no-power continuity/open conditions defined by the final PCB release;
- reject obvious short/contact faults.

**Exact nodes/ohmic limits:** `TBD_FROM_FINAL_PCB_AND_FIXTURE_DESIGN`.

No generic resistance threshold is invented here.

### FCT-02 — controlled power-up

Capture:
- input/source voltage;
- total current waveform where the station supports it;
- host 3V3 candidate rail;
- modem switched-rail behaviour;
- reset/brownout indicators.

The controlled Phase-0 PDN criterion already available is:

- nRF9151 VDD must not fall below **3.0 V** during the tested representative sequence;
- no modem reset/brownout;
- no protection/switch trip.

Other rail tolerances remain `TBD_FROM_RELEASED_ELECTRICAL_AUTHORITY`.

### FCT-03 — programming / firmware identity

If programming is part of the station:

1. connect through the released SWD/programming interface;
2. program the released test/application image;
3. perform tool-supported verification/read-back where available;
4. query/report firmware identity through the released mechanism.

**PASS:** programming tool reports success and the resulting firmware identity matches the release manifest.  
**FAIL:** programming/verify error or identity mismatch.

This criterion authorizes only programming correctness, not Device Trust or production security state.

### FCT-04 — host ↔ modem UART

After exact pin assignment is frozen:
- run one deterministic command/response or loopback/fixture-assisted exchange;
- record transmitted/received result and timeout.

**PASS rule:** `TBD_FIRMWARE_TEST_COMMAND`.  
Do not substitute “UART electrically present” for a deterministic functional response.

### FCT-05 — modem power sequencing

Exercise the controlled sequence:

1. assert nRF9151 main-VDD gate through host P0.07;
2. wait **at least 10 ms**;
3. assert nRF9151 VDD_GPIO gate through host P0.17;
4. observe the relevant rails and reset state.

**PASS:**
- ordering respected;
- delay >= 10 ms;
- nRF9151 VDD >= 3.0 V during the tested sequence;
- no reset/brownout;
- no protection/switch trip.

### FCT-06 — BMI270 primary I2C sanity

Current controlled architecture:
- primary I2C;
- SDO low;
- candidate address 0x68.

The final released firmware/test script must define:
- register/identity transaction;
- expected returned value(s);
- optional manufacturer-supported self-test command/result.

**Exact PASS bytes:** `TBD_FROM_RELEASED_SCRIPT_AND_DATASHEET_AUTHORITY`.

### FCT-07 — microphone digital-interface sanity

The current electrical candidate uses:
- single INMP441;
- left I2S channel;
- CHIPEN high while powered.

Simple fixture scope may verify:
- digital clock/data activity under the released test firmware;
- non-stuck/non-silent electrical capture against an explicit test stimulus if one is defined.

**Acoustic response, membrane, enclosure loss and vibration coupling are not simple-FCT PASS criteria.**

Exact digital limits/test stimulus: `TBD_FROM_RELEASED_AUDIO_TEST_SCRIPT`.

### FCT-08 — NTC electrical path sanity

Use the controlled `NTC_EXCITE` path only after the test firmware and expected measurement network are frozen.

Possible released check:
- enable excitation;
- sample ADC/path;
- compare against a known fixture/reference condition.

**Exact acceptable range:** `TBD_FROM_FINAL_BOM + TEST_REFERENCE`.

No temperature-accuracy claim is created by this FCT.

### FCT-09 — charging path basic sanity

Only after pogo/contact geometry is frozen:
- continuity/polarity behaviour;
- basic charging-current presence;
- status if exposed by the released design.

Contact resistance, compression, corrosion, sealing and cycle-life remain separate physical evidence.

**Exact limits:** `TBD_AFTER_CHARGING_MECHANICS_FREEZE`.

### FCT-10 — result sealing

For each unit emit a deterministic result record:

```text
unit_id
pcb_revision
bom_revision
firmware_revision
fixture_revision
test_package_revision
station_id
operator_id
started_at
finished_at
test_id
result = PASS | FAIL | INCONCLUSIVE | NOT_RUN
measured_values[]
limits_revision
raw_log_reference
failure_code
deviation_note
```

A unit must not be collapsed to a single green/red result if an individual required test is `INCONCLUSIVE` or `NOT_RUN`.

## 6. Script contract

The script package sent to MOKO should contain, at minimum:

```text
TAG_FCT_<revision>/
├── 00_RELEASE_MANIFEST/
│   ├── package_revision
│   ├── compatible_pcb_revision
│   ├── compatible_bom_revision
│   ├── firmware_revision
│   └── limits_revision
├── 01_TEST_POINT_MAP/
│   ├── physical_test_points.csv
│   └── fixture_keepouts_datum.pdf
├── 02_STATION_SETUP/
│   ├── required_instruments.md
│   └── wiring_interface.md
├── 03_SCRIPTS/
│   ├── runner/
│   └── README.md
├── 04_LIMITS/
│   └── pass_fail_matrix.csv
├── 05_OPERATOR_SOP/
│   └── step_by_step.md
├── 06_OUTPUT_SCHEMA/
│   └── result_schema.md
└── 07_FIRST_ARTICLE_VALIDATION/
    └── deviations_and_signoff.md
```

No secret, private device credential or production signing key belongs in this fixture package.

## 7. Physical test-point CSV contract

Once the controlled PCB exists, every fixture-contact row should contain:

```csv
test_point_id,pcb_ref,net_name,side,x_mm,y_mm,contact_type,max_voltage,measurement_role,required_for_test,notes
```

Rules:
- `pcb_ref` must exist in the released PCB;
- `net_name` must match the released schematic/PCB;
- coordinates must come from the released board, never a screenshot guess;
- one row may serve multiple FCT steps, but each use must be traceable;
- RF test connectors/switches are not silently reclassified as pogo points.

## 8. Pass/fail matrix contract

The released matrix should use:

```csv
test_id,measurement,lower_limit,upper_limit,unit,method,timeout_ms,on_fail,authority_revision
```

Where no approved numerical limit exists:
- keep the test `TBD` or `ENGINEERING_OBSERVATION_ONLY`;
- do not invent a factory threshold merely to obtain a binary result.

The simple production-style fixture should contain only criteria mature enough to be deterministic and repeatable.

## 9. First-article fixture validation

Before the fixture can be used as repeated execution authority:

1. MOKO returns fixture CAD/drawings/BOM/wiring;
2. EMOPET verifies every contact against the released test-point map;
3. scripts and limits are hash/revision matched;
4. at least one known-good/reviewed engineering unit is run;
5. deliberate or known failure cases are exercised where safe;
6. repeated insertion/run produces stable results;
7. raw station logs are retained;
8. all deviations are resolved or explicitly accepted.

A fixture that only proves it can generate a green screen is not validated.

## 10. Current blockers

### Blocking fixture design release

- controlled final PCB/test-point geometry absent from this repository;
- routing freeze still HOLD;
- final fabricator stack-up/open physical design gates remain;
- exact SWD/contact access not frozen;
- charging pogo datum open;
- exact final production/test firmware command set open.

### Not blocking preparation

- logical host/modem direction;
- modem gate control pins on MS88;
- BMI270 primary-I2C architecture;
- microphone channel candidate;
- bounded nRF9151 VDD criterion;
- required evidence/logging structure;
- script/package structure;
- supplier ownership boundary.

## 11. Next handoff to MOKO

Do **not** yet send “please design the fixture” as though the physical input pack were complete.

Next controlled handoff should occur when the ECAD gate can supply:
- exact released PCB revision;
- `physical_test_points.csv`;
- fixture keep-outs/datum;
- released scripts;
- released pass/fail matrix.

At that point ask MOKO to return:
- fixture concept;
- editable CAD/drawings;
- fixture BOM;
- wiring/interface diagram;
- NRE + fixture build quotation;
- lead time;
- first-article validation plan;
- per-unit execution cost;
- maintenance/spares assumptions.

## 12. Gate

`MOKO_SIMPLE_FIXTURE_CAPABILITY = CONFIRMED_IN_WRITING`

`EMOPET_FIXTURE_INPUT_CONTRACT = PREPARED`

`PHYSICAL_TEST_POINT_MAP = BLOCKED_PENDING_CONTROLLED_PCB`

`FIXTURE_DESIGN_RELEASE = HOLD`

`FIXTURE_PURCHASE_AUTHORITY = NONE`

`TAG_FABRICATION_RELEASE = NONE`
