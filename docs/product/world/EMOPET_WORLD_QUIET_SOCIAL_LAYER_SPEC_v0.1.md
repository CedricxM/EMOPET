# EMOPET — WORLD QUIET SOCIAL LAYER SPEC v0.1

**Date:** 2026-09-01  
**GitHub:** #46  
**Status:** PROPOSED INTERACTION SPEC / NOT IMPLEMENTED

## 1. Purpose

Enable comfortable social contact before unrestricted chat.

The Quiet Social Layer must:
- reduce first-contact friction;
- allow cooperation without free-text chat;
- reduce moderation load;
- remain accessible;
- avoid emotional interpretation of the dog avatar.

## 2. First-slice preset set

### Greeting
- `Salut`
- `👋`

### Navigation / coordination
- `Par ici`
- `J’ai trouvé quelque chose`
- `Prêt·e`
- `Attends`

### Positive completion
- `Bien joué`
- `Merci`

### Exit / boundary
- `Je quitte`
- `Pas maintenant`

## 3. Design rules

Presets are:
- user-triggered;
- short;
- non-insulting;
- non-romantic by default;
- non-sexual;
- non-diagnostic;
- non-location-revealing.

Presets must not include:
- “Your dog likes mine.”
- “Your dog is scared.”
- “My dog loves you.”
- any emotional statement on behalf of a dog.

## 4. Presentation

Possible UI:
- compact radial menu or bottom sheet;
- text + icon;
- accessibility label;
- recent-use memory optional.

No noisy emote spam.

Rate limit required.

## 5. Accessibility

Every preset must have:
- readable text label;
- screen-reader label;
- non-color-only state;
- keyboard/controller alternative where supported.

Users who cannot or do not want to use spatial gestures must be able to trigger the same communication from UI.

## 6. Social pressure prevention

Receiving a preset:
- does not require a response;
- does not generate repeated reminder;
- does not expose “seen” by default in the first slice;
- can be muted.

Repeated unwanted preset spam must be reportable/rate-limited.

## 7. Contextual availability

### Hub
Available:
- Salut
- Par ici
- Pas maintenant
- Je quitte

### La piste commune
Available:
- Par ici
- J’ai trouvé quelque chose
- Prêt·e
- Attends
- Bien joué
- Merci
- Je quitte

### Personal space
Available only between invited participants:
- Salut
- Bien joué / Merci
- Je quitte

## 8. Dog-avatar firewall

Quiet Social Layer controls human communication only.

It must never trigger:
- dog wag;
- dog excitement;
- dog greeting;
- dog emotional reaction;
- ELI/mood animation.

## 9. Free-text relationship

The first playtest must support two conditions:

### Condition A — Quiet only
No free-text chat.

### Condition B — Quiet + text
Free-text chat available only where policy/test cohort permits.

The goal is to measure whether World can create social connection without relying on unrestricted chat.

**STATUS: QUIET SOCIAL SPEC READY FOR CLICKABLE PROTOTYPE.**