# EMOPET — WORLD VERTICAL SLICE DEFINITION v0.1

**Date:** 2026-09-01  
**Status:** PROPOSED CONTROLLED DESIGN CANDIDATE / FOUNDER REVIEW REQUIRED  
**Implementation:** NOT IMPLEMENTED / NO UNITY OR NAKAMA RUNTIME AUTHORIZATION  
**Relationship:** Derived from the World Game Design Core, Community moderation doctrine and dog-avatar non-expressive doctrine.

## 1. What this slice must prove

This slice exists to answer one question:

> Can EMOPET World be genuinely enjoyable as a persistent social experience for Guardians, even when there is no new MAT/TAG/ELI insight to inspect?

The slice must test:
- social presence;
- ease of meeting;
- shared activity;
- persistent personal identity;
- local/cultural discovery;
- Community → World continuity;
- neutral dog-avatar representation;
- moderation/privacy boundaries;
- short-session and longer-session value.

It does **not** test:
- production scale;
- monetization;
- empirical canine validation;
- real-world location matchmaking at full scale;
- durable live economy;
- final art direction.

## 2. Target participant for the first slice

Primary test profile:

**Guardian with an EMOPET account and a dog profile. Hardware ownership is optional.**

The first slice does not require MAT or TAG.

A later accessibility slice may test:
- people without EMOPET hardware;
- people without a dog;
- spectators/guests;
- family/Guardian Circle scenarios.

No decision about a virtual substitute dog for non-dog users is made here.

## 3. First-region scope

**Brittany-first, with Lorient-area visual inspiration as a design direction only.**

The playable hub is stylized and fictionalized. It must not pretend to reproduce a real public place exactly.

Local cultural facts, events or places may only enter the slice through source-backed content slots.

No unsourced “Breton flavour” is hardcoded as factual content.

## 4. Vertical-slice spaces

### 4.1 Shared Hub — `WORLD_HUB_BRETAGNE_01`
Working design name: **Le Hub Bretagne**

Purpose:
- arrival point;
- see other opted-in Guardians in the current instance;
- receive invitations;
- start one cooperative activity;
- access one local discovery;
- return to personal space.

Visual requirements:
- welcoming;
- open;
- readable on mobile-class hardware;
- clearly stylized rather than photorealistic;
- enough landmarks to support spatial memory;
- no visual dependency on dog emotional expression.

### 4.2 Personal Space — `WORLD_HOME_01`
Working user-facing idea: **Mon espace**

Purpose:
- persistent feeling of “this is mine”;
- display 3–6 collected memories/objects;
- choose placement of a small set of neutral objects;
- invite a friend;
- see the dog avatar move through the space using neutral animations.

No status display from ELI.
No mood representation.
No wellbeing-derived decoration.

### 4.3 Discovery Point — `WORLD_DISCOVERY_BZH_01`

A single interactive local-content object in the hub.

It must contain:
- source-backed local/cultural content;
- visible provenance/source access;
- no implication that local context is dog-state evidence;
- one optional shared interaction.

The exact cultural content remains `CONTENT_PENDING_SOURCE_REVIEW`.

## 5. Core social flow

### Presence
A Guardian chooses to be visible in the current World instance.

Visible:
- chosen display name/pseudonym;
- human avatar;
- chosen dog avatar/profile representation;
- optional high-level social status such as “available for activity”.

Not visible by default:
- exact real-world location;
- MAT/TAG data;
- ELI output;
- private Memories;
- legal identity;
- phone/email.

### First contact
Allowed actions:
- wave/emote from human avatar;
- inspect public profile card;
- invite to shared activity;
- invite to personal space;
- block/report.

No automatic “friendship” or location disclosure.

## 6. Cooperative activity — `TRAIL_01`

Working design name: **La piste commune**

Players:
- 2 to 4 Guardians;
- dog avatars are present but do not provide emotional clues.

Duration:
- approximately 8–12 minutes as a design target, not a validated runtime claim.

Mechanic:
1. group enters a compact scene;
2. three environmental clues must be found;
3. each clue requires a simple action, observation or cooperative positioning;
4. one regional content clue is source-backed;
5. completion gives every participant the same **shared keepsake**;
6. no ranking, no winner, no dog-performance score.

Example interaction types:
- align symbols;
- find a landmark detail;
- place discovered objects in the correct sequence;
- stand on separate interaction points simultaneously;
- choose the source-backed answer to a local-content prompt.

Forbidden:
- speed leaderboard;
- real-dog activity requirement;
- “best Guardian” award;
- ELI-based bonus;
- pay-to-skip.

## 7. Keepsakes and progression

The first slice uses **keepsakes**, not currency.

A keepsake may be:
- a decorative object;
- a framed scene;
- a regional card;
- a small cosmetic object;
- a participation memory.

Keepsakes:
- have no monetary value;
- are not tradable in the first slice;
- are not bought;
- do not reflect dog health;
- do not create competitive power.

Long-term progression hypothesis:
**the player’s space becomes a visible history of places, people and shared experiences.**

## 8. Dog-avatar behaviour

The dog avatar is visually identifiable but emotionally neutral.

Required neutral animation set:
- idle standing;
- neutral walk;
- neutral run for scene traversal;
- sit;
- lie down;
- follow Guardian;
- move to waypoint;
- neutral object interaction;
- enter/leave scene.

Prohibited:
- smile/sadness/fear/anxiety/excitement animations;
- ELI-driven animation;
- Valence–Arousal-driven expression;
- mood colours/auras;
- “tired” state from real data;
- affection meter;
- automatic tail/face animation presented as emotional truth.

Test:
If a participant says, “the avatar looks like that because EMOPET thinks my dog feels that way,” the design fails.

## 9. Community → World handoff

### Community object
A pre-moderated Community event/post can contain:
- title;
- description;
- audience;
- broad region/World hub;
- scheduled World session;
- organizer;
- moderation state.

### Handoff
From a published Community event:
**Join in World**

The user enters the relevant World hub/instance.

The handoff must not expose:
- exact real-world coordinates;
- private profile fields;
- ELI/MAT/TAG data.

Community approval means only that the content passed publication policy. It does not make the content scientific authority.

## 10. Moderation model in the slice

### Public posts/events
Pre-publication state machine:

`DRAFT`
→ `SUBMITTED`
→ `PENDING_MODERATION`
→ `PUBLISHED | REVISION_REQUIRED | REJECTED | ESCALATED_HUMAN_REVIEW`

### Realtime World interaction
Realtime chat/emotes cannot use the same delayed publication gate.

They require:
- rate limiting;
- block;
- mute;
- report;
- session removal;
- audit;
- abuse filters;
- escalation.

The slice should include at least one test of:
- block;
- report;
- leaving an interaction;
- revoking visibility.

## 11. Privacy model

The slice must preserve:
- pseudonymous/social identity;
- instance-level presence;
- no exact real-world location to strangers;
- opt-in visibility;
- reversible visibility;
- audience-aware invitations.

Meet Mode / real-world meeting is **not implemented in this first slice**. Only its boundary is preserved.

## 12. Breiz role

Breiz may:
- introduce the hub;
- explain how to join an activity;
- narrate one source-backed discovery;
- distinguish cultural content from EMOPET dog evidence;
- explain safety/privacy controls.

Breiz may not:
- infer dog emotions;
- use World behaviour as ELI evidence;
- turn local culture into dog-state explanation;
- publish social actions without explicit confirmation.

## 13. Technical responsibility map

### Unity — candidate presentation layer
May own:
- scene rendering;
- human/dog avatars;
- neutral animation;
- interaction UI;
- local scene state;
- camera/input;
- personal-space presentation.

### Nakama — candidate realtime/session layer
May support:
- instance presence;
- party/group;
- chat transport;
- cooperative session state;
- invitations.

### Authoritative backend
Must own durable:
- account identity;
- dog ownership/relationship;
- visibility policy;
- moderation state;
- block/report records;
- durable progression/keepsake records;
- audit;
- consent/permissions.

Neither Unity nor Nakama becomes truth authority for ELI or protected Guardian/dog data.

## 14. Explicitly excluded from the first slice

- monetization;
- premium currency;
- marketplace/trading;
- leaderboard;
- dog-performance rewards;
- ELI-driven game state;
- real-time exact location;
- public health/wellbeing feed;
- user-generated 3D object uploads;
- large open-world map;
- persistent public voice chat;
- AR;
- more than one regional hub;
- final art pipeline.

## 15. Concept GO / ITERATE / NO-GO gate

### GO candidate
Proceed to a larger prototype only if playtesting shows that participants:
- understand what to do without heavy explanation;
- voluntarily approach or accept social interaction;
- complete the cooperative activity without competitive pressure;
- understand that the dog avatar is representational, not emotional telemetry;
- find the personal space worth revisiting;
- understand the boundary between Community content and EMOPET evidence;
- express a credible desire to return for the experience itself.

### ITERATE
If the concept is appealing but:
- social initiation is awkward;
- the activity feels educational rather than entertaining;
- the hub feels empty;
- personal space lacks attachment;
- dog-avatar neutrality feels lifeless rather than intentional;
- Community→World handoff is confusing.

### NO-GO / reconsider Unity
If:
- 3D adds friction without social value;
- participants prefer a normal Community feed for the same tasks;
- the experience depends on rewards or ELI data to remain interesting;
- the dog avatar repeatedly causes emotional-state confusion;
- privacy controls make social interaction unusable or unsafe.

**STATUS: VERTICAL SLICE DEFINED — IMPLEMENTATION STILL HOLD.**