# EMOPET Legacy Freemium Retention Authority v0.1

**Status:** CONTROLLED NON-RELEASE RETENTION DECISION  
**Date:** 2026-09-09  
**Related:** #235, PR #224

## Decision

The historical `backend/db/seeds/freemium-templates-*` corpus is retained only as **non-release migration/regression evidence**.

It is not a secondary product-content authority, is not approved Breiz release content, and must not be reachable from production runtime or production seed flows.

The canonical Breiz release authority remains the controlled release registry/output path under `packages/ai-personality/src/bleiz/bleiz-release-*`.

## Enforced boundary

The retained corpus may be loaded only when both conditions are true:

1. `EMOPET_ALLOW_LEGACY_FREEMIUM_TEMPLATE_SEED=1` is set explicitly; and
2. `NODE_ENV !== production`.

If the legacy seed flag is requested in production, the seed process must fail rather than silently load the historical corpus.

The Security supply-chain authority gate runs `pnpm legacy-freemium:audit`, which must fail if:

- a retired `freemium-scheduler` reference returns;
- `freemium-templates-*` is referenced outside the backend seed quarantine;
- the DB insert is no longer behind the explicit opt-in gate;
- the production exclusion is removed from the allow decision.

## What retention permits

Retention permits narrow engineering work such as:

- migration comparison against canonical release templates;
- regression fixtures for detecting historical bypass behavior;
- controlled local/dev inspection of historical content shape.

Retention does **not** permit:

- publishing the historical corpus;
- scheduling it through a release runtime;
- treating historical `enabled` flags as release approval;
- importing entries into canonical authority without item-level review;
- enabling the seed flag in production.

## Exit criteria

The corpus may later be deleted when migration/regression evidence no longer needs it. Individual entries may move into canonical release authority only through the same semantic, scientific/content, provenance and release review applied to new canonical entries.

This document makes no claim that the historical content is correct, safe, scientifically validated or suitable for release. It records only why the files remain in the repository and the boundary that keeps them non-release.
