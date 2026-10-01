# EMOPET — Regional Pack evidence report

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED EXPLAINABILITY LAYER / NO NEW AUTHORITY`

## Purpose

Regional Pack release readiness was already fail-closed, but its result was mostly a yes/no verdict plus high-level blockers.

This slice adds a machine-readable evidence report so developers, reviewers and future admin surfaces can answer:

- which regional domains are required;
- which sources are candidates for each domain;
- which sources are actually release-ready;
- which source-rights blockers remain;
- whether rights evidence exists;
- whether a required domain is entirely unbound.

## Domain states

Each domain is classified as:

- `READY`: at least one bound source is release-ready;
- `BLOCKED`: candidate sources exist but none are release-ready;
- `UNBOUND`: no controlled source is bound at all.

This distinction matters.

For example, Bretagne currently has:

- events → DATAtourisme candidate, still blocked;
- culture → BCD/Bretania/etc. candidates, still blocked;
- canine network → required but intentionally unbound.

An unbound canine-network domain is different from a source that exists but is waiting on rights evidence.

## Source evidence

For every Regional Pack source binding, the report exposes only controlled repository state:

- source ID;
- bound domains;
- purpose;
- whether the source exists in the registry;
- ingestion-permitted verdict;
- public release-ready verdict;
- exact source-rights blockers;
- evidence state;
- release disposition;
- recheck date.

It does not transform public presence into partnership status.

## Why this helps

The report makes future regional rollout auditable.

A Normandy/Occitanie/etc. pack can be assessed using the same shape without changing the common engine.

It also prevents vague statements such as:

> “we have data for events”

when the actual repository state is:

> candidate source exists, but rights evidence is HOLD.

## Current Bretagne expectation

With current evidence, the Bretagne pack remains not release-ready because:

- profile is not production-ready;
- no regional lexicon term has review-backed VERIFIED status;
- required data domains have no release-ready source;
- canine network has no controlled source binding.

## Non-goals

This layer does not:

- enable any source;
- create source rights;
- validate cultural wording;
- create partnerships;
- alter scientific authority;
- expose private outreach/contact information;
- change product UI.

Related:
- PR #868 — Bretagne Regional Pack v1;
- #817 — language/reviewer intake;
- #835 — DATAtourisme source unlock;
- #836 — Région Bretagne dataset allow-list;
- #842/#847 — canine pilot candidate/outreach work.
