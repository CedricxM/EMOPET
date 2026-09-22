---
description: Route and generate the TAG manufacturing package only after every pre-routing gate is satisfied
---

# /tag-release

Execute TAG ECAD/manufacturing-release work under issue #497.

This is the **last** TAG ECAD command, not a shortcut around the gates.

Read:
- #497
- parent physical gate #480
- #499 source recovery
- #492 electrical closure
- #502 MS88SF3 footprint
- #503 PDN
- #504 RF
- #508 mechanical datums
- #510 temperature path
- current production BOM / sourcing evidence

## 1. Fail-closed preflight

STOP before any routing if any of the following is not proven by a current receipt:
- coherent current schematic;
- native KiCad parse + fresh ERC reviewed;
- MS88SF3 64-pad footprint native QA complete;
- nRF9151 footprint/package parity checked;
- RF topology sufficiently frozen for placement/routing;
- fabricator stack-up known for controlled impedance;
- PDN placement/routing constraints issued;
- mechanical/acoustic/pogo/battery routing datums issued;
- NTC excitation implementation resolved;
- Phase-0 microphone interface frozen;
- no unresolved placement-critical component choice.

Do not turn OPEN gates into guessed defaults.

## 2. Production footprint/BOM pass

Before routing:
- assign every populated ref a fabrication-capable footprint;
- reconcile symbol pin ↔ footprint pad mapping;
- remove or explicitly DNP superseded placeholders;
- freeze generic populated passives to value, tolerance, voltage/power/temp rating, package and exact MFR+MPN where required by sourcing/release policy;
- record approved substitutions separately;
- ensure BOM, schematic and PCB references reconcile exactly.

Produce `TAG_PRODUCTION_BOM_FREEZE_REPORT.md`.

## 3. Placement/routing

Route only after preflight PASS.

Order of authority:
1. board/mechanical datums;
2. BLE/LTE/GNSS antenna and RF keep-outs;
3. nRF9151 matching/test access and controlled-impedance structures;
4. nRF9151 VDD/VDD_GPIO local network and return paths;
5. charger/power path and high-current loops;
6. clocks/high-speed/digital buses;
7. sensors/acoustic interface;
8. low-rate GPIO/NTC;
9. test/programming access.

Preserve continuous RF reference planes and all documented antenna no-copper zones.

Do not optimize aesthetics over electrical/mechanical constraints.

## 4. Native verification

Run with native KiCad:
- ERC;
- DRC;
- unconnected-net check;
- footprint/library resolution check;
- board-stack/constraint review;
- 3D/mechanical collision review where supported.

Every remaining finding must be classified. Do not waive to get a green count.

## 5. Fabrication outputs

Only after native verification:
- Gerber;
- NC Drill;
- Pick & Place / centroid;
- BOM;
- assembly drawings;
- fabrication drawing;
- stack-up / controlled-impedance note;
- programming/SWD handoff;
- bring-up/test-point map;
- release manifest + SHA-256.

Generate `TAG_MANUFACTURING_RELEASE_REPORT.md` containing exact source and output hashes.

## 6. Release boundary

A complete ECAD package does not close #480 physical feasibility.

If ECAD is complete but physical validation remains:
`TAG_ECAD = FABRICATION_CANDIDATE_READY / PHYSICAL_GATE_480_OPEN`

Only an explicitly authorized human release may change the package from candidate to released-to-MOKO.

Never output `PRODUCT_VALIDATED` or `RF_VALIDATED`.
