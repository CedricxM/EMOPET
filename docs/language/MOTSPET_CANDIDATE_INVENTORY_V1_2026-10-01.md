# EMOPET — MotsPet candidate concept inventory v1

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED REVIEW INVENTORY / NOT RUNTIME AUTHORITY`

## Purpose

MotsPet v0.2 currently exposes a small controlled seed. That is intentional, but the next language-review queue also needs to be explicit rather than living in scattered UI copy and product docs.

This inventory records the next concepts that require language decisions **without** promoting them into runtime MotsPet.

Machine-readable source:

`apps/web/lib/language/motspet-candidate-inventory.ts`

## Three states

### EXISTING_CONTROLLED

The concept already exists in runtime MotsPet as `CONTROLLED_SEED`.

Current examples include:

- observation;
- Owner note;
- confidence;
- insufficient evidence;
- source;
- consent.

### AUTHORITY_HOLD

The concept exists in MotsPet but is deliberately not public runtime wording.

Current example:

- activation/arousal change.

### CANDIDATE_REVIEW

The concept is important enough to review next, but has:

- no public wording authority;
- no runtime MotsPet entry;
- no implied translation approval.

## First 20-concept inventory

The v1 inventory covers:

1. observation;
2. Owner note;
3. confidence;
4. insufficient evidence;
5. source;
6. consent;
7. activation change;
8. context;
9. time window;
10. reference;
11. limits;
12. signal quality;
13. device state;
14. uncertainty;
15. trend;
16. share scope;
17. explicit preference;
18. Moment;
19. Memory;
20. Community visibility.

## Why these candidates

The first priority is the observation/evidence contract already visible across Care:

- context;
- time window;
- reference;
- provenance;
- quality/confidence;
- limits;
- device/signal state;
- uncertainty;
- trend.

The second priority is cross-surface language that carries privacy or relationship meaning:

- share scope;
- explicit preference/refusal;
- deliberate Moment;
- deliberate Memory;
- Community visibility/audience.

Those terms need controlled language because sloppy wording can silently change product meaning even when the underlying code is correct.

## Important boundary

A candidate entry is **not**:

- approved French copy;
- approved English copy;
- scientific validation;
- a medical interpretation;
- a privacy grant;
- a shipped feature claim.

Candidate entries deliberately contain a review question rather than a public phrase.

## Review sequence

For each `CANDIDATE_REVIEW` concept:

1. confirm the repository authority;
2. define the semantic contract;
3. choose bounded FR wording;
4. choose bounded EN wording;
5. run cross-locale semantic QA;
6. add prohibited shortcuts;
7. only then consider promotion into runtime MotsPet.

## Relationship to current work

- PR #830 owns the MotsPet v0.2 runtime seed;
- PR #866 owns FR/EN semantic-equivalence QA;
- PR #872 maps legacy UI debt to controlled concepts;
- PR #820 prevents legacy public vocabulary from increasing.

This inventory sits before those migrations. It says **what needs review next**, not what the UI should say today.
