# MotsPet — legacy UI migration map v3

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED INVENTORY / REPLACEMENTS STILL OPEN / REBASED ON MotsPet v0.3`

## Purpose

The web FR/EN dictionary still contains historical public copy that predates the current Care/Experience/MotsPet doctrine.

The goal is not a blind global replacement.

The goal is to bind each known legacy surface to:

- the exact current FR/EN copy;
- a migration disposition;
- an existing controlled MotsPet concept where one already exists;
- explicit product/science/language authority;
- a rationale for why replacement remains open.

Machine-readable authority:

`apps/web/lib/language/motspet-legacy-migration.ts`

## Current mapped debt

The v3 map preserves the same known UI debt while rebasing its controlled targets on the broader MotsPet v0.3 authority:

- `dashboard.balanceIndex`;
- `bienEtre.eyebrow`;
- `bienEtre.title`;
- `bienEtre.lead`;
- `nav.dashboard`;
- `nav.bienEtre`.

CI compares the map with the live FR/EN dictionary so silent text drift becomes visible.

## Important distinction

A legacy string may be:

1. known debt;
2. mapped to a controlled concept;
3. approved for replacement;
4. actually migrated in UI.

Those states are deliberately separate.

Example:

`dashboard.balanceIndex = "Indice d'équilibre (ELI)"`

remains:

`OPEN_REMOVE_GLOBAL_INDEX_LANGUAGE`

with no replacement concept.

This blocks the tempting but invalid move of renaming one global score into another.

## Current controlled mapping

The confidence component of the historical wellbeing lead can point to the controlled `confidence` MotsPet concept.

That does not approve the surrounding generic wellbeing claim.

## Migration sequence

For each mapped surface:

1. identify the user task;
2. identify the actual bounded observations available;
3. select only controlled MotsPet concepts;
4. draft FR/EN copy;
5. run semantic QA;
6. update visible dictionary copy;
7. lower/remove the legacy vocabulary ratchet;
8. retire the migration entry when the old wording no longer exists.

## Relationship to other work

- PR #830: MotsPet v0.2 foundation;
- PR #866: cross-locale semantic QA;
- PR #881: MotsPet v0.3 observation-contract expansion;
- PR #820: legacy vocabulary downward ratchet.

## Non-goals

This slice does not:

- alter visible UI copy;
- rename ELI;
- select a new wellbeing score;
- create scientific claims;
- validate regional wording;
- replace the ratchet;
- declare final replacement wording.


## v0.3 reconciliation

This migration map now runs after the v0.3 observation-contract expansion.

Any non-null `targetConceptId` must therefore resolve against the v0.3 runtime MotsPet registry and remain `CONTROLLED_SEED`.

The migration map still does **not** approve replacement copy. It only prevents known legacy text from drifting away from its governing language/science decisions.
