# EMOPET — MotsPet candidate concept inventory v4

**Date:** 2026-10-02  
**Status:** `IMPLEMENTED REVIEW INVENTORY / RECONCILED WITH MotsPet v0.5 / NOT NEW RUNTIME AUTHORITY`

## Changes from v3

`explicit_preference` is now reconciled as `EXISTING_CONTROLLED` because MotsPet v0.5 contains the bounded `OWNER_PREFERENCE` semantic contract.

Its runtime authority remains limited to a preference/constraint/refusal explicitly declared or confirmed by the Owner.

It must not be used as dog-state evidence or relationship scoring.

## Remaining review queue

The canonical `CANDIDATE_REVIEW` queue is now:

1. `share_scope`;
2. `moment`;
3. `memory`;
4. `community_visibility`.

## Existing controlled concepts added by recent revisions

v0.4:
- uncertainty;
- longitudinal change / trend.

v0.5:
- explicit preference.

## HOLD

`activation_change` remains `AUTHORITY_HOLD`.

## Reconciliation invariant

The inventory remains bidirectionally tied to runtime MotsPet:

- every runtime controlled concept appears exactly once as `EXISTING_CONTROLLED`;
- every runtime HOLD appears exactly once as `AUTHORITY_HOLD`;
- every review candidate remains absent from runtime authority.

No candidate is promoted merely because it is next in the queue.
