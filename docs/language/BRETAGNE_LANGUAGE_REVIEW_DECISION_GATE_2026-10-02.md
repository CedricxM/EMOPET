# EMOPET — Bretagne language review human decision gate

**Date:** 2026-10-02  
**Status:** `IMPLEMENTED HUMAN REPOSITORY DECISION GATE / NO RUNTIME TERM PROMOTED`

## Purpose

The Bretagne language/culture flow now separates four authorities:

`runtime-derived packet -> external review response -> bounded proposal -> human repository decision`

An external reviewer can assess language/culture.

That response still cannot change runtime by itself.

A second human repository/code-review decision must confirm the evidence still matches the current runtime-derived packet before an identity/lexicon evidence candidate can be prepared.

## Reviewer identity and evidence are separate

External review now requires both:

- `reviewerRef`: controlled reference to the reviewer identity/role;
- `evidenceReference`: controlled reference to the actual review evidence.

They must not be conflated.

The repository does not need private contact details to preserve this distinction.

## Exact runtime binding

A human decision fails closed if the approved proposal no longer matches the current packet.

### Identity

The proposal must still match:

- companion name;
- name-origin explanation;
- naming rule;
- packet revision.

### Lexicon

The proposal must still match:

- exact term;
- exact French meaning;
- exact usage category;
- exact lexicon revision;
- packet revision.

Changing any of these after external review requires another review cycle.

## Human repository decisions

Allowed decisions:

- `ACCEPT`;
- `REJECT`;
- `REQUEST_CHANGES`.

Every decision requires:

- code reviewer role;
- code reviewer reference;
- non-future timestamp;
- controlled decision evidence reference.

`REQUEST_CHANGES` additionally requires an explicit reason.

## ACCEPT requirements

Acceptance requires the code reviewer to confirm:

- any external review conditions were read and acknowledged;
- any attribution/reuse requirements were acknowledged;
- MotsPet / ELI semantic authority remains unchanged;
- automatic apply remains forbidden.

## Output

A valid ACCEPT produces only:

`MANUAL_RUNTIME_PATCH_REQUIRED`

### Identity candidate

The candidate contains the exact fields needed for a future manual
`RegionalIdentityEvidence` patch.

It still declares:

- `canApplyAutomatically: false`;
- `profileMutationAllowedAutomatically: false`;
- `semanticAuthorityChangeAllowed: false`.

### Lexicon candidate

The candidate contains the exact fields needed for a future manual
regional-lexicon review receipt:

- `VERIFIED` status candidate;
- reviewer;
- review timestamp;
- review receipt;
- reviewed term;
- reviewed meaning;
- reviewed usage;
- reviewed revision.

It still declares:

- `canApplyAutomatically: false`;
- `lexiconMutationAllowedAutomatically: false`;
- `semanticAuthorityChangeAllowed: false`.

## Why semantic authority confirmation exists

A regional language reviewer may validate wording/cultural usage.

That cannot silently change:

- scientific truth class;
- ELI meaning;
- confidence semantics;
- causal limits;
- medical boundary;
- consent/privacy meaning.

Regional language remains downstream of MotsPet and the scientific/product authorities.

## Current Bretagne state

Nothing is promoted.

Expected runtime status remains:

- Breiz identity: `PENDING_REVIEW`;
- `bretagne_demat`: `PENDING_REVIEW`;
- `bretagne_ar_veute`: `PENDING_REVIEW`.

No actual reviewer, receipt or decision is created by this code.

## Non-goals

This slice does not:

- send outreach;
- read external replies;
- appoint a reviewer;
- validate Breton or Gallo;
- apply a runtime patch;
- mark anything VERIFIED automatically;
- create endorsement/partnership status;
- alter MotsPet or ELI authority.

Related:

- PR #991 — exact regional lexicon review binding;
- PR #992 — runtime-derived review packet;
- PR #994 — external response proposals;
- #821 — Bretagne reviewer/source outreach.
