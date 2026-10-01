# EMOPET — Regional companion identity evidence gate

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED FAIL-CLOSED IDENTITY GATE / BREIZ STILL PENDING REVIEW`

## Purpose

A regional profile contains culturally meaningful identity claims:

- assistant name;
- explanation/origin of that name;
- regional naming rule.

Those fields must not become production authority merely because a developer changes the profile status to `PRODUCTION_READY`.

## New gate

Each Regional Pack now carries `RegionalIdentityEvidence`.

A regional identity is release-ready only when:

1. identity status is `VERIFIED`;
2. reviewed assistant name exactly matches the active profile;
3. reviewed origin/explanation exactly matches the active profile;
4. reviewed naming rule exactly matches the active profile;
5. reviewer role exists;
6. controlled reviewer reference exists;
7. dated review receipt exists;
8. review date is valid and not in the future.

If any condition fails, the pack receives:

`IDENTITY_NOT_REVIEWED`

## Bretagne state

The current Bretagne pack records:

- assistant name: `Breiz`;
- current origin claim from the regional profile;
- current naming rule;
- review status: `PENDING_REVIEW`;
- no reviewer;
- no review receipt.

This is deliberate.

`Breiz` remains the project's working identity, but the repository does not pretend that the name/origin/public cultural framing has already received independent linguistic/cultural review.

## Why this is separate from the regional lexicon

A reviewed greeting such as a regional term does not automatically validate the companion's own name.

Likewise, validating the companion's name does not automatically approve greetings, community labels or other cultural vocabulary.

The two gates remain independent:

`identity review != lexicon review`

Both are required before a Regional Pack can become release-ready.

## Future regions

A future Normandy, Occitanie, Île-de-France or international companion must carry its own exact identity evidence.

Copying a Bretagne review receipt or changing only `assistantName` cannot satisfy the gate.

## Non-goals

This slice does not:

- validate the name Breiz;
- appoint a reviewer;
- claim OPLB, BCD, Institut du Galo or any other body approved the identity;
- create future regional names;
- modify scientific/ELI authority;
- change UI copy.

Related:
- PR #830 — MotsPet v0.2 foundation;
- PR #868 — Bretagne Regional Pack v1;
- #817 / #821 — reviewer intake and outreach.