# EMOPET — MEMORIES EXPERIENCE MASTER v0.1

**Original date:** 2026-09-01  
**Imported to project memory:** 2026-09-07  
**Status:** `PROPOSED PRE-PRODUCTION AUTHORITY / NOT IMPLEMENTED / NOT RELEASED`  
**Gate:** `G-MEMORIES-EXPERIENCE-01`

> GitHub import preserves this document's original maturity. It does not make Memories an implemented or released feature.

## 1. Product role

Memories is the private longitudinal history of a Guardian–dog relationship.

It exists to preserve continuity through deliberately retained:

- Moments;
- places;
- people;
- routines/rituals;
- Circle/event context;
- World keepsakes;
- user-authored milestones.

Memories is **not**:

- a health dashboard;
- a relationship score;
- a dog-performance history;
- a social feed;
- a retention machine;
- an automatic emotional biography generated from sensors.

> **Memories remembers what was lived and deliberately kept. It does not decide what the relationship meant.**

## 2. Core hierarchy

```text
MOMENT
 deliberate lived capture
    ↓ optional private save
MEMORY ENTRY
 private relationship chronology
    ↓ optional organisation
MEMORY TIMELINE / LENSES
    ↓ separate explicit action only
SHARE DRAFT → COMMUNITY MODERATION

Optional:
MEMORY ENTRY → WORLD KEEPSAKE
```

No arrow runs directly from Care/ELI to sentimental Memory text.

## 3. Default privacy

Memory defaults:

- private;
- no audience;
- no social discovery;
- no public profile presence;
- no Circle access;
- no Vet View access by default;
- no automatic World exposure.

Already-created Memories must remain accessible independently of social participation and must not be held hostage behind future engagement mechanics.

## 4. What may become a Memory entry

### `MOMENT`
Photo, short video, note or lived capture deliberately saved.

### `MILESTONE`
Guardian-authored or explicitly confirmed fact.

### `PLACE_MEMORY`
A place the Guardian deliberately chooses to retain. Prefer broad/user-chosen labelling; no automatic home/work inference.

### `PEOPLE_CONTEXT`
A person/Circle attached only through permitted identity/audience rules.

### `RITUAL`
A routine explicitly named or confirmed by the Guardian. Frequency alone must not be treated as emotional importance.

### `WORLD_KEEPSAKE`
Optional symbolic artifact created by user choice.

## 5. Excluded by default

Do not auto-create sentimental Memory entries from:

- step count;
- distance;
- calories;
- activity ranking;
- ELI;
- Valence/Arousal estimates;
- sleep/rest metrics;
- sensor anomalies;
- medical/veterinary events;
- private Breiz raw conversation;
- Community popularity;
- follower/reaction count.

Care and Memories may coexist chronologically, but they remain different semantic domains.

## 6. Timeline

Default view candidate: **Votre histoire**.

Chronological, calm and non-scored.

No:

- memory completion percentage;
- missing-month warnings;
- streak gaps;
- “you were more active last year” pressure;
- “relationship peak”.

A year with three Memories is not worse than a year with fifty.

## 7. Lenses

Optional filters, not scores:

- `Moments`
- `Repères`
- `Lieux`
- `Avec d'autres`
- `Circles`
- `World`
- `Années`
- possible later `Rituels`

The absence of a category has no negative meaning.

## 8. Resurfacing

First-release default candidate: `MANUAL_ONLY`.

Possible future controlled modes:

- `OCCASIONAL_PRIVATE`
- `DATE_BASED_PRIVATE`
- `USER_PINNED_REMINDER`

No push unless separately enabled.

No resurfacing based on:

- loneliness inference;
- late-night use;
- low engagement;
- emotional vulnerability;
- dog health changes;
- dog death inferred from inactivity;
- social comparison.

## 9. Breiz role

Breiz may:

- find a requested Memory;
- summarise factual context;
- ask whether the user wants to save a new Moment;
- help title/caption without inventing dog emotion;
- offer a private resurfacing only under an authorised mode.

Breiz may not:

- say what the dog “felt” unless quoting Guardian-authored text;
- declare the relationship stronger/weaker;
- create a memory streak;
- pressure sharing;
- infer grief;
- generate sentimental certainty from Care/ELI.

## 10. Sharing

Sharing creates a separate social object or sanitised share representation.

Private Memory remains private.

`MEMORY → SHARE_DRAFT → sanitation → audience → moderation → published`

No implicit audience inheritance from a Circle/event.

## 11. World

A Memory may optionally create/display a symbolic keepsake.

World does not become a second public Memory database.

No performance unlocks based on Memories.

## 12. Export / deletion

User must be able to:

- export Memories;
- export associated user-owned media where applicable;
- delete a Memory entry;
- delete a social share separately;
- understand which copies/context remain for safety/legal/audit reasons.

Essential privacy/export/delete controls must not be gamified.

## 13. Success criteria

Success means:

- user understands Memories are private;
- timeline feels meaningful without scoring;
- resurfacing feels optional;
- Breiz does not invent meaning;
- sharing is visibly separate;
- deletion/export scopes are understandable;
- long quiet periods are accepted without product pressure.

**STATUS: MASTER READY FOR FOUNDER / PRIVACY / UX REVIEW.**
