# Presence comparison source/window contract

**Issue:** #133  
**Date:** 2026-09-25  
**Status:** `SEMANTIC CONTRACT CANDIDATE / PUBLICATION BLOCKED`

## 1. Current defect

The historical `computePresenceComparison()` helper cannot support a production hourly claim because it:
- counts matching rows as valid hours;
- converts unavailable source-specific fields to zero;
- averages values without independently proving each row covers one hour;
- lets MAT and TAG rows in the same real hour increase apparent coverage;
- derives publication confidence from those row counts.

No production route currently calls that helper. It is now explicitly marked deprecated/prototype rather than silently looking authoritative.

## 2. New minimum source-window contract

`backend/api/services/presence-hourly-contract.ts` introduces the minimum shape required before any presence comparison can become real.

Every source window must carry:
- explicit start/end;
- explicit covered seconds;
- stable source-window identity;
- device/source/firmware provenance;
- summary-contract version;
- field-level measurement state.

Coverage must never be inferred from database row cardinality.

## 3. Source-specific semantics

MAT may measure `matPresenceMinutes` but is not allowed to manufacture vocal/agitation zeros.

TAG may measure `vocalEvents` and `agitationEvents` but is not allowed to manufacture MAT-presence zeros.

Field states distinguish:
- MEASURED, including measured zero;
- SOURCE_NOT_APPLICABLE;
- SOURCE_MISSING;
- SOURCE_INVALID;
- SOURCE_SUPPRESSED.

`MEASURED(0)` is therefore not equivalent to missing/unavailable.

## 4. What remains deliberately undecided

This contract does not choose:
- UTC versus local-calendar hourly buckets;
- DST behavior;
- exact MAT/TAG join key;
- partial-window weighting;
- duplicate/replay merge policy;
- denominator for per-hour rates;
- confidence/effect-size formula;
- PUBLISH/DEGRADE/REJECT thresholds.

Those are the actual #133 decisions and must not be inferred from old code.

## 5. Persistence implication

Current `sensor_summaries` has timestamp/source/device/ingestion provenance but no explicit window start/end, covered duration or summary-contract version.

Therefore current stored rows cannot by themselves prove the temporal denominator needed by the historical `*_per_hour` names.

A future migration/ingestion contract must add or otherwise authoritatively derive those fields before production comparison.

## 6. Publication boundary

Until G1-G6 are closed:

`PRESENCE_VALID_HOURS = BLOCKED`

`PRESENCE_PER_HOUR_RATES = BLOCKED`

`PRESENCE_EFFECT_SIZE = BLOCKED`

`PRESENCE_PUBLICATION_GATE = BLOCKED`

The current route-level fail-closed behavior remains correct.
