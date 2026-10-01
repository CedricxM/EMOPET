# EMOPET — MotsPet review queue v3

**Date:** 2026-10-01  
**Status:** `DERIVED REVIEW PROJECTION / SINGLE SOURCE OF TRUTH`

## Purpose

The review queue answers a simple operational question:

> what MotsPet concepts still need semantic/language review next?

Earlier queue work manually repeated the candidate concepts. That creates a drift
risk because the candidate inventory and review queue can silently become two
different dictionaries.

v3 removes that duplication.

## Authority chain

The canonical source is:

`apps/web/lib/language/motspet-candidate-inventory.ts`

The review queue is only a projection:

`candidate inventory -> controlled | authority HOLD | next review`

No concept metadata is manually re-declared in the queue.

## Buckets

### Controlled

Entries whose canonical inventory status is:

`EXISTING_CONTROLLED`

This includes the MotsPet v0.3 observation contract such as context, time
window, individual reference, limits, publication state, device state, signal
quality and model version.

### Authority HOLD

Entries whose canonical inventory status is:

`AUTHORITY_HOLD`

Today this includes:

`activation_change`

It cannot become a review candidate merely by editing the queue.

### Next review

Entries whose canonical inventory status is:

`CANDIDATE_REVIEW`

Current queue:

- uncertainty;
- trend / longitudinal change;
- share scope;
- explicit preference/refusal;
- Moment;
- Memory;
- Community visibility/audience.

## Drift guard

The audit verifies that:

- the canonical candidate inventory itself is valid;
- every inventory entry appears in exactly one projection bucket;
- next-review entries have no runtime authority reference;
- HOLD entries remain HOLD;
- the projection covers the full canonical inventory.

This means promotion happens in one place only:

`candidate inventory + runtime MotsPet`

The queue follows automatically.

## Boundary

A review candidate is not:

- approved public wording;
- a shipped product feature;
- scientific or medical validation;
- privacy permission;
- relationship inference;
- community visibility consent.

## Stack

Built on the clean current candidate inventory #959.

Supersedes the duplicated manual queue design in #895.
