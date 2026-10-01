# EMOPET — Bretagne Regional Pack v0

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED STRUCTURE / FAIL-CLOSED / NOT RELEASE READY`

## Purpose

The Bretagne Regional Pack turns the regionalisation strategy into one machine-readable composition layer.

It does **not** replace the underlying authorities:

- `RegionalProfile` owns regional identity/routing metadata;
- `RegionalKnowledgeBase` owns human-reviewed local knowledge;
- the regional lexicon owns culturally reviewed wording;
- the Breiz source registry owns third-party rights/provenance state;
- MotsPet owns controlled public-language meaning.

The pack only says which authorities/data domains belong together for one territory.

## Bretagne v0 coverage

The first pack currently requires evidence in four data domains before release readiness:

1. `territorial_context`;
2. `culture`;
3. `events`;
4. `canine_network`.

Candidate source bindings include:

- Région Bretagne open data;
- GéoBretagne;
- data.gouv.fr;
- BCD / Bécédia;
- Bretania;
- Patrimoine de Bretagne;
- POP;
- DATAtourisme;
- SIRENE;
- Association Canine Territoriale Bretonne / Centrale Canine club page.

A binding is **not** a rights grant, endorsement or partnership.

## Language coverage

Current declared product locale coverage in the pack is only:

- `fr-FR`.

Breton and Gallo are intentionally excluded from `supportedLocales` until:

- named linguistic review exists;
- exact reviewed terms have receipts;
- product-level locale coverage exists;
- cross-locale semantic QA proves no change to truth class, confidence, provenance, privacy or medical boundaries.

## Release verdict

`evaluateRegionalPackReleaseReadiness()` fails closed when any of the following is true:

- profile/knowledge region IDs disagree;
- the profile is not `PRODUCTION_READY`;
- no regional lexicon term is release-ready through the review-receipt gate;
- a source binding references an unknown controlled source;
- any required data domain lacks at least one release-ready source.

With the current repository state, Bretagne is expected to remain **NOT release-ready**.

That is deliberate.

## Canine network

The club-network source is now registered as a disabled `manual_review` / `LINK_ONLY` candidate with `PARTNER_PERMISSION_REQUIRED`.

This prevents the product from turning a public directory page into an implicit data licence or claiming clubs as pilots before written evidence exists.

The target evidence for this domain is:

- exact source/reuse/update method;
- provenance for club identity/activity data;
- written pilot/reference relationship where applicable;
- no scraping or unsupported partner claim.

## Replication rule

Future regional packs should duplicate this structure rather than editing the common engine:

`EMOPET Core → MotsPet → regional identity/review → regional source pack → local knowledge/community`

A new territory must not inherit Brittany-specific vocabulary, names or cultural assumptions.

## Related work

- PR #815 — MotsPet + Breiz lexicon foundation;
- PR #822 — regional review-receipt gate;
- #817 — MotsPet + Breiz data/reviewer intake;
- #821 — Brittany reviewer/source outreach;
- #35 / #116 — source rights and provenance controls.
