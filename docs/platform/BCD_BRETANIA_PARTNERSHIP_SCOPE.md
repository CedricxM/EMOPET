# EMOPET × Bretagne Culture Diversité — partnership scope

Status: `CONTACT_REQUIRED / NO COMMERCIAL RIGHTS ASSUMED`

Purpose: define the exact questions EMOPET must resolve before Bécédia/Bretania content is used beyond public links/metadata.

## What EMOPET wants to build

Breiz is a location-aware cultural/context assistant inside EMOPET. During a walk or visit, a user may discover nearby history, heritage, language, events or cultural context. The experience should cite authoritative sources and invite exploration; it must not use cultural context as evidence about the dog's internal state.

## Technical questions for BCD

1. Is there a supported machine-readable feed/API for third-party products (Bretania metadata, Bécédia metadata or both)?
2. If OAI-PMH is available to partners, what is the stable base URL, set structure, metadata format and rate policy?
3. Can EMOPET use the existing Bretania widget inside a commercial product, and under what conditions?
4. Can records be cached/indexed for search? If yes, which fields and for how long?
5. Are embeddings/vector indexes of descriptive metadata permitted?
6. Is generation of short factual summaries permitted when the source notice is cited and linked?
7. Can thumbnails/images be displayed? What item-level rights fields must be respected?
8. Is location/geographic metadata available at record level for proximity-based discovery?
9. Are update/deletion feeds available so EMOPET can remove stale or withdrawn records?

## Commercial / rights questions

1. Is commercial reuse allowed for metadata and/or editorial content?
2. Is a licence, partnership agreement or paid subscription required?
3. If paid, what pricing model applies: fixed annual licence, usage tier, API calls, active users, or bespoke quote?
4. Required attribution wording and brand/logo requirements?
5. Restrictions on AI-assisted summarisation, retrieval-augmented generation or semantic search?
6. Restrictions on storing content outside BCD infrastructure?
7. Conditions for cross-border availability if EMOPET expands outside Brittany/France?

## Requested pilot scope

A reasonable first pilot would be **metadata-first**:

- title;
- institution/source;
- canonical record URL;
- location/territory;
- date/period;
- category/subject;
- short source-provided description when licensed;
- item-level rights/licence;
- thumbnail only when explicitly reusable;
- source update date.

No bulk reproduction of Bécédia articles is requested by default.

## Cost authority

Until BCD replies with terms, record:

`BCD_BRETANIA_SOURCE_COST = UNKNOWN / PARTNER_QUOTE`

Do not invent a subscription price and do not treat absence of a public price list as permission for free commercial ingestion.
