# EMOPET — MAT Incremental Value Protocol v0.1

**Status:** PROPOSED FEASIBILITY / PRODUCT-VALUE PROTOCOL — NOT EXECUTED  
**Date:** 2026-09-06  
**Parent:** #223  
**Not a medical-device validation protocol.**

## 1. Decision question

Does MAT provide enough **incremental observation value** over a TAG-only configuration to justify a second device, its cost, setup, maintenance and user friction?

The answer cannot be `yes because MAT has more sensors`.

## 2. Product claim boundary

Until evidence exists, use:

> `EMOPET's target architecture combines a wearable TAG with a separate resting-context MAT.`

Do not use:
- `MAT is more accurate than wearables`;
- `MAT detects disease earlier`;
- `MAT provides clinically superior data`;
- `two devices are more reliable than one`.

## 3. Value dimensions to test

### A. Observation qualification
Does MAT make it easier to identify when the dog is actually in a qualified resting context?

Candidate evidence:
- occupancy confidence;
- stable rest-window qualification;
- lower ambiguity between dog movement and device movement;
- fewer windows rejected for context uncertainty.

### B. Rest-context signal quality
For signals intended to be observed at rest, does MAT improve signal-to-noise, repeatability or provenance under defined conditions?

No metric may be assumed valid merely because it is measurable.

### C. Complementarity
Does MAT contribute information that is meaningfully different from TAG rather than duplicating TAG?

Candidate classes:
- pressure/load distribution proxies where valid;
- body repositioning during qualified rest;
- resting-context environmental data;
- sensor fusion that materially changes confidence/abstention outcome.

### D. Continuity
Does MAT improve the longitudinal history specifically for periods where TAG-only evidence would be degraded, missing or ambiguous?

### E. User burden
Does the added value outweigh:
- cost;
- placement constraints;
- cleaning;
- power/network setup;
- dog acceptance;
- travel limitations;
- multi-dog ambiguity;
- replacement/SAV burden?

## 4. Comparison conditions

At minimum compare the same candidate observation under:

1. `TAG_ONLY`
2. `MAT_ONLY` where scientifically meaningful
3. `MAT_PLUS_TAG`
4. `GROUND_REFERENCE / CONTROLLED ANNOTATION` appropriate to the signal being tested

Do not compare different dogs or different contexts and call the difference a device effect.

## 5. Candidate bench / controlled outputs

For each signal or observation candidate record:
- ground/reference method;
- raw input availability;
- quality criteria;
- missingness;
- qualification rate;
- confidence state;
- false qualification / false rejection where definable;
- repeatability;
- sensitivity to placement;
- sensitivity to dog size/posture;
- synchronization error;
- failure mode;
- whether MAT changed the final publish/degrade/reject state.

## 6. Incremental-value scorecard

Do not collapse into one marketing score. Use a decision table per observation class:

| Observation class | TAG-only adequacy | MAT incremental value | Combined value | User burden | Disposition |
|---|---|---|---|---|---|
| Qualified rest occupancy | TBD | TBD | TBD | TBD | TEST |
| Repositioning during rest | TBD | TBD | TBD | TBD | TEST |
| Resting-context environmental context | TBD | TBD | TBD | TBD | TEST |
| Candidate respiratory proxy at rest | TBD | TBD | TBD | TBD | SEPARATE SCIENTIFIC GATE |
| Weight/load-related observations | TBD | TBD | TBD | TBD | SEPARATE SENSOR/MECHANICAL GATE |

## 7. Kill criteria

MAT must be narrowed, redesigned or removed from launch scope if controlled evidence shows one or more of the following:
- TAG alone provides equivalent usable evidence for the intended V1 jobs;
- MAT increases complexity without materially improving qualification/confidence;
- dog acceptance or household placement makes qualified coverage too low;
- cleaning/durability burden materially reduces retention or trust;
- multi-dog attribution cannot be solved to acceptable confidence;
- claimed MAT-derived observations require medical-device positioning EMOPET does not intend to pursue;
- incremental BOM/retail cost cannot be justified by measured user/professional value.

## 8. Strong-pass condition

MAT earns its place only if EMOPET can demonstrate, for at least one strategically important V1 observation class:

1. a defined resting context where MAT contributes unique or materially better-qualified evidence;
2. a measurable improvement in provenance, confidence, missingness or abstention decision;
3. acceptable household burden;
4. clear explanation to a user/veterinarian of **why the MAT contribution matters** without medical overclaim.

## 9. Commercial translation test

After technical evidence exists, test whether users understand this statement:

> `TAG follows the dog through the day. MAT gives EMOPET a dedicated observation context when the dog is resting on it. EMOPET combines those contexts only when the evidence is good enough.`

If users still ask `why do I need the mat?`, the evidence may be technically real but commercially insufficient.

## 10. Required decision

Per V1 scope, select one:
- `MAT_CORE — incremental value demonstrated`
- `MAT_OPTIONAL — useful for defined use cases only`
- `MAT_POST_V1 — value not yet sufficient for launch`
- `MAT_REDIRECT — redesign observation role`
- `MAT_KILL — complexity not justified`

**Gate:** `G-MAT-INCREMENTAL-VALUE-01 = OPEN`
