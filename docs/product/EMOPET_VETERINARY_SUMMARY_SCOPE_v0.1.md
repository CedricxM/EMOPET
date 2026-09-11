# EMOPET — Veterinary Summary Scope v0.1

**Status:** PRODUCT / INFORMATION-ARCHITECTURE CANDIDATE — NOT CLINICALLY VALIDATED  
**Date:** 2026-09-06  
**Canonical terminology revision:** 2026-09-11 under DOMAIN-TERM #245  
**Related:** #64, Founding 12 veterinary strategy, Experience Doctrine

> The 2026-09-11 revision updates dog-owner terminology only. Clinical boundaries and validation status are unchanged.

## 1. Job

Give a veterinarian a short, dated chronology of governed observations that an Owner deliberately shares, without turning EMOPET into a diagnostic system or a second clinical dashboard.

Target reading behavior:

> understand what changed, approximately when it became persistent, how often it was observed, and how reliable the underlying observation was.

This is a product target, not a validated time-saving claim.

## 2. Summary sections

### Identity/context header
- dog name;
- Owner-provided basic profile fields relevant to identification;
- observation period;
- generated-at timestamp;
- explicit `NON-MEDICAL / OBSERVATIONAL SUMMARY` label.

### Data coverage
- qualified observation days/windows;
- missing/degraded periods;
- source contexts used (`MAT`, `TAG`, declared context) at an understandable level;
- confidence/quality explanation.

### Longitudinal observations
Only governed observations that passed their upstream publication gate.

Each item should answer:
- what was observed;
- reference/baseline comparison where valid;
- first persistent appearance/date range;
- recurrence/frequency;
- confidence/coverage;
- known evidence limitations.

### Owner-selected context/notes
Only if explicitly included in the grant.

Clearly label as:
`DECLARED BY OWNER`, not sensor truth.

### Interpretation boundary
Required text concept:

> EMOPET reports longitudinal observations and their data quality. It does not identify a disease, pain state, emotional state or clinical cause. Clinical interpretation belongs to the veterinarian.

Final regulated/legal wording requires review.

## 3. What must not appear by default

- diagnosis probability;
- disease ranking;
- `arthritis likely`, `anxiety likely`, etc.;
- hidden emotion labels;
- raw ELI latent/debug dimensions;
- relationship score;
- owner-performance score;
- World/community engagement;
- private Memories;
- raw audio;
- unnecessary precise location history;
- marketing language.

## 4. Evidence provenance

Every professional-facing observation should be traceable internally to:

- dog ID;
- data period;
- observation class/version;
- source modality/context;
- quality/gate decision;
- baseline/reference version where applicable;
- generated-at version/build;
- any Owner-declared context used.

The PDF/UI may summarize provenance, but audit/export systems should preserve it.

## 5. Abstention is visible

Do not hide low coverage to make the report look more complete.

Examples:
- `Données insuffisantes pour comparer cette période.`
- `Observation non publiée sur X jours en raison d'une qualité insuffisante.`
- `Ce changement n'est pas assez persistant pour être résumé.`

A shorter report can be a correct report.

## 6. Candidate one-page hierarchy

```text
EMOPET VETERINARY SUMMARY
Naya · observation period 01 Aug–31 Aug
NON-MEDICAL / OBSERVATIONAL

DATA COVERAGE
24/31 days with qualified observation
3 degraded periods · 4 days without sufficient coverage

PERSISTENT CHANGES
1. Rest repositioning
   First persistent appearance: around 19 Aug
   Observed: 10 of last 14 qualified nights
   Confidence: high
   Cause: not determined

2. Daytime activity
   Within individual reference range

OWNER NOTES (selected)
[clearly declared]

BOUNDARY
Observations only. No diagnosis or clinical cause inferred.
```

Exact visual design must be tested with practitioners.

## 7. Founding 12 evaluation

Candidate measures:
- would-read rate;
- perceived usefulness;
- chronology value;
- information-noise rate;
- observation/interpretation boundary comprehension;
- added-work vs perceived time saving;
- trust after explicit abstention.

Do not present these as clinical validation metrics.

## 8. Gate

`G-VETERINARY-SUMMARY-UTILITY-01 = NOT_TESTED`

No claim that the summary improves consultations is authorized until controlled practitioner evidence exists.