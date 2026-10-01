# EMOPET — Neutral regional detection fallback

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED BEHAVIOUR CHANGE / FAIL-CLOSED`

## Problem

The regional detector previously used Bretagne as the default when:

- no region was declared;
- no department was available;
- a department was not mapped;
- a declared regional ID was unknown.

That made Breiz the accidental identity of unsupported territories.

Examples:

- an unresolved Paris user could receive the Bretagne profile;
- a future Normandy user could fall back to Breiz before a Normandy companion existed.

This contradicts the regional-companion doctrine: each territory must receive its own reviewed identity rather than inheriting Brittany by accident.

## Change

A new `neutral_france` profile is now the default fallback.

It uses:

- assistant name: `EMOPET`;
- no departments;
- no regional knowledge;
- no cultural naming claim;
- no regional rhythm sources.

Known Brittany departments and explicit `bretagne` selection still resolve to Breiz.

The documented Brittany-specific 44 mapping remains unchanged.

## Why neutral instead of inventing future companions

A missing regional pack is an absence of evidence, not permission to synthesize a culture.

Until a territory has:

- a controlled regional profile;
- reviewed naming/language;
- verified source/data coverage;
- provenance and rights evidence;

the fallback stays neutral.

## Tests

The regional tests now assert:

- empty context → `neutral_france`;
- unmapped department (example: 75) → `neutral_france`;
- unknown declared region (example: `normandie`) → `neutral_france`;
- departments 29 and 44 continue to resolve to Bretagne.

## Non-goals

This change does not:

- create a Normandy, Île-de-France or other regional companion;
- infer location without consent;
- alter the Bretagne 44 doctrine;
- implement travel/home-region semantics;
- validate cultural terms;
- change ELI or scientific interpretation.
