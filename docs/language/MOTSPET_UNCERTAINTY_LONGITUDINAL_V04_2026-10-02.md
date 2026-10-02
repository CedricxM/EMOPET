# EMOPET — MotsPet v0.4 uncertainty + longitudinal change

**Date:** 2026-10-02  
**Status:** `IMPLEMENTED CONTROLLED-SEED EXPANSION / NON-DIAGNOSTIC / NOT A GLOBAL SCORE`

## Purpose

MotsPet v0.3 already controlled the observation envelope:

- observation;
- context;
- time window;
- individual reference;
- provenance;
- confidence;
- limits;
- publication state;
- device/signal state;
- model version;
- consent.

Two concepts remained in the candidate queue even though current product authority already requires them downstream:

- uncertainty;
- longitudinal change/trend.

v0.4 promotes only these two concepts, with narrow semantic ceilings.

## `uncertainty`

Public projection:

- FR: `incertitude`;
- EN: `uncertainty`.

Meaning:

> explicit indication that available evidence limits the precision or stability of an interpretation.

It is not:

- reassurance;
- a probability invented without authority;
- a way to publish an otherwise ineligible observation;
- a substitute for epistemic silence.

`insufficient_evidence` remains distinct. If evidence is insufficient for publication, EMOPET may still abstain entirely.

Authority basis:

- Care explicitly requires users to distinguish uncertainty from no-result state;
- Experience doctrine requires confidence/abstention to remain attached to observations;
- Product authority map requires uncertainty/abstention to survive downstream and forbids consumers from increasing certainty.

## `trend`

Public projection:

- FR: `évolution longitudinale`;
- EN: `longitudinal change`.

Meaning:

> change over time of a **named observation**, tied to an explicit individual/contextual reference and a bounded time window.

It is not:

- a global ELI trend;
- a wellbeing trajectory;
- a universal improvement/degradation score;
- a comparison against other dogs or breed percentiles.

Authority basis:

- Care HISTORY is longitudinal observation by context;
- Care compares primarily with the dog's own contextual references;
- the Care migration map explicitly replaces the legacy global weekly ELI delta with longitudinal change tied to a named observation and individual/contextual reference;
- the Product Authority Map recognizes qualified movement trend and descriptive longitudinal change as bounded authority classes.

## Semantic QA

New internal truth classes:

- `UNCERTAINTY_METADATA`;
- `LONGITUDINAL_CHANGE`.

Both remain:

- `NO_CAUSAL_UPGRADE`;
- `NON_DIAGNOSTIC`;
- `PRESERVE_PURPOSE_AND_CONSENT`;
- provenance-required.

FR/EN semantic QA must therefore preserve the exact same ceiling even when wording changes.

## Candidate queue after v0.4

Promoted into runtime MotsPet:

- uncertainty;
- trend.

Still review-only:

- share scope;
- explicit preference;
- Moment;
- Memory;
- Community visibility.

Still HOLD:

- activation/arousal public wording.

## Non-goals

This slice does not:

- revive a global ELI/wellbeing score;
- authorize discrete emotion labels;
- claim a medical trend;
- authorize causal statements;
- migrate legacy UI copy automatically;
- change scientific validation status;
- promote activation/arousal wording.

The visible UI migration remains separately governed.
