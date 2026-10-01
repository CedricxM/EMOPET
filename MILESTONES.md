# EMOPET — Milestones

**Status:** `COMPANY OS PROJECTION / NOT DOMAIN AUTHORITY`  
**Machine-readable source:** `state/milestones/`

## Current critical milestone

### S1 — PHYSICS

**Question:** can MAT and TAG produce repeatable, trustworthy physical evidence in their intended contexts without maturity inflation?

Current state: **OPEN**.

Required gates:

1. **MAT incremental value** — issue #230 / `G-MAT-INCREMENTAL-VALUE-01`
   - execution package exists;
   - evidence has not been run;
   - allowed outcomes include `MAT_CORE`, `MAT_OPTIONAL`, `MAT_POST_V1`, `MAT_REDIRECT`, `MAT_KILL`;
   - no sunk-cost exception.

2. **TAG combined physical feasibility** — issue #480
   - current repository gate says physical evidence is not yet present in-repo;
   - battery, RF, GNSS, PDN, thermal, sealing, acoustics, charging, packing and wearability must be reviewed together;
   - architecture detail alone is not proof.

## Exit discipline

S1 cannot become `PASSED` because:

- a PCB exists;
- Gerbers exist;
- a supplier reviewed files;
- synthetic tests pass;
- software ingestion works;
- a slide deck says the system is ready.

It can move only through the controlling evidence gates.

## What S1 does not automatically unlock

Passing S1 would not itself authorize:

- manufacturing release;
- scientific validation;
- clinical claims;
- fundraising;
- commercial launch.

Those require their own authorities and gates.
