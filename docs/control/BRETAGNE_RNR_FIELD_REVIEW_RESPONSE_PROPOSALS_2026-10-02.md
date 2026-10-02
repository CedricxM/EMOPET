# EMOPET — Bretagne RNR field review response proposals

**Date:** 2026-10-02  
**Status:** `IMPLEMENTED RESPONSE INTAKE / HUMAN CODE REVIEW REQUIRED / NO FIELD PROMOTED`

## Purpose

The RNR field review packet identifies the exact candidate fields that a human product/data reviewer may assess.

This slice defines the next boundary:

`field review packet -> reviewer response -> validated proposal -> human code review -> runtime field-approval receipt`

The response itself never changes runtime authority.

## Exact binding

Every response must match the packet's exact:

- packet revision;
- dataset ID;
- source version;
- schema fingerprint.

A response to an older schema or older source version cannot authorize the current dataset.

## Review evidence

Every response requires:

- reviewer role;
- reviewer reference;
- non-future review timestamp;
- controlled evidence reference;
- explicit purpose-boundary confirmation.

The response may not claim automatic application.

## Allowed dispositions

### APPROVE

Requires at least one approved field.

Every approved field must come from the packet's candidate field set.

### APPROVE_WITH_CONDITIONS

Same field constraints as approval, plus explicit non-empty conditions/restrictions.

### REJECT

May be recorded as valid review evidence but:

- must carry no approved fields;
- creates no field-approval proposal.

## Candidate-only boundary

The current packet candidates are:

- `id`;
- `nom`;
- `geo_point_2d`.

A response cannot smuggle in:

- `description`;
- `image`;
- `geo_shape`;
- any other deferred/non-candidate field.

Such a response fails validation.

## Proposal state

A valid approval creates only:

`HUMAN_CODE_REVIEW_REQUIRED`

with:

`canApplyAutomatically: false`

The proposal contains the exact material needed for a future
`BretagneDatasetFieldApprovalEvidence` review:

- approved fields;
- source version;
- schema fingerprint;
- reviewer role/reference;
- review timestamp;
- evidence receipt;
- purpose boundary;
- any conditions.

The proposal is not written into runtime automatically.

## Purpose boundary

The reviewer must explicitly confirm the packet's territorial-context boundary.

Approval therefore cannot be repurposed as authority for:

- dog access;
- leash rules;
- opening hours;
- seasonal restrictions;
- safety;
- dog-friendliness.

## Current runtime state

Nothing changes.

The RNR dataset still has:

- no approved runtime fields;
- no field-approval evidence;
- licence-version clarification HOLD;
- no rights GO;
- no runtime record retrieval.

## CI

The response contract is exercised in the Security supply-chain workflow.

Tests cover:

- exact valid approval;
- packet/source/schema drift;
- unknown or duplicate fields;
- conditional approval without conditions;
- rejection behaviour;
- future timestamps/missing evidence;
- missing purpose-boundary confirmation;
- attempted automatic-apply override.

## Non-goals

This slice does not:

- approve the candidate field set;
- apply a proposal to runtime;
- resolve source rights;
- create a reviewer;
- provide legal advice;
- enable ingestion.

Related:

- PR #995 — field-approval evidence gate;
- PR #996 — live-schema-derived field review packet;
- #836 — Région Bretagne data workstream;
- #989 — dataset-scoped Regional Pack readiness.
