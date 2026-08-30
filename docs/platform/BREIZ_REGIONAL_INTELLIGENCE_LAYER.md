# BREIZ — Regional Context & Knowledge Intelligence Layer

Status: `P0 CONTROLLED ARCHITECTURE / NOT FULLY INGESTED`

## Purpose

Breiz is EMOPET's regional context and knowledge layer for Brittany. It is not a dog-state inference engine and it is not a generic chatbot.

Breiz federates public, institutional and partner sources, preserves provenance, rights and freshness, and contextualises information according to the user's voluntary location, time and question.

## Separation of concerns

- **ELI**: observations and changes derived from EMOPET MAT/TAG/app evidence under confidence gates.
- **BREIZ**: external territorial, cultural, regulatory, environmental and service context.
- **VEUTE**: community/social layer.

Breiz must never use public territory, weather, breed or cultural data as a shortcut to infer a dog's internal state.

## Retrieval pipeline

`question -> voluntary location/territory -> time/season -> eligible sources -> retrieval -> authority/freshness/rights filter -> synthesis -> citations/provenance`

## Required provenance

Every answerable source record must preserve:

- source id and name;
- publisher;
- canonical URL;
- source update date when available;
- retrieval date;
- territory;
- content type;
- licence/rights statement;
- allowed use;
- attribution;
- language;
- checksum when content is materialised;
- freshness policy;
- authority class.

## Rights policy

Source registration is not permission to copy content. Connectors must enforce item-level rights. Supported policy flags include:

- `FULL_TEXT_ALLOWED`
- `METADATA_ONLY`
- `LINK_ONLY`
- `ATTRIBUTION_REQUIRED`
- `NON_COMMERCIAL_ONLY`
- `NO_DERIVATIVES`
- `PARTNER_PERMISSION_REQUIRED`

For sources with mixed or unclear rights, default to metadata/link-only until reviewed.

## First registry

The P0 registry covers Bécédia/BCD, Bretania, Région Bretagne Open Data, GéoBretagne, Patrimoine de Bretagne, POP, data.gouv.fr, SIRENE and DATAtourisme.

Only sources with an explicit safe connector path should be enabled. BCD/Bécédia full-text bulk ingestion is explicitly disabled pending a rights/partnership review.

## Editorialisation principle

Breiz should not merely aggregate records. It should turn authoritative local data into contextual cards and sourced answers such as local regulations, nearby services, weather/environment context, events and heritage context, while always exposing why the information is shown and where it came from.

## P0 non-goals

- no scraping of copyrighted editorial corpora;
- no clinical interpretation;
- no emotion attribution;
- no automatic publication of community contributions;
- no exact location sharing to third parties unless required and explicitly authorised;
- no silent use of stale records.
