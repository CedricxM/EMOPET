# EMOPET — Bretagne RNR licence clarification response flow

**Date:** 2026-10-02  
**Status:** `IMPLEMENTED RESPONSE + HUMAN DECISION FLOW / CURRENT RIGHTS STATE STILL HOLD`

## Purpose

The Région Bretagne RNR dataset already has a controlled licence-version conflict:

- primary dataset metadata says generic `Licence ouverte`;
- the historical linked PDF is identified as Licence Ouverte 1.0;
- the current canonical Etalab page states Licence Ouverte 2.0;
- the data.gouv mirror states version 2.0.

EMOPET therefore keeps runtime rights on HOLD until the exact dataset publisher
confirms the applicable version and reuse obligations.

This slice defines what happens **after** such a primary-publisher answer is
received. It does not send the clarification request and it does not simulate a
reply.

## Evidence chain

`primary-publisher reply / corrected primary metadata`
→ `validated clarification response`
→ `HUMAN_CODE_REVIEW_REQUIRED proposal`
→ `human code/data-rights decision`
→ `MANUAL_RUNTIME_PATCH_REQUIRED clarification-register candidate`

There is no automatic path to rights GO.

## Accepted authoritative response forms

Only two evidence kinds are accepted:

- `PRIMARY_PUBLISHER_REPLY`;
- `CORRECTED_PRIMARY_METADATA`.

The response must explicitly resolve:

- exact dataset ID;
- exact source version;
- applicable Licence Ouverte version: `1.0` or `2.0`;
- whether the historical PDF pointer is stale or intentionally authoritative;
- attribution requirement;
- last-update-date display requirement;
- any additional portal/API/service conditions.

The authority must be recorded as:

`PRIMARY_PUBLISHER_CONFIRMATION`.

Secondary catalogues cannot satisfy this gate by themselves.

## Reviewer identity vs evidence

The response keeps separate controlled references for:

- the publisher/authority identity or role;
- the actual reply/corrected-metadata evidence.

Private contact details are not required in the public repository.

## Human code/data-rights decision

A valid response still creates only:

`HUMAN_CODE_REVIEW_REQUIRED`.

A separate repository reviewer may choose:

- `ACCEPT`;
- `REJECT`;
- `REQUEST_CHANGES`.

Every decision is bound to a SHA-256 fingerprint of the exact proposal plus:

- dataset ID;
- source version;
- reviewer role/reference;
- decision timestamp;
- decision evidence receipt.

Proposal drift after review invalidates the decision.

## ACCEPT boundary

An ACCEPT decision must explicitly confirm that:

- field-approval evidence is unchanged;
- schema evidence is unchanged;
- runtime ingestion is still blocked;
- partnership status is unchanged.

The output is only a manual register-patch candidate:

`MANUAL_RUNTIME_PATCH_REQUIRED`

with:

- `canApplyAutomatically: false`;
- `runtimeIngestionAllowed: false`;
- `fieldApprovalChangeAllowed: false`;
- `schemaEvidenceChangeAllowed: false`;
- `partnershipClaimAllowed: false`.

The candidate may contain a proposed licence-clarification register transition
to `CONFIRMED / GO`, but that transition is not written automatically.

## Outreach status evidence

The existing clarification register previously required
`messageSent: false` forever.

The gate now permits `messageSent: true` only when a controlled
`messageEvidenceRef` exists.

This allows future real outreach to be represented without weakening evidence
requirements.

Current repository state remains:

- `messageSent: false`;
- no message evidence;
- no authoritative confirmation;
- rights disposition `HOLD`;
- `releaseAllowed: false`.

## Independence from field/schema gates

A licence confirmation cannot approve product fields.

A field review cannot grant reuse rights.

A schema capture cannot grant reuse rights.

All remain independently required before any record retrieval can become
release-ready.

Even if the clarification register later reaches rights `GO`, runtime
ingestion still requires the separate dataset field/schema/release gates.

## CI

Security supply-chain now exercises:

`scripts/control/bretagne-rnr-licence-clarification-response.test.mjs`

Tests cover:

- exact primary-publisher response;
- source/dataset/authority/date drift;
- licence-version and legacy-pointer resolution;
- required attribution/update/service conditions;
- proposal fingerprint drift;
- ACCEPT boundary confirmations;
- REJECT / REQUEST_CHANGES non-application;
- manual-only patch candidate;
- evidence-backed outreach status.

## Non-goals

This slice does not:

- contact Région Bretagne;
- claim a publisher response exists;
- choose Licence Ouverte 1.0 or 2.0;
- apply rights GO;
- enable ingestion;
- approve record fields;
- alter schema evidence;
- create a partnership;
- provide legal advice.

Related:

- #836 — Région Bretagne open-data workstream;
- #116 — third-party data/service rights;
- current RNR licence clarification HOLD register;
- current RNR field-review flow.
