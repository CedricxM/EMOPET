# EMOPET — OSM / Overpass release-authority checkpoint

**Date:** 2026-09-14  
**Gate:** DATA-LIC-G4 / #116  
**Branch:** `experience-hardening-2026-09-06`  
**Status:** `HOLD / FAIL-CLOSED RUNTIME AUTHORITY`  
**Authority:** engineering control only; not legal sign-off and not product release authority.

## Why this change exists

The existing map implementation already had several useful controls:

- OpenStreetMap/Overpass was disabled by default;
- activation required an explicit `NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE=GO` switch;
- an explicit clean HTTPS Overpass endpoint was required;
- OSM markers carried their source-element URL, attribution text and licence pointer;
- the map rendered OpenStreetMap attribution/licence links;
- caching was bounded to an ephemeral five-minute in-memory LRU, with no persistent OSM store in this module.

The remaining authority gap was that an environment variable still had enough power to enable the live service flow. Under DATA-LIC-G4, deployment configuration is not evidence that the service policy, use classification and rendered attribution have been reviewed.

## Implemented boundary

`apps/web/lib/overpass-rights.ts` now carries the repository-side release authority for the current Overpass flow.

Production use requires all of the following:

1. disposition `GO`;
2. non-empty evidence revision;
3. named reviewer role;
4. dated review that is not in the future;
5. controlled provider-policy receipt pointer;
6. controlled rendered-attribution evidence pointer;
7. live-query flow explicitly reviewed;
8. cache flow fixed to the current `EPHEMERAL_MEMORY_ONLY` design;
9. export explicitly `PROHIBITED`;
10. derived-database use explicitly `PROHIBITED`.

The checked-in authority deliberately remains `HOLD`, with the provider-policy receipt and rendered-attribution evidence still absent. Therefore a deployment with `NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE=GO` and a valid endpoint still fails closed today.

## Endpoint and data-flow controls retained

`apps/web/lib/osm-spots.ts` keeps the existing endpoint restrictions:

- HTTPS only;
- no embedded credentials;
- no query string supplied by deployment configuration;
- no fragment;
- no default public provider endpoint;
- malformed upstream objects are dropped;
- each accepted POI remains tied to its OSM element URL and attribution/licence metadata.

The current cache remains process/browser memory only, capped at 40 bounding boxes and expiring after five minutes.

## Test evidence

`apps/web/lib/__tests__/osm-spots.test.ts` now proves that:

- the repository authority is `HOLD` by default;
- environment variables alone cannot activate Overpass;
- a synthetic reviewed authority must contain the complete evidence set and the exact bounded flow classification;
- endpoint validation remains fail-closed;
- OSM POI projections retain source/licence provenance;
- malformed upstream objects do not receive fabricated provenance;
- rendered map code retains source and licence links.

## Still open

This checkpoint does **not** close DATA-LIC-G4. Still required before any controlled `GO`:

- review and retain the exact provider/service-use policy applicable to the selected Overpass endpoint;
- verify intended traffic/volume architecture against that policy;
- capture a controlled rendered-attribution check from the release candidate;
- confirm the live-query classification and any privacy implications;
- keep persistent cache/export/derived-database uses prohibited unless separately reviewed;
- record named reviewer/date/evidence revision and update the authority record deliberately.

`DATA-LIC-G4 = HOLD / RUNTIME AUTHORITY ENFORCED / PROVIDER + RENDERED EVIDENCE OPEN`

`G-THIRD-PARTY-DATA-RIGHTS-01` remains `OPEN`.
