# EMOPET — Bretagne RNR field review decision gate

**Date:** 2026-10-02  
**Status:** `IMPLEMENTED HUMAN DECISION GATE / MANUAL RUNTIME PATCH STILL REQUIRED`

## Purpose

The existing Bretagne RNR flow now has three distinct human boundaries:

`live schema -> field review packet -> reviewer response -> approval proposal -> code-review decision`

A reviewer response is not runtime authority.

A valid proposal still requires a separate human code/data-control decision before it can become a candidate for `BretagneDatasetFieldApprovalEvidence`.

## Exact proposal binding

Every code-review decision binds the exact proposal by:

- proposal revision;
- SHA-256 proposal fingerprint;
- dataset ID;
- source version;
- schema fingerprint;
- exact approved field list in exact order.

If any reviewed proposal content changes after the decision, the decision fails closed.

## Allowed code-review decisions

### ACCEPT

Creates only a **field-approval evidence candidate**.

It still carries:

- `candidateStatus: MANUAL_RUNTIME_PATCH_REQUIRED`;
- `canApplyAutomatically: false`;
- `runtimeMutationAllowed: false`;
- `datasetStatusTransitionAllowed: false`;
- `rightsDispositionChangeAllowed: false`.

Acceptance therefore does not edit the dataset descriptor and does not move the dataset to `RELEASE_READY`.

### REJECT

Records a valid human code-review decision but creates no field-approval evidence candidate.

### REQUEST_CHANGES

Requires an explicit reason and creates no field-approval evidence candidate.

## Human evidence required

Every decision requires:

- code reviewer role;
- code reviewer reference;
- non-future decision timestamp;
- controlled decision evidence reference.

An `ACCEPT` decision additionally requires explicit confirmation that:

- the purpose boundary remains intact;
- source-rights disposition is unchanged;
- proposal conditions are acknowledged when the original response was conditional.

## Purpose / rights separation

The code reviewer may approve the field-minimisation decision only.

They may **not** use that decision to:

- grant reuse rights;
- clear the licence-version HOLD;
- change source rights to GO;
- move the dataset to `RELEASE_READY`;
- enable ingestion;
- infer dog access, leash rules, opening hours, safety or dog-friendliness.

Those remain independent gates.

## Current runtime state

Nothing is approved or applied.

The current RNR candidate field set remains:

- `id`;
- `nom`;
- `geo_point_2d`.

No field-approval evidence has been written to the runtime dataset descriptor.

## CI

The Security supply-chain workflow now runs:

`scripts/data/bretagne-rnr-field-review-decision.test.mjs`

Coverage includes:

- deterministic proposal fingerprint;
- exact ACCEPT decision;
- proposal drift invalidation;
- source/schema/dataset/field mismatch;
- conditional-approval acknowledgement;
- purpose/right boundary confirmation;
- REJECT / REQUEST_CHANGES non-application;
- future/incomplete human evidence;
- automatic-runtime-mutation rejection.

## Non-goals

This slice does not:

- approve any RNR field;
- write `fieldApprovalEvidence` into runtime;
- change `allowedRecordFields`;
- resolve data rights;
- create a reviewer;
- enable ingestion;
- provide legal advice.

Related:

- PR #995 — field-approval evidence gate;
- PR #996 — live-schema-derived review packet;
- PR #997 — human-gated review response proposals;
- #836 — Région Bretagne data workstream;
- #989 — dataset-scoped Regional Pack readiness.
