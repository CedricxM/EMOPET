---
name: tag-close
description: Close EMOPET TAG electrical/design blockers from controlled evidence without inventing hardware decisions or bypassing KiCad/bench gates.
---

# TAG closure workflow

Use this skill when working on EMOPET TAG Phase 0 / Rev-B-or-later hardware closure.

## Goal

Reduce the TAG blocker set using controlled repository/filesystem evidence and authoritative component documentation. Implement reversible, evidence-backed electrical closures. Never convert an unresolved physical, RF, mechanical, regulatory, supplier, or bench requirement into a fabricated design fact.

## Required inputs

Locate the current copies of, when available:

- `EMOPET_TAG_OPEN_BLOCKERS.csv`
- `EMOPET_TAG_AUTHORITATIVE_CAPTURE_PLAN.csv`
- `EMOPET_TAG_COMPONENT_CAPTURE_MATRIX.csv`
- current `*.kicad_sch`, `*.kicad_pcb`, local symbol/footprint libraries and project files
- latest native `ERC.rpt` / DRC reports
- current TAG BOM
- current engineering-candidate / change-set / source-evidence files

If multiple versions exist, identify the newest controlled source and do not silently merge contradictory versions.

## Authority rules

1. Prefer an existing controlled EMOPET decision over historical source material.
2. Prefer official manufacturer documentation for component pin/function facts.
3. A datasheet may close a component-connection question; it does not close a Product, RF, mechanical, regulatory, thermal, battery-pack, enclosure, dog-body-loading, or bench-validation decision.
4. Do not add No-Connect markers merely to make ERC green. Add them only when the official component documentation explicitly permits DNC / floating and the EMOPET architecture intentionally does not use the function.
5. Do not invent RF matching values, antenna geometry, controlled-impedance widths, battery pulse performance, acoustic sealing performance, pogo coordinates, enclosure datums, or measured results.
6. Do not route or release fabrication files while a routing/fabrication blocker remains.
7. Never treat a generated Gerber/Drill/PnP file as authority when the design gate says HOLD / NOT FOR FABRICATION.

## Current evidence-backed closures to verify/apply

When still applicable to the current schematic revision:

- BMI270 in I2C mode:
  - SDO/ADDR -> GND for default address;
  - CSB -> VDDIO;
  - unused INT2 may be DNC;
  - unused ASDx/ASCx may be DNC or VDDIO, never GND;
  - unused OCSB/OSDO may be DNC when the OIS interface remains disabled.
- INMP441:
  - choose and record one channel; default EMOPET Phase-0 choice is LEFT, so L/R -> GND;
  - CHIPEN -> VDD for always-enabled Phase-0 capture;
  - include the datasheet-required 100 kΩ pulldown on SD unless a later controlled implementation supersedes it.
- TPS63900:
  - if the rail remains the selected always-on 3V3 candidate, EN may be tied directly to VIN; record this as the explicit design disposition;
  - RCFG3 = 16.2 kΩ is the TI table value for 3.3 V when SEL is low;
  - RCFG1 = 36.5 kΩ gives 3.3 V when SEL is high, and RCFG2 = 0 Ω selects the unlimited input-current setting;
  - treat those values as electrically verified; exact production MPNs still require the configured tolerance/tempco constraints.
- BQ25185:
  - STAT1/STAT2 may be DNC when unused;
  - /CE -> GND for always-enabled charging unless a later controlled requirement needs MCU control;
  - NTCSC0402E3103FLFT is 10 kΩ, B25/85=3435 K and may connect directly to TS/MR for the charger temperature function;
  - RISET = 3.0 kΩ gives approximately 100 mA fast-charge current from the TI programming equation;
  - RILIM/VSET = 24 kΩ selects 4.2 V battery regulation and 100 mA input-current limit;
  - those programming values are closed unless the battery/charge requirement changes; exact resistor MPNs remain a sourcing item.
- TAG local NTC measurement:
  - the current BOM already states RT1/R10/C16 use a duty-cycled MS88SF3 GPIO; a direct GPIO-driven divider is acceptable only after confirming the exact current/current-limit and ADC acquisition assumptions. Do not invent a MOSFET solely because an older blocker said “gate”.
- nRF9151 host UART:
  - UARTE pins are software-remappable through PSEL;
  - if no later authority conflicts, reserve nRF9151 P0.00 as RXD from MS88 P0.06/TX and P0.01 as TXD to MS88 P0.08/RX;
  - record the corresponding firmware PSEL obligation.
- Native ERC already executed:
  - if the latest controlled report is the 2026-09-21 KiCad-10 report with 25 errors + 1 warning, the old “no native ERC” blocker is stale and must be marked closed/replaced by the specific remaining findings.

## Physical / measured gates that MUST stay open until evidence exists

Keep these open unless the required evidence is actually present:

- MS88SF3 fabrication footprint independent land-pattern QA;
- nRF9151 LTE/GNSS antenna selection, matching and body/enclosure detuning;
- SIM/eSIM implementation and provisioning path;
- controlled 50-ohm geometry from the final fabricator stack;
- production protected battery pack and measured VDD droop under cellular bursts;
- effective capacitance / inrush measurements on the real PDN;
- final pogo target geometry, pitch, compression and enclosure datum;
- microphone port/membrane/sealing performance;
- full 3D packing, thermal, GNSS and RF physical validation;
- final production passive MPN freeze where no controlled selection exists;
- native KiCad ERC/DRC after every material schematic/layout change.

## Execution sequence

1. Inventory current files and hashes.
2. Reconcile blocker registry against the newest ERC/DRC and design records. Close stale blockers only with evidence.
3. Build a table: blocker -> authority -> proposed closure -> evidence -> change -> verification -> residual risk.
4. Apply only evidence-backed schematic/BOM edits.
5. Run structural sanity checks on KiCad text files.
6. If `kicad-cli` is available:
   - run native ERC;
   - run DRC only if a routed board exists and routing is authorized.
7. If `kicad-cli` is unavailable:
   - do not claim ERC/DRC PASS;
   - emit `NATIVE_KICAD_VERIFICATION_REQUIRED.md` with exact commands/GUI checks required.
8. Never fabricate missing RF/mechanical/battery data just to reduce the blocker count.
9. Update the blocker registry with explicit states: CLOSED, CLOSED_ELECTRICAL_PENDING_NATIVE_VERIFY, OPEN_PHYSICAL, OPEN_BENCH, OPEN_PRODUCT_DECISION, OPEN_REGULATORY.
10. Produce a concise closure receipt including changed files, unresolved blockers, and the next single highest-value action.

## Stop conditions

Stop rather than guess when:
- an RF matching value or antenna placement needs simulation/measurement;
- a battery-pack pulse/droop claim needs real hardware;
- an enclosure datum or acoustic stack is not controlled;
- a regulatory classification changes mechanical architecture;
- source files are stale or inconsistent with the latest ERC report;
- native KiCad validation is required but unavailable.

The objective is fewer *real* blockers, not a greener-looking report.
