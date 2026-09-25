# EMOPET TAG Phase-0 — external engineering / test RFQ package

**Issue:** #580  
**Parent physical gate:** #480  
**Related:** #503 PDN, #504 RF, #508 mechanics, #583 combined feasibility matrix  
**Date:** 2026-09-25  
**Status:** `RFQ PACKAGE / NO PROVIDER SELECTED / NO FABRICATION RELEASE`

## 1. Project context

EMOPET is preparing a Phase-0 engineering build of a compact connected canine TAG.

The current engineering candidate includes:

- nRF52840 host module;
- nRF9151 LTE-M / NB-IoT + GNSS modem;
- BMI270 IMU;
- digital microphone path;
- rechargeable Li-ion/Li-poly battery and charger/power-path circuitry;
- BLE, LTE and GNSS radio paths;
- two-contact charging interface.

Five engineering prototypes are planned for the first evidence campaign.

This RFQ is **not** a production-certification request and does not imply that the current design is fabrication-ready. EMOPET is looking for bounded engineering/test support with full evidence and handover.

## 2. Two independent scopes

A supplier may quote either or both scopes.

### Scope A — fixture + functional bring-up engineering

Goal: develop/validate a repeatable electrical functional test that can later be reproduced and executed by MOKO on prototypes and production batches.

Expected partner contribution:

1. review EMOPET schematics, PCB/test-point files and test requirements;
2. identify missing test access or bring-up risks;
3. design the physical fixture if required;
4. define or complete test scripts;
5. validate the method on up to five engineering prototypes;
6. provide raw results;
7. hand over the complete fixture/test package to EMOPET.

### Scope B — RF / GNSS / EMC / power evidence

Goal: obtain specialist engineering evidence that cannot be established by factory AOI/X-ray/flying-probe or ordinary fixture execution.

Potential work includes:

- LTE-M / NB-IoT conducted bring-up;
- GNSS path verification;
- RF test-port measurements;
- antenna/VNA/S11 work;
- enclosure/body-loading comparisons;
- BLE/LTE/GNSS coexistence observations;
- EMC pre-scan;
- LTE TX current/rail transient capture;
- environmental/reliability work where relevant.

Formal certification is **not automatically included**. Please separate engineering/pre-compliance work from formal certification pricing.

## 3. Scope A deliverables — mandatory quotation lines

Please quote these separately where possible.

### A1. Design review / DFT review

Deliver:

- schematic/test-point review;
- list of blocking or recommended DFT changes;
- instrument requirements;
- fixture/test architecture proposal;
- estimated test cycle time.

### A2. Fixture engineering

Confirm whether you can design the physical fixture **without EMOPET supplying finished fixture CAD**, using:

- schematics;
- PCB/Gerber/ODB++/native ECAD exports as agreed;
- test-point coordinates;
- test requirements;
- connector/interface definitions.

Deliver:

- fixture mechanical CAD;
- drawings;
- wiring diagrams;
- fixture BOM with exact MFR+MPN;
- pogo/connector mapping;
- calibration/check procedure;
- maintenance/spares list.

### A3. Functional scripts

Target functions may include, as applicable:

- input/source power sanity;
- charger/charge-path sanity;
- 3.3 V rail;
- modem switched VDD/VDD_GPIO sequence;
- current draw;
- SWD/program/debug availability;
- I2C devices;
- I2S microphone interface sanity;
- UART host↔modem communication;
- IMU identity/basic sample;
- temperature-divider ADC sanity;
- LTE modem boot/AT responsiveness;
- GNSS basic interface responsiveness;
- BLE advertising/basic communication;
- charging-contact continuity.

Deliver:

- complete script/source code;
- dependencies/runtime versions;
- configuration files;
- limits;
- deterministic pass/fail rules;
- example raw logs;
- failure codes;
- step-by-step SOP.

No proprietary executable-only handoff is acceptable unless explicitly agreed before award.

### A4. Prototype execution

Quote execution on **five prototypes**.

Return per unit:

- serial/device identifier;
- test start/end;
- raw log;
- measured values;
- pass/fail per test;
- operator/test-station identity;
- deviations/rework;
- final disposition.

### A5. Handover / reproducibility

The package must be usable by another competent factory/test provider.

Please confirm:

- fixture CAD ownership/handover;
- source-code ownership/handover;
- editable files included;
- no undisclosed licence dongle/server dependency;
- whether MOKO can reproduce/build another fixture from the handover package.

## 4. Scope B deliverables — specialist laboratory

### B1. LTE-M / NB-IoT conducted bring-up

Where equipment and prototype access permit:

- network attach;
- TX/RX conducted checks;
- power-state observation;
- relevant band/config documentation;
- raw plots/logs.

The current engineering direction includes a conducted LTE test-access candidate. Final access details will be provided with the released test revision.

### B2. GNSS

Please state capability for:

- conducted/path verification;
- sensitivity screening;
- TTFF measurements;
- enclosure comparison;
- representative body-loading comparison where appropriate.

### B3. Antenna / VNA

Please state capability for:

- S11 / return loss;
- antenna tuning/matching support;
- free-space versus enclosure comparison;
- representative dog-body-equivalent loading;
- BLE/LTE/GNSS coexistence review.

Do not quote a generic antenna PASS without describing the test configuration.

### B4. EMC / pre-compliance

Please separate:

- engineering pre-scan;
- troubleshooting/retest time;
- formal accredited testing/certification.

State the standards/bands and accreditation scope you can support for the requested work.

### B5. PDN / transient evidence

Please state whether you can capture during representative LTE TX / attach activity:

- battery terminal voltage;
- source-side reservoir voltage;
- modem switched rail;
- nRF9151 VDD;
- VDD_GPIO;
- current waveform;
- reset/brownout evidence.

The current minimum engineering criterion from EMOPET #503 is that nRF9151 VDD must not fall below **3.0 V** during the tested sequence and there must be no modem reset/brownout or switch/protection trip.

This is an engineering acceptance criterion, not a certification statement.

## 5. Evidence format

For every test, EMOPET requests enough provenance to reproduce the result:

- prototype serial/device id;
- PCB revision;
- BOM revision;
- firmware version/commit supplied by EMOPET;
- battery SKU/configuration;
- enclosure revision if used;
- equipment make/model;
- calibration identity/date where relevant;
- setup diagram/photo;
- raw logs/data;
- derived result;
- pass/fail criterion;
- anomaly/deviation notes;
- test date/operator.

## 6. Commercial response requested

Please provide:

- one-off NRE;
- fixture engineering cost;
- fixture manufacturing cost;
- script/software engineering cost;
- per-prototype execution cost;
- RF/EMC engineering hourly/day rate where applicable;
- formal certification cost separately;
- lead time from complete input package;
- minimum order / minimum engineering charge;
- payment terms;
- sample shipping/return terms;
- re-test pricing;
- IP/source-file ownership terms.

## 7. Questions to answer explicitly

1. Can you design the physical functional-test fixture from requirements + PCB/test-point data, or do you require finished fixture CAD from EMOPET?
2. Can you create/complete test scripts and pass/fail logic?
3. Will EMOPET receive editable fixture CAD, full BOM, script source, SOP and limits?
4. Can another factory, specifically MOKO, reproduce and operate the fixture after handover?
5. Can you support five prototype units?
6. Which requested measurements are within your own laboratory capability?
7. Which work is subcontracted?
8. What exact accreditation scope applies to any accredited RF/EMC result?
9. Can you provide raw data rather than report-only output?
10. What design changes, if any, do you need before quoting accurately?

## 8. Current manufacturing boundary

MOKO has already indicated that it can:

- manufacture/assemble a simple test fixture;
- run the agreed functional test on the five prototypes and later batches;
- support flying-probe, AOI and X-ray;
- provide additional environmental/reliability test capabilities.

EMOPET therefore does **not** intend to retain a separate engineering partner indefinitely for routine production test if the fixture/test package can be transferred successfully.

## 9. Award gate

A candidate is not selected on website capability statements alone.

Award requires written agreement on:

- exact scope;
- deliverables;
- price;
- lead time;
- source/IP handover;
- raw evidence;
- accreditation where relevant;
- sample logistics;
- confidentiality/NDA requirements.

`TAG_EXTERNAL_TEST_PARTNER = RFQ / NO AWARD`
