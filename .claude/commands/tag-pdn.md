---
description: Build the TAG nRF9151 battery/PDN model and bench plan without inventing transient validation
---

# /tag-pdn

Execute TAG power-gate work under issue #503.

Read AGENTS.md, CLAUDE.md, #503, #480, the current Rev-B source evidence, and the official/local nRF9151 and battery documentation available in the engineering workspace.

Preserve these nRF9151 constraints:
- VDD operating range 3.0–5.5 V;
- no VDD droop/ripple below 3.0 V in operation;
- supply-network impedance target below 0.2 ohm from 10 kHz to 50 kHz;
- source must support approximately 500 mA peak at 3.7 V for reliable uplink.

Current EMOPET candidate includes U12/U13 TPS22916C sequencing, Nordic local ferrite/decoupling, provisional source reservoir and LP501622HA 3.7 V / 100 mAh / 10C candidate.

Current EEMB product authority identifies LP501622HA as a **bare cell with solder tabs**, approximately 16.5 × 24.0 × 5.3 mm and ~2.0 g. Treat that as a Phase-0 bare-cell CAD input only. A PCM/protection implementation, leads, insulation and their resistance/volume remain separate OPEN inputs.

Current #503 arithmetic also establishes that the candidate is prototype-plausible at mid SOC but has essentially no static path-loss margin near 3.2 V OCV under the 505 mA design load. Preserve this as a reason to require low-SOC transient bench evidence; do not turn the 10C label into a PASS.

Tasks:
1. Recover exact component values/MPNs from controlled sources, never memory.
2. Build a worst-case rail budget including cell OCV/ESR, protection path if present, switch resistance/inrush, ferrite/trace resistance, capacitor effective values and modem burst load.
3. Mark every missing input explicitly.
4. Check the P0.07 -> >=10 ms -> P0.17 sequencing against the schematic/firmware contract.
5. Produce routing-critical placement and test-point constraints.
6. Produce TAG_PDN_MODEL_AND_BENCH_PLAN.md with assumptions, equations, numerical scenarios, sensitivity analysis and a bench capture table.
7. Do not close B03 from calculation alone.

If the model shows the candidate cannot plausibly keep nRF9151 VDD above 3.0 V, stop and recommend redesign before routing.

If the model is plausible, stop with:
TAG_B03_PDN = MODEL_READY / BENCH_TRANSIENT_EVIDENCE_REQUIRED

Only real measured transient evidence can move the gate to PASS.
