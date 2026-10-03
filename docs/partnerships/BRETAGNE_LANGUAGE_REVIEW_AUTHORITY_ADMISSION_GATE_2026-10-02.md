# EMOPET — Bretagne language-review authority admission gate

**Date:** 2026-10-02  
**Status:** `IMPLEMENTED FAIL-CLOSED REVIEW-AUTHORITY BINDING / NO REVIEW SCOPE AGREED YET`

## Purpose

EMOPET already separates:

- outreach preparation;
- relationship state;
- language-review packet;
- external review response;
- human repository decision.

This change closes the remaining gap between **relationship state** and **review evidence**.

A syntactically valid language-review response is no longer sufficient by itself.

Before a response can create a review proposal, EMOPET now requires an explicit review authority context proving that the exact review scope was agreed.

## Required authority context

A review authority must provide:

- exact candidate ID;
- organisation name;
- relationship state `REVIEW_SCOPE_AGREED`;
- exact Bretagne language-review packet revision;
- exact review item IDs covered by the agreement;
- controlled scope-agreement evidence reference;
- scope-agreement timestamp.

The review response must occur after the scope agreement.

## Fail-closed rules

A response is rejected when:

- no agreed authority covers the item;
- more than one authority covers the item and the authority is ambiguous;
- the authority packet revision differs from the current packet/response;
- scope-agreement evidence is missing;
- the agreement timestamp is invalid or future-dated;
- review evidence predates the agreed review scope.

## Proposal lineage

An accepted external-review proposal now preserves:

- authority candidate ID;
- authority organisation name;
- scope-agreement evidence reference;
- scope-agreement timestamp.

The later human repository decision carries the same authority lineage into the manual runtime evidence candidate.

This means the path is now:

`candidate -> outbound packet-bound evidence -> REVIEW_SCOPE_AGREED -> review response -> human repository decision -> manual runtime patch candidate`

rather than:

`review response -> trust it`

## Current repository truth

No organisation currently has `REVIEW_SCOPE_AGREED`.

The language-review outreach evidence registry remains empty.

Therefore no real Bretagne language-review response is currently admissible through this gate.

Synthetic test authorities exist only inside tests and create no runtime/repository authority.

## Partnership / reviewer boundary

A review-scope agreement does not create:

- partnership status;
- endorsement;
- scientific authority;
- medical authority;
- blanket permission to reuse linguistic resources.

It only establishes that a bounded organisation/reviewer scope exists for exact language-review items.

## Current reviewed items

The current OPLB / TermBret candidate scope is limited to:

- `bretagne_companion_identity`;
- `bretagne_demat`;
- `bretagne_ar_veute`.

Institut du Galo remains a separate candidate track for future Gallo scope/terms.

## Non-goals

This gate does not:

- send outreach;
- invent a reviewer;
- mark Breiz, Demat or Ar Veute VERIFIED;
- auto-apply reviewer responses;
- change MotsPet or ELI semantic authority;
- store personal contact data.

Related:

- #821 — Bretagne reviewer/source outreach;
- current Bretagne language-review outreach status/evidence gate;
- existing Bretagne language review packet / response / human-decision flow.
