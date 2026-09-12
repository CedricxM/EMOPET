# EMOPET — Experience Doctrine v0.1

**Status:** PROPOSED CONTROLLED PRODUCT AUTHORITY / FOUNDER REVIEW REQUIRED  
**Date:** 2026-09-06  
**Canonical terminology revision:** 2026-09-11 under DOMAIN-TERM #245  
**Parent gate:** `G-EMOPET-EXPERIENCE-HARDENING-01`  
**Master issue:** #223

> The 2026-09-11 revision updates dog-owner terminology only. Product boundaries, gates and maturity status are unchanged.

## 0. Purpose

This document unifies the product logic of Care, Breiz, Together, Memories, Community, World and professional/veterinary sharing without promoting planned surfaces into released or validated product facts.

EMOPET is not differentiated by any single generic feature such as a personalised baseline, AI monitoring, a veterinary PDF, a community feed, a memory timeline or a recommendation engine. Its intended defensible territory is the **governed continuity between several domains that remain semantically and permission-wise distinct**.

## 1. Product category hypothesis

Working category hypothesis:

> **EMOPET is a continuity architecture for everyday life with a dog.**

This is a product-positioning hypothesis, not a protected category claim or proof of market uniqueness.

The architecture aims to preserve seven continuities:

1. **Observation continuity** — MAT + TAG observe complementary contexts.
2. **Evidence continuity** — signal provenance, qualification, confidence and abstention stay attached to observations.
3. **Daily continuity** — Care, Today and Breiz help the Owner understand what deserves attention now.
4. **Relationship continuity** — Together, Moments and Memories preserve chosen shared-life context without scoring the bond.
5. **Social continuity** — Community, Circles and World can support real connection without turning dog performance into social status.
6. **Territorial continuity** — Breiz and local discovery use controlled regional/contextual information without contaminating ELI inference.
7. **Professional continuity** — the Owner may share a bounded, revocable, provenance-preserving summary with a veterinarian or other authorized professional.

## 2. Semantic domains

### 2.1 Care / ELI — observation domain

**Job:** describe qualified longitudinal observations about the dog.

May use:
- MAT/TAG sensor outputs that passed their own qualification gates;
- bounded owner/context inputs where explicitly authorized;
- ELI provenance, quality, confidence and abstention logic.

Must not:
- diagnose disease;
- assert unsupported emotions;
- produce a generic health score;
- convert low-confidence evidence into confident narrative;
- treat Community popularity, Memories sentiment or World activity as scientific evidence.

### 2.2 Breiz — contextual companion domain

**Job:** explain, contextualize, retrieve useful local/reference information, ask clarifying questions and help the Owner navigate EMOPET.

Breiz may:
- explain a qualified ELI observation without increasing its certainty;
- retrieve controlled local/reference knowledge;
- remember permitted, confirmed user preferences;
- suggest bounded next actions;
- abstain.

Breiz must not:
- become an independent dog-state authority;
- infer emotion from sensor data;
- turn cultural/local context into canine-state evidence;
- silently move private information between domains;
- take consequential social/location/sharing actions without the required confirmation.

### 2.3 Today / Home — orchestration domain

**Job:** answer: `What deserves my attention in EMOPET right now?`

Today is not:
- a health verdict;
- a feed;
- a task-pressure surface;
- a red-dot accumulation surface.

A quiet Today state is valid.

### 2.4 Together — activity / suggestion domain

**Job:** answer: `What might make sense for this Owner and dog to do now?`

Together may use explicit preferences, practical context and bounded approved suitability signals.

Together must not:
- score the relationship;
- score the Owner;
- treat refusal as relationship failure;
- optimize only for suggestion acceptance;
- infer that repeated activity equals emotional importance.

A good outcome may be a suggestion, a conservative alternative or abstention.

### 2.5 Moments / Memories — chosen relationship-history domain

**Job:** preserve what the Owner deliberately chooses to keep from shared life.

Memories may contain:
- deliberate Moments;
- user-authored milestones;
- chosen places;
- people/context under permission;
- explicitly named rituals;
- optional World keepsakes.

Memories must not:
- auto-create sentimental narratives from MAT/TAG/ELI;
- score relationship strength;
- use streaks or completion pressure;
- turn sensor anomalies into sentimental memory entries;
- become public by default.

### 2.6 Community / Circles — human social domain

**Job:** help Owners find useful local people, activities, groups and knowledge.

Community must remain distinct from EMOPET scientific authority.

It may support:
- moderated posts;
- Circles;
- events;
- discovery;
- controlled handoff into World.

It must not:
- automatically publish Care/ELI data;
- use dog physiology as status;
- optimize for virality, outrage, follower accumulation or time spent;
- treat user advice as EMOPET interpretation;
- expose precise location by default.

### 2.7 World — playful/social experience domain

**Job:** provide an optional persistent interactive place worth entering even when no new Care/ELI information exists.

World may contain bounded playful systems if they are independent from canine wellbeing and real-dog performance.

World must not:
- turn MAT/TAG/ELI into XP, currency, rank, rarity or progression;
- reward steps, rest, activity, sleep, wellbeing or inferred emotion;
- create a dog-health, dog-happiness or relationship scoreboard;
- make human connection require paid currency or performance;
- treat the dog's real-world behaviour as game-controller authority.

### 2.8 Professional / Veterinary sharing — delegated observation domain

**Job:** let the Owner share a bounded observation history with an authorized professional.

Default principles:
- Owner-controlled;
- recipient-bound where feasible;
- time/data scoped;
- revocable/expiring;
- access audited;
- provenance/confidence preserved;
- no automatic transfer of private Memories, Community, World or raw Breiz conversation.

The professional interprets clinically. EMOPET does not.

## 3. Cross-surface firewall

The following flows are **forbidden by default**:

- `ELI → sentimental Memory text`
- `ELI → Community post`
- `ELI → World reward/progression`
- `Community popularity → ELI confidence`
- `World participation → Care score`
- `Memories quantity → relationship score`
- `raw Breiz conversation → social recommender`
- `private Care/ELI → Vet View without explicit Owner authority`
- `local/cultural Breiz source → canine-state evidence`

Any exception requires a separately documented authority, purpose, permission model, provenance path and validation gate.

## 4. Playfulness / gamification authority

### 4.1 Forbidden gamification

Never gamify or reward:
- health or wellbeing;
- inferred emotion;
- relationship quality;
- veterinary risk;
- dog activity volume;
- steps/distance;
- sleep/rest quantity;
- MAT/TAG adherence as moral performance;
- ELI confidence;
- `good Owner` behaviour;
- public dog popularity.

Forbidden mechanics include, when tied to those domains:
- XP;
- levels;
- streaks;
- leaderboards;
- scarcity/FOMO rewards;
- public ranks;
- badges implying health/relationship superiority.

### 4.2 Potentially allowed play

Playful systems may be explored in World or other specifically governed surfaces when:
- they are not driven by real-dog health/wellbeing/performance;
- they do not manipulate Care/ELI semantics;
- they can function without fresh sensor output;
- failure/refusal does not shame the user;
- they remain behind their own design, safety, privacy and usability gates.

Examples of potentially acceptable candidates:
- cooperative World activities;
- symbolic keepsakes;
- personal-space decoration;
- non-competitive shared discovery;
- preset social interaction.

This section resolves the product-level conflict between a blanket `no gamification` rule and the separately governed World concept. It does **not** authorize existing prototype game mechanics for release.

## 5. Source-of-truth hierarchy

When product documents conflict, use this order unless a later approved authority explicitly supersedes it:

1. Founder-approved controlled product/scientific/privacy/security authority;
2. closed gate evidence and approved specification;
3. current architecture / controlled implementation contract;
4. implemented prototype code;
5. mock/demo content;
6. historical briefs and exploratory documents.

Code existence is never sufficient to promote a product hypothesis to approved policy or validated capability.

## 6. Surface necessity rule

Every primary surface must answer all six questions before release:

1. **User job** — what problem does this surface solve?
2. **Unique value** — why is another surface insufficient?
3. **Authority** — which inputs may it trust/use?
4. **Boundary** — what must never leak into it?
5. **Autonomous value** — is it worth using on its own terms?
6. **Kill criterion** — what evidence would cause EMOPET to merge, narrow, defer or remove it?

No surface is protected from deletion merely because substantial design/code work already exists.

## 7. System-level success criterion

EMOPET succeeds only if the ecosystem feels coherent without flattening its domains.

An Owner should be able to understand the difference between:
- **observation** — what EMOPET measured/qualified;
- **explanation** — how Breiz explains known information;
- **suggestion** — what might be useful to do;
- **memory** — what the Owner deliberately chose to preserve;
- **community speech** — what another person says;
- **professional interpretation** — what a veterinarian concludes.

If users routinely confuse these categories, the experience has failed even if individual features are attractive.

## 8. Competitive discipline

Do not claim uniqueness from a generic feature alone, including:
- personalized baselines;
- AI monitoring;
- behaviour-change detection;
- early awareness;
- veterinary summaries;
- sharing with a veterinarian;
- community maps/events;
- memory timelines;
- recommendation engines.

Competitive differentiation should be argued only from verified architecture, evidence discipline, user experience and validated outcomes.

## 9. Evidence needed before `BULLETPROOF` language is allowed internally

The following must exist:
- controlled whole-ecosystem user testing;
- MAT incremental-value evidence against an appropriate TAG-only baseline;
- validated confidence/abstention behavior for intended observations;
- cross-surface privacy/permission tests;
- veterinary usefulness evidence for professional sharing;
- proof that Community/World can create value without engagement-maximization mechanics;
- proof that users understand the semantic separation between domains;
- local/source-rights governance closure for released regional intelligence;
- production architecture/security gates appropriate to launch scope.

Until then, use:

> `DISTINCTIVE CONTROLLED EXPERIENCE ARCHITECTURE — VALIDATION OPEN`

not:

> `BULLETPROOF`, `CLINICALLY PROVEN`, `MARKET UNIQUE`, or equivalent certainty.

## 10. Immediate linked work

- #223 — Experience hardening master
- #43 — World vertical slice
- #53 — humane engagement
- #58 — Memories
- #59 — Together
- #60 — Today/Home
- #61 — App Shell / IA
- #64 — Owner Authority / Vet View (historical workstream number retained)
- #116 — third-party data/service-rights gate

**Gate:** `G-EMOPET-EXPERIENCE-DOCTRINE-01 = OPEN`

Close after Founder + Product/UX + Science/ELI + Privacy/Security + Breiz/AI review.