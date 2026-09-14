# OSM / Overpass runtime authority boundary — 2026-09-14

Status: **ENGINEERING CONTROL PRESENT / DATA-LIC-G4 OPEN**

Issue: #116

## Purpose

This record documents a fail-closed runtime boundary for the EMOPET OpenStreetMap / Overpass integration. It is an engineering control only. It is **not** legal clearance, service-use approval, ODbL classification, product release authority or evidence that any public Overpass operator permits EMOPET's intended production traffic.

## Change

The web OSM integration no longer contains a default public Overpass endpoint that becomes active merely because a single gate flag is set.

Runtime activation now requires both:

- `NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE=GO`; and
- an explicit `NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT` containing a valid HTTPS URL with no embedded credentials, query string or fragment.

If either requirement is absent or malformed, `fetchOsmSpots()` returns no OSM data and makes no Overpass request.

The endpoint is read when the fetch is attempted rather than captured once at module load. This keeps the authority boundary explicit in tests and avoids treating a stale module-level snapshot as current operator state.

## Upstream-data integrity hardening

The OSM projection now drops malformed or unsupported elements instead of fabricating provenance:

- only `node`, `way` and `relation` element types are accepted;
- element IDs must be positive safe integers;
- latitude and longitude must be finite and within geographic bounds;
- accepted markers continue to carry the exact OSM element URL, contributor attribution text and OSM copyright/licence URL.

The cache remains process/browser memory only, capped at 40 bbox entries with a five-minute TTL.

## Automated evidence

`apps/web/lib/__tests__/osm-spots.test.ts` now proves that:

1. the runtime is default-off;
2. exact `GO` without an explicit endpoint is still off;
3. HTTP endpoints, embedded credentials, query strings and fragments fail closed;
4. an explicit HTTPS endpoint plus exact `GO` can activate the integration;
5. unsupported element types, invalid IDs and impossible coordinates are discarded;
6. projected OSM markers retain source and licence provenance;
7. rendered OSM popups retain source and licence links.

## What remains open

`DATA-LIC-G4` remains **OPEN**. This change does not decide or prove:

- ODbL classification of live-query, cache, export or any future derived-database flow;
- production use rights or policy for a selected Overpass provider;
- expected request volume, rate limits, SLA or capacity architecture;
- whether a dedicated/self-hosted/contracted service is required;
- all rendered attribution placements across every product surface;
- export/persistence policy for OSM-derived data;
- legal/licensing review and dated release disposition.

No production operator should set the gate to `GO` until those service and rights questions have a reviewed disposition.

`G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN`
