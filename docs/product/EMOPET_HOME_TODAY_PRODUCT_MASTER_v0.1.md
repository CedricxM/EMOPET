# EMOPET — HOME / TODAY PRODUCT MASTER v0.1

**Original date:** 2026-09-01  
**Original GitHub workstream:** #60  
**Status:** `PROPOSED PRE-PRODUCTION AUTHORITY / NOT IMPLEMENTED / NOT RELEASED`  
**Gate:** `G-HOME-ORCHESTRATION-01`  
**Imported to project memory:** 2026-09-07

## 1. Product role

Home answers:

> **What deserves my attention in EMOPET right now?**

It does not answer:

- How healthy is my dog?
- How happy is my dog?
- How strong is our relationship?
- What should I do to be a better Guardian?

Home is an orchestration surface, not a verdict surface.

## 2. Core principle

> **Home should be calm enough to leave.**

A successful Home can contain:

- one operational item;
- one qualified Care observation;
- a few quiet entry points;
- or nothing requiring attention.

No engagement feed is required.

## 3. Four zones

### `NEEDS_ATTENTION`
Only real, eligible items such as a device sync problem, account/security action, material event change or qualified Care observation authorised for presentation.

### `CONTINUE`
User-initiated unfinished action, such as device setup, a draft, event confirmation or requested export.

### `EXPLORE`
Quiet entry points such as Together, Memories, Community, World and Care history. These are entry points, not unsolicited personalised recommendations in v1.

### `ASK_BREIZ`
Persistent conversational entry. Breiz can explain what is on Home and answer requests. Breiz does not narrate the dog's inner state.

## 4. What Home never contains

- generic health score;
- relationship score;
- “mood of the day”;
- “dog happiness” ring;
- streak;
- activity leaderboard;
- social popularity;
- autoplay media;
- endless feed;
- “you haven't done enough” pressure;
- forced Together recommendation;
- unsolicited Memory resurfacing in v1;
- public/community content ranked for engagement.

## 5. Quiet Home

Default candidate:

> **Rien ne demande ton attention dans EMOPET pour le moment.**

Supporting text:

> “Tu peux ouvrir Care, Together, Memories, Community ou World quand tu en as envie.”

This means only that EMOPET currently has no eligible attention item.

It does not mean the dog is healthy/happy, that no veterinary problem exists, or that no real-world issue exists.

## 6. Care relationship

Home may surface a Care item only if the source domain authorises presentation.

The card must preserve:

- observation scope;
- context;
- time window;
- confidence/quality state;
- provenance class;
- uncertainty;
- abstention/suppression semantics.

No scientific observation is converted into a social or relationship recommendation.

## 7. Together relationship

In v1, Together is a visible entry point such as:

> `Une idée pour vous deux ?`

Opening it is user intent.

Home does not proactively pressure the user to spend time with the dog.

## 8. Memories relationship

In v1, Memories may appear as a quiet entry point such as `Votre histoire`.

No automatic anniversary/resurfacing card under `MANUAL_ONLY`.

If the user later enables resurfacing, Home may host a private resurfacing card subject to that policy.

## 9. Community / World

Home may surface direct state changes such as an accepted invitation, event time/location change, moderation outcome or user-requested World reminder.

Home does not surface viral posts, popular dogs, “people are waiting” pressure or endless discovery recommendations.

## 10. Breiz

Breiz must distinguish:

- Care fact/observation;
- recommendation;
- external/local information;
- Community/World content.

## 11. Information density

Candidate first prototype: maximum 2–3 attention/continue cards above quiet navigation.

This is a design hypothesis, not a validated optimum.

If more items exist, group them, show priority summary and allow explicit expansion. No infinite stack.

## 12. Success

Good:

- user understands what requires action;
- user understands when nothing requires action;
- scientific uncertainty remains visible;
- Home can be closed immediately;
- no domain leaks into another;
- Breiz can explain without exaggerating.

Bad KPI:

- Home session duration;
- cards clicked;
- number of daily opens.

**STATUS: MASTER READY FOR FOUNDER / UX / SCIENCE / PRIVACY REVIEW.**
