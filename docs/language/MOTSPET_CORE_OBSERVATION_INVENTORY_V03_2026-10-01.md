# EMOPET — MotsPet core observation inventory v0.3

**Date:** 2026-10-01  
**Status:** `CONTROLLED SEED EXPANSION / INTERNAL AUTHORITY MAPPED / EXTERNAL REVIEW OPEN`

## Purpose

MotsPet v0.2 established the controlled language mechanism.

v0.3 expands the seed so the core Care observation contract can be represented explicitly rather than collapsing multiple concepts into the single word “observation”.

## Controlled concepts added

The v0.3 slice adds:

- context;
- time window;
- individual reference;
- limits;
- publication state;
- device state;
- signal quality;
- model version.

Together with the existing seed, the controlled Care-facing vocabulary now covers the main fields required by the Care Product Master:

- observation;
- context;
- time window;
- individual reference;
- source/provenance;
- confidence;
- limits;
- model/version;
- publication state;
- Owner note;
- explicit insufficient-evidence state;
- device/signal state separation.

## Semantic boundaries

### Context

`context` must not become a causal claim.

### Individual reference

`individual_reference` is explicitly longitudinal and dog-specific. It must not become:

- a universal norm;
- a “normal dog” label;
- breed percentile ranking;
- competition between dogs.

### Device state

`device_state` describes MAT/TAG technical state, not the dog's medical or biological state.

### Signal quality

`signal_quality` qualifies the evidence path. It is not “quality of wellbeing” and cannot itself become an emotional-state claim.

### Publication state

`publication_state` expresses whether an observation may be shown/degraded/suppressed. It does not mean clinical or scientific validation.

## Cross-locale QA

Every new controlled concept receives an explicit semantic contract in the MotsPet cross-locale QA layer.

FR/EN wording may differ, but each concept must preserve:

- truth class;
- provenance requirement;
- no causal upgrade;
- non-diagnostic boundary;
- consent/privacy meaning;
- exact MotsPet revision.

## HOLD remains HOLD

The activation/arousal public wording remains excluded from the controlled projection.

This inventory expansion does not promote that concept.

## Non-goals

This slice does not:

- migrate visible UI copy;
- validate translation quality;
- create a health/wellbeing score;
- validate ELI scientifically;
- validate Breton/Gallo terminology;
- create new dog-state claims.

Related:
- PR #830 — MotsPet v0.2 foundation;
- PR #866 — cross-locale semantic QA;
- Care Product Master v0.1.