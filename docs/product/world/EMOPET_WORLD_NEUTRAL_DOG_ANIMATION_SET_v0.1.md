# EMOPET — WORLD NEUTRAL DOG AVATAR ANIMATION SET v0.1

**Status:** PROPOSED VERTICAL-SLICE ANIMATION CONTRACT

## Required animations

| ID | Animation | Intent |
|---|---|---|
| DOG-N-001 | Idle stand | Neutral presence |
| DOG-N-002 | Walk | Traversal |
| DOG-N-003 | Run | Traversal inside game scene |
| DOG-N-004 | Sit | Neutral pose |
| DOG-N-005 | Lie down | Neutral pose, not fatigue |
| DOG-N-006 | Follow Guardian | Navigation behaviour |
| DOG-N-007 | Move to waypoint | Scene logic |
| DOG-N-008 | Inspect/interact with object | Mechanical interaction only |
| DOG-N-009 | Enter scene | Transition |
| DOG-N-010 | Leave scene | Transition |

## Animation style requirements

- neutral face;
- no eyebrow acting;
- no mouth-smile language;
- no “sad eyes”;
- no fear/startle performance;
- no excitement loop;
- no affection solicitation;
- no distress/limp/pain animation;
- no ELI/TAG/MAT parameter binding;
- no Valence–Arousal parameter binding.

Tail/ear movement, if used for natural motion, must be reviewed to ensure it does not become a coded emotional state.

## Runtime contract

Allowed inputs:
- player navigation command;
- scene waypoint;
- cooperative activity state;
- user-triggered neutral action;
- scene transition.

Forbidden inputs:
- ELI output;
- wellbeing state;
- physiological data;
- inferred valence;
- inferred arousal;
- “mood” variable;
- Guardian’s subjective emotion label.

## QA

A neutral animation is rejected if:
- testers reliably assign an emotion to it;
- the UI labels it emotionally;
- animation state changes with Care/ELI data;
- designers use it as a hidden emotional feedback channel.

**STATUS: ANIMATION CONTRACT READY FOR ART/UNITY REVIEW — NOT IMPLEMENTED.**