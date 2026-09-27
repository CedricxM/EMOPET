# EMOPET — MAT Phase 0 Executable Bench & Incremental-Value Protocol v0.2

**Status:** EXECUTION TEMPLATE / NOT EXECUTED EVIDENCE  
**Date:** 2026-09-22  
**Parents:** `EMOPET_MAT_INCREMENTAL_VALUE_PROTOCOL_v0.1.md`, `EMOPET_MAT_PHASE0_EVIDENCE_MAP_v0.1.md`, #230  
**Supplier context:** the current Phase 0 engineering/testing request was transmitted to MOKO on 2026-09-22; transmission evidence is recorded separately.  
**Not a medical-device validation protocol. Not a fabrication release. Not proof that MAT has incremental value.**

## 0. Why this protocol exists

The existing #230 documents define the decision and the evidence layers, but they do not yet provide the smallest executable runbook for the first returned supplier/lab data.

This document separates two jobs that must not be confused:

1. **Phase 0A — MAT hardware characterization:** establish whether the current MAT test article produces repeatable, traceable engineering data under controlled stimuli.
2. **Phase 0B — MAT incremental-value comparison:** compare `TAG_ONLY`, `MAT_ONLY` and `MAT_PLUS_TAG` against the same reference context.

A successful Phase 0A does **not** answer #230. It only earns the right to run a meaningful Phase 0B.

## 1. Non-negotiable evidence rules

For every run:

- identify the exact physical test article and source revision;
- preserve raw or minimally processed data where available;
- keep acquisition settings with the data;
- record failures and aborted runs rather than deleting them;
- never replace missing data with zero;
- do not derive product/science claims from bench observability alone;
- do not compare different dogs, contexts or reference procedures and call the difference a device effect;
- no `MAT_CORE | MAT_OPTIONAL | MAT_POST_V1 | MAT_REDIRECT | MAT_KILL` disposition is created by a single engineering run.

## 2. Test-article identity

Before recording measurements, capture:

| Field | Required |
|---|---|
| test_article_id | yes |
| MAT PCB / assembly revision | yes |
| schematic / Gerber source revision or package hash | yes |
| BOM revision | yes |
| firmware / acquisition configuration | yes |
| fixture / jig revision | yes where used |
| power-supply configuration | yes |
| sensor references / channel mapping | yes |
| operator | yes |
| date/time + timezone | yes |
| deviation from planned setup | yes if any |

A result with unknown test-article identity is engineering anecdote, not controlled evidence.

## 3. Phase 0A — MAT hardware characterization

### 3.1 Power-up and rails

Record at minimum:

- input supply;
- regulated rail voltages;
- current at idle;
- current during acquisition;
- abnormal startup/restart behaviour;
- rail droop or instability observed during test;
- test equipment used.

No power-budget pass threshold is invented here. Compare only against the current electrical design authority where an approved limit already exists.

### 3.2 Raw channel baseline

For every current sensor / AFE channel that can be read:

- record raw or minimally processed time series;
- record sampling rate;
- gain;
- filter configuration;
- supply voltage;
- firmware/acquisition build;
- channel identifier;
- units or ADC representation;
- duration.

Minimum outputs:
- baseline trace;
- mean/offset;
- observed spread/noise description;
- missing samples / acquisition interruptions.

### 3.3 Offset, noise and drift

Run a stationary controlled condition long enough to observe short-term stability.

Record:
- start/end time;
- environmental conditions if known;
- offset at start/end;
- drift over elapsed time;
- obvious step changes;
- clipping/saturation;
- acquisition dropout.

Do **not** convert this into a sensor-validity or physiological claim.

### 3.4 Repeatable mechanical stimulus

Use a stimulus that can be repeated and described.

For each repetition record:
- stimulus identifier;
- reference event time where available;
- channel response;
- response latency where measurable;
- peak / integral / other engineering descriptors only where already meaningful for the channel;
- recovery time;
- failure or ambiguous response.

The protocol does not impose one universal stimulus because MAT channels have different physical roles.

### 3.5 Repeatability

Repeat the same controlled condition/stimulus across multiple runs without silently retuning the system between repetitions.

Record:
- number of repetitions;
- configuration identity;
- per-run engineering descriptors;
- outliers;
- configuration changes;
- assembly/reconnect events.

Averaging is not allowed to hide failed repetitions.

### 3.6 Channel-to-channel crosstalk

Stimulate one intended channel/zone at a time where physically meaningful.

Record:
- intended stimulated channel/zone;
- response on that channel;
- response on other channels;
- timing relationship;
- known mechanical/electrical coupling in setup;
- ambiguous attribution.

No universal crosstalk percentage threshold is chosen here.

### 3.7 Saturation and recovery

Where safe and applicable:

- increase controlled stimulus toward the expected measurable range;
- identify visible saturation/clipping;
- return to baseline condition;
- record recovery behaviour and any hysteresis/drift.

This is an engineering range test, not a maximum-use or safety certification.

### 3.8 Known-load / occupancy bench matrix

For load-bearing or occupancy-related sensing where supported by the current test article:

- no-load baseline;
- known static loads;
- center placement;
- representative edge/off-center placements;
- repeated placement/removal;
- any available multi-contact / ambiguous-load condition.

Record actual reference loads and positions. Do not infer dog occupancy performance directly from fixture loads.

## 4. Phase 0A deliverables expected from a supplier/lab

Preferred data package:

```text
MAT_PHASE0_RUN_<run-id>/
├── 00_RUN_MANIFEST/
├── 01_RAW_OR_MINIMALLY_PROCESSED_DATA/
├── 02_ACQUISITION_SETTINGS/
├── 03_REFERENCE_AND_STIMULUS_LOG/
├── 04_ENGINEERING_SUMMARY/
├── 05_FAILURES_AND_DEVIATIONS/
└── 06_PHOTOS_OR_SETUP_EVIDENCE_IF_AVAILABLE/
```

Preferred time-series format: CSV or another non-proprietary tabular export where practical.

Each time-series export should carry enough information to reconstruct:

- timestamp;
- run id;
- test article id;
- channel / sensor;
- raw or minimally processed value;
- unit / ADC representation;
- sample rate;
- gain/filter/configuration;
- supply condition;
- stimulus/reference marker where applicable.

## 5. Phase 0B — incremental-value comparison

Phase 0B starts only when both devices / reference methods are capable of participating in the same controlled observation.

For each selected observation class, run the **same context/reference sequence** under:

1. `TAG_ONLY`
2. `MAT_ONLY` where scientifically meaningful
3. `MAT_PLUS_TAG`
4. `GROUND_REFERENCE / CONTROLLED_ANNOTATION`

### 5.1 First comparison classes

The existing #230 authority makes these the first useful candidates:

- qualified rest occupancy/context;
- repositioning during qualified rest;
- resting-context environmental context.

The following remain separate gates and must not be used as a shortcut to claim MAT value:

- candidate respiratory proxy at rest;
- calibrated weight/load claims;
- any clinical/diagnostic interpretation.

### 5.2 Window-level comparison fields

For each observation window record, where meaningful:

- condition (`TAG_ONLY | MAT_ONLY | MAT_PLUS_TAG`);
- reference state / annotation;
- source device(s);
- source revision(s);
- window start/end;
- whether the observation qualified;
- why it failed qualification if not;
- missingness;
- provenance completeness;
- confidence/publication state if a controlled rule already exists;
- timing error against reference where definable;
- ambiguous attribution / multi-dog concern;
- operator note.

No new publish/degrade/reject thresholds are created by this document.

## 6. Comparison outputs

For each observation class report separately:

- qualification rate;
- missingness;
- repeatability;
- false qualification / false rejection **only where a real reference definition exists**;
- timing error where relevant;
- provenance completeness;
- placement sensitivity;
- dog-size/posture sensitivity when actual dog/context work begins;
- multi-dog attribution failure modes;
- whether MAT changes a controlled `publish / degrade / reject / abstain` outcome where such an outcome is already authoritative;
- added setup/user burden.

Do not collapse the result into one marketing score.

## 7. rr_variability and respiratory boundary

The 22 September #86 work proves that the historical 60 s window cannot satisfy the current 30-interval gate across the cited normal-rest range, while the current 300 s firmware window is arithmetically viable at normal resting rates but exposes a low-rate sleep-tail boundary.

That arithmetic does **not** decide the statistic or scientific validity.

Therefore:
- Phase 0 may record raw respiratory-channel engineering data;
- it may record reference respiratory events/rates where the protocol is controlled;
- it must **not** use `rr_variability` as a MAT incremental-value success criterion until #86's semantic/scientific contract is resolved.

## 8. Decision bridge

After Phase 0A and Phase 0B evidence exists, update the #230 scorecard.

Allowed dispositions remain:

- `MAT_CORE`
- `MAT_OPTIONAL`
- `MAT_POST_V1`
- `MAT_REDIRECT`
- `MAT_KILL`

### Strong-pass requirement

MAT earns a launch role only if at least one strategically important V1 observation class demonstrates:

1. unique or materially better-qualified evidence in a defined resting context;
2. measurable improvement in provenance, confidence, missingness or abstention;
3. acceptable household burden;
4. a clear non-medical explanation of why the MAT contribution matters.

A clean PCB, stable waveform or successful supplier test is not enough by itself.

## 9. Current status

As of 2026-09-22:

- the protocol is **prepared**;
- a supplier execution/cost request has been sent;
- returned Phase 0 bench data are **not yet recorded here**;
- TAG physical-feasibility and final fabrication blockers remain open;
- #86 respiratory semantics remain open;
- #230 remains open.

`G-MAT-PHASE0-EXECUTION-01 = READY_FOR_DATA / NOT_EXECUTED / NO_INCREMENTAL_VALUE_CLAIM`
