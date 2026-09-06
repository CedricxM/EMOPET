# EMOPET — Surface Necessity Matrix v0.1

**Status:** PROPOSED PRODUCT HARDENING AUTHORITY / REVIEW REQUIRED  
**Date:** 2026-09-06  
**Parent:** #223  
**Doctrine:** `docs/product/EMOPET_EXPERIENCE_DOCTRINE_v0.1.md`

## Purpose

Every primary surface must justify its existence. Sunk cost is not a reason to keep a surface.

| Surface | Primary user job | Unique value | Allowed authority | Hard boundary | Autonomous-value test | Kill / merge criterion |
|---|---|---|---|---|---|---|
| **Today / Home** | Know what deserves attention now | Calm orchestration across domains | Qualified operational states, user-requested continuations | No health verdict, no engagement feed, no unsolicited pressure | User understands priorities in <30s without interpreting Today as a wellbeing score | Merge into Care if it becomes a duplicate dashboard; remove cards that exist only to increase opens |
| **Care / ELI** | Understand qualified longitudinal observations | Evidence contract: provenance + quality + confidence + abstention | Approved MAT/TAG/context inputs | No diagnosis, unsupported emotion, social popularity, memory meaning | Users correctly distinguish observation from explanation/diagnosis | Narrow output if confidence semantics are misunderstood; suppress any metric whose validation/utility is insufficient |
| **Breiz** | Explain, contextualize, retrieve, help navigate | Bounded companion across EMOPET + regional context | Qualified Care facts, approved references, explicit/confirmed preferences | No independent dog-state authority; no silent cross-domain data transfer | Useful when it says less, asks clarification, or abstains; not merely a chat skin over Care | Narrow to retrieval/navigation if generative layer adds hallucination, anthropomorphism or no unique value |
| **Together** | Find an appropriate shared activity now | Learns explicit preferences/refusals without scoring relationship | Explicit/confirmed preferences, practical context, separately approved suitability | No bond score, good-owner score, coercion, medical/emotional inference | Users find suggestions relevant without feeling judged or pressured | Merge into Breiz if it has no distinct decision model; defer if acceptance requires manipulative engagement |
| **Moments** | Deliberately capture something lived | Intentional capture boundary before memory/social publication | User-created media/note/context | No auto-publication; no sensor-generated sentiment | Users understand capture as private-first and intentional | Merge into Memories capture if standalone Moment UX adds no value |
| **Memories** | Preserve chosen shared-life continuity | Private relationship chronology without performance scoring | Deliberate Moments, user-authored milestones, permitted context | No automatic sentimental ELI narrative, no streaks, no completion score | Worth revisiting even with manual-only resurfacing and no push pressure | Reduce to simple timeline/export if AI resurfacing adds distress, pressure or little value |
| **Community** | Find useful local people, groups, events and knowledge | Humane finite social layer tied to local dog life | Moderated public/social content, explicit profile/context permissions | No MAT/TAG/ELI leak, popularity-as-authority, infinite scroll, exact location by default | Users can accomplish a useful local/social task then leave naturally | Remove feed-like surfaces if value is mostly scrolling; narrow to groups/events/discovery if conversation feed is weak |
| **Circles** | Build recurring local belonging | Small recurring groups without follower hierarchy | Explicit membership, event participation, bounded contextual reputation | No automatic trust escalation, popularity score, Care access | Repeated participation occurs because group has real-world/World utility | Merge into Community groups if recurring identity/governance adds no distinct value |
| **World** | Enter an optional persistent playful/social place | Social presence, shared activity, personal space, regional discovery without dog-performance scoring | World-specific state + explicitly permitted social context | No ELI-driven mood/reward, dog activity XP, health/relationship scoring | Would a user open World tonight with no new MAT/TAG/ELI insight? | `NO-GO` if answer is consistently no, or if value depends on Care rewards / engagement dark patterns |
| **Veterinary Summary / Vet View** | Bring a usable chronology into consultation | Professional continuity without asking EMOPET to diagnose | Guardian-authorized bounded observation history + provenance/confidence | No automatic Memories/Community/World/raw Breiz access; no clinical interpretation by EMOPET | Vet can understand relevant change, timing and confidence quickly and says it is useful | Reduce to export-only if portal adds workflow burden; remove fields that do not change consultation usefulness |
| **Guardian Hub / Authority** | Control dog, devices, privacy, sharing, delegation | Central authorization boundary | Account/dog/device/consent/sharing authority | Household/social membership never implies full Guardian rights | User can understand who has access to what and revoke it | Redesign if users cannot predict permissions or revocation behavior |

## Duplicate-risk map

### Today vs Care
- **Today** = prioritization/orchestration.
- **Care** = evidence detail/history.

If Today begins to replicate charts/history, remove them from Today.

### Breiz vs Together
- **Breiz** = explanation/retrieval/conversation interface.
- **Together** = bounded activity decision policy.

If Together becomes only prompts written by Breiz with no distinct policy, merge the user-facing surface while preserving the decision contract as a service.

### Moments vs Memories
- **Moment** = deliberate capture event.
- **Memory** = durable chosen history.

Separate UI is optional; semantic separation is mandatory.

### Community vs World
- **Community** = publish/discover/organize.
- **World** = interactive presence/do-things-together.

No need for duplicate chat/feed systems across both.

### Veterinary Summary vs Vet Portal
- **Summary** = first-line workflow.
- **Portal** = only if real practitioners ask for persistent professional workspace.

Do not build portal-first.

## Release rule

A primary surface cannot move from `PROPOSED` to release authority unless:
1. its user job is unique and understood;
2. its data authority/boundary is testable;
3. its autonomous-value test passes controlled research;
4. its kill criterion has been explicitly reviewed rather than ignored;
5. it does not depend on misleading medical/emotional claims or engagement pressure.

**Gate:** `G-EMOPET-SURFACE-NECESSITY-01 = OPEN`
