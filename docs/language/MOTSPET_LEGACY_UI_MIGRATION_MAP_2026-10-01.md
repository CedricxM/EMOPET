# MotsPet — legacy UI migration map

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED INVENTORY / REPLACEMENTS STILL OPEN`

## Purpose

The current web dictionary still contains historical public copy that predates the later Care/Experience language doctrine.

The goal is not to perform a blind global search/replace.

The goal is to make each known legacy surface explicit before replacing it.

Machine-readable authority:

`apps/web/lib/language/motspet-legacy-migration.ts`

## Current mapped debt

The first migration map covers:

- `dashboard.balanceIndex`
- `bienEtre.eyebrow`
- `bienEtre.title`
- `bienEtre.lead`
- `nav.dashboard`
- `nav.bienEtre`

The map preserves the exact current FR/EN strings so CI can detect silent drift.

## Important rule

A legacy term can have three separate states:

1. **known debt**;
2. **mapped to an existing controlled MotsPet concept**;
3. **replacement wording approved**.

Those are not the same thing.

For example:

`dashboard.balanceIndex = "Indice d'équilibre (ELI)"`

is now explicitly mapped as:

`OPEN_REMOVE_GLOBAL_INDEX_LANGUAGE`

with no replacement concept selected.

This prevents a developer from solving the problem by simply renaming one global score into another.

## Current controlled mapping

The only first-slice mapping that points at an existing MotsPet concept is the confidence component of the legacy wellbeing lead.

That does **not** approve the rest of the sentence.

The generic “well-being indicators” framing remains open.

## Migration sequence

For each mapped surface:

1. identify the user task;
2. identify the observations actually available;
3. select only controlled MotsPet concepts;
4. write bounded FR/EN copy;
5. run semantic review;
6. update UI dictionary;
7. lower/remove the legacy ratchet budget;
8. remove the migration entry once no legacy authority remains.

## Non-goals

This slice does not:

- alter visible UI copy;
- rename ELI;
- select a new wellbeing score;
- create new scientific claims;
- validate regional wording;
- replace the existing legacy-vocabulary ratchet.

Related:
- PR #815 — MotsPet foundation
- PR #820 — legacy public-vocabulary ratchet
- #817 — MotsPet/Breiz data and reviewer intake
