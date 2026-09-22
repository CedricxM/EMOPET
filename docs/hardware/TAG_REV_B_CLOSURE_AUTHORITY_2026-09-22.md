# EMOPET TAG Rev-B — source-backed closure authority — 22 September 2026

**Status:** CONTROLLED ENGINEERING CANDIDATE / NOT FABRICATION RELEASE  
**Owner gate:** #480 `TAG-FEASIBILITY-01`

## Purpose

Reconcile the TAG Rev-B package after MOKO clarified that its Phase-0 role is fabrication and test execution from EMOPET design files, not schematic/RF/power/mechanical design ownership.

This record separates blockers that are stale or electrically decidable from blockers that still require physical, RF, mechanical, battery or fabricator evidence.

## Source-backed electrical closures available now

### MS88SF3

The controlled Rev-B changeset already supplies the normal-voltage power mode and the GPIO-to-module-pad allocation. The older supplier workbook sentence saying the physical GPIO mapping is unavailable is stale against that changeset and the recovered Minew pin-definition source.

The current candidate is:

- VDD pad 31 + VDDH pad 32 -> `3V3_CANDIDATE`;
- P0.05 / pad 15 -> NTC excitation;
- P0.06 / pad 21 -> host UART TX;
- P0.08 / pad 26 -> host UART RX;
- P0.07 / pad 20 -> nRF9151 main-VDD gate;
- P0.17 / pad 41 -> nRF9151 VDD_GPIO gate.

Independent production land-pattern dimension/pad QA is still required before fabrication.

### NTC excitation

The Rev-B changeset allocates P0.05 to `NTC_EXCITE`, and the BOM describes RT1/R10/C16 as a duty-cycled MS88SF3-GPIO divider. The schematic no longer needs to preserve the R10-top/P0.05 logical connection as unknown.

No extra transistor is authorised by the current evidence.

### Host UART

Logical direction is closed:

- MS88 P0.06 TX -> nRF9151 RXD;
- nRF9151 TXD -> MS88 P0.08 RX.

Nordic UARTE permits RX/TX selection from GPIOs, so the exact nRF9151 P0.xx choice belongs to the final nRF9151 pin budget/layout rather than being a fixed-function pin recovery problem.

This closes the **direction** question, not the full nRF9151 physical-symbol/RF gate.

### BMI270

The architecture already selects primary I2C. For the current candidate:

- CSB -> VDDIO;
- SDO -> GND, selecting default I2C address 0x68;
- INT1 remains the used interrupt;
- INT2 may remain DNC;
- unused auxiliary/OIS pins may remain DNC.

This converts several current ERC findings from “open architecture” into explicit manufacturer-supported dispositions.

### INMP441

For the single-microphone Phase-0 candidate:

- `L/R -> GND` selects the left I2S channel;
- `CHIPEN -> VDD` keeps the device enabled for bring-up;
- the reserved R4 role should be reconciled as the 100 kΩ SD pull-down recommended by the microphone application connection.

The mechanical acoustic port/membrane/sealing stack remains open even after the electrical pins are closed.

### BQ25185

For the current standalone Phase-0 charger candidate:

- `/CE -> GND` means charging enabled;
- STAT1 and STAT2 are open-drain status outputs and may be explicitly unused/NC.

The battery TS/NTC network still requires its final thermal/mechanical implementation evidence.

### TPS63900

The project calls TPS63900 the always-on 3.3 V rail. Its EN input therefore cannot remain floating. The current candidate is `EN -> VIN`, subject to normal schematic review.

### Charging bridge interface

BR1 DNC is an explicit NC. BR1 AC1/AC2 can connect to a logical two-contact `CHARGE_IN` interface while the actual pogo footprint, target pads, pitch, compression, enclosure datum and sealing remain mechanically open.

## Blocker state after this reconciliation

| Blocker | Current state | Why |
|---|---|---|
| B01 MS88SF3 land pattern | PARTIAL | pad/pin source recovered; independent production land-pattern QA still required |
| B02 nRF9151 RF/SIM/eSIM | OPEN | antenna/matching/SIM/eSIM/keep-outs/radiated validation still physical/RF work |
| B03 battery pack/droop | PARTIAL | LP501622HA is a credible Phase-0 candidate; pack/PCM and measured droop remain open |
| B04 pogo/enclosure | OPEN | logical charge interface can close; mechanical geometry/sealing cannot |
| B05 microphone acoustic stack | OPEN | electrical microphone straps can close; acoustic/mechanical validation cannot |
| B06 controlled 50-ohm geometry | OPEN | requires chosen antenna topology + real fabricator stack-up |
| B07 UART reconciliation | PARTIAL -> logical CLOSED | host direction is known; exact nRF9151 GPIO assignment remains final pin-budget work |
| B08 production passive MPNs | OPEN | exact production MPN freeze still required |
| B09 native ERC | EXECUTED | native ERC already ran; remaining findings must now be reduced/reclassified from the decisions above |

## Routing gate

**ROUTING REMAINS PROHIBITED.**

Electrical cleanup is worthwhile, but it does not supersede #480. Routing freeze still requires at minimum the production MS88 footprint QA, nRF9151 RF/SIM/antenna plan, battery/droop evidence, pogo/enclosure datum, acoustic/mechanical stack and final fabricator impedance information.

## Claude Code workflow

The repository previously had no project `.claude/` workflow for this task. A manual skill is introduced with this record as `/tag-close`.

The skill is intentionally forbidden from inventing physical evidence. It may reconcile source-backed KiCad/BOM/ERC decisions and automate consistency work, but it must leave RF, battery measurements, enclosure/acoustics and fabricator-dependent geometry open until evidence exists.
