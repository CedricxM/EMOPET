# EMOPET — Supplier & Sourcing Lineage — June–September 2026

**Audit date:** 2026-09-07  
**Status:** `CONTROLLED MEMORY / HISTORICAL QUOTES RECONCILED WITH CURRENT WORKSTREAM`  
**Scope:** supplier history, quote provenance and supersession only. This file does not select a supplier or freeze production sourcing.

## Purpose

EMOPET accumulated several real supplier contacts, sample prices and working-chain hypotheses before the current MOKO Phase 0 review. Those records are useful evidence, but they must not be mistaken for the current industrial authority.

This record separates:

1. historical supplier evidence;
2. historical working-chain decisions;
3. current supplier-review status;
4. what may and may not be reused in current costing or external claims.

## 1. Historical June/July supplier evidence

The June/July sourcing corpus contains genuine supplier contacts and several price points.

Examples preserved in the controlled ClickUp BOM review (`869dvjx9u`) include:

### TAG candidates

- Wiliyoung / Jeff — candidate LiPo 602030, 3.7 V, 300 mAh: historical quoted figure **0.45 USD/pc**; configuration details such as PCM, connector, polarity, wire length and battery shipping were still open.
- Minewsemi / Dustin — nRF52840 module candidate: price not yet received in the recorded snapshot.
- BMI270 — candidate IMU: final price not received in the recorded snapshot.
- INMP441 — candidate microphone: final price not received in the recorded snapshot.
- Quectel L76K — optional GPS candidate: final price not received in the recorded snapshot.
- TAG enclosure: no controlled final custom price in that snapshot.

### MAT candidates

- Maxrays / Zhaoruixin — TS-PC2602 piezoelectric coaxial cable: historical sample path recorded at **15 USD/m**, 5 m sample need, approximately **40 USD shipping**, for an expected sample operation around **115 USD**.
- Shenzhen Zhicheng / Wilson — BME280: historical figures of **4.00 USD/pc for 10 samples**, then approximately **3.60 / 3.40 / 3.25 USD** at higher quantity tiers; the record already flagged a discrepancy versus much lower listing prices.
- Catherine — NTC 10K B3950: sample material free in the recorded exchange, direct-France shipping approximately **36.9 USD**, and historical 1000-piece pricing around **0.07 USD/pc at 100 mm** and **0.08 USD/pc at 150 mm**.
- Helen Su — ABS/PC sheet candidate: historical range **3.8–9.0 USD/pc** depending on material/thickness, with drilling around **+1.5 USD/pc**.
- Yz-Link — generic FFC/FPC listing around **0.30 USD**, explicitly **not** a final EMOPET custom quotation.
- Load cells / weighing board: final controlled price not yet received in that snapshot.
- Landztop PCBA: fabrication capability was discussed, but no final controlled MAT/TAG PCBA quote was recorded in that snapshot.

### Interpretation

These are **historical supplier evidence**, not current production COGS.

They may be used to reconstruct what was known at the time, but current costing must revalidate at least configuration, quantity, incoterm, shipping, duties/tax, NRE/setup, test fixture, programming, calibration, yield/rework and actual assembly scope.

## 2. Historical working chain

A July working strategy proposed a segmented chain rather than one supplier owning the entire product:

`component suppliers → Yz-Link for harness/connectivity if qualified → Landztop for PCBA/integration if qualified → tested subassemblies → ESAT France for final assembly/control/packaging`

The related records explicitly said:

- no supplier should become an uncontrolled “chief supplier”;
- each supplier should stay inside a defined disclosure/work corridor;
- the ESAT should ideally receive subassemblies ready to place, connect, close, inspect and package;
- Yz-Link was a **candidate** harness/connectivity hub, not a validated hub;
- Landztop was retained only as a **candidate secondary fabrication/PCBA route**, especially because design-source ownership and document-return conditions were a concern.

### Status today

`HISTORICAL / PRIOR WORKING STRATEGY — SUPERSEDED AS ACTIVE INDUSTRIAL PATH`

The logic remains useful as an architectural sourcing principle, but the named chain must not be presented as current supplier selection.

## 3. Why old supplier quotes are not current BOM authority

The product architecture changed while the sourcing work progressed.

Examples include:

- MAT moved through raw-film / discrete LDT0-028K / coaxial-piezo branches;
- TAG physical envelope, battery direction and feature set changed;
- some historical components and voice/GPS assumptions are no longer current V1 authority;
- PCB, enclosure, RF, battery and detailed production configuration remain gated.

Therefore a supplier price can remain historically valid for the item that was discussed while being unusable as current COGS because the current item, configuration or scope is different.

**Quote provenance ≠ current BOM applicability.**

## 4. Current active industrial workstream — MOKO

The current controlled communications record identifies MOKO Technology / Alyson Tong as the supplier/EMS under active technical and commercial review.

The Phase 0 RFQ was sent with subject:

`EMOPET Phase 0 | MAT + TAG Engineering RFQ and Prototype Quotation`

Gmail message ID: `1a078c0bd460631b`.

The RFQ asks MOKO to review the MAT + TAG Phase 0 scope, blockers, engineering/NRE, prototype pricing assumptions, sourcing, DFM/DFA, testing capability, timing and commercial terms.

### Current evidence status at this audit point

- RFQ transmission: **PROVEN SENT**;
- supplier acknowledgement of that RFQ: **NOT PROVEN**;
- engineering/NRE quotation: **NOT PROVEN**;
- prototype/commercial quotation: **NOT PROVEN**;
- manufacturing/tooling release: **NOT AUTHORIZED**;
- final supplier selection: **NOT MADE**.

Preferred wording:

> MOKO is the supplier/EMS under technical and commercial review and has been sent the Phase 0 RFQ.

Do not upgrade that to “selected manufacturer”, “engaged engineering partner” or equivalent until later evidence supports it.

## 5. MOKO does not erase the historical supplier map

The earlier supplier work remains valuable for three reasons:

1. **benchmarking** — historic component/sample figures can flag implausible new quotes;
2. **fallbacks** — prior qualified or partially qualified contacts may be revisited if current scope requires an alternate route;
3. **supply-chain decomposition** — the earlier corridor-based model remains a useful control principle for IP, disclosure and second-source planning.

But revival requires a new review against the current architecture and legal/commercial gates.

## 6. Costing rule going forward

Current BOM/COGS work must classify every value by evidence status.

Recommended statuses:

- `CURRENT_QUOTE — CONFIGURATION MATCHED`
- `CURRENT_QUOTE — PARTIAL / ASSUMPTIONS OPEN`
- `HISTORICAL_QUOTE — SAME ITEM, REVALIDATION REQUIRED`
- `HISTORICAL_QUOTE — SUPERSEDED CONFIGURATION`
- `LISTING PRICE — NOT A QUOTE`
- `ESTIMATE / MODEL ASSUMPTION`
- `NO PRICE EVIDENCE`

No total current product COGS should silently combine values from incompatible architecture generations.

## 7. Hidden-cost doctrine retained

The July BOM review correctly identified cost categories that must remain explicit in any current industrial model:

- shipping by component family;
- regulated battery transport;
- third-party component receipt / hub fees;
- incoterms;
- VAT/duties;
- PCBA NRE/setup;
- stencil;
- test fixture;
- programming/flashing;
- calibration;
- cable termination;
- scrap/yield/rework;
- packaging;
- final-assembly labour, jigs and incoming/outgoing QA.

These categories survive architecture changes even when the old numerical values do not.

## 8. Closure status

The retrospective supplier-lineage task is **closed at the provenance/supersession level**.

What remains open is operational current sourcing:

- receive and evaluate MOKO acknowledgement/quotation;
- complete current CAD/R3 release gate;
- compare engineering/NRE/prototype scope on a like-for-like basis;
- refresh current BOM values only against current configuration;
- maintain alternates/second-source options where justified;
- preserve IP and source-file return requirements in any design/manufacturing engagement.

**Historical quote ≠ current COGS. Supplier conversation ≠ supplier selection. RFQ sent ≠ manufacturing release.**