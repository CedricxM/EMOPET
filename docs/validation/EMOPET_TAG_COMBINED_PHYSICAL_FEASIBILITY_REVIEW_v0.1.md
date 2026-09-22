# EMOPET — TAG Combined Physical Feasibility Review v0.1

**Status:** REVIEW TEMPLATE / NOT EXECUTED EVIDENCE  
**Date:** 2026-09-22  
**Parent:** #480 `TAG-FEASIBILITY-01`  
**Related:** #66 Device Trust, #230 MAT launch gate, MOKO Phase 0 engineering review  
**Not a routing release. Not a DFM approval. Not proof of RF, battery, thermal, acoustic or sealing performance.**

## 0. Purpose

The TAG cannot be frozen one domain at a time.

Its battery, PDN, cellular/GNSS RF, enclosure, acoustic path, charging method, sealing, thermal behaviour and wearability compete for the same volume and influence one another.

This document turns #480 into an executable **combined review**. It is intentionally designed to stop a routing freeze from being approved on a collection of individually plausible but mutually incompatible assumptions.

## 1. Review outcome

The review may end in only one of:

- `HOLD` — unresolved coupled risk blocks routing/fabrication freeze;
- `REMEDIATE` — architecture is plausible but one or more changes are required before freeze;
- `PROCEED_TO_CONTROLLED_PROTOTYPE` — enough coupled engineering assumptions are closed to build a controlled prototype for physical validation.

`PROCEED_TO_CONTROLLED_PROTOTYPE` is **not** Product V1 approval, production release or evidence that the prototype will pass bench/body testing.

## 2. Maturity vocabulary

Every row must be marked exactly one of:

- `OUVERT`
- `CANDIDAT`
- `DÉCIDÉ`
- `IMPLÉMENTÉ`
- `TESTÉ`
- `VALIDÉ`

Do not promote maturity because a value appears in a schematic, datasheet or supplier quotation.

## 3. Required review packet

At review start, identify:

| Item | Required evidence |
|---|---|
| TAG hardware revision | exact source/revision |
| PCB outline / candidate stack-up | controlled source |
| component/BOM revision | controlled source |
| battery candidate | exact MFR + MPN + cell data |
| antenna candidates | exact MFR + MPN / layout requirements |
| enclosure revision | controlled CAD/version if available |
| acoustic membrane/port candidate | exact part or explicit OPEN |
| charging mechanism | exact candidate or OPEN |
| firmware/duty-cycle assumption | revision/config or OPEN |
| radio reporting profile | LTE/GNSS/BLE duty-cycle assumption or OPEN |
| test article identity | once hardware exists |

Unknown items remain `OUVERT`; do not fill them with convenient defaults.

## 4. Coupled feasibility matrix

For every domain below record:

- current assumption;
- source of that assumption;
- measurement/calculation required;
- evidence artifact;
- result;
- maturity;
- coupled dependencies;
- blocking issue / next action.

### 4.1 3D packing

Required evidence:

- PCB envelope;
- battery volume + swelling/clearance allowance where applicable;
- LTE/GNSS/BLE antenna volumes and keep-outs;
- acoustic port/membrane;
- charging contacts/coil;
- enclosure walls/seals;
- fastening/attachment;
- cable/flex paths if any;
- service/removal access where required.

Output:
- controlled 3D section or equivalent volumetric evidence;
- explicit collision/clearance list;
- antenna keep-outs visible in the real packing model.

A 2D schematic or BOM does not satisfy this row.

### 4.2 Battery energy budget

Record the intended duty cycle, not only nominal battery capacity.

At minimum model/measure:

- MCU baseline;
- IMU;
- microphone/acoustic acquisition;
- BLE;
- LTE-M/NB-IoT idle/attach/transmit;
- GNSS acquisition/tracking;
- regulator losses;
- sleep current;
- charging-system quiescent load;
- expected reporting cadence;
- low-temperature derating where relevant.

Output:
- assumptions table;
- average-current estimate;
- peak-current profile;
- expected operating-time range with uncertainty;
- explicit conditions under which the estimate is invalid.

No commercial battery-life claim is authorized by this calculation alone.

### 4.3 Peak-current / cell-delivery compatibility

Required:

- cellular transmit peak current;
- pulse duration / repetition;
- battery internal resistance / supplier pulse capability;
- protection-circuit limits;
- connector/contact resistance where relevant;
- low-state-of-charge and low-temperature cases.

Measure or simulate:
- battery-side droop;
- regulator input droop;
- 3.3 V / relevant rail droop;
- brownout/reset margin.

A capacity value in mAh is not peak-current evidence.

### 4.4 PDN integrity

Exercise the credible worst simultaneous activity set, including where applicable:

- cellular TX;
- GNSS;
- BLE;
- IMU acquisition;
- microphone acquisition;
- flash/storage activity.

Record:
- rail min/max;
- transient droop;
- startup behaviour;
- reset/brownout events;
- regulator thermal behaviour;
- measurement bandwidth/setup.

The review must state which simultaneous-load case is considered worst and why.

### 4.5 RF keep-outs and coexistence

For each radio/antenna:

- identify antenna;
- frequency bands;
- matching network state;
- required keep-out;
- ground/clearance requirements;
- proximity to battery, metal, charging contacts, microphone path and enclosure features;
- coexistence/coupling risks.

The real PCB/enclosure geometry must be reviewed. A datasheet keep-out copied into prose is not closure.

### 4.6 Antenna performance under body loading

Free-space RF performance is insufficient for the wearable use case.

Plan/record measurements with:
- final/candidate enclosure;
- intended attachment orientation;
- dog-body-equivalent dielectric loading or controlled animal-equivalent fixture where appropriate;
- repeatable position.

Evidence should include, as available:
- return loss / matching change;
- efficiency or proxy;
- RSSI/link-margin behaviour;
- cellular attach/data success;
- BLE range/reliability;
- sensitivity to orientation/body distance.

Do not claim dog-worn RF validation from a benchtop antenna measurement alone.

### 4.7 GNSS

Test with candidate enclosure and body-loading context.

Record:
- cold/warm/hot-start condition;
- time to first fix;
- satellite count/quality where available;
- horizontal accuracy/error against known reference;
- loss/reacquisition behaviour;
- coexistence with cellular/BLE activity;
- orientation sensitivity.

No navigation-grade accuracy claim is implied.

### 4.8 Thermal / skin-contact temperature

Identify credible worst cases, including sustained/clustered radio activity and charging where relevant.

Measure:
- component hot spots;
- internal enclosure temperature;
- outer skin-contact surface temperature;
- ambient condition;
- duration to steady or peak state.

Any safety/comfort threshold must come from the applicable product/safety authority; this template does not invent one.

### 4.9 Acoustic path vs. sealing

The microphone/acoustic path and water/dust sealing must be reviewed together.

Record:
- microphone location;
- acoustic port geometry;
- membrane/mesh candidate;
- enclosure cavity;
- attenuation / frequency-response effect;
- wind/contact artefact;
- sealing method;
- contamination/cleaning sensitivity.

Required decision evidence:
- measured acoustic change with the actual candidate sealing path;
- explicit tradeoff if improved sealing degrades the required acoustic observation.

### 4.10 IP / sealing target

Record:
- intended ingress-protection target;
- exact enclosure revision;
- seams;
- ports;
- charging interface;
- buttons/openings;
- membrane;
- battery access.

The target must remain `CANDIDAT` until demonstrated on the real enclosure by an appropriate method.

Do not write `IP67` as a product fact merely because it is the design ambition.

### 4.11 Charging architecture

Record candidate:

- pogo/contact charging;
- magnetic contacts;
- inductive charging;
- removable-cell charging;
- other.

For the selected candidate evaluate:
- sealing impact;
- corrosion/contamination;
- contact wear;
- misalignment;
- short-circuit protection;
- temperature during charge;
- charger/current limits;
- user handling;
- mechanical keep-outs;
- factory/service test access.

Charging cannot be frozen independently of enclosure/sealing.

### 4.12 Battery removability / serviceability

This is an engineering + safety + regulatory decision, not a layout convenience.

Record:
- whether the candidate battery is user-removable, service-removable or sealed;
- enclosure consequence;
- seal-restoration method;
- replacement process;
- identity/traceability implications;
- transport/service implications;
- external regulatory/legal review status.

No legal conclusion is created by this document.

### 4.13 Comfort / wearability

Record candidate:
- total mass;
- external dimensions;
- attachment method;
- contact areas;
- center of mass;
- protrusions/edges;
- intended dog size range;
- orientation stability;
- expected motion/slip;
- cleaning burden.

Bench geometry is not dog-acceptance evidence.

Controlled wearability work should later capture:
- fit;
- movement;
- interference with normal behaviour;
- slip/orientation;
- user handling;
- visible discomfort/refusal;
- duration tolerated.

## 5. Device Trust coupling

#66 remains separate but must be reviewed before hardware freeze where physical consequences exist.

The feasibility review must expose space/interfaces for the chosen trust architecture, including where applicable:

- manufacturing credential storage;
- secure boot / root-of-trust implementation;
- debug/programming interface control;
- key provisioning;
- recovery interface;
- signed OTA / anti-rollback storage requirements.

This document does **not** select a secure element or credential architecture. It only forbids a physical freeze that leaves no room for the security architecture once chosen.

## 6. Supplier-review questions

For MOKO or another engineering partner, ask each response to distinguish:

- **can do in-house**;
- **requires external lab/subcontractor**;
- **requires EMOPET input first**;
- **not currently quotable**.

For every cost/range request:
- state assumptions;
- state whether price is NRE, fixture, test service, prototype material or recurring unit cost;
- state lead-time impact;
- state whether a later design revision would invalidate the quote.

## 7. Evidence package structure

Preferred review evidence structure:

```text
TAG_FEASIBILITY_<review-id>/
├── 00_MANIFEST/
├── 01_3D_PACKING/
├── 02_POWER_BATTERY_PDN/
├── 03_RF_ANTENNA_COEXISTENCE/
├── 04_GNSS/
├── 05_THERMAL/
├── 06_ACOUSTIC_SEALING/
├── 07_CHARGING_SERVICEABILITY/
├── 08_WEARABILITY/
├── 09_DEVICE_TRUST_PHYSICAL_DEPENDENCIES/
├── 10_FAILURES_DEVIATIONS/
└── 11_DISPOSITION/
```

Each evidence artifact must identify the exact hardware/enclosure revision it applies to.

## 8. Freeze gate

Routing/fabrication freeze is not allowed merely because every row has a proposed answer.

Minimum gate before controlled prototype routing freeze:

- 3D packing: at least `DÉCIDÉ` for the candidate prototype;
- battery + peak current + PDN: numerical analysis exists and no unresolved brownout-class blocker is hidden;
- RF keep-outs: represented in actual candidate layout;
- antenna/GNSS test method: defined;
- charging + sealing + acoustic architecture: mutually compatible candidate exists;
- thermal/wearability test method: defined;
- Device Trust physical dependencies: space/interfaces reserved or explicitly accepted as no-extra-hardware by the relevant security/firmware authority;
- all remaining unknowns are visible with owners.

For **production** freeze, the evidence burden is higher: bench/body/enclosure testing must be completed to the maturity required by #480.

## 9. Review record template

| Domain | Current assumption | Evidence required | Result | Maturity | Coupled blocker | Owner / next action |
|---|---|---|---|---|---|---|
| 3D packing | TBD | real volumetric layout | NOT RUN | OUVERT | TBD | TBD |
| Battery energy | TBD | duty-cycle model + measurement | NOT RUN | OUVERT | TBD | TBD |
| Peak current | TBD | cellular peak vs cell/PDN | NOT RUN | OUVERT | TBD | TBD |
| PDN | TBD | worst simultaneous-load rails | NOT RUN | OUVERT | TBD | TBD |
| RF keep-outs | TBD | actual layout review | NOT RUN | OUVERT | TBD | TBD |
| Antenna/body load | TBD | body-equivalent measurement | NOT RUN | OUVERT | TBD | TBD |
| GNSS | TBD | enclosure/body TTFF + accuracy | NOT RUN | OUVERT | TBD | TBD |
| Thermal | TBD | sustained-load surface temperature | NOT RUN | OUVERT | TBD | TBD |
| Acoustic/sealing | TBD | measured sealed-path impact | NOT RUN | OUVERT | TBD | TBD |
| IP/sealing | TBD | target + real enclosure evidence | NOT RUN | OUVERT | TBD | TBD |
| Charging | TBD | mechanism + seal/thermal/contact review | NOT RUN | OUVERT | TBD | TBD |
| Battery serviceability | TBD | mechanical/safety/regulatory review | NOT RUN | OUVERT | TBD | TBD |
| Wearability | TBD | mass/fit/attachment + later body evidence | NOT RUN | OUVERT | TBD | TBD |
| Device Trust physical deps | TBD | key/boot/provisioning interface review | NOT RUN | OUVERT | TBD | TBD |

## 10. Current disposition

As of 2026-09-22:

- supplier engineering review package has been sent;
- no physical TAG evidence is recorded by this template yet;
- no routing/fabrication freeze is authorized here.

`G-TAG-COMBINED-PHYSICAL-FEASIBILITY-01 = REVIEW_READY / EVIDENCE_PENDING / FREEZE_NOT_AUTHORIZED`
