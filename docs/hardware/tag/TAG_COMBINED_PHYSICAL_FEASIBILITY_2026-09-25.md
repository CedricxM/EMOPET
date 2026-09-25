# TAG combined physical-feasibility matrix

**Issue:** #480  
**Date:** 2026-09-25  
**Status:** `CONTROLLED REVIEW MATRIX / PHYSICAL EVIDENCE STILL OPEN`

This record consolidates the current TAG physical-feasibility state. It is not a fabrication release and does not convert calculations or supplier webpages into validation.

## Current system candidate

The repository currently carries a Phase-0 TAG candidate around:

- MS88SF3 / nRF52840 host;
- nRF9151 cellular/GNSS modem;
- BMI270 IMU;
- digital microphone path;
- BQ25185 charger;
- TPS63900 3.3 V rail;
- TPS22916C modem power sequencing;
- LP501622HA 3.7 V / 100 mAh / 10C **bare-cell** fit-check candidate;
- separate LTE and GNSS external-path Phase-0 direction;
- physical 1.8 V nano-SIM direction;
- two-contact charging interface direction.

Every item above remains bounded by its controlling issue and maturity.

## Combined readiness matrix

| Domain | Current maturity | What is already controlled | Missing evidence before #480 can close |
|---|---|---|---|
| 3D packing | **OPEN** | fit-check target 36×26×16 mm external / 32×22×12 mm internal; bare-cell dimensions known | one real CAD pack with PCB, protected-cell allowance, RF zones, pogo, mic path, walls/ribs/seals, SWD and attachment |
| Battery capacity | **PARTIAL** | LP501622HA bare-cell candidate; 100 mAh / 10C vendor candidate | duty-cycle/runtime model, protected-pack architecture, low-temperature capacity, ageing/swelling |
| Peak current | **PARTIAL / MODEL GATE** | nRF9151 ~500 mA design peak requirement preserved | measured current and rail droop at high/medium/low SOC and temperature |
| PDN | **PARTIAL / BENCH REQUIRED** | sequencing, local ferrite/decoupling, source reservoir candidates | transient capture at cell, switched source, nRF9151 VDD/VDD_GPIO; no brownout/reset |
| LTE RF topology | **BOARD-SIDE CANDIDATE** | external Phase-0 path; U.FL candidate; conducted test switch candidate | real antenna choice, matching, enclosure/body-loaded efficiency/return loss |
| GNSS | **BOARD-SIDE CANDIDATE** | dedicated external Phase-0 path | TTFF/sensitivity/accuracy in final enclosure + representative loading |
| 50-ohm geometry | **OPEN** | requirement known | actual MOKO/fabricator stack-up + controlled impedance geometry + layout QA |
| BLE coexistence | **OPEN PHYSICAL** | MS88SF3 integrated BLE antenna exists | coexistence/placement validation versus LTE/GNSS and enclosure/body loading |
| UICC | **CANDIDATE** | physical 1.8 V nano-SIM; Molex holder + ESD candidate | placement/EMI/layout verification and bring-up |
| Thermal | **OPEN** | NTC Phase-0 electrical path candidate | modem burst/worst-case enclosure temperature and skin-contact measurements |
| Acoustic | **OPEN PHYSICAL** | microphone electrical interface/source direction exists | port/membrane/gasket geometry, insertion loss/frequency response, vibration coupling |
| IP / sealing | **OPEN** | sealing requirement recognized | target class, enclosure implementation and environmental test evidence |
| Charging contacts | **PARTIAL** | polarity-agnostic electrical front end; cradle pogo candidate direction | pad geometry, pitch, compression/tolerance, contact resistance, corrosion, sealing |
| Wearability | **OPEN** | target envelope only | assembled mass/CG/attachment/comfort on intended dog-size range |
| Battery removability | **LEGAL+MECH OPEN** | regulatory concern recorded in #480 | qualified applicability decision + enclosure architecture consequence |
| Production passive BOM | **OPEN** | many major MPNs known | exact remaining MFR+MPN/value/tolerance/voltage freeze |
| Native ECAD | **PARTIAL** | deterministic closure work exists | current native ERC/DRC receipts on the final coherent revision |

## Routing-freeze blockers

Routing freeze remains prohibited until these routing-critical inputs exist:

1. production-quality MS88SF3 footprint QA;
2. LTE/GNSS/SIM board topology frozen enough for placement;
3. actual fabricator stack-up for 50-ohm calculation;
4. battery/protection bounding box and PDN placement inputs;
5. pogo/contact datum;
6. acoustic port/mic datum;
7. antenna keep-outs and mechanical keep-outs.

A clean ERC alone does not satisfy these inputs.

## Phase-0 combined bench campaign

The first five prototypes should be treated as **engineering evidence units**, not release samples.

### A. Power / PDN

Capture:

- cell terminal voltage;
- source-side reservoir;
- switched modem rail;
- nRF9151 VDD;
- VDD_GPIO;
- current waveform;
- reset/brownout indicator;
- power-up timing.

Conditions:

- high SOC;
- medium SOC;
- low SOC;
- room temperature;
- at least one relevant cool-temperature condition if equipment permits;
- LTE attach/uplink burst;
- GNSS active;
- combined modem + host + sensor load.

Minimum bounded pass criterion from #503:

- nRF9151 VDD never below 3.0 V during tested sequences;
- no modem reset/brownout;
- no protection/switch trip;
- P0.07 -> >=10 ms -> P0.17 sequence respected.

### B. RF / GNSS

Separate conducted-path evidence from radiated antenna evidence.

Conducted:

- modem bring-up;
- LTE path insertion/debug;
- conducted TX/RX where lab equipment supports it.

Radiated/enclosure:

- antenna S11/return-loss sweep;
- representative enclosure;
- representative dog-body-equivalent loading;
- BLE coexistence observation;
- GNSS TTFF and basic sensitivity/accuracy comparison.

Do not collapse conducted PASS into antenna PASS.

### C. Charging / pogo

Measure:

- continuity/contact resistance;
- alignment tolerance;
- nominal/worst compression;
- repeated mate/unmate;
- charging current;
- polarity behavior;
- contamination/corrosion exposure plan.

### D. Acoustic

Compare at minimum:

- open-board microphone baseline;
- enclosure port;
- selected membrane/mesh candidate;
- sealed assembly.

Measure relative response/loss across the intended feature band and record enclosure vibration artifacts.

### E. Thermal

Instrument:

- cell;
- charger/regulator hot spots;
- nRF9151 region;
- enclosure skin-contact surface.

Test worst intended active sequence and report steady/transient temperatures rather than a qualitative “warm/not warm”.

### F. Fit / wearability

Record:

- final assembled mass;
- dimensions;
- center of mass;
- strap/attachment behavior;
- contact with neck/fur;
- rotation/slip during movement;
- representative small/medium/large dog fit or mechanical surrogate.

## Prototype allocation suggestion

If five prototypes are available:

- **P1**: destructive/debug-friendly electrical/PDN instrumented unit;
- **P2**: RF conducted + antenna tuning unit;
- **P3**: acoustic/sealing development unit;
- **P4**: charging/mechanical/tolerance unit;
- **P5**: integrated regression/wearability unit.

This allocation is a test-management proposal, not a requirement to sacrifice all five permanently. Reuse is acceptable when test history remains controlled.

## External partner boundary

#580 now owns partner qualification.

Preferred split:

- MOKO: PCB/PCBA fabrication, AOI/X-ray/flying probe, fixture manufacture/assembly, repeatable agreed functional execution;
- one-off engineering partner if needed: fixture/test-method development and bring-up;
- specialist/accredited lab: RF/GNSS/EMC/environmental evidence.

## Evidence packet required per test

Every physical test should capture:

- exact prototype serial/device id;
- PCB revision;
- BOM revision;
- firmware commit/version;
- battery SKU/configuration;
- enclosure revision;
- test equipment + calibration identity where relevant;
- setup photo/diagram;
- raw logs/data;
- derived result;
- pass/fail criterion;
- anomalies/deviations;
- operator/date.

## Current disposition

`TAG_ROUTING_FREEZE = HOLD`

`TAG_ECAD = ENGINEERING CANDIDATE`

`TAG_POWER = MODEL/SCHEMATIC CANDIDATE / TRANSIENT EVIDENCE OPEN`

`TAG_RF = BOARD-SIDE CANDIDATE / PHYSICAL RF EVIDENCE OPEN`

`TAG_MECH_ACOUSTIC = DATUMS+PHYSICAL EVIDENCE OPEN`

`TAG_PHYSICAL_FEASIBILITY = NOT VALIDATED`
