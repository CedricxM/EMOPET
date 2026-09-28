# EMOPET TAG Phase 0 — external engineering / test partner RFQ

**Issue:** #580  
**Date:** 2026-09-25  
**Status:** `RFQ PACKAGE / NO PROVIDER SELECTED / NO PURCHASE AUTHORITY`

## 1. Purpose

EMOPET is preparing five TAG Phase-0 engineering prototypes.

MOKO Technology's clarified role remains:

- PCB/PCBA fabrication and assembly from EMOPET-controlled design files;
- AOI / X-ray / flying-probe and agreed factory inspection;
- manufacture/assembly of a test fixture if EMOPET supplies a sufficiently controlled test package;
- execution of an agreed functional test on the five prototypes and later batches.

MOKO is **not** currently the owner of TAG schematic closure, PCB/RF/power/mechanical design or one-off engineering validation.

This RFQ therefore seeks external partners for one of two distinct tracks.

## 2. Track A — one-off fixture / bring-up engineering

EMOPET may need a one-time engineering partner to convert our controlled requirements into a reproducible test system that can later be transferred to MOKO.

### Requested scope

Please state whether you can provide:

1. review of schematic, PCB files, test points and test requirements;
2. physical fixture/jig design;
3. fixture BOM;
4. test-instrument definition;
5. test software/scripts;
6. firmware/programming support where needed for bring-up;
7. step-by-step SOP;
8. pass/fail limits;
9. first-article fixture validation;
10. execution on **5 TAG prototypes**;
11. raw/minimally processed result files;
12. issue/failure log;
13. final handover package so the fixture/test can be reproduced by MOKO.

### Required ownership/handover

The quotation must state whether EMOPET receives:

- editable fixture CAD/source;
- drawings;
- BOM;
- scripts/source code;
- configuration files;
- instrument setup;
- test procedure;
- limits;
- calibration/check procedure and assumptions;
- maintenance/spares information where a custom fixture is used;
- revision history.

No proprietary executable-only handoff is acceptable unless explicitly agreed before award. EMOPET's target is **no long-term lock-in** for routine production execution.

### Initial functional coverage

The initial functional-test architecture should be able to cover, where technically appropriate:

- power-up current and rail sanity;
- 3V3 rail;
- nRF9151 switched VDD / VDD_GPIO sequence;
- SWD/programming access;
- host UART;
- I2C sensor presence/basic sanity;
- I2S microphone interface/basic sanity;
- NTC ADC path;
- IMU basic identity/self-test where supported;
- modem boot/attach sanity;
- GNSS basic bring-up;
- charging input/basic current path;
- serial/device identifier logging.

This list is an RFQ input, not a final released production test specification.

## 3. Track B — RF / GNSS / EMC / environmental engineering laboratory

EMOPET also seeks a specialist laboratory for evidence that cannot be closed by factory functional testing.

### Requested capability response

Please state whether you can support:

#### Cellular / RF
- nRF9151 LTE-M / NB-IoT conducted bring-up;
- conducted TX/RX test through an RF test switch/connector;
- RF path debug;
- VNA / S11 / return-loss measurement;
- antenna matching/tuning support;
- enclosure/body-loading evaluation;
- BLE/LTE/GNSS coexistence pre-compliance.

#### GNSS
- GNSS path bring-up;
- TTFF comparison;
- sensitivity / basic receive-path evaluation;
- enclosure/body-loaded comparison.

#### EMC / pre-compliance
- radiated/conducted emissions pre-scan;
- immunity/pre-compliance options;
- final certification planning if later requested.

#### PDN / power
- LTE burst-current capture;
- battery terminal / source-side reservoir / switched rail / nRF9151 VDD and VDD_GPIO capture where accessible;
- transient droop;
- reset/brownout and switch/protection-trip observation;
- sequencing capture.

For the currently controlled #503 engineering campaign, quote against the candidate criterion that nRF9151 VDD must not fall below **3.0 V** during the tested representative sequence, with no modem reset/brownout or switch/protection trip. This is an engineering acceptance criterion for Phase 0, not a certification statement.

#### Environmental / mechanical where available
- temperature;
- humidity;
- vibration;
- drop;
- ingress/water/dust pre-evaluation;
- thermal-surface measurement.

## 4. Prototype/evidence requirements

For every test session, EMOPET requires a traceable evidence package containing, where applicable:

- prototype/device serial;
- PCB revision;
- BOM revision;
- firmware version/commit;
- battery configuration;
- enclosure revision;
- test equipment make/model;
- calibration identity/date where relevant;
- test-station identity where relevant;
- setup description/photo;
- test conditions;
- raw or minimally processed data;
- plots;
- derived result;
- explicit pass/fail criterion where one exists;
- anomalies/deviations;
- test date/operator.

A polished summary without underlying evidence is not sufficient for Phase 0.

## 5. Commercial response format

Please quote separately:

- one-time engineering/NRE;
- fixture design;
- fixture manufacture;
- test software/script development;
- first-article validation;
- testing of 5 prototypes;
- engineering support hourly/day rate if relevant;
- environmental/RF lab time;
- formal certification pricing separately from engineering/pre-compliance work;
- report/raw-data package;
- shipping/return;
- re-test pricing;
- minimum order / minimum engineering charge;
- taxes/other mandatory fees.

Also state:

- lead time;
- payment terms;
- prototype shipping and return requirements;
- any subcontracted part of the requested work;
- NDA/IP terms;
- validity period of quote;
- what is explicitly **not included**.

## 6. Required response questions

Please answer explicitly:

1. Can you design the physical functional-test fixture from requirements plus PCB/test-point data, or do you require finished fixture CAD from EMOPET?
2. Can you create or complete the test scripts and deterministic pass/fail logic?
3. Will EMOPET receive editable fixture CAD, full BOM, script source, SOP, limits and calibration/check instructions?
4. Can MOKO reproduce/build and operate the fixture from the handover package?
5. Can you support execution on five Phase-0 prototypes?
6. Which requested measurements are performed in-house?
7. Which requested work, if any, is subcontracted?
8. What exact accreditation scope, standards and bands apply to the quoted RF/EMC work?
9. Can you provide raw data and plots, not report-only output?
10. What design changes or additional inputs are required before you can quote accurately?

## 7. Handover to MOKO

For Track A, please confirm whether the completed fixture/test package can be transferred to another EMS factory for repeated execution.

Preferred end state:

`engineering partner develops/validates once -> EMOPET owns controlled package -> MOKO reproduces/runs routine test`

If your commercial model requires that the fixture/software remain proprietary or only executable at your facility, state that clearly.

## 8. Accreditation boundary

For Track B, provide the **exact accreditation scope** relevant to the requested RF/EMC/environmental work.

General company accreditation is not automatically evidence that every requested method is covered. The response should identify the applicable standards/bands and distinguish engineering/pre-compliance work from formally accredited testing.

## 9. Current technical maturity

The TAG is an engineering prototype. Current gates remain open for:

- physical RF validation;
- PDN transient validation;
- final enclosure/packing;
- acoustic stack;
- sealing;
- wearability;
- full production BOM;
- formal certification.

The RFQ is intended to generate engineering evidence and quotations, not to represent the design as production validated.

## 10. Selection status

`TAG_EXTERNAL_TEST_PARTNER = RFQ / NO PROVIDER SELECTED`

No website claim, email response or quotation alone authorizes supplier selection or fabrication release.
