# EMOPET — DATAtourisme event context cards

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED TRANSFORM / STACKED ON RIGHTS-GATED LOADER / SOURCE STILL HOLD`

## Purpose

The DATAtourisme loader can eventually return rights-gated, provenance-bound Bretagne event records.

This slice defines the next product boundary:

`loaded event + provenance -> BreizContextCard`

The transform does not fetch data and does not weaken source-rights gates.

## Fail-closed requirements

A card is emitted only when:

- an explicit relevance reason is provided;
- source provenance identifies `datatourisme`;
- producer attribution matches the event record;
- provenance publisher matches the event producer;
- source update timestamps match;
- a non-empty licence is present;
- provenance is still fresh under the source freshness rule.

Otherwise the event is dropped.

## Data minimisation

The card retains only:

- event UUID;
- canonical URI when present;
- label/title;
- provider event types;
- Bretagne department;
- producer attribution;
- source update timestamp;
- DATAtourisme update timestamp;
- full source provenance from the controlled loader.

It does not manufacture or retain:

- contact details;
- media;
- descriptions;
- opening schedules;
- dog-friendliness;
- veterinary or behavioural meaning.

## Why relevance is caller-supplied

The transform does not decide *why* an event should be shown.

That decision belongs to a later contextual-ranking layer with its own evidence and user-context rules. Requiring `relevanceReason` prevents the card builder from inventing user relevance merely because an event exists nearby.

## Current runtime state

The upstream DATAtourisme source remains rights-HOLD in the registry.

Therefore this card transform is currently exercised by tests/fixtures only. It cannot create live product data by itself.

## Related

- PR #878 — clean current-main reconstruction of the rights-gated DATAtourisme Bretagne loader;
- #835 — DATAtourisme source-unlock workstream;
- #116 — third-party data rights;
- PR #868 — Bretagne Regional Pack v1.
