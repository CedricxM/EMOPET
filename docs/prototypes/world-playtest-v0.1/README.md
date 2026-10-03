# World clickable playtest prototype v0.1

**Issue:** #49  
**Status:** `CANDIDATE / NOT YET PLAYTESTED / NO PRODUCT AUTHORITY`  
**Protocol:** `docs/validation/WORLD_CLICKABLE_PLAYTEST_PROTOCOL_v0.1_2026-10-03.md`

## Purpose

This is a deliberately low-fidelity, local-only 2D prototype for the controlled World concept test.

It is not:
- the Unity World client;
- a production UI;
- evidence of user preference;
- retention evidence;
- a substitute for #49 participant sessions.

## Run

Open:

`docs/prototypes/world-playtest-v0.1/index.html`

in a modern browser.

No dev server is required.

## Data boundary

The page:
- performs no network request;
- uses no analytics;
- uses no cookies;
- uses no `localStorage` or `sessionStorage`;
- keeps synthetic interaction state in memory only;
- loses all state on refresh.

Do not add real participant data to the HTML.

## Test conditions

Use the moderator control at the top:

- **Condition A:** Quiet Social Layer presets only.
- **Condition B:** presets plus a bounded free-text field.

The moderator records the assigned order in the observation sheet. Do not let the prototype choose a winner.

## Scenarios represented

- Community -> World handoff;
- Hub arrival;
- `Mon espace`;
- stranger encounter;
- invite / decline;
- Quiet Social Layer;
- `La piste commune`;
- shared keepsake;
- neutral dog representation explanation;
- block / report / leave;
- explicit World exit.

## Deliberate omissions

No:
- real accounts;
- exact location;
- dog health information;
- ELI state;
- matchmaking score;
- relationship score;
- leaderboard;
- streak;
- currency;
- reward economy;
- notification pressure;
- production moderation backend.

## Evidence rule

A successful click-through is not a successful playtest.

Only completed participant sessions under the versioned protocol may populate the observation and issue-log templates. The repository must preserve negative findings and critical failures rather than recording only favourable sessions.
