# EMOPET — MAT Phase 0 Evidence Map v0.1

**Status:** CONTROLLED PLANNING / NOT EXECUTED EVIDENCE  
**Date:** 2026-09-06  
**Parent:** `EMOPET_MAT_INCREMENTAL_VALUE_PROTOCOL_v0.1.md` / #230  
**Related Autodesk/Fusion R3 outputs:** MAT stack / L4 routing / L5 variants  
**Not product V1. Not manufacturing release. Not tooling authorization.**

## 0. Purpose

This document connects the current Phase 0 Autodesk/Fusion work to the evidence needed to decide whether MAT earns a place in EMOPET.

A drawing, CAD dimension or routing artifact can establish **design intent and geometry provenance**. It cannot by itself establish sensor performance, scientific validity, dog acceptance, clinical utility or manufacturing readiness.

The key rule is:

> `CAD evidence can tell us what we built and where. Bench/controlled evidence must tell us whether it works and whether MAT adds value.`

## 1. Controlled Phase 0 drawing families

| Artifact family | Primary engineering job | Evidence it can support | Evidence it cannot support alone |
|---|---|---|---|
| MAT stack | document layer/stack geometry, thickness relationships, interfaces and mechanical context | geometry provenance, interface dimensions, candidate placement constraints, test-article reproducibility | signal quality, comfort, dog acceptance, respiratory validity, load accuracy |
| L4 routing | document controlled/candidate routing geometry and review constraints | routing provenance, spacing/clearance review, interface identification, reproducible test article | EMC performance, electrical integrity, manufacturability, reliability |
| L5 variants | compare candidate mechanical/layout variants | variant identity, geometry delta, controlled comparison plan | which variant is scientifically or commercially superior |

All three remain `PREPARED_NOT_SENT` until separately released.

## 2. Evidence chain required for each MAT observation class

Every proposed MAT observation must traverse four layers:

1. **Design evidence** — what geometry/electronics were built;
2. **Bench evidence** — what the hardware measures under controlled reference conditions;
3. **Context evidence** — whether the measurement is valid when used by a dog in a household-like context;
4. **Incremental-value evidence** — whether MAT changes a decision relative to TAG-only.

No layer may be skipped.

## 3. Mapping to the incremental-value protocol

### 3.1 Qualified rest occupancy

**Phase 0 design evidence**
- stack geometry and load-bearing interfaces;
- sensor/plate zones where represented and controlled;
- candidate mechanical boundaries affecting occupancy attribution;
- multi-dog ambiguity risks visible from sensing area/layout.

**Bench/controlled evidence still required**
- known-load placement matrix;
- occupancy/no-occupancy discrimination under controlled loads;
- edge-position sensitivity;
- dog-size/load range coverage;
- false-positive/false-negative qualification where definable;
- repeatability across assembly cycles.

**Incremental comparison**
- `TAG_ONLY` rest-context qualification;
- `MAT_ONLY` occupancy qualification;
- `MAT_PLUS_TAG` combined qualification;
- annotated reference.

Primary decision metric: whether MAT materially reduces ambiguous/rejected rest windows without introducing unacceptable false qualification.

### 3.2 Repositioning during qualified rest

**Phase 0 design evidence**
- sensing-zone geometry;
- layer coupling/stack relationships that may influence event propagation;
- routing/variant differences that could alter reproducibility.

**Evidence still required**
- controlled repositioning events with reference annotation;
- event timing error;
- missed/duplicate event rate;
- sensitivity to dog size/posture and location on MAT;
- difference between genuine body repositioning and environmental/contact artifacts.

**Incremental question**
Does MAT provide a cleaner or more attributable rest-repositioning history than TAG-only evidence under the same annotated event sequence?

### 3.3 Resting-context environmental context

**Phase 0 design evidence**
- environmental sensor location and enclosure/stack relationship where controlled;
- thermal/airflow constraints if represented.

**Evidence still required**
- comparison against reference instrumentation;
- local self-heating bias;
- position/room gradient sensitivity;
- response time;
- whether the reading meaningfully describes the dog's resting micro-context rather than only room ambient conditions.

### 3.4 Candidate respiratory proxy at rest

**Separate scientific gate.**

Phase 0 drawings may establish the physical sensor arrangement and reproducible test article only.

They do **not** establish:
- respiratory-rate validity;
- clinical accuracy;
- disease detection;
- physiological interpretation.

Required later evidence includes synchronized reference measurement, quality gating, failure modes, posture/size effects, artifact rejection and external scientific review as appropriate.

### 3.5 Weight/load-related observations

**Separate sensor/mechanical gate.**

Drawings can establish load-path geometry and sensor placement. They cannot establish calibrated weight/load performance.

Required later:
- traceable loads;
- calibration curve;
- hysteresis;
- repeatability;
- creep/drift;
- off-center loading;
- temperature dependence;
- assembly-to-assembly variation;
- maximum foreseeable dog load and mechanical safety margin.

## 4. Variant discipline

L5 variants must be treated as controlled candidates, not aesthetic alternatives.

For each variant, record:

- variant ID;
- Fusion source document/version;
- changed geometry only;
- hypothesis the change is intended to test;
- bench metric affected;
- expected failure mode;
- result;
- disposition: `KEEP | REDESIGN | DROP`.

A variant with no explicit hypothesis should not advance merely because it looks cleaner in CAD.

## 5. R3 annotation requirements for evidence usefulness

Where technically supported, the controlled drawings should expose enough information to reproduce the test article and understand test differences, including:

- overall envelope/reference dimensions;
- relevant layer/interface names;
- controlled versus candidate geometry;
- key offsets/spacing/clearance used in a test hypothesis;
- routing zones/interfaces relevant to electrical review;
- variant identifier;
- source Fusion document + source version;
- maturity state;
- unresolved values explicitly marked `TO_CONFIRM` / `PROVISIONAL` / `BLOCKED`.

Do not add a dimension only because it is measurable. Add it when it supports assembly identity, review or a defined test hypothesis.

## 6. Phase 0 evidence package structure

Recommended evidence package after R3:

```text
MAT_PHASE0_EVIDENCE/
├── 00_MANIFEST/
├── 01_CONTROLLED_DRAWINGS/
│   ├── MAT_STACK/
│   ├── L4_ROUTING/
│   └── L5_VARIANTS/
├── 02_SOURCE_VERSION_POINTERS/
├── 03_BENCH_PROTOCOLS/
├── 04_RAW_RESULTS/
├── 05_PROCESSED_RESULTS/
├── 06_QA/
├── 07_FAILURES_AND_DEVIATIONS/
└── 08_DISPOSITION/
```

Every bench result must point back to the exact physical variant/source version tested.

## 7. Phase 0 success is not MAT success

A successful R3/Fusion package means:

- test-article intent is legible;
- maturity is explicit;
- drawings are traceable;
- unresolved geometry is visible;
- the next bench work can be tied to a controlled configuration.

It does **not** mean:

- `MAT_CORE`;
- MAT is superior to TAG;
- sensor claims are validated;
- the design is DFM-approved;
- manufacturing is authorized.

## 8. Decision bridge to #230

After controlled bench/context testing, update the parent scorecard for each observation class:

| Observation class | Design evidence | Bench evidence | Context evidence | TAG-only comparison | Incremental-value disposition |
|---|---|---|---|---|---|
| Qualified rest occupancy | R3 pending | NOT RUN | NOT RUN | NOT RUN | TEST |
| Rest repositioning | R3 pending | NOT RUN | NOT RUN | NOT RUN | TEST |
| Environmental context | R3 pending | NOT RUN | NOT RUN | NOT RUN | TEST |
| Respiratory proxy | R3 physical arrangement only | NOT RUN | NOT RUN | NOT RUN | SEPARATE SCIENTIFIC GATE |
| Weight/load observations | R3 load-path evidence only | NOT RUN | NOT RUN | NOT RUN | SEPARATE SENSOR/MECHANICAL GATE |

## 9. Current disposition

`G-MAT-PHASE0-EVIDENCE-MAP-01 = CONTROLLED_PLAN / EVIDENCE_NOT_EXECUTED`

The Autodesk/Fusion work can now produce evidence-ready engineering artifacts without being mistaken for proof of MAT incremental value.