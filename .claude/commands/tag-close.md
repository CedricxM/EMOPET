---
description: Close evidence-backed TAG schematic/ERC blockers without inventing RF, battery or mechanical decisions
---

# /tag-close

You are executing EMOPET TAG electrical closure under issue #492.

This command is a **bounded ECAD closure workflow**. It may close deterministic schematic/ERC items supported by authoritative component documentation and current EMOPET design intent. It must not turn an electrically clean schematic into a claim of RF, battery, mechanical, acoustic or physical validation.

## 0. Read authority first

Read, in this order:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/hardware/tag/TAG_ELECTRICAL_CLOSURE_2026-09-22.md`
4. the current TAG blocker CSV / ERC report found beside the KiCad project

If any instruction conflicts with a controlled current source, stop and report the conflict.

## 1. Locate the controlled TAG workspace

Search the current workspace and any explicitly added Claude Code directories for:

- `*.kicad_pro`
- `*.kicad_sch`
- `*.kicad_pcb`
- `EMOPET_TAG_OPEN_BLOCKERS.csv`
- `ERC*.rpt`

Prefer the package whose schematic is named like:
`EMOPET_TAG_REV_B_SCHEMATIC_CAPTURE_STARTER.kicad_sch`.

If the KiCad sources are absent, **STOP**. Do not fabricate a substitute inside this software repository. Report that the TAG package must be copied into the workspace or supplied through an added working directory.

If multiple plausible TAG projects exist, ask which one is current rather than choosing by filename age.

## 2. Preflight and preservation

Before editing:

- record the exact source paths, hashes and Git status if applicable;
- preserve the original files or work on a new branch/revision;
- read the current ERC and blocker register;
- inspect all relevant symbols/pin numbers before changing nets;
- run `kicad-cli --version` if available;
- inspect `kicad-cli sch erc --help` and `kicad-cli pcb drc --help` before constructing commands because CLI syntax can differ by KiCad version.

If `kicad-cli` is unavailable, edits may be prepared as a **candidate patch only**. Never claim native ERC/DRC closure.

## 3. Allowed deterministic Phase-0 closures

Only apply an item when the actual symbol pin names/numbers match the expected component documentation. If they do not match, stop that item and record the mismatch.

### E1 — BQ25185

- STAT1 / STAT2 may be explicit no-connect when unused.
- CE must not float.
- For the Phase-0 simple always-charge candidate, strap CE low to enable charging.
- Do not alter ISET/ILIM programming values without separate authority.

### E2 — BMI270 in primary I2C mode, no secondary/OIS

- SDO/SA0 -> GND for default I2C address.
- CSB -> VDDIO.
- INT2 -> explicit NC when unused.
- ASDx / ASCx -> explicit NC when the secondary interface is unused.
- OCSB / OSDO -> explicit NC when OIS is unused.
- Preserve local VDD/VDDIO decoupling.
- Fix power-driver ERC with correct rail semantics / PWR_FLAG only where the rail is truly sourced.

### E3 — TPS63900 always-on 3.3 V rail

- EN must not float.
- Existing EMOPET capture intent treats this as the always-on 3.3 V rail; strap EN high to the appropriate live input/control rail for this Phase-0 candidate.
- Keep SEL/CFG straps explicit.

### E4 — INMP441 simple Phase-0 closure

- L/R -> GND for left-channel selection unless current firmware explicitly requires another I2S slot.
- CHIPEN -> VDD for always-enabled microphone operation while the microphone rail is powered.
- Verify the 100 kOhm SD pulldown and local 100 nF bypass.
- Do not infer acoustic-port or membrane design from these electrical straps.

### E5 — MS88SF3 to nRF9151 host UART

Before wiring, search all current sources for conflicts with nRF9151 P0.00/P0.01.

If no controlled conflict exists:
- MS88SF3 UART_TX -> nRF9151 RXD on P0.00.
- MS88SF3 UART_RX <- nRF9151 TXD on P0.01.

Record the required firmware PSEL mapping beside the schematic change.

If either GPIO is already controlled for another function, stop and reconcile. Never silently choose a new pair.

### E6 — power/ERC semantics

After the wiring changes, classify every remaining `power input not driven` finding.

Use PWR_FLAG only for a rail that is genuinely sourced by the design. Never use a flag merely to make ERC green.

### E7 — MS88SF3 footprint

The current Minew module documentation contains a mechanical drawing, recommended perimeter pad dimensions, centre GND pad dimensions, pin map and antenna-layout guidance.

You may implement or repair the footprint only if the authoritative drawing available in the workspace contains enough exact geometry to reproduce:
- every pad coordinate;
- pad number;
- pad size;
- centre GND;
- module outline/origin;
- antenna keep-out / no-copper region.

If any coordinate/pitch/origin is ambiguous, leave B01 OPEN and report the missing dimension. Do not trace a screenshot by eye.

## 4. Explicitly forbidden auto-closures

Do NOT invent or mark closed:

- nRF9151 LTE-M/NB-IoT/GNSS antenna topology;
- RF matching values;
- SIM/eSIM architecture;
- antenna/body-detuning performance;
- controlled 50-ohm geometry before stack-up + topology authority;
- exact battery suitability or pulse-current margin;
- nRF9151 burst-droop proof;
- pogo pitch/compression/enclosure datum;
- microphone port/membrane/sealing;
- IP rating;
- thermal/skin-contact validation;
- production passive substitutions without exact MFR+MPN and value/voltage/tolerance authority;
- any #480 physical-feasibility row.

No routing freeze is authorized by this command.

## 5. Verification

After edits:

1. save the schematic without moving unrelated symbols;
2. run fresh native ERC if `kicad-cli` exists;
3. run DRC only to detect accidental PCB/source corruption; do not claim routing readiness from a placement-study PCB;
4. compare new ERC findings with the original report;
5. inspect the diff for accidental pin renumbering, net rename or library mutation;
6. update the blocker matrix with:
   - prior state;
   - new state;
   - exact evidence/source;
   - remaining dependency;
7. produce `TAG_ELECTRICAL_CLOSURE_REPORT.md` beside the KiCad project.

The report must state separately:
- deterministic items closed;
- items reduced but still open;
- items untouched;
- native ERC/DRC status;
- whether `kicad-cli` actually ran;
- physical-validation non-claims.

## 6. Stop condition

Stop before routing.

Final line must be one of:

- `TAG_ELECTRICAL_CLOSURE = CANDIDATE_PATCH_ONLY / NATIVE_KICAD_NOT_RUN`
- `TAG_ELECTRICAL_CLOSURE = ERC_REDUCED / ROUTING_BLOCKERS_REMAIN`
- `TAG_ELECTRICAL_CLOSURE = ELECTRICALLY_READY_FOR_ROUTING_REVIEW / PHYSICAL_GATE_#480_OPEN`

Never output `FABRICATION_READY` from this command.
