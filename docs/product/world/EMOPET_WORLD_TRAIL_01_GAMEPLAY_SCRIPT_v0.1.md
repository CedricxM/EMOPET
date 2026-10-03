# EMOPET — WORLD ACTIVITY SCRIPT — LA PISTE COMMUNE v0.1

**Date:** 2026-09-01  
**Activity ID:** `TRAIL_01`  
**Status:** PROPOSED GAMEPLAY SCRIPT / NOT IMPLEMENTED  
**Players:** 2–4 Guardians  
**Target duration:** ~8–12 minutes (design target only)  
**Competitive ranking:** NONE

## 1. Activity fantasy

A small group enters a stylized regional trail to reconstruct a shared route from environmental clues.

The experience should feel:
- collaborative;
- light;
- social;
- discoverable;
- slightly playful;
- not educational homework.

No dog-performance mechanic is used.

## 2. Entry flow

### T+00:00 — Group ready
At the shared trail gate:
- organizer sees group members;
- each member chooses `READY`;
- activity launches only after explicit ready state.

Breiz:
> “Vous allez suivre une piste ensemble. Rien à gagner contre les autres : le but, c’est de trouver le chemin.”

No leaderboard is shown.

### T+00:20 — Scene entry
Players appear at a compact stylized trailhead.

Dog avatars enter beside their Guardians using neutral walk animation.

No emotional bark/gesture.

## 3. Beat 1 — The broken markers

### T+00:30 to 02:30

Three visual markers are scattered in the opening area.

Players must:
- find all three;
- inspect them;
- communicate which symbols they saw.

Each player can inspect any marker.

The final sequence only becomes available after all three markers are discovered by the group.

Social value:
- encourages talking/pointing;
- does not require skill dominance.

Dog role:
- purely present/following;
- does not “sniff out” the answer;
- no AI hint through dog behaviour.

Breiz only intervenes if the group stalls for a configurable test threshold:
> “Vous avez trouvé plusieurs marques. Peut-être qu’elles vont ensemble.”

## 4. Beat 2 — The split bridge

### T+02:30 to 05:00

Players reach a small symbolic bridge/gate.

Two or more separate interaction points must be activated within a short time window.

For 2 players:
- both activate one point.

For 3–4 players:
- two are required;
- others may inspect the next area or help coordinate.

Design rule:
no player is assigned “better” or “leader” status.

Human avatars can use a pointing/wave emote.

Dog avatars wait neutrally near the Guardian.

Completion opens the gate.

## 5. Beat 3 — Regional discovery

### T+05:00 to 07:00

The group reaches one source-backed discovery object.

Content slot:
`CONTENT_PENDING_SOURCE_REVIEW`

The content must:
- be short;
- be genuinely connected to Brittany;
- come from a source eligible for EMOPET local culture;
- show provenance on demand.

Interaction:
- players inspect 3 visual fragments;
- one fragment correctly corresponds to the sourced story/place/object.

This is not a school quiz.
The environment itself should make the answer inferable.

Breiz:
> “Ça, c’est du contexte culturel du territoire — pas une donnée sur votre chien.”

This line is important for semantic separation.

## 6. Beat 4 — Reconstruct the route

### T+07:00 to 09:30

The group reaches a shared table/map object.

The three earlier marker symbols and the regional clue must be placed in the correct sequence.

Mechanic:
- drag/place;
- each player may move one piece at a time;
- no timer pressure;
- wrong placement gives neutral feedback only.

When complete:
- final route lights up;
- short environment transition occurs;
- no emotional dog animation.

## 7. Completion

### T+09:30 to 10:15

Everyone receives the same keepsake:

**Working name:** `Souvenir de piste — Bretagne 01`

Possible visual:
- small stylized route marker;
- decorative card;
- framed emblem.

Properties:
- identical for all participants;
- non-tradable in slice;
- non-purchasable;
- no rarity tier;
- no power;
- no relation to dog health.

Completion card:
> “Vous avez terminé La piste commune ensemble.”

Optional:
- `Retour au Hub`
- `Placer le souvenir dans Mon espace`

No auto-post to Community.

## 8. Immediate second-activity hook

The hook should not be:
- “daily reward”;
- “streak”;
- “come back tomorrow or lose it”.

Instead, on return to Hub the group sees:

> **Une autre activité est ouverte dans le Hub.**

Working second activity teaser:
### `ATELIER_01 — La fresque collective`

Concept:
- 3–6 Guardians contribute one visual tile each;
- together they build a temporary shared mural in the Hub;
- each participant gets a snapshot/keepsake after completion;
- no competition.

Why this is a good hook:
- changes activity type;
- remains social;
- gives a visible world consequence;
- creates “we did something here” feeling.

## 9. Failure/exit handling

A player may leave at any time.

If one leaves:
- activity scales down if minimum players remain;
- no punishment;
- no loss of streak/reward.

If group drops below 2:
- activity pauses;
- players may return to Hub.

Blocked user:
- cannot re-invite during the session;
- must not be automatically re-matched into the same private activity.

## 10. What must be measured in playtest

Without pretending results exist:
- time to understand objective;
- number of prompts needed;
- spontaneous communication;
- awkward silence vs natural collaboration;
- confusion around dog-avatar role;
- desire to launch another activity;
- whether the keepsake feels meaningful;
- whether the activity feels like a quiz.

## 11. Hard fail conditions

Fail if:
- one skilled player can complete everything alone while others watch;
- dog animation is interpreted emotionally;
- players focus on rewards more than interaction;
- regional content feels like school;
- activity requires real-dog data;
- users ask why there is no leaderboard;
- players would rather do the exact same thing in a text feed.

**STATUS: GAMEPLAY SCRIPT READY FOR PAPER/PROTOTYPE REVIEW.**