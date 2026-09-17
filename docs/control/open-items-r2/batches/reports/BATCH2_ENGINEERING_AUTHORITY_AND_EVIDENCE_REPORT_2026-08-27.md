# Batch 2 engineering authority and evidence reconciliation report

| Field | Value |
|---|---|
| Document ID | BATCH2-RECON-001 |
| Revision | 1.0 |
| Date | 2026-08-27 |
| Status | PASS_WITH_NOTES — AUTHORITY / EVIDENCE RECONCILED / NOT RELEASED |
| Classification | INTERNAL CONTROLLED |
| Visual authority | BRAND-AUTHORITY-001 — no visual conversion performed |
| Mass conversion | BLOCKED — OPEN-DOC-005 |

## Executive result

The 188 rows initially routed to Batch 2 have been reconciled at document/source level without modifying any source file.

| Controlled route | Rows |
|---|---:|
| Batch 2 — current engineering authority/source/evidence | 138 |
| Batch 8 — historical MOKO r1.4 lineage | 45 |
| Batch 6 — legal/corporate | 3 |
| Batch 4 — software/data/cyber | 2 |
| Total | 188 |

This pass records authority, maturity, evidence role, limitations and supersessions. It closes no engineering, Product, physical-validation, typography, transmission, manufacturing or release gate.

## Current MAT authority

- `ENG-003` remains the canonical current engineering register within its stated scope.
- `MAT_CURRENT_STATE_RevA2R1` reconciles the current component/status layer: PCA10056/nRF52840 DK, ADS131M04 and ADS1261 are the controlled Phase 0 baselines; ADS1220 remains an alternative.
- ADA4530-1 remains a preferred candidate / `TO VALIDATE`, not a selected or validated AFE.
- Approximately 1.35 V remains a VBIAS candidate with 1.25 V retained as an alternative; neither is promoted to production status.
- `EMOPET_MAT_Phase0_Schematic_Capture_Package_RevA` is partially superseded for ADS1220/ADA4530/VBIAS status and must not be silently rewritten.

The [Texas Instruments ADS1261 page](https://www.ti.com/product/ADS1261), [ADS1220 page](https://www.ti.com/product/ADS1220) and [Analog Devices ADA4530-1 page](https://www.analog.com/en/products/ada4530-1.html) confirm current manufacturer product/source characteristics only. They do not create EMOPET selections or close system-level validation.

## ECAD and manufacturing boundary

Static ECAD reconciliation remains valid within its measured scope. O-041 remains `PARTIAL — STATIC PASS`; native KiCad open/refill/DRC/cross-plot/connectivity/footprint review and reviewer sign-off remain required.

No Gerber or manufacturing release is authorized. RFQ, CAD, repository, static-validation or source-availability status cannot be promoted to manufacturing evidence.

## MAT Controller v0.4 provenance

The immutable v0.4 archive was independently checked:

| Check | Result |
|---|---:|
| Archive SHA-256 | `9f72ced4015c593fab62ebcd7d5e852465f7733bd097c183053b8e601707d1e4` |
| Actual file members | 84 |
| Extracted file members | 84 |
| Byte-identical member matches | 84 / 84 PASS |
| Internal SHA controls | PASS |

This establishes lineage only. v0.4 software/document/synthetic verification remains historical evidence. It does not establish physical validation, current component authority, Gerber readiness or manufacturing release. Its nRF5340 / ADS131M08 / ADS1234 candidate wording is superseded for current Phase 0 status.

## TAG authority and evidence

Autonomous TAG position acquisition for V1 recovery remains **REQUIRED — CONTROLLED**. Exact GNSS/module, antenna, provider and implementation remain open.

- Nordic's [nRF9151 specification](https://docs.nordicsemi.com/r/bundle/ps_nrf9151) is a current manufacturer source for candidate/power modelling only.
- u-blox's [MAX-M10 series page](https://www.u-blox.com/en/product/max-m10-series) confirms MAX-M10S as a current candidate-family member only.
- No battery is selected.
- EEMB's [LP602030HA page](https://www.eemb.com/product-249) confirms 3.7 V, 260 mAh typical, 230 mAh minimum and a 10C classification. Exact controlled continuous/pulse-current, protection, lot and measured system-load evidence remains unavailable; selection and autonomy remain open.
- Phase 2 matrices and sensitivity work remain parametric. The autonomy, IP67, mass, RF, thermal and wear documents are plans/targets, not passed tests.

## Scoped supersessions

Four scoped supersession records were added:

1. `SUPR-018` — MAT Controller v0.4 candidate baseline → current Phase 0 status;
2. `SUPR-019` — MAT RevA schematic input ADC/AFE/VBIAS wording → reconciled current status;
3. `SUPR-020` — optional/local-only GNSS wording → controlled V1 autonomous-position requirement, implementation open;
4. `SUPR-021` — generic 602030 quantitative wording → no battery selected / exact evidence required.

Every historical/source file remains immutable and traceable.

## Open gates

Two documentary/evidence gates were added and remain open:

- `OPEN-DOC-007` — current-engineering source consolidation/reissue;
- `OPEN-VAL-B2-001` — physical-validation evidence closure.

`OPEN-DOC-005`, component-selection, Product, transmission, manufacturing and typography-publication gates remain open or blocked exactly as before.

## Conclusion

**PASS_WITH_NOTES — 188/188 SOURCE ROWS RECONCILED / 138 ENGINEERING ROWS RETAINED / 50 ROWS REROUTED / ZERO GATES CLOSED / NOT RELEASED**
