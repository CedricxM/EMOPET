# EMOPET — MotsPet + Breiz runtime foundation

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED FOUNDATION / CONTROLLED SEED / NOT RELEASE AUTHORITY`

## 1. Purpose

This slice starts the runtime implementation of the language architecture already accepted by:

`ELS / Semantic Core → MotsPet → Explanation Grammar → Regional Companion → Local Context Engine`.

It does not declare MotsPet v1.0 complete, does not validate Breton/Gallo wording and does not promote any external content source or partnership.

## 2. What landed

### MotsPet controlled seed

`apps/web/lib/language/motspet.ts` introduces a versionable human-language lexicon contract with:

- stable concept IDs;
- domain;
- internal terms;
- public FR/EN wording;
- human-readable definition;
- prohibited/unsafe public shortcuts;
- provenance requirement;
- repository authority pointers;
- explicit `CONTROLLED_SEED` versus `HOLD` status.

The first seed deliberately covers only terms already supported by current product/science doctrine:

- observation;
- Owner note;
- confidence;
- insufficient evidence / abstention;
- source;
- consent.

A candidate activation/arousal wording is recorded as `HOLD` to prove that presence in the registry does not authorize public use.

### Regional lexicon gate

`apps/web/lib/regional/regional-lexicon.ts` separates regional cultural vocabulary from MotsPet semantics.

Existing prototype vocabulary such as `Demat` and `Ar Veute` is recorded as `PENDING_REVIEW`, not as validated regional language.

No pending term is injected into the regional prompt.

### Runtime prompt integration

`buildAssistantSystemPrompt` now injects:

1. the MotsPet public-language contract;
2. the regional lexicon contract;
3. verified regional knowledge.

The regional layer may change wording only after review. It cannot strengthen scientific meaning, confidence, provenance, consent/privacy meaning or medical boundaries.

## 3. Why fail-closed

The repository already states:

- MotsPet v1.0 remains OPEN;
- no named cultural/linguistic/scientific reviewer is assigned;
- Breiz persona/config remains DRAFT pending cultural/language review and cross-locale semantic QA;
- regional content must be human-verified;
- external source registration is not permission to reuse content.

This implementation therefore prefers an explicit absence of regional vocabulary over invented dialect, accent or cultural shorthand.

## 4. Data workstream now opened

The next MotsPet/Breiz data work should build four controlled inventories.

### A. MotsPet semantic inventory

For each public concept:

- concept ID;
- internal producer terms;
- public FR/EN terms;
- definition;
- synonyms;
- prohibited shortcuts;
- provenance/confidence requirements;
- authority source;
- reviewer;
- revision date;
- release status.

Priority domains:

- Care / ELI;
- privacy and consent;
- Community / Together;
- professional/veterinary sharing;
- regional/context language.

### B. Brittany language and culture pack

No term should become `VERIFIED` without a named review receipt.

Candidate reviewer/outreach categories:

- Breton-language terminology and translation expertise;
- Gallo language expertise;
- Brittany cultural/editorial expertise;
- local canine-community reviewers.

These are candidate categories only. They are not current partners.

### C. Regional source pack

Breiz source rights remain separately governed by the third-party data-rights gate.

Candidate source families already present in repository strategy/registry include:

- BCD / Bécédia / Bretania;
- Région Bretagne open data;
- GéoBretagne;
- Patrimoine de Bretagne;
- data.gouv.fr;
- SIRENE;
- DATAtourisme.

No source becomes usable merely because it is listed.

### D. Canine-local vocabulary and directory evidence

A future regional pack should distinguish:

- official canine-club/association terms;
- local activity terminology;
- dog-friendly place categories;
- professional/veterinary terminology;
- community-created wording.

Directory items require item-level provenance or explicit demo classification before production representation.

## 5. Partnership opportunities to pursue

The project should seek written review/access relationships rather than scraping cultural or institutional content.

Priority outreach tracks:

1. **BCD** — current cultural-source discussion, rights/access + possible reviewer introductions;
2. **Breton-language terminology/review body** — validate names, greetings, terminology and cultural usage;
3. **Gallo language body** — ensure Brittany regionalisation is not reduced to Breton-only identity;
4. **canine territorial/club network** — validate club/activity vocabulary and establish pilot/reference data;
5. **veterinary/scientific reviewers** — review MotsPet Care/ELI wording that could otherwise overstate biological meaning.

No organisation should be described as a partner until evidence of the relationship exists.

## 6. Next implementation gates

### LANG-01 — MotsPet v0.2 inventory
- reconcile current Care/public wording;
- inventory legacy UI terms;
- map each public term to authority;
- add machine-readable revision metadata.

### LANG-02 — Breiz reviewer receipts
- named reviewer(s);
- exact reviewed terms;
- source/reference;
- date;
- approved usage;
- expiry/recheck rule where appropriate.

### LANG-03 — cross-locale semantic QA
Prove that FR/EN/regional wording changes style but not truth class, confidence, provenance, privacy or medical meaning.

### LANG-04 — legacy copy migration
Only after the registry is mature enough:
- replace obsolete/historical UI wording;
- remove duplicate semantic definitions;
- make MotsPet the source of truth for controlled product terminology.

### LANG-05 — regional duplication proof
Create the first non-Brittany real regional profile only after:
- Brittany review evidence exists;
- regional source rights are controlled;
- the duplication requires no change to the semantic core.

## 7. Non-goals of this slice

This slice does **not**:

- rename Breiz repository-wide;
- change UI navigation or visual design;
- declare Breton/Gallo translations correct;
- activate new external APIs;
- ingest BCD/Bécédia/Bretania content;
- change ELI scientific authority;
- turn regional context into dog-state evidence;
- claim production readiness.
