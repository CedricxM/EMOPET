# EMOPET — Regional Pack evidence report v2

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED EXPLAINABILITY LAYER / IDENTITY-AWARE / NO NEW AUTHORITY`

## Purpose

Regional rollout now has several independent gates:

- profile readiness;
- companion identity review;
- regional lexicon review;
- third-party source rights;
- required regional data-domain coverage.

A single boolean is not enough to explain why a region is still blocked.

This report turns the existing gates into a machine-readable evidence view for developer/admin use.

## Identity evidence

The report exposes the current companion identity state without manufacturing approval.

For Bretagne it currently reports:

- assistant name: `Breiz`;
- identity review state: `PENDING_REVIEW`;
- identity release-ready: `false`;
- no review date;
- no reviewer role;
- no reviewer reference;
- no review receipt.

This is intentionally separate from regional vocabulary review.

A reviewed greeting does not validate the companion name, and a reviewed companion name does not validate the rest of the regional lexicon.

## Domain states

Each Regional Pack data domain is classified as:

- `READY`: at least one bound source is release-ready;
- `BLOCKED`: candidate sources exist but none are release-ready;
- `UNBOUND`: no controlled source is bound at all.

Current Bretagne examples:

- events -> DATAtourisme candidate, blocked by source-rights evidence;
- culture -> BCD/Bretania/etc. candidates, blocked;
- canine network -> required but intentionally unbound.

## Source evidence

For every source binding, the report surfaces repository evidence only:

- source ID;
- source-registry presence;
- bound domains;
- ingestion-permitted verdict;
- public release-ready verdict;
- exact rights blockers;
- evidence state;
- release disposition;
- recheck date.

Candidate status is never converted into partnership, endorsement or approval.

## Why this matters

The report gives future regional rollout a repeatable audit shape.

A future Normandie, Occitanie, Île-de-France or international pack can be evaluated through the same evidence model without changing the common scientific/semantic engine.

It also makes investor/product statements easier to keep honest:

> source candidate exists

is materially different from:

> rights evidence complete and release-ready.

## Current Bretagne expectation

The Bretagne pack remains blocked because:

- profile is not production-ready;
- companion identity has no review receipt;
- no regional lexicon term is release-ready;
- required data domains have no release-ready sources;
- canine-network evidence is still unbound.

## Non-goals

This layer does not:

- validate the name Breiz;
- appoint or identify a reviewer;
- enable any data source;
- create data rights;
- create partnerships;
- expose private outreach/contact information;
- change product UI;
- alter ELI/scientific authority.

Related:
- PR #830 — MotsPet v0.2;
- PR #868 — Bretagne Regional Pack v1;
- PR #876 — regional identity evidence gate;
- #817 — language/reviewer intake;
- #835 — DATAtourisme source unlock;
- #836 — Région Bretagne dataset allow-list;
- #880/#886 — canine candidate/outreach work.
