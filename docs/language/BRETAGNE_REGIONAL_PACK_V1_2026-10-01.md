# EMOPET — Bretagne Regional Pack v1

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED COMPOSITION / FAIL-CLOSED / NOT RELEASE READY`

## Purpose

The Regional Pack makes “Bretagne first, then replicate region by region” executable.

It composes existing authorities without replacing them:

- regional profile for identity/routing;
- regional knowledge base for reviewed local knowledge;
- regional lexicon for culturally reviewed wording;
- Breiz source registry for third-party rights/provenance;
- MotsPet upstream for controlled public-language meaning.

## Required Bretagne domains

The first Bretagne pack requires evidence in:

1. territorial context;
2. culture;
3. events;
4. canine network.

A required domain with no release-ready source keeps the whole pack blocked.

## Current candidate bindings

The pack currently points to controlled source-registry candidates for:

- Région Bretagne open data;
- GéoBretagne;
- data.gouv.fr;
- BCD / Bécédia;
- Bretania;
- Patrimoine de Bretagne;
- POP;
- DATAtourisme;
- SIRENE.

A source binding means only:

> this source could satisfy this domain if its existing rights/provenance gate becomes release-ready.

It does **not** mean partner, approved source, or ingestion permission.

## Canine-network discipline

The `canine_network` domain is required but intentionally has **no source binding** in this pack yet.

That is deliberate.

The project has a separate candidate/pilot workstream for ACT Bretagne and clubs. Public organisational evidence or draft outreach is not enough to turn those organisations into a production data source.

Until exact source/reuse/update evidence exists, this domain remains a hard blocker.

## Language discipline

The pack currently declares only:

- `fr-FR`.

Breton and Gallo are not advertised as supported product locales until:

- named linguistic review exists;
- reviewed terms have receipts;
- product locale coverage exists;
- cross-locale semantic QA proves no change to truth class, confidence, provenance, privacy or medical boundaries.

## Release-readiness evaluator

`evaluateRegionalPackReleaseReadiness()` fails closed on:

- profile/knowledge region mismatch;
- profile not `PRODUCTION_READY`;
- no review-backed regional lexicon term;
- unknown source binding;
- any required domain without at least one release-ready source.

With current repository evidence, Bretagne is expected to remain **NOT release-ready**.

## Replication rule

A future territory should add:

- one reviewed RegionalProfile;
- one RegionalKnowledgeBase;
- one regional lexicon/review set;
- one Regional Pack;
- source bindings for that territory.

The common semantic/scientific engine should not need to change.

## Non-goals

This slice does not:

- activate DATAtourisme;
- grant BCD/Bretania rights;
- claim a canine-club partnership;
- validate Breton/Gallo;
- promote Bretagne to production;
- change ELI/scientific authority.

Related:
- PR #830 — MotsPet v0.2 foundation;
- #817 — language/reviewer intake;
- #835 — DATAtourisme unlock;
- #836 — Région Bretagne open-data allow-list;
- #842/#847 — canine pilot candidate/outreach work.
