# ELI dynamics parameter provenance — anticipation + recovery

**Issues:** #89, #90  
**Status:** `CONTROLLED PROVENANCE / SEMANTIC DECISIONS STILL OPEN`  
**Date:** 2026-09-25

This record separates **what the code currently does** from **what science/product has validated**.

Machine-readable authority:
`config/science/eli-dynamics-parameter-authority.json`.

## Anticipation

Current constants (30 d, 7 events, 50%, 15 min, ratio 1.5) are EMOPET engineering hypotheses. McEwen (1998) and Homma & Masaoka (2008) do not establish those numbers.

The code currently uses a modal **UTC hour bucket**. That remains an approximation and is not promoted here to the intended recurrence contract.

The output now exposes both:
- raw event occurrences;
- above-threshold historical hits.

The legacy `occurrences_count` remains only as a compatibility alias for above-threshold hits.

Guardian copy is constrained to factual pattern language; it must not claim the dog “is anxious” or that the detector is validated.

## Recovery

Current implementation semantics are recorded rather than silently rewritten:

- episode starts on first sample above high threshold;
- return requires 300 s below low threshold;
- reported recovery time ends at first low crossing later confirmed;
- confirmation resets at/above the low threshold.

This record does **not** declare those semantics scientifically correct. #90 still owns the final event-definition decision.

The numerical constants (EMA 0.1, 28/14 d trend, minimum 4 samples, +20%, ×1.10) are EMOPET parameters pending validation.

## Bleiz safety

The documented “trend >20% sustained for >=7 days” condition was not represented by the template.

The template now requires a separate `sensor.recovery_trend_sustained_days >= 7` field. Until a runtime owner computes that field, publication fails closed rather than treating cooldown as persistence.

## Remaining decisions

Still open:
- anticipation recurrence semantics and local-time/DST ownership;
- publication criterion;
- recovery sustained-high start rule;
- recovery first-crossing vs confirmed-return semantics;
- threshold derivation;
- runtime/persistence owner for recovery trend;
- scientific validation/tuning.

No change in this patch turns synthetic tests into canine validation.
