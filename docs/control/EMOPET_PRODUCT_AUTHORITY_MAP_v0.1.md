# EMOPET — Product Authority Map v0.1

**Status:** PROPOSED CONTROLLED PRODUCT/DATA AUTHORITY — FOUNDER REVIEW REQUIRED  
**Date:** 2026-09-06  
**Canonical terminology revision:** 2026-09-11 under DOMAIN-TERM #245  
**Parent:** #223  
**Doctrine:** `docs/product/EMOPET_EXPERIENCE_DOCTRINE_v0.1.md`

> The 2026-09-11 revision updates dog-owner terminology only. Authority boundaries, permissions and maturity status are unchanged.

## 0. Purpose

This document defines **who is allowed to say what, based on which source, to which surface, under which permission**.

It exists to prevent semantic leakage across EMOPET. A datum being technically available does not make it authorized for every feature.

The default rule is:

> **No cross-domain use without an explicit purpose, authority, provenance path and permission basis.**

## 1. Authority classes

| Class | Meaning | Examples |
|---|---|---|
| `SENSOR_RAW` | Raw or minimally processed device evidence | MAT PVDF/IMU/load/environment; TAG IMU/acoustic/context |
| `QUALIFIED_OBSERVATION` | Observation that passed the applicable quality/provenance/confidence gate | rest-window observation, qualified movement trend |
| `OWNER_FACT` | Explicit factual information supplied/confirmed by Owner | schedule, dog profile, chosen place, declared routine |
| `OWNER_PREFERENCE` | Explicit/confirmed preference, not evidence about the dog | activity preference, notification preference |
| `ELI_INTERPRETATION` | Bounded scientific interpretation with provenance/confidence/abstention | descriptive longitudinal change state |
| `BREIZ_EXPLANATION` | Contextual explanation/retrieval/suggestion, never independent dog-state truth | explanation, source-backed local fact, navigation help |
| `MEMORY_CONTENT` | Owner-chosen private relationship history | Moment, milestone, chosen place, note |
| `COMMUNITY_SPEECH` | User/professional/community content subject to moderation | post, reply, Circle/event content |
| `WORLD_STATE` | Optional playful/social state independent of canine evidence | personal-space object, symbolic keepsake |
| `PROFESSIONAL_INTERPRETATION` | Conclusion made by veterinarian/authorized professional | clinical assessment, diagnosis, care decision |

## 2. Canonical flow map

```text
MAT/TAG RAW
    ↓ qualification / provenance / sensor-specific validation gates
QUALIFIED OBSERVATION
    ↓
ELI bounded interpretation
    ├──→ Care / Today
    ├──→ Breiz explanation (certainty cannot increase)
    └──→ Owner-controlled Veterinary Summary

Owner explicit facts/preferences
    ├──→ Care context where separately authorized
    ├──→ Breiz
    ├──→ Together
    ├──→ Memories when deliberately saved
    └──→ Community/World only when explicitly shared for that purpose

Community speech
    └──→ Community / Circles / moderated discovery
         ✕ never becomes ELI ground truth

Memories
    └──→ private relationship continuity
         └── optional sanitized explicit share copy
         ✕ never becomes scientific confidence

World state
    └──→ World only / explicitly connected social surfaces
         ✕ never becomes Care score, ELI evidence or dog-performance reward

Veterinary Summary
    → authorized veterinarian
    → professional interpretation happens outside EMOPET scientific authority
```

## 3. Domain authority matrix

| Destination | Allowed primary inputs | Conditional inputs | Forbidden by default |
|---|---|---|---|
| **Care / ELI** | qualified MAT/TAG observations; approved contextual inputs | owner facts with explicit scientific role | Community popularity/speech, Memories sentiment, World state, raw Breiz conversation |
| **Today / Home** | qualified Care state; operational device/account state; user-requested continuations | bounded Community/World operational state | generic health verdict, click-probability ranking, private cross-domain content without purpose |
| **Breiz** | qualified Care observations, controlled sources, confirmed preferences | owner context needed for requested help | unsupported dog emotion, hidden certainty increase, unverified local source presented as fact, automatic sharing |
| **Together** | confirmed preferences, practical context, approved suitability inputs | bounded canine-context signals only after their own review | relationship score, good-Owner score, ELI emotion, hidden profiling, refusal-as-failure |
| **Memories** | deliberate Moment, Owner-authored milestone/place/ritual | explicitly confirmed factual context | automatic ELI narrative, sensor anomaly, Community popularity, dog-performance score |
| **Community / Circles** | moderated social content, explicit profile/audience choices | bounded context required for safe eligibility | automatic Care/ELI disclosure, exact location by default, private Memories, raw Breiz conversation |
| **World** | World-specific state, permitted social identity/context | optional explicit sanitized Memory/Community handoff | MAT/TAG/ELI reward, real dog activity progression, health/bond score |
| **Veterinary Summary / Vet View** | Owner-authorized bounded observation history + provenance/confidence | selected owner notes/context | private Memories, Community/World data, raw Breiz conversation, unrestricted raw telemetry by default |

## 4. ELI authority

### ELI may
- receive only inputs with documented scientific/product authority;
- preserve provenance and quality state;
- publish bounded descriptive outputs;
- degrade or reject output when evidence is insufficient;
- expose uncertainty/abstention downstream.

### ELI may not
- infer human-style emotion as certainty;
- transform breed stereotypes into individual truth;
- use Community or social success as behavioral evidence;
- use Memories as latent emotional labels;
- use a veterinarian's diagnosis as hidden training ground truth without a separately governed research protocol;
- turn missing data into positive reassurance.

### Downstream invariant
No consumer may increase certainty above ELI's authorized output.

If ELI says `DEGRADED` or `INSUFFICIENT_INFORMATION`, Breiz, Today, a notification or a report must not rewrite it as certainty.

## 5. Breiz authority

Breiz is **not** a second inference engine.

Allowed roles:
- explain an already-qualified observation;
- retrieve source-controlled local/reference information;
- ask clarification;
- help navigate product controls;
- remember explicit/confirmed preferences under the proper privacy scope;
- suggest an optional next action;
- abstain.

Forbidden roles:
- infer an unobserved dog state from prose alone;
- convert activity into emotion;
- convert a local/weather/cultural source into evidence about the dog's internal state;
- invent provenance;
- silently share Care, Memories, Community or location information across scopes;
- make a veterinary conclusion.

### Provenance rule
Material factual/local statements must be able to resolve to an approved source class. If source-rights/provenance gate #116 is not satisfied for the item, Breiz must fail closed, narrow to non-factual assistance or disclose that the information cannot currently be verified.

## 6. Today authority

Today is an **orchestration surface**, not a truth generator.

It may rank:
1. safety/operational blockers;
2. explicit user-requested continuation;
3. qualified Care observation requiring attention;
4. time-sensitive event/task explicitly joined by the user;
5. optional discovery.

It may not rank by:
- expected time spent;
- notification/open probability;
- outrage/virality;
- dog-performance reward value;
- hidden relationship score.

A blank/quiet state is valid.

## 7. Together authority

Together owns the **activity decision contract**, not emotional truth.

Priority order:
1. hard safety/eligibility gates;
2. explicit current request;
3. confirmed preferences;
4. practical context;
5. separately approved dog-context suitability;
6. conservative alternative;
7. abstention.

A refusal updates preference/cooldown only. It must never reduce a relationship score because no such score is authorized.

## 8. Memories authority

Memory requires deliberate Owner authorship or confirmation.

Allowed creation paths:
- user creates/saves Moment;
- user writes milestone;
- user explicitly names a ritual;
- user explicitly retains a place/person/event context;
- user explicitly saves a World keepsake.

Forbidden creation paths:
- `ELI_CHANGE → sentimental memory`;
- `high activity → great day`;
- `low activity → sad day`;
- `sleep pattern → dream narrative`;
- `sensor anomaly → relationship milestone`.

Existing Memories remain private by default and independent from social participation.

## 9. Community / Circles authority

Moderation authorization means only:

> `allowed under Community policy`

It does not mean:
- scientifically correct;
- veterinarian-approved;
- ELI-authoritative;
- safe as individualized professional advice.

Community must visually distinguish:
- user speech;
- verified professional identity/content where applicable;
- sourced educational content;
- EMOPET qualified observation;
- Breiz explanation.

No Community metric may flow into scientific confidence.

## 10. World authority

World may contain optional play only under separate gates.

Allowed candidate sources:
- World-specific user choices;
- cosmetic/persistent-space state;
- cooperative activity state;
- explicit Community/Circle participation state;
- optional symbolic keepsakes.

Forbidden reward sources:
- step count;
- distance;
- sleep/rest;
- MAT adherence;
- ELI state/confidence;
- inferred emotion;
- dog health/wellbeing;
- relationship quality.

## 11. Owner authority and professional sharing

The Owner–dog relationship is the central product authorization boundary.

A future professional grant should contain at minimum:
- `grant_id`;
- dog/Owner authority;
- recipient identity or controlled recipient binding;
- purpose;
- data categories;
- time range;
- created/accepted timestamps;
- expiry;
- revocation state;
- audit trail.

A single boolean such as `vet_export_opt_in=true` may express a coarse preference, but **cannot be sufficient durable authority for ongoing recipient-bound professional access**.

Default professional share excludes:
- private Memories;
- Community private/social content;
- World state;
- raw Breiz conversation;
- unrelated location history;
- unrestricted raw telemetry.

## 12. Semantic labels required in product research

During prototypes and the 90-day pilot, outputs should be testable against these visible/internal classes:

- `OBSERVATION`
- `EXPLANATION`
- `SUGGESTION`
- `MEMORY`
- `COMMUNITY_SPEECH`
- `PROFESSIONAL_INTERPRETATION`

If users cannot distinguish these reliably, the cross-surface architecture is not ready.

## 13. Forbidden flows register

The following are launch blockers unless a later controlled authority explicitly supersedes them:

| Forbidden flow | Reason |
|---|---|
| `MAT/TAG/ELI → XP/points/levels/streaks` | gamifies real-dog performance/evidence |
| `ELI → automatic sentimental Memory` | invents relationship meaning |
| `Community popularity → Care/ELI` | social signal is not scientific evidence |
| `raw Breiz conversation → recommender/social graph` | privacy + hidden profiling risk |
| `private Care → Community` | purpose/audience violation |
| `private Memory → Vet by default` | unrelated private relationship content |
| `Breiz local source → dog-state inference` | context is not canine evidence |
| `World activity → health/relationship score` | semantic contamination |
| `vet access boolean → permanent broad access` | inadequate scope/revocation model |

## 14. Required implementation controls

Before production claim:
- typed domain/source classification for material cross-surface payloads;
- backend authorization for durable grants;
- provenance retained through Care → Breiz/Vet Summary;
- automated tests for forbidden flows where technically enforceable;
- privacy/audience tests across Memories/Community/World;
- fail-closed local-source behavior linked to #116;
- audit events for professional access/revocation;
- copy/UX testing proving semantic categories are understood.

## 15. Status

This map is an authority proposal, not proof that the current repository already enforces all boundaries.

**Gate:** `G-EMOPET-PRODUCT-AUTHORITY-MAP-01 = OPEN`

Close only after Founder + Product/UX + Science/ELI + Privacy/Security + Breiz/AI review and implementation mapping.