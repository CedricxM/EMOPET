# DATAtourisme — source evidence note

**Review date:** 2026-10-01  
**Status:** `SOURCE FACTS RECORDED / RIGHTS GATE STILL HOLD / SOURCE DISABLED`

## Official references reviewed

- API documentation: https://api.datatourisme.fr/v1/docs
- Data reuse page: https://www.datatourisme.fr/utiliser-les-donnees/
- Legal resources: https://www.datatourisme.fr/ressources-juridiques/

## Source facts observed

The official DATAtourisme material reviewed on 2026-10-01 states that:

- the public API is versioned under `/v1`;
- `X-API-Key` is the recommended authentication transport;
- the current page-size maximum is 100;
- sustained use is subject to published concurrency/rate/hourly limits;
- `/entertainmentAndEvent` is the pre-filtered events endpoint;
- the `fields` parameter replaces the default field selection and can be used for data minimisation;
- the `filters` parameter supports structured field filters;
- direct page-number traversal is bounded to the first 10,000 results, with response `meta.next` recommended for deeper traversal;
- reuse is described as subject to the Licence Ouverte / Etalab framework and DATAtourisme terms;
- reuse must preserve dataset producer attribution through `HasBeenCreatedBy` and the last-update information.

These are source statements, not an EMOPET legal conclusion.

## EMOPET implementation consequence

The first Bretagne-events technical slice therefore:

- keeps credentials in `X-API-Key`, not the URL;
- uses `/entertainmentAndEvent`;
- filters using structured department fields for 22, 29, 35, 44 and 56;
- requests only UUID, URI, label, type, department, producer attribution and update timestamps;
- explicitly excludes producer address data;
- does not request contact, media or description data in v0;
- rejects records with no producer attribution, no valid provider update timestamp or no structured Brittany department;
- strips API-key/token/secret query parameters from retained pagination links;
- rejects pagination links outside the HTTPS `api.datatourisme.fr` origin.

## Why the registry remains HOLD

The repository source entry remains fail-closed:

- `enabled: false`;
- `license: Licence Ouverte 2.0` recorded only as an official source statement;
- without runtime `rightsEvidence`;
- without any `INGESTION` or `PUBLIC_ANSWER_WITH_SOURCE` scope.

This is intentional.

The source licence label is now known, but the exact API-v1 CGU applicability and recheck/versioning authority remain unresolved. Before promotion, the project still needs a controlled clarification response or equivalent authority that resolves those points and can then be reviewed separately for a runtime rights disposition.

## No partnership claim

DATAtourisme is an external open-data/API source candidate.

This note does not claim:
- a partnership;
- endorsement;
- special access;
- production approval;
- legal sign-off.

Related:
- #116 third-party data rights
- #835 DATAtourisme source-unlock workstream
- #827 Bretagne Regional Pack v0


## Recheck — 2026-10-03

The official DATAtourisme material was rechecked against the current public API and reuse pages.

Observed repository facts:

- the API documentation identifies API version `1.0.0`;
- `X-API-Key` remains the recommended authentication transport;
- the current reuse page and FAQ explicitly describe DATAtourisme data reuse under `Licence Ouverte 2.0`;
- the reuse page requires producer attribution through `HasBeenCreatedBy` and the last-update date;
- the current API-key request form requires acceptance of DATAtourisme CGU.

### CGU scope ambiguity retained as HOLD

The CGU linked by the current API-key request form resolves to:

`https://www.datatourisme.fr/wp-content/uploads/2025/12/datatourisme-cgu-diffuseur-v2.0.pdf`

That document identifies itself as:

- `INTERFACE DIFFUSEURS DATATOURISME`;
- version `2.0`;
- dated `23/08/2022`.

The current website links this document from the API-key request flow, but EMOPET does not treat that link alone as proof that every clause is the exact API-v1 authority for the public API.

Therefore:

- the licence observation is recorded as a source fact;
- no `SOURCE_CONFIRMED / GO` runtime rights evidence is created;
- no product-use scope is granted;
- DATAtourisme remains disabled;
- live fetch remains unauthorized.

Machine-readable observation receipt:

`data/registry/receipts/datatourisme-api-rights-observation-2026-10-03.json`

The next authority transition requires an explicit clarification response or equivalent controlled evidence resolving API-CGU scope and recheck/versioning rules.
