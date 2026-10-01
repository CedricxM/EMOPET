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

The repository source entry remains:

- `enabled: false`;
- `license: null`;
- without a release-ready rights receipt.

This is intentional.

Before promotion, the project still needs a controlled rights/reuse receipt that records the exact licence/CGU version or immutable evidence snapshot reviewed, the attribution format to emit, recheck/expiry rules and the resulting permitted-use scope.

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
