# EMOPET — Bretagne canine pilot evidence guard

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED CONTROL / STACKED ON CANDIDATE REGISTER / NO OUTREACH CLAIM`

## Purpose

The Bretagne canine candidate register already distinguishes a public shortlist from a partnership list.

This guard makes that distinction executable.

Machine-readable validator:

`apps/web/lib/partnerships/bretagneCaninePilotRegistry.ts`

Current controlled register:

`config/partnerships/bretagne-canine-pilot-candidates-v1.json`

## What the guard enforces

Every candidate must retain:

- a unique candidate ID;
- organisation and territory;
- reviewed public activity evidence;
- at least one potential role;
- safe HTTPS public-source references;
- `partnershipClaimAllowed: false`;
- `contactDataStored: false`;
- a valid controlled relationship status.

The registry cannot silently add personal contact fields such as email, telephone or named contact details.

## Evidence-gated promotion

A status string alone is not evidence.

### OUTREACH_SENT

Requires:

- outreach timestamp;
- controlled communication evidence reference.

### RESPONSE_RECEIVED

Requires:

- valid outreach evidence;
- response timestamp;
- inbound response evidence reference.

### PILOT_SCOPE_DISCUSSION

Requires:

- valid response evidence;
- explicit pilot-scope evidence reference.

### LETTER_OF_INTEREST_RECEIVED

Requires:

- valid response evidence;
- exact written LOI/email evidence reference.

### DECLINED / DEFERRED

Requires:

- a disposition note explaining the state.

## Why

Without this guard, a future edit could change:

`CANDIDATE_NOT_CONTACTED -> LETTER_OF_INTEREST_RECEIVED`

with one string edit and no underlying proof.

That would turn a relationship status into fiction.

The same principle already used for source rights and regional-language review now applies to partnership/pilot evidence.

## Current state

All three current Bretagne candidates remain:

`CANDIDATE_NOT_CONTACTED`

and require no invented communication evidence.

This change does not send outreach, store personal contacts or claim that any organisation has agreed to participate.

## Non-goals

This guard does not:

- establish a partnership;
- recruit participants;
- grant club-directory reuse rights;
- validate EMOPET hardware/science;
- send an email;
- turn a response or LOI into endorsement.

Related:
- PR #842 — Bretagne canine pilot candidate register;
- PR #847 — draft outreach pack;
- #821 — regional reviewer/source outreach;
- #116 — third-party data/source controls.
