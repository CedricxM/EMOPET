---
name: tag-close
description: Controlled EMOPET TAG Rev-B closure workflow for KiCad/electrical blockers. Use only when explicitly invoked.
disable-model-invocation: true
---

# EMOPET TAG Rev-B closure workflow

Goal: close every TAG blocker that can be closed from controlled evidence, while refusing to fabricate missing RF, mechanical, battery-test or manufacturing facts.

The user's text after `/tag-close` should identify the TAG working directory or task. If the KiCad working directory is outside the repository, ask the user to run `/add-dir <path>` or start Claude Code with `--add-dir <path>` before editing it.

## Authority order

1. Current TAG source files supplied by the user.
2. `EMOPET_TAG_REV_B_CHANGESET_2026-09-11.json`.
3. Current authoritative capture plan / pinmap / native ERC findings.
4. Manufacturer datasheets and official reference designs.
5. Current GitHub issue #480 and controlled repo records.

Never use old Flux fragments as authority when they conflict with the controlled Rev-B changeset.

## Known source-backed closures

Treat these as engineering decisions that may be implemented if the current files still match the cited evidence:

- MS88SF3 normal-voltage supply mode: VDD pad 31 + VDDH pad 32 -> 3V3_CANDIDATE.
- MS88SF3 GPIO/module-pad map from the Rev-B changeset:
  - SCL P0.26 / pad 17
  - SDA P0.27 / pad 14
  - BMI270_INT1 P0.13 / pad 39
  - I2S_SCK P0.14 / pad 30
  - I2S_WS P0.15 / pad 40
  - I2S_SD P0.16 / pad 29
  - NTC_ADC P0.04/AIN2 / pad 16
  - NTC_EXCITE P0.05/AIN3 / pad 15
  - UART_TX P0.06 / pad 21
  - UART_RX P0.08 / pad 26
  - nRF9151 MAIN_PWR_EN P0.07 / pad 20
  - nRF9151 GPIO_PWR_EN P0.17 / pad 41
  - SWDIO pad 49, SWCLK pad 50.
- NTC excitation is direct GPIO-gated from MS88 P0.05 to the R10 divider top. Do not invent a transistor unless a newer authority requires one.
- nRF9151 split VDD/VDD_GPIO sequencing and U12/U13 load-switch network come from the controlled changeset.
- nRF9151 UART logical direction:
  - MS88 P0.06 TX -> nRF9151 RXD
  - nRF9151 TXD -> MS88 P0.08 RX
  Exact nRF9151 GPIO selection is a configurable PSEL/layout decision and must be assigned from the final nRF9151 pin budget, not guessed.
- BMI270 primary interface is I2C. For the current single-primary-interface candidate:
  - CSB -> VDDIO
  - SDO -> GND for default 0x68 address
  - INT1 used
  - INT2 DNC unless a newer requirement exists
  - unused auxiliary/OIS pins stay DNC.
- INMP441 single-microphone candidate:
  - L/R -> GND for left channel
  - CHIPEN -> VDD for always-enabled Phase-0 bring-up
  - retain/add the manufacturer-recommended 100 kΩ SD pull-down where the current design has R4 reserved for this role.
- BQ25185 Phase-0 standalone charging:
  - /CE -> GND for charging enabled
  - STAT1/STAT2 may be explicitly NC if not consumed; do not add fake status logic.
- TPS63900 is the selected always-on 3V3 rail:
  - EN must be driven high; tying EN to VIN is the default candidate unless a newer controlled power-state requirement supersedes it.
- BR1 DNC is explicit NC.
- The two bridge AC inputs may terminate on a logical 2-contact CHARGE_IN interface without freezing pogo pitch/pad/enclosure geometry.

## Do not pretend these are closed

The following remain physical/production gates until real evidence exists:

- LTE/GNSS antenna topology, matching, SIM/eSIM, RF keep-outs and radiated validation.
- Final 50-ohm geometry until a real fabricator stack-up + chosen antenna topology exist.
- Battery pack/PCM identity and measured droop/ESR across relevant SOC/temperature/age.
- Final pogo pad geometry, pitch, compression, sealing and enclosure datum.
- Microphone port/membrane/sealing mechanical stack and ingress/acoustic validation.
- Final enclosure fit / 3D packing / thermal / comfort.
- Production passive MPN freeze until exact MPNs are selected and reviewed.
- Routing freeze and manufacturing release until the blocking physical gates are closed.

## Execution workflow

1. Read the current schematic, PCB, local libraries, blocker CSV, changeset/pinmap, BOM and latest ERC report before editing.
2. Reconcile stale blockers against the controlled changeset and manufacturer datasheets.
3. Make only source-backed schematic/library/BOM changes.
4. Never add No-Connect flags merely to silence ERC. NC is allowed only when the manufacturer permits the pin to be unused and the project does not require it.
5. If KiCad CLI is installed, run native ERC after every electrical batch. If not installed, stop short of claiming ERC closure and produce an exact pending-validation diff.
6. Do not route while #480 physical blockers remain. A lower ERC count is not routing authority.
7. Preserve a rollback-safe copy before modifying KiCad files.
8. Produce/update:
   - blocker matrix with CLOSED / PARTIAL / OPEN and evidence;
   - ERC findings;
   - BOM/footprint status;
   - issue #480 evidence note;
   - a final list of items requiring physical lab/CAD/fabricator evidence.
9. Never claim manufacturing-ready unless native KiCad checks, footprint QA, RF/mechanical/battery gates and final review all pass.

## Expected result

Drive the electrical schematic as far toward source-backed closure as possible. Report a blocker as OPEN only when the missing evidence is genuinely external/physical, not because an older document failed to import a decision that a newer controlled source already contains.
