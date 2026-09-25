# EMOPET MAT incremental-value execution protocol

**Issue:** #230  
**Parent protocol:** `docs/validation/EMOPET_MAT_INCREMENTAL_VALUE_PROTOCOL_v0.1.md`  
**Evidence map:** `docs/validation/EMOPET_MAT_PHASE0_EVIDENCE_MAP_v0.1.md`  
**Date:** 2026-09-25  
**Status:** `EXECUTION PLAN / NOT RUN / NO MAT LAUNCH DECISION`

## 1. Decision to be answered

Does MAT materially improve at least one strategically important V1 observation class over TAG-only enough to justify a second device and its cost/household burden?

This protocol does not assume that the answer is yes.

Allowed final dispositions remain:

- `MAT_CORE`
- `MAT_OPTIONAL`
- `MAT_POST_V1`
- `MAT_REDIRECT`
- `MAT_KILL`

## 2. Comparison design

For each eligible observation class, compare the **same dog / same controlled session or matched context** under:

- `TAG_ONLY`
- `MAT_ONLY` where scientifically meaningful
- `MAT_PLUS_TAG`
- `REFERENCE` / controlled annotation

Do not use different dogs or different sessions as the primary device comparison.

Where simultaneous comparison is technically possible, prefer synchronized acquisition.

## 3. Phase-0 primary observation classes

### O1 — qualified rest occupancy

Question:

Does MAT reduce ambiguity about whether a dog is actually in an eligible resting context?

Reference candidate:

- synchronized annotated presence/rest state;
- controlled known occupancy/no-occupancy intervals.

Measure per modality:

- eligible window count;
- rejected/ambiguous window count;
- false qualification where definable;
- false rejection where definable;
- latency to qualify;
- attribution failure in multi-dog or edge-position conditions.

Primary incremental endpoint:

`delta_qualified_window_rate = MAT_PLUS_TAG - TAG_ONLY`

Secondary:

- reduction in ambiguous/rejected windows;
- change in confidence/publication state;
- failure-mode count.

### O2 — repositioning during qualified rest

Question:

Does MAT provide cleaner, more attributable rest-repositioning evidence than TAG-only?

Reference:

- synchronized video/manual event annotation under consented controlled testing.

Measure:

- true events;
- detected events;
- missed events;
- duplicate events;
- timing error;
- artifact events;
- posture/position dependence.

Primary endpoint:

- event-level precision/recall where the implementation makes those metrics meaningful;
- otherwise explicitly report detection/miss/duplicate counts without manufacturing a classification metric.

### O3 — resting environmental context

Question:

Does MAT add a useful micro-context measurement beyond TAG/room-level context?

Reference:

- calibrated/reference temperature/humidity instrumentation positioned according to the test plan.

Measure:

- bias;
- repeatability;
- response time;
- self-heating;
- location gradient sensitivity;
- whether the value describes the dog's rest micro-context rather than only room ambient.

### O4 — respiratory proxy

Status:

`SEPARATE SCIENTIFIC GATE`

MAT incremental-value testing may measure whether MAT increases the **fraction of technically usable resting respiratory windows** relative to TAG-only.

It must not translate that into physiological/clinical accuracy unless the synchronized scientific reference gate is separately approved.

### O5 — weight/load observations

Status:

`SEPARATE SENSOR/MECHANICAL GATE`

Phase 0 may test calibration/repeatability/attribution and whether such information changes an eligible V1 observation.

No “health”, body-composition or clinical interpretation is authorized by this protocol.

## 4. Session matrix

Each technical comparison session should capture at minimum:

- test session id;
- dog id or controlled anonymized subject id;
- MAT hardware revision;
- TAG hardware revision;
- firmware versions;
- MAT physical variant;
- environment;
- reference method;
- synchronized start/end;
- scenario;
- expected reference state;
- raw data file ids;
- operator;
- deviations.

Candidate scenario coverage:

### Rest occupancy

- centered on MAT;
- edge of MAT;
- partial occupancy;
- no occupancy;
- enter/leave transition;
- lying/sitting if relevant;
- different dog sizes/loads;
- second dog nearby;
- two dogs / attribution challenge where safe and appropriate.

### Repositioning

- no movement control;
- small posture shift;
- full turn;
- stand then lie;
- scratching/body shake as artifact condition where appropriate.

### Environmental

- stable room;
- controlled temperature change;
- location gradient;
- device self-heating observation.

## 5. Data-quality states

Every comparison result must distinguish:

- `VALID`
- `DEGRADED`
- `SUPPRESSED`
- `NOT_APPLICABLE`
- `NOT_OBSERVED`
- `MISSING`

Never convert unavailable MAT or TAG evidence into zero.

## 6. Incremental-value calculation discipline

For an observation class, report:

1. TAG-only result;
2. MAT-only result if applicable;
3. combined result;
4. reference;
5. absolute delta;
6. uncertainty / sample count;
7. failure modes;
8. whether MAT changed the final usable observation decision.

A combined result counts as incremental value only when MAT changes a meaningful state such as:

- unusable -> usable;
- ambiguous -> attributable;
- degraded -> valid;
- no publishable observation -> publishable observation;
- materially lower missingness;
- materially better repeatability;

and the change survives repeated sessions rather than one demonstration.

## 7. Burden study

MAT cannot earn `MAT_CORE` from sensor performance alone.

Record household/product burden:

- setup time;
- placement difficulty;
- cleaning effort;
- power/network burden;
- dog avoidance/acceptance;
- movement of MAT by household members;
- travel incompatibility;
- multi-dog ambiguity;
- maintenance/replacement burden;
- Guardian understanding of why MAT exists.

Use factual observations and structured feedback. Do not create a composite “burden score” unless separately justified.

## 8. Commercial comprehension check

After technical evidence is available, test whether participants understand:

> TAG follows the dog through the day. MAT gives EMOPET a dedicated observation context when the dog is resting on it. EMOPET combines those contexts only when the evidence is good enough.

Record:

- can the participant explain MAT's role back in their own words?
- do they perceive the second device as justified?
- which concrete observation makes it worthwhile, if any?
- what burden would make them stop using it?

## 9. Decision table

No global weighted score.

For each observation class, complete:

| Field | Required |
|---|---|
| TAG-only adequacy | yes |
| MAT-only adequacy | where applicable |
| MAT+TAG outcome | yes |
| reference quality | yes |
| qualified-window delta | where applicable |
| missingness delta | yes |
| confidence/gate delta | where applicable |
| repeatability | yes |
| burden | yes |
| key failure modes | yes |
| incremental-value disposition | yes |

Disposition per class:

- `STRONG_INCREMENTAL_VALUE`
- `BOUNDED_INCREMENTAL_VALUE`
- `NO_MATERIAL_INCREMENT`
- `INCONCLUSIVE`
- `INVALID_TEST`

## 10. Product decision logic

### MAT_CORE candidate

Only if at least one strategically important V1 observation class demonstrates:

- repeatable, material incremental value;
- acceptable burden;
- clear user explanation;
- no dependency on unsupported medical/scientific claims.

### MAT_OPTIONAL candidate

If value exists for defined use cases/dogs/contexts but does not justify universal launch inclusion.

### MAT_POST_V1 candidate

If promise is credible but evidence, manufacturability or burden is not ready for launch.

### MAT_REDIRECT candidate

If MAT's current intended role is weak but the hardware provides a different evidence-backed role worth pursuing.

### MAT_KILL candidate

If TAG-only is adequate for intended V1 jobs or MAT adds complexity without meaningful decision value.

## 11. Minimum evidence before a launch disposition

Do not set an arbitrary sample count here.

Before a final commercial disposition, require enough repeated technical and household-context evidence to characterize:

- dog-size/posture variation;
- assembly-to-assembly variation;
- placement variation;
- multi-dog failure modes;
- day-to-day repeatability;
- missingness;
- user burden.

The sample plan must be reviewed once the actual Phase-0 sensor performance and expected effect sizes are known.

## 12. Evidence package

Store:

```
MAT_INCREMENTAL_VALUE/
├── 00_PROTOCOL/
├── 01_HARDWARE_MANIFEST/
├── 02_REFERENCE_METHOD/
├── 03_RAW_TAG/
├── 04_RAW_MAT/
├── 05_ANNOTATION/
├── 06_ANALYSIS/
├── 07_FAILURES/
├── 08_BURDEN/
└── 09_DISPOSITION/
```

Every analysis row must point to exact raw evidence and hardware/firmware revisions.

## 13. Current gate

`G-MAT-INCREMENTAL-VALUE-01 = OPEN / EXECUTION PLAN READY / EVIDENCE NOT RUN`

No current repository artifact authorizes the claim that MAT is more accurate or more reliable than TAG.
