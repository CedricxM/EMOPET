# EMOPET — Legacy public-vocabulary ratchet

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED REGRESSION GUARD / MIGRATION STILL OPEN`

## Purpose

The web translation dictionary still contains historical public wording that predates the current Care/product doctrine and the MotsPet workstream.

This record does not re-authorise that wording. It freezes a maximum-count baseline so the debt can only decrease while the controlled language migration is prepared.

## Guarded legacy phrases

The automated web test currently ratchets the following families downward:

- global `Indice d'équilibre / Balance index` wording;
- `Bien-être · ELI / Well-being · ELI` labels;
- generic `Indicateurs de bien-être / well-being indicators` claims;
- `ELI · Dashboard` navigation wording.

The baseline is a **maximum**, not an expected permanent count. Deleting or migrating an occurrence passes the guard. Adding another occurrence fails.

## Why this is intentionally a ratchet

The current repository contains production-ineligible or legacy copy while later doctrine says:

- no generic health/wellbeing score;
- no naked number;
- user-facing observations require context/provenance/confidence and limits;
- scientific/internal terminology is not automatically public vocabulary.

Mass replacement without a controlled lexicon would risk creating a different semantic inconsistency.

The correct migration order is:

1. controlled concept/term inventory;
2. authority and reviewer mapping;
3. MotsPet wording decision;
4. UI migration;
5. reduce the ratchet budget to zero.

## Non-goals

This guard does not:

- validate replacement wording;
- change UI copy;
- change ELI science;
- declare the legacy phrases safe;
- block unrelated translations;
- replace the MotsPet registry.

Related language/data work is tracked in #817 and PR #815.
