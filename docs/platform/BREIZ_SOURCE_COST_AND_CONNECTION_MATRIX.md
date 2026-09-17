# BREIZ — Source cost & connection matrix

Status: `P0 CONNECTION DISCOVERY / VERIFIED 2026-08-31`

This document tracks source-level access cost, rights, credentials and connector readiness for Breiz. It does **not** estimate EMOPET infrastructure costs (hosting, LLM inference, storage, observability, maps, vector search), which are separate from source access fees.

## Executive summary

The official/open-data foundation can start at **€0/month in source subscription fees**: Région Bretagne Open Data, GéoBretagne, POP/data.culture.gouv.fr, data.gouv.fr and BnF/Gallica expose public machine-readable services. DATAtourisme is also free but requires a free API key. SIRENE is open data with an account/subscription and a 30 requests/minute open-data quota.

BCD/Bécédia and Bretania are different: they contain high-value editorial/heritage material, but no public commercial API tariff or general-purpose public integration contract was identified. BCD explicitly offers tailored tools/widgets and support. Treat them as a **partnership/rights discussion**, not as a scrape target.

## Matrix

| Source | Source fee | Account/key | Machine access | Current EMOPET decision |
| --- | ---: | --- | --- | --- |
| Région Bretagne Open Data | €0 | No | Opendatasoft Explore API v2.1 | Connect now |
| GéoBretagne | €0 | No for public catalogue | CSW 2.0.2 / OGC services | Connect catalogue now; preserve layer licence |
| POP / data.culture.gouv.fr | €0 for public information | No | Opendatasoft API / downloads | Connect selected heritage datasets now |
| data.gouv.fr | €0 | No for read API | REST catalogue API `/api/1` + tabular APIs | Connect catalogue now |
| BnF / Gallica | €0 for descriptive metadata | No | SRU + OAI-PMH + open metadata | Connect metadata search now; no automatic full-content reuse |
| FranceArchives | €0 for datasets under Licence Ouverte | No for published downloads | Open datasets/downloads; API path to be confirmed per dataset | Register now; connector after endpoint selection |
| DATAtourisme | €0 | **Free API key required** | REST API `api.datatourisme.fr/v1` | Connector prepared; activate after key |
| SIRENE | €0 | **INSEE account/subscription required** | API Sirene; 30 req/min open-data quota | Prepare credential slot; activate after account |
| Patrimoine de Bretagne | €0 for qualifying public information | No documented general API found | Website/public metadata; source + update date required | Metadata/link-only until a stable feed is verified |
| Bretania | No public tariff found | Partnership/contact likely | Widget officially offered; public OAI endpoint not verified | Partnership review; do not claim direct OAI yet |
| Bécédia / BCD | No public tariff found | Partnership/rights review | Editorial site; tailored tool support available | No bulk scrape/full-text vectorisation without permission |

## Source-specific constraints

### BCD / Bécédia

- Public consultation does not imply a licence for bulk ingestion.
- Image rights are frequently item/owner specific.
- BCD offers support for creating tailored tools using Bécédia/Bretania resources.
- Contact path: `contact@bcd.bzh`.
- EMOPET action: request a partnership covering metadata/feed availability, commercial reuse, embeddings/indexing, generated summaries, images/thumbnails and attribution.

### Bretania

- Bretania federates heritage notices from many contributing institutions and exposes a customizable embeddable widget.
- BCD uses OAI-PMH/Dublin Core in aggregation workflows, but this is not sufficient evidence that a stable public Bretania OAI endpoint is offered to third-party products.
- EMOPET action: keep the source in `partner_review` until BCD confirms the technical feed and item-level reuse conditions.

### DATAtourisme

- API access is free after registration and issuance of an API key.
- Current documented quotas: 1000 requests/hour, 20–30 concurrent requests, and about 10 requests/second sustained.
- Licence Ouverte 2.0; preserve producer attribution (`HasBeenCreatedBy`) and last-update information.

### SIRENE

- Open-data API access requires an INSEE account/subscription.
- Current open-data quota: 30 requests/minute.
- Apply strict data minimisation; do not turn partially diffused establishment/person data into a prospecting dataset.

### BnF / Gallica

- Descriptive metadata are under Licence Ouverte and can be reused free of charge with source + retrieval date preserved.
- Prefer SRU/OAI metadata for discovery cards.
- Rights for the underlying digitised content/media are a separate question; do not assume the metadata licence grants content rights.

## Budget rule

`SOURCE_ACCESS_BUDGET_P0 = €0/month confirmed recurring source subscriptions + unknown partnership quote for BCD/Bretania`

This is **not** the full operating budget. Before an external beta, create a separate infra model for:

- model inference / Breiz calls;
- hosting and serverless execution;
- database/vector storage;
- caching and egress;
- maps/geocoding if paid services are introduced;
- observability and error tracking;
- scheduled ingestion jobs.

## Connection priority

1. POP/data.culture.gouv.fr — high-value geocoded heritage and cultural POIs.
2. BnF/Gallica — official library metadata and digitised-document discovery.
3. data.gouv.fr — catalogue discovery/fallback to official datasets.
4. GéoBretagne — regional geospatial catalogue.
5. Région Bretagne Open Data — targeted datasets selected for Breiz scenes.
6. DATAtourisme — events/POIs once the free API key is issued.
7. SIRENE — service directory only after account + privacy filtering.
8. BCD/Bécédia/Bretania — partnership track in parallel, no scraping shortcut.

## Connection safety rule

A source is not considered `connected` merely because an endpoint responds. A production-eligible connector must preserve provenance, source URL, update/retrieval time, licence/rights, attribution, and must fail closed when those rights are missing or ambiguous.
