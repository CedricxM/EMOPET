# EMOPET — Experiment Ledger

**Status:** `COMPANY OS INDEX / NOT A SUBSTITUTE FOR CONTROLLED PROTOCOLS`  
**Machine-readable source:** `state/experiments/`

## EXP-MAT-INCREMENTAL-001

Status: **NOT RUN**.

Decision question:

> Does MAT add enough incremental value over TAG-only to justify a second-device commercial architecture and its burden?

Controlled sources:

- issue #230;
- `docs/validation/EMOPET_MAT_INCREMENTAL_VALUE_PROTOCOL_v0.1.md`;
- `docs/validation/EMOPET_MAT_INCREMENTAL_VALUE_EXECUTION_2026-09-25.md`;
- `docs/validation/EMOPET_MAT_PHASE0_EVIDENCE_MAP_v0.1.md`.

Arms:

- TAG_ONLY
- MAT_ONLY
- MAT_PLUS_TAG
- REFERENCE

Allowed decisions:

`MAT_CORE | MAT_OPTIONAL | MAT_POST_V1 | MAT_REDIRECT | MAT_KILL`

Current decision: **NONE**.

## EXP-TAG-PHYSICAL-001

Status: **OPEN / NO PHYSICAL EVIDENCE IN REPOSITORY**.

Decision question:

> Does the integrated TAG remain physically feasible when all coupled constraints are tested together?

Controlled source: issue #480 and `docs/hardware/tag/TAG_COMBINED_PHYSICAL_FEASIBILITY_2026-09-25.md`.

Required evidence domains include packing, battery, peak current, PDN, antenna/body loading, GNSS, thermal, acoustic/sealing conflict, charging and wearability.

## Experiment rule

A good `KILL` or `REDIRECT` supported by evidence is progress.

Keeping an expensive assumption alive without running the experiment is not.
