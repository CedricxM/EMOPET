---
description: Reconstruct and QA the Minew MS88SF3 land pattern before TAG routing
---

# /tag-footprint

Execute TAG footprint closure under issue #502.

Read first:
1. AGENTS.md
2. CLAUDE.md
3. docs/hardware/tag/TAG_ELECTRICAL_CLOSURE_2026-09-22.md
4. issue #502 if GitHub access is available
5. the authoritative Minew MS88SF3 datasheet and EMOPET MS88SF3 pin-map evidence in the TAG engineering workspace.

The current MS88SF3 STUDY_ONLY footprint is not authority. It has only pads 1–51; its visible 52–64 markers are text, not electrical pads.

Vendor structural contract:
- module 12.5 × 18.5 × 2.0 mm;
- 64 electrical pads;
- 1–51 perimeter;
- 52 P1.02, 53 P1.04, 54 P1.06, 55 P0.09, 56 P0.10, 57 P1.07, 58 P1.05, 59 P1.01, 60 P1.03;
- 61–64 centre GND;
- recommended signal solder land 1.1 × 0.35 mm;
- recommended centre GND land 1.8 × 1.3 mm;
- no carrier copper beneath the antenna and at least 4 mm clearance around the antenna region.

Workflow:
1. Work only after /tag-recover has produced a coherent schematic baseline.
2. Preserve/hash the old footprint.
3. Render/inspect the vendor mechanical drawing at sufficient resolution.
4. Reconstruct all 64 pads from the dimensioned drawing. Do not copy missing/incorrect geometry from the study footprint.
5. Preserve exact pad numbering and symbol-to-footprint parity.
6. Represent the antenna no-copper/clearance constraint in the footprint/board rules.
7. Save under a CANDIDATE name, never RELEASED.
8. Open the footprint and coherent project in native KiCad.
9. Run native DRC and inspect all 64 pads, courtyard, outline, mask/paste and antenna keep-out.
10. Produce TAG_MS88SF3_FOOTPRINT_QA_REPORT.md with hashes, datasheet revision, pad map, dimensional check and DRC result.

Do not route the TAG in this command.
Do not claim BLE/RF performance from footprint geometry.

Final status must be either:
TAG_B01_MS88SF3 = CANDIDATE_RECONSTRUCTED / NATIVE_QA_PENDING
or
TAG_B01_MS88SF3 = NATIVE_QA_PASS / READY_FOR_ROUTING_GATE_REVIEW

Never output FABRICATION_READY.
