# EMOPET — Bretagne language-review outreach status gate

**Date:** 2026-10-02  
**Status:** `IMPLEMENTED PREPARATION/RELATIONSHIP SEPARATION / NO OUTREACH SENT`

## Purpose

EMOPET now distinguishes:

- **outreach preparation**: a draft may exist internally;
- **relationship state**: whether the exact organisation was actually contacted;
- **review authority**: whether an organisation/person has actually agreed to review a bounded item.

A prepared email draft is not evidence that outreach was sent.

## Current candidates

### OPLB / TermBret

- preparation: `DRAFT_PREPARED`;
- relationship: `CANDIDATE_NOT_CONTACTED`;
- reviewer claim: forbidden;
- partnership claim: forbidden.

### Institut du Galo

- preparation: `DRAFT_PREPARED`;
- relationship: `CANDIDATE_NOT_CONTACTED`;
- reviewer claim: forbidden;
- partnership claim: forbidden.

The repository stores only public organisational sources and bounded proposed review items. It does not store private contacts or email bodies.

## Evidence progression

Relationship status may advance only with a matching receipt:

- `OUTREACH_SENT` -> `OUTBOUND_MESSAGE`;
- `RESPONSE_RECEIVED` -> `INBOUND_MESSAGE`;
- `REVIEW_SCOPE_DISCUSSION` -> `REVIEW_SCOPE_DISCUSSION_NOTE`;
- `REVIEW_SCOPE_AGREED` -> `REVIEW_SCOPE_AGREEMENT`;
- `DECLINED` -> `DECLINE`;
- `DEFERRED` -> `INTERNAL_DEFER_DECISION`.

`CANDIDATE_NOT_CONTACTED` must remain receipt-free.

## Claim boundaries

Every candidate and every evidence receipt must keep:

- `partnershipClaimAllowed: false`;
- `reviewerClaimAllowed: false`;
- `contactDataStored: false` for candidates;
- `containsPersonalData: false` for receipts.

An outbound message is not a partnership.

A response is not reviewer appointment.

A review-scope discussion is not linguistic validation.

Only the separate Bretagne language-review packet/response/decision flow may later produce a bounded review-evidence candidate.

## Current external-action state

No outbound evidence is recorded for OPLB/TermBret or Institut du Galo.

Therefore GitHub truth remains:

`DRAFT_PREPARED + CANDIDATE_NOT_CONTACTED`

until an actual send action and controlled evidence receipt exist.

## CI

Security supply-chain runs:

`scripts/control/bretagne-language-review-outreach.test.mjs`

The gate prevents a future edit from turning a draft into `OUTREACH_SENT` without evidence.

## Non-goals

This gate does not:

- send email;
- appoint a reviewer;
- validate Breiz, Demat or Ar Veute;
- create partnership/endorsement;
- expose private contact data;
- alter MotsPet/ELI authority.

Related: #821 and the consolidated Bretagne language-review flow.


## Packet binding

Communication evidence is now bound to the exact current review packet rather than merely to an organisation.

For evidence types that represent actual language-review communication:

- `OUTBOUND_MESSAGE`;
- `INBOUND_MESSAGE`;
- `REVIEW_SCOPE_DISCUSSION_NOTE`;
- `REVIEW_SCOPE_AGREEMENT`;

the receipt must carry:

- the exact `currentPacketRevision`;
- a unique non-empty `reviewItemIds` list;
- only items that already exist in that candidate's `proposedReviewItems`.

This prevents a generic email or a later scope expansion from being reused as evidence that a different Breiz/lexicon packet was reviewed.

CI also checks that the outreach register's `currentPacketRevision` still matches the runtime Bretagne language-review packet constant.
