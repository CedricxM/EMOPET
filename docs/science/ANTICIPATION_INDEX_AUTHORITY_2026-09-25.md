# Anticipation index — semantic hold and publication gate

**Issue:** #89  
**Status:** `HOLD PENDING SCIENCE/PRODUCT SEMANTIC DECISION`  
**Date:** 2026-09-25

Machine-readable authority:

`config/science/anticipation-index-authority.json`

## Current implementation facts

The current tracker uses:

- modal **UTC hour bucket** recurrence;
- minimum 7 raw events before evaluation;
- 15-minute pre-event activity window;
- activity-ratio threshold 1.5;
- 50% modal-hour coverage;
- 30-day trailing horizon;
- `occurrences_count` as count of historical above-threshold hits for publication logic.

These are implementation facts, not scientific validation.

## Document/implementation divergence

The controlled model text describes a ±30-minute recurrence idea that is not equivalent to the implemented UTC hour bucket. Characterisation tests already show that the two rules can rank the same event series differently.

The count vocabulary is also overloaded: raw recurring events and above-threshold detections are distinct concepts and must not share one ambiguous field in the final contract.

## Parameter provenance

The current numerical constants are classified as:

`EMOPET_DESIGN_PARAMETER_UNVALIDATED`

Current McEwen/Homma citations do not establish the exact 7 / 1.5 / 15 min / 50% / 30 d detector.

## Fail-closed Guardian publication

Until #89 selects a controlled semantic contract, the Bleiz anticipation template requires:

`sensor.anticipation_contract_authorized === true`

No current runtime produces that authority field. Therefore future accidental wiring cannot publish the template merely because the current detector returns `detection_threshold_met = true`.

This guard is not the final detector design. It is a publication firewall.

## Decisions still required

1. true ±30-minute recurrence versus another method;
2. dog-local-time versus UTC treatment;
3. separate raw event count and above-threshold hit count fields;
4. publication criterion;
5. interpretation wording and validation plan.

## Current gate

`G-ANTICIPATION-CONTRACT-01 = HOLD / IMPLEMENTATION CHARACTERIZED / PUBLICATION FAIL-CLOSED`
