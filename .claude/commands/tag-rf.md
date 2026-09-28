---
description: Close deterministic TAG nRF9151 RF/SIM design inputs and produce the pre-routing RF decision packet
---

# /tag-rf

Execute TAG RF pre-routing work under issue #504.

Read AGENTS.md, CLAUDE.md, #504, #480, the coherent TAG schematic/source evidence, and current Nordic nRF9151 reference/hardware RF guidance.

Preserve:
- ANT pin 35 is the 50-ohm LTE/DECT NR+ path;
- GPS pin 42 is the 50-ohm GNSS receive path;
- SIM/UICC uses SIM_RST, SIM_IO, SIM_CLK and SIM_1V8;
- SIM_DET is currently unsupported and must remain floating;
- 50-ohm geometry depends on the real stack-up;
- final antenna matching values are design-specific and cannot be invented.

Current Phase-0 topology/component authority from #504:
- LTE: external antenna path for the first engineering build;
- GNSS: dedicated external path; do not share LTE/GNSS for Phase 0;
- UICC: physical 1.8 V nano-SIM; SIM_DET remains floating;
- LTE/GNSS board receptacle candidate: Hirose U.FL-R-SMT-1(01);
- conducted LTE test switch candidate: Murata MM8130-2600;
- nano-SIM holder candidate: Molex 1042240820;
- UICC low-capacitance ESD candidate: TI TPD4E05U06DQAR;
- do not replace these candidates by convenience. Reopen only for a documented fit, availability, lifecycle or electrical conflict.

Tasks:
1. Audit the nRF9151 symbol/pin map against current Nordic authority.
2. Inventory every existing RF/SIM net and placeholder in the recovered schematic.
3. Build a Phase-0 decision packet for:
   - LTE antenna topology;
   - GNSS topology;
   - UICC/eSIM implementation;
   - RF conducted-test access;
   - BLE/LTE/GNSS coexistence constraints;
   - fabricator stack-up inputs required for controlled impedance.
4. Where a controlled exact MFR+MPN already exists, carry it forward. Otherwise mark selection OPEN rather than choosing by convenience.
5. Add schematic placeholders only where Nordic reference circuitry requires topology that is independent of the final antenna tuning. Keep matching values DNP/TBD when design-specific.
6. Keep ANT/GPS routes short, with continuous reference ground and explicit keep-outs/test-access constraints in the routing rules.
7. Produce TAG_RF_PRE_ROUTING_REPORT.md.

Do not claim antenna efficiency, VSWR, body/enclosure detuning, GNSS TTFF/sensitivity or regulatory radiated performance.

If the board-side candidates above are coherent but stack-up/matching/antenna physical evidence remains open, stop with:
TAG_B02_B06_RF = BOARD_SIDE_COMPONENTS_SELECTED / STACKUP+MATCHING+PHYSICAL_RF_EVIDENCE_OPEN

If topology and stack-up are actually frozen, stop with:
TAG_B02_B06_RF = READY_FOR_50OHM_ROUTING_CALCULATION / PHYSICAL_RF_GATE_OPEN

Never output RF_VALIDATED or FABRICATION_READY.
