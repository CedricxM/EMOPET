# EMOPET — MotsPet candidate concept inventory v3

**Date:** 2026-10-02  
**Status:** `IMPLEMENTED REVIEW INVENTORY / RECONCILED WITH MotsPet v0.4 / NOT NEW RUNTIME AUTHORITY`

## Purpose

The candidate inventory is the review queue around MotsPet, not a second public dictionary.

With v0.4, `uncertainty` and `trend` move from candidate review into controlled runtime authority because their semantic boundaries are already supported by Care, Experience and Product Authority doctrine.

## Newly reconciled concepts

### `uncertainty`

Inventory state:

`EXISTING_CONTROLLED`

Runtime target:

`uncertainty`

The concept remains distinct from:

- confidence;
- insufficient evidence;
- reassurance.

### `trend`

Inventory state:

`EXISTING_CONTROLLED`

Runtime target:

`trend`

The concept means only bounded longitudinal change for a named observation with explicit reference/time context.

It does not authorize a generic ELI/wellbeing trend.

## Remaining candidate-review queue

The queue is now:

1. `share_scope`;
2. `explicit_preference`;
3. `moment`;
4. `memory`;
5. `community_visibility`.

These five entries remain outside runtime MotsPet authority.

## HOLD

`activation_change` remains:

`AUTHORITY_HOLD`

Its presence in the runtime registry does not authorize public use.

## Reconciliation invariant

The inventory audit remains bidirectional:

- every `EXISTING_CONTROLLED` entry must resolve to exactly one runtime `CONTROLLED_SEED`;
- every `AUTHORITY_HOLD` entry must resolve to runtime `HOLD`;
- every `CANDIDATE_REVIEW` entry must have no runtime authority;
- every runtime MotsPet entry must appear exactly once in this inventory.

This prevents review planning and runtime language from drifting apart.

## Next review order

The next candidates should not all be promoted at once.

A reasonable evidence order is:

- `share_scope`: privacy/Owner-authority wording;
- `explicit_preference`: relationship vs inference boundary;
- `moment` / `memory`: intentional relationship continuity;
- `community_visibility`: audience/privacy boundary.

Each promotion still requires its own semantic contract and cross-locale QA.
