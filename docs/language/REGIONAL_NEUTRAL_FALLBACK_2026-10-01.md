# EMOPET — Regional identity neutral fallback

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED COMPATIBILITY CONTAINMENT / NOT A NEW REGIONAL PERSONA`

## Problem

The legacy AI-tone compatibility layer mapped historical French regional identifiers such as
`FR_NORM`, `FR_IDF`, `FR_PROV` and `FR_OCC` onto Breiz-derived persona names.

That mapping is incompatible with the current regional-companion doctrine:

- Breiz is the Brittany companion, not a generic French persona;
- future regions require their own reviewed identity;
- culturalisation must not be invented from a region label;
- regional style cannot change scientific or privacy meaning.

## Decision

Keep the existing Breiz-derived selectable tone profiles unchanged for compatibility.

For legacy regional identifiers:

- `FR_BREIZ` remains mapped to `BREIZ`;
- `BREIZ_BASE` remains mapped to `BREIZ`;
- unsupported non-Brittany regional identifiers map to an internal `EMOPET_NEUTRAL` profile;
- unknown non-empty profile identifiers also map to `EMOPET_NEUTRAL`.

`EMOPET_NEUTRAL` is not a new cultural identity. It is a fail-closed compatibility profile:

- display name: `EMOPET`;
- generic French greeting;
- no regional language claim;
- no inferred dialect/accent;
- no cultural shortcuts.

## Non-goals

This slice does not:

- create names for Normandy, Occitanie, Provence, Île-de-France or any other territory;
- change the current selectable mobile tone-profile list;
- change regional detection;
- validate Breton wording;
- implement travel-versus-home-region switching;
- promote any regional data source.

## Follow-up

Real regional identities must be created through the controlled regional profile / reviewer workflow tracked under #817 and related language/data authorities.
