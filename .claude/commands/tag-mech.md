---
description: Build the placement-critical TAG mechanical interface-control packet before PCB routing
---

# /tag-mech

Execute TAG mechanical pre-routing work under issue #508.

Read first:
1. `AGENTS.md`
2. `CLAUDE.md`
3. #508 and parent #480
4. current TAG KiCad placement/source workspace
5. controlled/current mechanical CAD exports when available
6. current Phase-0 battery dimensions/configuration from #503
7. RF keep-out decisions from #504
8. Phase-0 microphone decision from #509

This command may freeze **routing-input datums**. It may not claim enclosure/IP/acoustic/wearability validation.

## 1. Preconditions

Require the best current mechanical source material. If no controlled CAD/export exists for the enclosure, do not invent a shell.

The historical fit-check target may be used only as a bounded target:
- external envelope: 36 × 26 × 16 mm;
- internal usable reference: 32 × 22 × 12 mm.

Label those dimensions `FIT_CHECK_TARGET` unless a newer controlled CAD authority exists.

## 2. Build one coordinate authority

Create `TAG_MECHANICAL_INTERFACE_CONTROL_2026-09-22.md` and a machine-readable CSV/JSON table with one coordinate system shared by:
- PCB outline/origin/orientation;
- enclosure datum A/B/C;
- MS88SF3 body and BLE antenna keep-out volume;
- nRF9151 + LTE/GNSS RF reserve/keep-outs from #504;
- exact Phase-0 battery bounding box, leads/protection/insulation;
- tag-side charging targets;
- cradle-side pogo candidate;
- microphone bottom-port/acoustic axis;
- enclosure acoustic port/membrane reservation;
- SWD/debug access;
- attachment/strap and wall/rib/seal keep-outs.

Every datum must state source, maturity and tolerance status.

## 3. Pogo / charging interface

Current direction includes two tag-side target contacts and a cradle-side spring-contact candidate. Do not infer geometry from the part name alone.

For Phase 0, derive or request:
- contact target diameter/shape/finish;
- center-to-center pitch;
- spring pin exact MFR+MPN;
- free height and recommended working travel;
- nominal compression;
- worst-case compression from the tolerance stack;
- cradle alignment/keying;
- polarity/orientation behavior;
- contact-resistance inspection/test access;
- corrosion/cleaning/sealing constraints.

If the exact geometry cannot be derived from a controlled manufacturer drawing + actual CAD stack, leave the datum OPEN and stop before routing those pads.

## 4. Acoustic interface

Phase-0 microphone source is INMP441 under #509.

Use the exact manufacturer land/port geometry to define:
- PCB acoustic opening/cavity;
- mic-port center relative to PCB datum;
- enclosure port axis;
- membrane/mesh candidate interface, if one has controlled source evidence;
- gasket/adhesive/compression reservation;
- mechanical keep-out;
- contamination/water path;
- clearance from pogo/cradle loads and enclosure vibration paths.

Do not invent acoustic loss, membrane performance or IP rating.

## 5. 3D packing check

Build or audit one fit-check containing at minimum:
- PCB thickness and max component heights;
- battery body/leads/protection + explicit tolerance/swelling allowance placeholder;
- MS88SF3 body + antenna clearance volume;
- nRF9151 RF zones;
- pogo/contact stack;
- mic/acoustic path;
- enclosure walls/ribs/seals;
- SWD access;
- attachment/strap reservation.

Report:
- collisions;
- minimum clearances;
- unowned/unknown dimensions;
- whether each unknown is routing-critical or later-validation-only.

## 6. Export routing constraints

Only if the coordinate/tolerance inputs are real enough:
- export antenna no-copper/no-component zones;
- acoustic hole/keep-out;
- pogo targets and edge constraints;
- battery outline/insulation keep-out;
- enclosure wall/rib/seal/screw keep-outs;
- max-component-height zones.

Do not route yet. Hand these constraints to #497.

## Stop conditions

If routing-critical geometry is controlled but physical tests remain:

`TAG_B04_B05_MECH = ROUTING_INPUT_DATUMS_READY / PHYSICAL_VALIDATION_OPEN`

If critical geometry is missing:

`TAG_B04_B05_MECH = BLOCKED / MISSING_CONTROLLED_MECHANICAL_INPUTS`

Never output `IP67_VALIDATED`, `ACOUSTIC_VALIDATED`, `WEARABILITY_VALIDATED` or `FABRICATION_READY`.
