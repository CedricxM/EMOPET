# EMOPET — HUMANE SOCIAL ARCHITECTURE MASTER v0.2 — VERIFIED RESEARCH DELTA

**Original date:** 2026-09-01  
**Imported to project memory:** 2026-09-07  
**Status:** `PROPOSED CONTROLLED PRODUCT / TRUST & SAFETY AUTHORITY — FOUNDER REVIEW REQUIRED`  
**Release status:** `NOT RELEASED / NOT LEGAL SIGN-OFF / NOT IMPLEMENTED`  
**Primary gates:** `OPEN-WORLD-HUMANE-DESIGN-001`, `OPEN-WORLD-SAFETY-AGE-001`, `OPEN-WORLD-MATCHING-001`

> Memory import preserves the source status. Importing this document to GitHub does not close a gate or promote it to released product authority.

## 0. Executive doctrine

EMOPET Community and World must be designed around **meaningful connection, appropriate canine-context matching, safe discovery, and easy disengagement**.

They must not be designed around maximizing time spent, scroll depth, notification opens, posting volume, follower accumulation, virality, FOMO, streak dependence or behavioral manipulation by Breiz.

> **A successful EMOPET social session is not the longest session. It is one that helps an Owner safely find a useful person, activity, group, discovery or shared World experience — and then makes leaving the product easy.**

Offline interaction is optional and mutually chosen. World-only or Community-only outcomes can also be successful.

## 1. Social architecture

```text
COMMUNITY
posts / groups / events / discoveries
        ↓
SOCIAL DISCOVERY & MATCHING
Owner interests + canine encounter context
        ↓
WORLD
interactive social presence / shared activities
        ↓
OPTIONAL REAL-WORLD MEET
separate consent + safety/location gates
```

No layer automatically publishes Care, MAT, TAG, ELI, private Memories or raw Breiz conversation.

## 2. Feed — finite by design

Candidate sections:

- `LOCAL NOW`
- `UPCOMING`
- `CIRCLES`
- `DISCOVER`
- `RECENT`

Each section returns a bounded batch. Further content requires an explicit action such as `Voir plus`.

Natural end candidate:

> **Tu as vu l’essentiel pour maintenant.**

A UI that silently prefetches forever fails this rule even if it does not call itself infinite scroll.

No autoplay chain. No streak mechanics. No public popularity hierarchy.

## 3. Recommender doctrine

Allowed priority inputs, subject to policy:

1. policy eligibility;
2. safety;
3. explicit user intent;
4. activity suitability;
5. canine contextual fit;
6. confirmed Owner interests;
7. chosen Circles/connections;
8. broad regional relevance;
9. freshness;
10. source/provenance quality;
11. diversity.

Forbidden optimization objectives:

- predicted time spent;
- session count;
- outrage or controversy;
- compulsive return;
- notification opens;
- follower growth;
- virality;
- public popularity.

Required user controls should include mechanisms equivalent to:

- `Pourquoi cette suggestion ?`
- `Moins de contenus comme ça`
- `Masquer`
- `Ne plus utiliser cette préférence`
- `Mettre les suggestions en pause`

## 4. Canine + Owner matching

No global compatibility percentage, dog friendship score, ELI compatibility or breed-essentialist rule.

```text
AGE / ACCOUNT / PRIVACY
        ↓
BLOCK / SAFETY
        ↓
CANINE SAFETY VETO
        ↓
CANINE ACTIVITY-CONTEXT FIT
        ↓
OWNER PRACTICAL FIT
        ↓
CONFIRMED SHARED INTERESTS
        ↓
CANDIDATE ACTIVITY
        ↓
EXPLICIT MUTUAL ACCEPTANCE
```

Possible bounded outputs:

- `LOW_PRESSURE_PARALLEL_WALK_ONLY`
- `WALK_CANDIDATE`
- `INTRODUCTION_CANDIDATE`
- `PLAY_CANDIDATE_WITH_SUPERVISION`
- `INSUFFICIENT_INFORMATION`
- `NOT_RECOMMENDED_CURRENTLY`

No candidate is a guarantee.

## 5. Breiz anti-manipulation contract

Forbidden:

- guilt;
- loneliness exploitation;
- FOMO;
- repeated nudging after refusal;
- “people are waiting for you” pressure;
- “I miss you” engagement pressure;
- using raw sensitive conversation to improve engagement;
- converting raw conversation directly into social-match data.

Allowed:

- suggest;
- explain;
- ask permission;
- store confirmed preferences;
- help plan;
- respect refusal;
- abstain.

Preference pipeline:

`conversation → candidate preference → user confirmation → chosen shareability scope`

## 6. Notification doctrine

- `P0 — safety/account`: may be immediate.
- `P1 — user-triggered/direct social state`: immediate only where appropriate/enabled.
- `P2 — recommendations`: digest/batch by default.
- `P3 — engagement bait`: blocked.

Blocked copy includes pressure such as “Tu rates quelque chose”, “Tes amis t’attendent”, streak-loss warnings or profile-view bait.

Ignored notifications must not trigger escalating pressure.

## 7. Youth policy candidate

**This is EMOPET product policy, not a statement of French law.**

### Under 13 — `HOUSEHOLD_CHILD_ONLY`

No independent public social identity, public posting, stranger discovery, DM, public World presence, matching, Meet Mode or public location.

### 13–14 — `LIMITED_YOUTH_NO_PUBLIC_SOCIAL`

Conservative candidate: no independent public Community/World social account, stranger graph, public posting, adult private contact or Meet Mode.

### 15–17 — `YOUTH_MODE`

Private by default. Youth-safe spaces/groups/events may be considered under stronger moderation and safety restrictions.

Blocked candidates include adult stranger DM/matching/private-space invitations, Meet Mode, exact live location, global public discovery, recommendation of youth content to unknown adults and external indexing.

### 18+ — `ADULT_SOCIAL`

Adult social features remain subject to moderation, privacy, trust, matching, location and safety gates.

Meet Mode v1 candidate: **18+ only**.

## 8. Age assurance direction

Layered approach candidate:

1. self-declared DOB;
2. risk/capability trigger;
3. privacy-preserving age assurance where appropriate/available;
4. retain only what is necessary;
5. do not reuse age-proof data for profiling/marketing;
6. do not distribute raw identity documents into social systems.

## 9. Community moderation

### Pilot

At low volume, **100% human pre-publication moderation** is acceptable and preferred.

### Scale candidate

```text
DRAFT
 ↓
SUBMITTED
 ↓
DETERMINISTIC SAFETY CHECKS
 ↓
AUTOMATED RISK CLASSIFICATION
 ↓
POLICY ENGINE
 ↓
PUBLISH / HUMAN REVIEW / REVISION / REJECT / SAFETY ESCALATION
```

High-risk human review includes minors, grooming/contact risk, severe threats, serious harassment, animal abuse, veterinary/medical certainty, dangerous meetup context and appeals.

`PUBLISHED` means **allowed under Community policy**, never scientific validation or ELI authority.

## 10. Dark-pattern prohibition

- Accept/Decline comparable visual weight.
- Public never default for youth.
- Location sharing never preselected.
- No guilt copy.
- No fake urgency/countdowns.
- No hidden audience expansion.
- Privacy-preserving choices cannot require punitive extra steps.
- Software updates preserve restrictive defaults.

## 11. Success metrics

Primary success candidates:

- mutual invitation acceptance;
- completed shared activity;
- repeat voluntary connection;
- useful reply rate;
- safe event participation;
- post-meet format appropriateness;
- block/report success;
- severe-incident rate;
- time-to-safety-action;
- repeated-contact-after-decline rate;
- location-exposure incidents;
- recommendation-abstention correctness.

Humane-design controls:

- infinite-scroll surfaces = 0;
- autoplay surfaces = 0;
- streak mechanics = 0;
- popularity leaderboard surfaces = 0.

Diagnostic only, never optimized upward:

- time spent;
- scroll count;
- session count;
- notification opens;
- posting volume.

A dashboard showing `time spent ↑` as a positive product outcome fails this doctrine.

## 12. Governance before public launch

Every material social release requires:

1. Product review;
2. Privacy review;
3. Trust & Safety review;
4. age-band review;
5. matching/data-purpose review;
6. recommender review;
7. dark-pattern audit;
8. abuse-case/adversarial QA;
9. moderation readiness;
10. Founder decision.

Before opening to minors, additional external child-safety/privacy review, controlled youth UX research, age-assurance evidence and incident-response rehearsal are required candidates.

## 13. Open gates

- `OPEN-WORLD-HUMANE-DESIGN-001`
- `OPEN-WORLD-SAFETY-AGE-001`
- `OPEN-WORLD-MATCHING-001`
- `G-COMMUNITY-MOD-01`
- `G-WORLD-SOCIAL-01`
- `G-WORLD-LOCATION-01`
- `G-BREIZ-SOCIAL-SAFETY-01`
- `G-WORLD-PLAYTEST-01`

No gate closes because this document exists.

## 14. Release rule

Community/World cannot launch merely because UI, moderation tooling, Unity, Nakama or user enjoyment exists.

Launch requires evidence that users can leave, privacy choices persist, recommendations are explainable, matching abstains when uncertain, canine safety vetoes work, block/report/decline work, feeds are non-compulsive by design and Breiz does not manipulate social behaviour.
