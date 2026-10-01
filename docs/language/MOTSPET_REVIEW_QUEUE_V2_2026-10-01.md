# EMOPET — MotsPet review queue v2

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED REVIEW QUEUE / STACKED ON MotsPet v0.3`

## Purpose

MotsPet v0.3 promotes the core observation contract into the runtime lexicon.

The review queue must therefore move forward instead of continuing to treat already-controlled concepts as pending work.

Machine-readable queue:

`apps/web/lib/language/motspet-review-queue.ts`

## Runtime-derived state

The queue no longer manually duplicates all controlled MotsPet concepts.

It derives:

- `controlled` from runtime entries with `CONTROLLED_SEED`;
- `holds` from runtime entries with `HOLD`.

This prevents the planning inventory from becoming stale when a concept is promoted.

## Concepts promoted by v0.3

The following are now runtime-controlled and are **not** in the next-review queue:

- context;
- time window;
- individual reference;
- limits;
- publication state;
- device state;
- signal quality;
- model version.

They join the earlier controlled seed around observation, Owner note, confidence, provenance/source, consent and insufficient evidence.

The activation/arousal candidate remains HOLD.

## Next-review queue

The next language/semantic review queue now focuses on concepts that are still outside runtime authority:

- uncertainty;
- trend / longitudinal change;
- share scope;
- explicit preference/refusal;
- Moment;
- Memory;
- Community visibility/audience.

## Why

The dictionary workstream should behave like a controlled queue:

`candidate -> semantic contract -> FR/EN wording -> QA -> runtime authority`

not like a growing list where old candidates remain pending forever.

## Boundary

A queue item is not:

- approved public wording;
- a shipped feature claim;
- medical/scientific validation;
- privacy permission;
- relationship inference.

For relationship/community concepts in particular, review must preserve the existing doctrine that sensor data does not create sentimental meaning, social authority or relationship scores.

## Related

- PR #830 — MotsPet v0.2 foundation;
- PR #866 — cross-locale semantic QA;
- PR #881 — MotsPet core observation inventory v0.3;
- PR #872 — legacy UI migration map;
- #817 — MotsPet/reviewer workstream.
