# EMOPET TAG Electrical Closure — 22 September 2026

**Status:** CONTROLLED ENGINEERING CLOSURE PLAN / NOT FABRICATION RELEASE  
**Owner gate:** #492  
**Parent physical-feasibility gate:** #480  
**Supplier boundary:** EMOPET closes design; MOKO fabricates and executes agreed tests from released design files.

## 1. Why this record exists

The current TAG Rev-B source has advanced well beyond the early placement-only concept, but the supplier package still carries a native ERC result of **25 errors + 1 warning** and a blocker register that intentionally prevents routing/fabrication claims.

MOKO has now clarified that schematic closure, PCB layout/routing, RF/antenna, battery/power-path and mechanical/acoustic design are outside its factory scope. Those responsibilities therefore remain with EMOPET or an explicitly engaged design bureau.

This record separates what can be closed now from what still requires engineering analysis or physical evidence.

## 2. Deterministic electrical closures now identified

| ID | Component/domain | Phase-0 closure candidate | Maturity after implementation |
|---|---|---|---|
| E1 | BQ25185 | STAT1/STAT2 explicit NC if unused; CE strapped low for simple always-charge prototype | implemented candidate, not bench-validated |
| E2 | BMI270 | primary I2C straps: SA0 low, CSB high; unused secondary/OIS/INT2 explicitly NC | implemented candidate, not bench-validated |
| E3 | TPS63900 | EN high for the currently intended always-on 3.3 V rail | implemented candidate, not bench-validated |
| E4 | INMP441 | L/R low = left channel; CHIPEN high while rail powered; verify SD pulldown + bypass | implemented candidate, acoustic stack still open |
| E5 | host UART | MS88SF3 TX -> nRF9151 RXD/P0.00; MS88SF3 RX <- nRF9151 TXD/P0.01, subject to conflict scan | implemented candidate + firmware mapping required |
| E6 | ERC power semantics | genuine sourced rails get correct power-driver/PWR_FLAG semantics | ECAD correctness only |
| E7 | MS88SF3 footprint | reconstruct from authoritative Minew mechanical/pin drawing and independent QA | OPEN until full geometry + QA complete |

These closures are deliberately narrow. They remove ambiguity where the component documentation and current EMOPET architecture already provide enough information.

## 3. Why these are reasonable bounded closures

### BQ25185
TI documents STAT1/STAT2 as open-drain status outputs that may remain unused. CE is an active control input and must not be left floating. For a Phase-0 board whose purpose is bring-up and measurement, always-enabled charging is the simplest explicit candidate; software charger-disable remains a later requirement if Product/Power promotes it.

### BMI270
Bosch documents the primary-I2C strapping and allows the unused secondary/OIS interrupt surfaces to remain disconnected under the applicable mode. This lets the schematic represent the intended interface instead of leaving mode-selection pins ambiguous.

### TPS63900
The regulator EN input cannot remain floating. The current capture matrix describes U11 as the always-on 3.3 V rail, so explicit enable is the coherent Phase-0 implementation.

### INMP441
The digital microphone requires an explicit L/R channel selection and CHIPEN state. A permanently selected left slot and CHIPEN high while the rail is active is sufficient for bring-up; this does not decide the enclosure acoustic path.

### nRF9151 UART
Nordic UARTE pin selection is software-configurable through PSEL. P0.00/P0.01 are therefore a simple dedicated pair when no controlled allocation conflicts with them. Firmware must mirror the schematic assignment.

## 4. Blockers that remain outside deterministic closure

### B01 — MS88SF3 footprint QA
The official Minew source now gives enough authority to start a real footprint instead of retaining a proxy. The footprint remains OPEN until every pad coordinate/number and the antenna keep-out are reproduced and independently reviewed.

### B02 / B06 — cellular/GNSS RF
Still OPEN:
- LTE/GNSS antenna topology;
- antenna selection;
- matching network;
- SIM/eSIM architecture;
- RF feed;
- stack-up-dependent 50-ohm geometry;
- real enclosure/body detuning.

An AI/code agent may check documentation and layout rules, but cannot validate antenna efficiency or body loading.

### B03 — battery / PDN
Still OPEN:
- exact production/prototype cell and protection;
- ESR and pulse-current capability;
- nRF9151 burst-current rail droop;
- low-temperature behaviour;
- duty-cycle/runtime model.

A calculation/model may narrow candidates. Physical transient evidence is still required.

### B04 — pogo / mechanics
Still OPEN:
- final contact geometry;
- pitch/compression;
- datum;
- cradle alignment;
- sealing interaction.

### B05 — acoustic stack
Still OPEN:
- acoustic-port geometry;
- membrane;
- sealing;
- insertion/acoustic loss;
- enclosure interaction.

### B08 — production BOM
Exact MFR+MPN exists for many major parts, but remaining generic passives/configuration parts must be frozen from their actual electrical requirements rather than filled for spreadsheet completeness.

### B09 — native KiCad verification
A fresh ERC after the deterministic edits is mandatory. No text-level agent inspection substitutes for native KiCad parsing.

## 5. Routing gate

Routing may begin only after:
- #492 deterministic electrical closures are implemented and natively checked;
- B01 footprint QA is closed;
- B02/B06 RF topology and stack-up inputs are sufficiently frozen;
- B03 battery/PDN design inputs are frozen enough for placement and routing;
- B04/B05 placement-critical mechanical/acoustic datums are known.

Routing completion does **not** close #480. Physical feasibility still requires the combined evidence named there.

## 6. Claude Code workflow

The repository now carries a project command:

`/tag-close`

It is intentionally fail-closed:
- if TAG KiCad files are not present in the Claude Code workspace, it stops;
- if `kicad-cli` is unavailable, it can prepare a candidate patch but cannot claim native ERC/DRC closure;
- it may implement E1–E7 only under their documented constraints;
- it must stop before routing;
- it may never infer physical validation from a clean schematic.

When the TAG package is stored outside the repository, start Claude Code with that directory explicitly available to the session or copy a controlled working revision into a dedicated engineering workspace.

## 7. Final authority boundary

`clean ERC != RF validation != battery validation != enclosure validation != fabrication release`

The purpose of #492 is to make the schematic truthful and reviewable so the remaining hard physical work becomes smaller and visible.

**Gate:** `G-TAG-ELECTRICAL-CLOSURE-01 = OPEN / SAFE CLOSURES IDENTIFIED / NATIVE IMPLEMENTATION PENDING`
