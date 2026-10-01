# EMOPET — Regional lexicon review binding

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED FAIL-CLOSED REVIEW BINDING / NO TERM PROMOTED`

## Problem

The regional lexicon already required a reviewer, review date and receipt before a term marked `VERIFIED` could enter Breiz prompt guidance.

That was necessary, but not sufficient.

A future term could have been reviewed, then edited afterwards while keeping the same receipt metadata. The runtime would still have considered the edited entry reviewed.

The review evidence must therefore bind the **exact reviewed content**, not only the entry ID/status.

## Change

Every regional lexicon review now binds:

- exact term;
- exact French meaning;
- exact usage category;
- exact regional-lexicon revision;
- reviewer reference/label;
- review receipt;
- valid non-future review timestamp.

`hasCompleteRegionalReviewReceipt()` returns false when any bound field no longer matches the live entry.

## Consequence

A sequence such as:

`review "Demat" -> VERIFIED -> later edit term/meaning/usage`

automatically loses release readiness until the changed wording receives a new review receipt.

A version bump of the regional lexicon also invalidates a receipt that was bound to the older revision.

## Current Bretagne state

No term is promoted.

Current entries remain:

- `bretagne_demat` -> `PENDING_REVIEW`;
- `bretagne_ar_veute` -> `PENDING_REVIEW`.

All reviewed-content binding fields remain `null`.

Therefore Breiz still injects no unreviewed regional vocabulary.

## Date integrity

The gate now also rejects:

- unreadable review timestamps;
- future review timestamps.

A non-empty string alone is no longer enough.

## Why this matters

The outreach/reviewer workflow asks external reviewers to approve exact language.

The runtime must preserve that exactness.

This keeps the evidence chain:

`exact wording -> exact review -> exact receipt -> VERIFIED runtime wording`

rather than:

`entry ID -> old receipt -> whatever wording happens to be in the file later`.

## Non-goals

This change does not:

- validate `Breiz`, `Demat` or `Ar Veute`;
- appoint a reviewer;
- send outreach;
- create a partnership;
- change MotsPet semantic authority;
- add Breton/Gallo locale support.

Related:

- #821 — Brittany reviewer/source outreach;
- merged language/culture review outreach pack;
- Regional Pack identity evidence gate.
