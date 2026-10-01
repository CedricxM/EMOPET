# EMOPET — Bretagne canine pilot status evidence gate

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED FAIL-CLOSED RELATIONSHIP STATUS GATE / NO OUTREACH EVIDENCE YET`

## Purpose

The Bretagne canine pilot register contains candidate organisations and a relationship status.

That status must never advance because someone edits one JSON field.

This gate binds every non-initial status to a controlled evidence receipt.

## Controlled files

Candidate register:

`config/partnerships/bretagne-canine-pilot-candidates-v1.json`

Evidence registry:

`config/partnerships/bretagne-canine-pilot-evidence-v1.json`

Validator:

`scripts/control/bretagne-canine-pilot-evidence.mjs`

The evidence registry is intentionally empty today.

## Status-to-evidence mapping

- `CANDIDATE_NOT_CONTACTED` -> no communication receipt may exist;
- `OUTREACH_SENT` -> `OUTBOUND_MESSAGE`;
- `RESPONSE_RECEIVED` -> `INBOUND_MESSAGE`;
- `PILOT_SCOPE_DISCUSSION` -> `PILOT_DISCUSSION_NOTE`;
- `LETTER_OF_INTEREST_RECEIVED` -> `LETTER_OF_INTEREST`;
- `DECLINED` -> `DECLINE`;
- `DEFERRED` -> `INTERNAL_DEFER_DECISION`.

A status without its matching receipt fails CI.

## Receipt minimum

A receipt must contain:

- unique receipt ID;
- exact candidate ID;
- exact relationship status;
- bounded evidence type;
- non-future timestamp;
- controlled evidence reference;
- short summary;
- `containsPersonalData: false`;
- `partnershipClaimAllowed: false`.

The repository should preserve only the minimum non-sensitive evidence pointer required to justify status.

Email bodies, named private contacts or club-member data do not belong in this registry.

## Candidate-register guards

The validator also enforces:

- unique candidate IDs;
- allowed relationship status;
- HTTPS-only public evidence sources;
- `partnershipClaimAllowed === false`;
- `contactDataStored === false`.

This makes the candidate register unsuitable for quietly becoming a CRM or a partner-claim list.

## Current state

All current candidates remain:

`CANDIDATE_NOT_CONTACTED`

and the evidence registry has zero receipts.

Therefore the current repository state passes without claiming:

- outreach;
- response;
- pilot interest;
- letter of interest;
- partnership;
- endorsement.

## CI

The evidence test is wired into the repository control-authority section of the Security supply-chain workflow.

A future status edit without the required evidence receipt turns CI red.

## Non-goals

This gate does not:

- send outreach;
- access Gmail;
- store personal contact information;
- recruit participants;
- create pilot approval;
- create partnership status;
- grant club-directory data rights;
- alter scientific or regional product authority.

Related:
- PR #880 — current-main candidate register;
- PR #886 — draft outreach pack;
- #821 — Bretagne reviewer/source outreach;
- PR #868/#876/#887 — Regional Pack evidence stack.
