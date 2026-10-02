# EMOPET — Bretagne language review packet v1

**Date:** 2026-10-01  
**Status:** `DRAFT_NOT_SENT / RUNTIME-DERIVED / NO REVIEW AUTHORITY`

## Purpose

The Bretagne language/culture outreach pack defines who EMOPET may ask for review and what evidence a useful response should contain.

This runtime packet solves a different problem:

> what **exact wording** are we asking a reviewer to review?

The packet is built directly from the current runtime RegionalProfile and regional lexicon.

It does not duplicate the claims in a manually maintained JSON file.

## Current review packet

### Companion identity

The packet includes the exact active Bretagne profile claims:

- assistant name;
- assistant-name origin/explanation;
- regional naming rule.

At the time of this revision, that means the current working identity `Breiz` and its exact current origin/naming claims.

### Regional lexicon

The packet includes every current Bretagne regional-lexicon entry.

At the time of this revision, the intentionally small set is:

- `bretagne_demat`;
- `bretagne_ar_veute`.

For every term, the packet carries:

- exact term;
- exact French meaning;
- exact usage category;
- exact regional-lexicon revision.

## Response contract

Each identity/lexicon item receives one response template requesting:

- disposition:
  - `APPROVED`;
  - `APPROVED_WITH_CONDITIONS`;
  - `REJECTED`;
- reviewer role;
- review date;
- controlled evidence reference;
- approved meaning/claim;
- permitted usage;
- conditions/restrictions;
- attribution/reuse requirements.

The packet does not decide the disposition.

## Drift prevention

`auditBretagneLanguageReviewPacket()` compares a packet with the live runtime authorities.

It fails when:

- assistant name changes;
- assistant-name origin changes;
- naming rule changes;
- a Bretagne lexicon item is missing;
- a lexicon term changes;
- meaning changes;
- usage changes;
- lexicon revision changes;
- response-template coverage is no longer one-to-one.

This means an old exported/reviewed packet cannot silently authorize later wording.

## Relationship to runtime review gates

The evidence path is now intentionally two-sided:

### Before review

`runtime claims -> generated review packet -> external human review`

### After review

`exact reviewed claim -> controlled receipt -> exact runtime binding -> VERIFIED`

PR #985 hardens the second half by binding lexicon receipts to exact wording.

This packet hardens the first half by ensuring the reviewer sees the exact wording that exists in runtime.

## Privacy and partnership boundary

The generated packet contains no:

- private contact details;
- reviewer email;
- contract;
- partnership status;
- endorsement claim.

Repository status remains `DRAFT_NOT_SENT`.

Sending the packet or recording a response is a separate evidence-bearing action.

## Non-goals

This module does not:

- send an email;
- select a reviewer;
- validate Breton or Gallo;
- validate the name Breiz;
- translate the app;
- create source/data rights;
- alter MotsPet scientific meaning;
- promote any term.

Related:

- #821 — Brittany reviewer/source outreach;
- merged current-main language/culture review outreach pack;
- PR #985 — exact regional lexicon review-receipt binding.
