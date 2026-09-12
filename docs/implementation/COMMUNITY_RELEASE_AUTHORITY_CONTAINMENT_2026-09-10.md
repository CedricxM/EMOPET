# Community Product V1 release-authority containment — 2026-09-10

**Status:** `CANDIDATE IMPLEMENTED / CODE CHECKPOINT CI PASS / PENDING MERGE`  
**Parent:** #98 `G-COMMUNITY-DATA-PLANE-01`  
**Branch:** `experience-hardening-2026-09-06`  
**Validated code checkpoint:** `48e8892adda30e0201379d2427ac2c4f830c59cd`

## Purpose

Prevent the historical Next.js/browser Community prototype from silently becoming Product V1 shared-data authority while the Hono/PostgreSQL Community persistence and lifecycle model remains unavailable.

This slice is containment and product-truth hardening. It does **not** implement durable Community persistence, choose a complete membership/rules lifecycle, or close #98.

## Authority decision implemented

Product V1 Community authority is represented as:

`Hono + durable Product V1 persistence`

The current Hono router still fails closed with `COMMUNITY_PERSISTENCE_NOT_READY` rather than returning success or authoritative empty data where durable Community persistence is absent.

The historical Next.js JSON-store plane is classified as legacy demo only:

- disabled by default;
- cannot be enabled in production;
- requires explicit non-production `EMOPET_ALLOW_LEGACY_COMMUNITY_DEMO=1`;
- returns `LEGACY_COMMUNITY_DATA_PLANE_DISABLED` otherwise.

## Server-route containment

The canonical gate is `apps/web/lib/server/community-authority.ts`.

All current Next.js Community handlers under `apps/web/app/api/community/**/route.ts` are required to invoke that gate before their prototype storage behavior:

- posts;
- events;
- replies;
- flag/moderation signal.

A recursive regression test enumerates the Community route tree and requires every exported HTTP handler to import and call `legacyCommunityAuthorityGate()`.

## Client false-success correction

`apps/web/app/quartier/CommunitySection.tsx` previously allowed a failed server operation to fall through to browser state and still present a success message. That could make a 503 from the newly fail-closed server plane look like a successful shared Community action.

The client now separates three states:

- `checking`;
- `legacy-demo`;
- `unavailable`.

Unless the explicit non-production legacy server demo is actually available:

- local Community prototype content is labelled as demonstrative;
- shared actions are not represented as successful;
- join/post/reply/event/report/participation attempts fail with an availability explanation;
- posts/events/replies are not fabricated locally after server failure;
- the old offline/local-success fallback is removed.

A static regression test forbids the known local fabricated-entity pattern and the old local shared-success fallback wording.

## Evidence

Validated code checkpoint `48e8892adda30e0201379d2427ac2c4f830c59cd`:

- P0 DB baseline run `34451499854`: **PASS**;
- Security run `34451499816`: **PASS**;
- frozen install: **PASS**;
- dependency HIGH/CRITICAL gate: **PASS**;
- workspace typecheck/tests: **PASS**;
- web build + regression enforcement: **PASS**;
- authority gates: **PASS**;
- CodeQL exact-commit evidence gate: **PASS**;
- Semgrep: **PASS**;
- Gitleaks: **PASS**;
- dependency licence evidence inventory: **PASS**;
- CycloneDX/SPDX SBOM: **PASS**;
- release provenance gate: **PASS**.

The later documentation-only commit that records this evidence does not change the validated Community runtime behavior.

## Remaining open work

`G-COMMUNITY-DATA-PLANE-01 = OPEN`.

Still required before Product V1 Community can be promoted:

- durable Hono/PostgreSQL read/write transactions;
- canonical authenticated identity/session integration;
- durable membership and Community-rules acceptance authority;
- authorship/ownership and moderation authorization;
- read-after-write evidence;
- lifecycle/retention/erasure reconciliation with PRIV-01;
- release UX that consumes the canonical backend rather than the legacy demo plane;
- controlled integration/security tests.

## Boundary

This record is not release authority, privacy sign-off, production readiness, or evidence that the Community feature has been user-validated. It documents containment of known false-authority paths while the real Product V1 data plane remains intentionally unavailable.
