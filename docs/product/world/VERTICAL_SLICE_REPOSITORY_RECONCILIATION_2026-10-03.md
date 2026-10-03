# World vertical-slice repository reconciliation — original #43 design pack vs current state

**Issue:** #43  
**Date:** 2026-10-03  
**Status:** `SOURCE RECOVERY + CURRENT-STATE RECONCILIATION / PRODUCT GATE REMAINS OPEN`

## 1. Purpose

The original World vertical-slice design pack referenced in #43 was created on 2026-09-01 outside the Git repository.

On 2026-10-03 the eight original artifacts were recovered from the persistent project Library and imported under `docs/product/world/`.

The source files are preserved verbatim as historical design evidence. Their original status lines, implementation assumptions and pre-Owner terminology are not silently rewritten.

Current implementation truth is recorded here instead.

## 2. Recovered source set

- `EMOPET_WORLD_VERTICAL_SLICE_DEFINITION_v0.1.md`
- `EMOPET_WORLD_FIRST_30_MINUTES_FLOW_v0.1.md`
- `EMOPET_WORLD_VERTICAL_SLICE_QA_MATRIX_v0.1.md`
- `EMOPET_WORLD_NEUTRAL_DOG_ANIMATION_SET_v0.1.md`
- `EMOPET_WORLD_HUB_BRETAGNE_SPATIAL_DESIGN_v0.1.md`
- `EMOPET_WORLD_TRAIL_01_GAMEPLAY_SCRIPT_v0.1.md`
- `EMOPET_WORLD_VERTICAL_SLICE_STATE_AUTHORITY_MODEL_v0.1.md`
- `EMOPET_WORLD_SECOND_ACTIVITY_FRESQUE_COLLECTIVE_v0.1.md`

Together they define the original candidate slice:

- one Brittany-rooted shared Hub;
- one personal space;
- one source-backed discovery point;
- one primary cooperative activity, `TRAIL_01 / La piste commune`;
- one second-activity hook, `ATELIER_01 / La fresque collective`;
- Community → World continuity;
- a neutral dog-avatar animation contract;
- a first-30-minutes loop;
- a QA / Unity kill-gate matrix;
- explicit state and authority boundaries.

## 3. Source-preservation rule

Use the recovered files for original product/design intent.

Use current executable code, current architecture records and current controlled validation records for present implementation truth.

Historical statements such as `NOT IMPLEMENTED`, `UNITY HOLD` or `NOT AUTHORIZED` describe the source date. They are not silently edited to match later technical work.

Conversely, later technical implementation does not automatically promote the entire historical vertical slice to implemented product authority.

## 4. Technical World foundation — current truth

Since the 2026-09-01 design pack, the repository has materially advanced the technical World foundation:

- the isolated Nakama transport/session spike is implemented and locally proven;
- the Unity client skeleton is implemented and Editor-validated;
- Unity → Hono → Nakama live integration has been proven on a real workstation;
- canonical connections, directional trust, blocks, presence consent and controlled preset chat exist in current backend authority;
- Nakama remains realtime/session transport rather than durable product truth;
- Unity remains presentation/input rather than durable protected-domain authority.

These facts close technical-spike questions.

They do **not** mean the full vertical slice described in the recovered design pack exists as a playable production scene.

## 5. Spatial Hub and Unity scene

The recovered design defines `WORLD_HUB_BRETAGNE_01` as a compact three-ring social Hub.

As of this reconciliation:

- the repository contains the Unity World project and client/runtime boundaries;
- no tracked `.unity` scene exists under `unity/world`;
- the recovered Hub identifier is not an implemented canonical runtime scene in the repository.

Therefore the Hub remains a product/design candidate, not a completed Unity environment.

The clickable #49 prototype represents Hub-level product questions in 2D without converting the spatial design into a production scene.

## 6. Personal space and keepsakes

The recovered slice defines `WORLD_HOME_01 / Mon espace` and durable symbolic keepsakes as the persistence/attachment anchor.

Current architecture still treats durable keepsakes and personal-space persistence as canonical EMOPET state that is separately gated.

The current Unity spike explicitly does not own durable keepsake or personal-space authority.

The #49 clickable prototype represents the concept at low fidelity only.

No durable personal-space implementation or keepsake-grant authority is promoted by this source recovery.

## 7. `TRAIL_01 / La piste commune`

The recovered gameplay script defines a richer four-beat cooperative design:

1. discover three broken markers;
2. coordinate through a split bridge/gate;
3. inspect a source-backed regional discovery;
4. reconstruct the route together;
5. receive the same non-competitive keepsake.

The #49 clickable prototype now provides a deliberately reduced low-fidelity cooperation flow sufficient to test basic comprehension, social pressure and return-value hypotheses.

It is **not** evidence that the complete recovered `TRAIL_01` gameplay script has been implemented or validated.

The original gameplay script remains the design source for any higher-fidelity version unless explicitly superseded.

## 8. `ATELIER_01 / La fresque collective`

The recovered second-activity source defines a curated, no-UGC, non-competitive collaborative mural.

No current runtime implementation is promoted for this activity.

It remains an optional second-activity design hook whose purpose is to test shared creation as a different social motivation from shared discovery.

It must not be treated as required scope for the first controlled #49 click-through unless a later protocol version explicitly adds it.

## 9. Neutral dog-avatar animation contract

The recovered contract defines functional states only:

- idle;
- walk;
- run;
- sit;
- lie;
- follow;
- waypoint;
- object interaction;
- enter;
- exit.

The contract forbids dog-emotion, pain, stress, valence/arousal, wellbeing or ELI-driven animation.

Current World technical boundaries preserve the rule that protected scientific/dog state does not become Unity presentation authority.

However, because no final tracked Unity scene/art animation set exists, the perceptual question remains unproven:

> Will people actually interpret the intended neutral animation as neutral?

That requires controlled visual/playtest evidence rather than code review.

## 10. State & authority model

The recovered state model correctly anticipated the durable-authority split:

- canonical EMOPET backend for durable identity, permissions, moderation, block/report, visibility and durable product state;
- Nakama for transient realtime/session concerns;
- Unity for presentation/local interaction.

Current implementation materially validates that boundary for the technical spike.

Some historical candidate fields/states in the source document are not current canonical contracts and must not be copied into runtime merely because they appear in the 2026-09-01 source.

Any future implementation must use current authority contracts first, then explicitly reconcile the old design vocabulary.

## 11. First 30 minutes and QA matrix

The recovered first-30-minutes flow and QA matrix remain research/design instruments.

They contain no observed result.

The merged #49 controlled playtest pack now provides:

- a runnable local clickable prototype;
- Condition A preset-only and Condition B preset + free-text comparison;
- observation-sheet and issue-log templates;
- explicit no-fabricated-result rules.

As of 2026-10-03:

- participant sessions under the controlled #49 protocol: **0 recorded**;
- retention evidence: **NONE**;
- social-comfort result: **NONE**;
- dog-avatar-neutrality result: **NONE**;
- 3D-vs-2D value result: **NONE**.

## 12. Current #43 gate

Source recovery closes the provenance gap for the original vertical-slice design pack.

It does **not** close the product gate.

#43 should remain open until at minimum:

1. #49 has controlled participant evidence;
2. the Hub / social / personal-space value is evaluated against a simpler 2D Community-style alternative;
3. dog-avatar neutrality is tested visually;
4. the cooperative activity is tested for intrinsic social value without Care/ELI rewards;
5. safety/privacy/authority comprehension is reviewed;
6. a Founder decision records one of:
   - `UNITY_GO`;
   - `ITERATE`;
   - `2D_FIRST`;
   - `NO_GO_CURRENT_WORLD_CONCEPT`.

## 13. Claim boundary

This reconciliation does not authorize claims that:

- the vertical slice is implemented;
- the Hub exists as a production Unity scene;
- `TRAIL_01` is validated;
- the Fresque is required;
- dog animations are perceived as neutral;
- users prefer World to Community;
- World creates retention;
- World is launch-ready.

It restores source provenance and makes the remaining gate explicit.
