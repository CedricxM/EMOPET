# EMOPET × Bretagne Culture Diversité — Bécédia / Bretania pre-call brief

**Issue:** #35  
**Date:** 2026-09-29  
**Status:** `PARTNERSHIP PREP / NO RIGHTS GRANTED / NO CONTENT INGESTION AUTHORIZED`

## 1. Purpose

Prepare one short discussion with Bretagne Culture Diversité (BCD) about:

1. the supported machine-access path for Bretania and Bécédia;
2. metadata/content reuse rights;
3. attribution and takedown/update requirements;
4. whether a bounded regional-context pilot with EMOPET is of interest.

This is not a request to bulk-copy BCD content.

## 2. Why BCD is strategically relevant

BCD publicly describes itself as a network, exchange and project-co-design actor for cultural initiatives in Brittany.

Its 2025–2028 scientific and cultural project also identifies:
- a redesign of Bécédia;
- improved accessibility and navigation;
- stronger articulation between Bécédia and Bretania;
- partnerships with cultural institutions and research actors;
- new ways of transmitting regional cultural knowledge.

Bretania is publicly presented as a regional cultural portal aggregating digitized cultural and heritage resources from many institutions.

These public directions make a **partnership + provenance** discussion more appropriate than treating the services as anonymous raw feeds.

Public references:
- https://www.bcd.bzh/bcd/le-projet-scientifique-et-culturel-de-bcd/
- https://www.bcd.bzh/projets/becedia/
- https://www.bcd.bzh/projets/
- https://www.bcd.bzh/bretania/les-dix-ans-de-bretania-demandez-le-programme/

## 3. Current EMOPET evidence boundary

### Bécédia

Publicly visible:
- editorial articles/dossiers;
- named authors/contributors;
- multimedia and thematic content;
- public web access.

Not established:
- API;
- feed;
- bulk-download right;
- commercial republication right;
- semantic-indexing/RAG right;
- image reuse right;
- derivative summary right.

Current EMOPET state remains:
`MANUAL_REVIEW / PARTNER_PERMISSION_REQUIRED / FULL_TEXT_DISABLED`.

### Bretania

Publicly visible:
- federated metadata records;
- contributing institution provenance;
- permanent record pages;
- heterogeneous record/media origins;
- aggregation role across many partner collections.

Some public record identifiers visibly contain source-side OAI-like provenance tokens. That is **not** enough to establish that Bretania exposes a supported public OAI-PMH endpoint for EMOPET.

EMOPET therefore records:
`METADATA PORTAL CONFIRMED / SUPPORTED MACHINE ACCESS OPEN / OAI-PMH NOT ASSUMED`.

## 4. Technical questions to ask BCD

Ask for the preferred supported access method for each service:

### Bretania
- documented API?
- OAI-PMH endpoint?
- SRU/SRW?
- export/feed?
- sitemap/structured metadata?
- partner-only endpoint?
- rate limits?
- record identifiers and update/deletion semantics?

If OAI-PMH is available, ask:
- base URL;
- metadata formats;
- sets;
- resumption-token/rate policy;
- deleted-record behavior;
- identifier persistence;
- rights fields and contributor provenance fields.

### Bécédia
- API/feed/export for article metadata?
- stable canonical identifiers/URLs?
- available metadata fields?
- multilingual metadata?
- update/deletion/takedown mechanism?
- author/contributor attribution requirements?

Do not ask for full article dumps by default.

## 5. Rights questions

Clarify separately for:

### Metadata
- commercial reuse permitted?
- attribution wording?
- source-institution attribution?
- licence propagated per item?
- caching allowed?
- search indexing allowed?
- retention after source deletion/update?

### Editorial text
- title + author + canonical link;
- short quotation/excerpt;
- machine-generated summary;
- human-authored summary;
- semantic embeddings/vector index;
- retrieval-augmented answering;
- offline/cache retention.

### Images/audio/video
- thumbnail display;
- remote embedding vs local caching;
- item-level licence propagation;
- contributor/institution credit;
- rights-holder restrictions.

No permission in one category should be interpreted as permission in another.

## 6. Preferred EMOPET product model

The safest first partnership shape is:

`BCD metadata + canonical links + provenance -> Breiz contextual discovery -> user opens original BCD/partner resource`

Benefits:
- BCD remains visible as authority;
- original contributors remain visible;
- EMOPET avoids becoming a shadow copy;
- takedown/update behavior stays tractable;
- a richer content licence can be negotiated later if useful.

Possible later extension only with explicit permission:

`authorized excerpt/summary + source attribution + canonical link`

Full-text/vector ingestion is **not** the starting assumption.

## 7. Partnership value proposition to discuss

EMOPET can offer a bounded pilot where regional context is surfaced around real user situations without pretending to own the cultural content.

Possible pilot outputs:
- discovery cards linking to Bécédia/Bretania resources;
- context by commune/theme/date;
- explicit provenance and contributor display;
- click-through measurement to original sources;
- no paywall around BCD content;
- feedback to BCD on which topics are discovered.

Do not promise volume, user counts or launch dates that are not controlled.

## 8. Questions for BCD about collaboration

- Is this type of contextual discovery aligned with BCD's current digital strategy?
- Would BCD prefer a technical integration, a content partnership, or a small pilot first?
- Is there a named technical/data contact for Bretania?
- Is there a named editorial/rights contact for Bécédia?
- Would BCD want approval over presentation/attribution before a pilot?
- Is a written licence/MOU needed even for metadata-only commercial use?
- Are there specific partner-institution restrictions that Bretania must propagate?

## 9. Red lines

Until written evidence exists:
- no Bécédia full-text scraping;
- no Bécédia embeddings/vectorization;
- no image/audio/video caching;
- no claim that Bretania exposes public OAI-PMH;
- no assumption that one licence covers all contributing institutions;
- no public product release using BCD content beyond independently verified rights.

## 10. Current communication state

A Gmail draft has been prepared for:
`contact@bcd.bzh`

Subject:
`EMOPET × Bretagne Culture Diversité — Bécédia / Bretania : accès, droits et piste de partenariat`

Status:
`DRAFT ONLY / NOT SENT`

The draft asks about technical access, reuse rights, attribution, caching/indexing/RAG conditions and a possible partnership/pilot.

## 11. Desired outputs from first exchange

Leave the first exchange with:

1. technical owner/contact;
2. supported access mechanism;
3. written metadata reuse position;
4. Bécédia excerpt/summary position;
5. image/media rule;
6. machine-indexing/RAG rule;
7. attribution format;
8. takedown/update rule;
9. whether a pilot is welcome;
10. next document/agreement needed.

## 12. Gate

`BCD_CONTACT = DRAFT_READY / NOT_SENT`

`BRETANIA_MACHINE_ACCESS = OPEN / OAI_PMH_NOT_ASSUMED`

`BECEDIA_EDITORIAL_REUSE = PERMISSION_REQUIRED`

`BCD_PARTNERSHIP = DISCUSSION_NOT_STARTED`

`BREIZ_BCD_INGESTION = HOLD`
