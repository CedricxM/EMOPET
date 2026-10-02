# EMOPET — Bretagne language review response proposals

**Date:** 2026-10-02  
**Status:** `IMPLEMENTED REVIEW-RESPONSE INTAKE / HUMAN APPLY REQUIRED / NO TERM PROMOTED`

## Purpose

The runtime-derived Bretagne review packet defines the exact claims that an external language/culture reviewer may assess.

This slice defines the next boundary:

`review packet -> external response -> validated proposal -> human repository review -> runtime authority update`

It deliberately stops before the final runtime update.

No external response can automatically mark a companion identity or regional lexicon term `VERIFIED`.

## Response contract

Each response must carry:

- exact packet revision;
- exact item ID;
- item kind: `IDENTITY` or `LEXICON`;
- disposition:
  - `APPROVED`;
  - `APPROVED_WITH_CONDITIONS`;
  - `REJECTED`;
- reviewer role;
- controlled reviewer reference;
- valid non-future review timestamp;
- controlled evidence reference;
- approved meaning/claim;
- permitted usage;
- conditions/restrictions;
- attribution/reuse requirements.

## Exactness rules

For approved/conditionally approved lexicon responses:

- approved meaning must exactly match the packet meaning;
- permitted usage must exactly match the packet usage category.

For the companion identity:

- the approval claim must bind the exact packet bundle:
  - assistant name;
  - assistant-name origin;
  - naming rule.

A changed packet revision, changed meaning, changed usage or changed identity claim invalidates the response proposal. Reviewer identity is also kept separate from the evidence receipt: `reviewerRef` identifies the reviewer record while `evidenceReference` identifies the reviewed evidence.

## Conditional approval

`APPROVED_WITH_CONDITIONS` requires explicit non-empty conditions/restrictions.

The system does not silently downgrade conditional approval into ordinary approval.

## Rejection

A `REJECTED` response may be stored as valid review evidence but produces no runtime-apply proposal.

This distinction is important:

`valid response evidence != permission to publish`

## Proposal state

Approved responses create only:

`HUMAN_REVIEW_REQUIRED`

proposals.

Every proposal explicitly carries:

`canApplyAutomatically: false`

The module never mutates:

- `BRETAGNE_PROFILE`;
- `BRETAGNE_REGIONAL_PACK.identityEvidence`;
- `REGIONAL_LEXICON`;
- any `VERIFIED` status.

A human/code-review step must still decide whether and how to apply the evidence.

## Partial review support

Reviewers do not have to answer the entire packet at once.

Batch evaluation distinguishes:

- all received responses valid;
- complete packet coverage;
- missing review items;
- duplicate item responses.

A partial valid response set remains partial and cannot be misrepresented as full review coverage.

## Duplicate protection

Two responses for the same item make the batch non-complete and non-valid for progression until reconciled.

This prevents multiple contradictory replies from being silently collapsed.

## Current Bretagne state

Nothing changes in runtime authority.

Current expected live status remains:

- companion identity: pending review;
- `bretagne_demat`: pending review;
- `bretagne_ar_veute`: pending review.

No reviewer has been selected or recorded by this module.

## Non-goals

This slice does not:

- send outreach;
- read email automatically;
- appoint a reviewer;
- validate Breton or Gallo;
- apply received evidence to runtime;
- create a partnership/endorsement;
- alter MotsPet or ELI scientific authority.

Related:

- #821 — Bretagne reviewer/source outreach;
- PR #991 — exact regional lexicon review binding;
- PR #992 — runtime-derived Bretagne review packet.
