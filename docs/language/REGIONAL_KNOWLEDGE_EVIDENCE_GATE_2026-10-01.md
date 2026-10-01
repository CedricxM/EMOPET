# EMOPET — Regional knowledge evidence gate

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED FAIL-CLOSED CONTENT GATE`

## Problem

The regional knowledge filter previously rejected only `PENDING_VERIFIED_CONTENT`.

That meant entries marked `EXEMPLE_DEMO` could still be injected into real assistant prompts when their text matched the user's query.

Those demo entries carried a boolean `sourceVerified: true`, but no structured provenance/review receipt.

A boolean is not enough evidence for release.

## Change

Regional geography/culture entries can now carry a `RegionalKnowledgeEvidence` record with:

- controlled source ID/label;
- exact source/item reference;
- reviewer role;
- review timestamp;
- provenance/use note.

A knowledge entry is release-ready only when:

1. `_status === VERIFIED`;
2. `sourceVerified === true`;
3. structured evidence exists;
4. required evidence fields are non-empty;
5. the review timestamp is valid and not in the future.

`EXEMPLE_DEMO` and `PENDING_VERIFIED_CONTENT` are both excluded from real prompt injection.

## Consequence for current Bretagne content

The existing Lorient / Festival Interceltique / Gwenn ha Du examples remain useful as repository/demo fixtures but are no longer treated as live evidence-backed regional knowledge.

They can be promoted later only through explicit source/reviewer evidence.

## Why

The regional companion must not turn:

`plausible fact → hard-coded demo → live cultural authority`

without a review/provenance step in between.

This aligns regional knowledge with the same fail-closed direction already used for:

- third-party source rights;
- regional vocabulary review receipts;
- MotsPet controlled language.

## Tests

Coverage proves that:

- demo entries are excluded;
- VERIFIED entries without evidence are excluded;
- blank/future evidence is excluded;
- evidence-backed VERIFIED entries can be selected;
- token-budget and region-duplication tests still exercise real release-ready fixtures.

## Non-goals

This slice does not:

- validate any current Bretagne demo item;
- add external content;
- grant source rights;
- create reviewer claims;
- alter scientific interpretation.
