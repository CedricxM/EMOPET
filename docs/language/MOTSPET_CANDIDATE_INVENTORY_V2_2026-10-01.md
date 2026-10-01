# EMOPET — MotsPet candidate concept inventory v2

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED REVIEW INVENTORY / RECONCILED WITH MotsPet v0.3 / NOT NEW RUNTIME AUTHORITY`

## Purpose

MotsPet v0.3 now contains a broader controlled observation contract than v0.2.

The candidate inventory must therefore distinguish:

- concepts already promoted into controlled runtime MotsPet;
- concepts still waiting for language/authority review;
- concepts explicitly held from public use.

This inventory is a review queue, not a second runtime lexicon.

## Reconciled controlled concepts

The following concepts are now recorded as `EXISTING_CONTROLLED` because MotsPet v0.3 already contains matching `CONTROLLED_SEED` entries:

- observation;
- Owner note;
- confidence;
- insufficient evidence;
- source;
- consent;
- context;
- time window;
- individual reference;
- limits;
- publication state;
- device state;
- signal quality;
- model version.

Each inventory entry must point to the exact existing MotsPet ID.

## Authority hold

`activation_change` remains `AUTHORITY_HOLD`.

Its runtime MotsPet entry remains `HOLD`, so the inventory cannot silently promote activation/arousal wording.

## Remaining review queue

The current `CANDIDATE_REVIEW` queue is now concentrated on concepts that still do not exist as runtime MotsPet authority:

- uncertainty;
- trend;
- share scope;
- explicit preference;
- Moment;
- Memory;
- Community visibility.

These entries contain review questions and authority paths only. They do not create approved FR/EN wording.

## Reconciliation rule

The inventory audit fails when:

- an `EXISTING_CONTROLLED` entry points to a missing/non-controlled runtime concept;
- an `AUTHORITY_HOLD` entry does not point to a runtime HOLD concept;
- a `CANDIDATE_REVIEW` entry points to runtime authority;
- authority paths or review questions are missing.

This prevents candidate inventory and runtime MotsPet from drifting into two contradictory dictionaries. The audit also checks the reverse direction: every runtime MotsPet entry must appear exactly once in the inventory, with `CONTROLLED_SEED -> EXISTING_CONTROLLED` and `HOLD -> AUTHORITY_HOLD`.

## Review sequence for remaining candidates

For each remaining `CANDIDATE_REVIEW` concept:

1. confirm the repository authority;
2. define the semantic contract;
3. choose bounded FR wording;
4. choose bounded EN wording;
5. run cross-locale semantic QA;
6. add prohibited shortcuts;
7. only then consider promotion into runtime MotsPet.

## Non-goals

This slice does not:

- add new runtime concepts beyond what v0.3 already authorizes;
- migrate UI copy;
- validate translation quality;
- validate Breton/Gallo wording;
- create scientific/medical authority;
- promote activation/arousal wording.

Related:
- PR #830 — MotsPet v0.2 foundation;
- PR #866 — cross-locale semantic QA;
- PR #881 — MotsPet v0.3 controlled observation inventory;
- PR #872 — legacy UI migration map;
- #817 — language/reviewer intake.
