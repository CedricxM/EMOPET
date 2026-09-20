# EMOPET — CARE PRODUCT MASTER v0.1

**Original date:** 2026-09-01  
**Imported to project memory:** 2026-09-07  
**Status:** `PROPOSED PRE-PRODUCTION AUTHORITY / NOT IMPLEMENTED / NOT RELEASED`  
**Gate:** `G-CARE-OBSERVATION-UX-01`

> Importing this source to GitHub preserves its original status. It does not constitute implementation or product release.

## 1. Product role

Care is the CORE daily observation domain of EMOPET.

It exists to help a Guardian understand:

- what was observed;
- in which context;
- by which source;
- with what quality/confidence;
- relative to which individual reference;
- what cannot be concluded;
- what the Guardian themselves recorded.

Care is **not**:

- a veterinary diagnosis surface;
- a generic health score;
- a discrete-emotion classifier;
- a “good/bad day” meter;
- a relationship score;
- an activity competition dashboard.

> **Care observes carefully. It does not pretend to know more than the evidence supports.**

## 2. Scientific authority boundary

Current controlled ELI authority remains empirically unvalidated as a complete product.

Current V1 scientific presentation constraint:

- dimensional-affect architecture is the conceptual framework;
- arousal/activation proxy is the only latent variable currently authorised for user publication under the v7.1 V1 authority;
- valence remains internal/gated;
- no discrete emotion labels;
- no medical conclusions.

Care must not promote future Valence–Arousal presentation work into current validated product behaviour.

## 3. Core Care surfaces

### `NOW`
Latest eligible observation or explicit epistemic silence.

### `HISTORY`
Longitudinal observations by context.

### `JOURNAL`
Guardian-authored factual/context notes.

### `DEVICES`
MAT/TAG technical state and data freshness.

### `SHARE`
Controlled export/professional sharing when authorised.

## 4. Observation doctrine

An observation must carry:

1. observation;
2. context;
3. time window;
4. reference;
5. source/provenance;
6. quality/confidence;
7. limits;
8. model/version;
9. publication state.

**No naked number.**

## 5. Semantic layers

Never collapse:

```text
DEVICE / SIGNAL STATE
      ↓
FEATURE / CONTEXT QUALITY
      ↓
INFERENCE / PUBLICATION DECISION
      ↓
USER-FACING OBSERVATION
```

A sensor producing a value does not automatically authorise a user-facing inference.

## 6. Individual reference

Care compares a dog primarily to **its own contextual references**.

It does not rank against:

- other dogs;
- breed percentile;
- a universal “normal dog” score.

Breed/size/age/coat may initialise contextual priors where authorised, but the intended longitudinal model converges toward individual references.

## 7. MAT role

MAT is the intended physiological reference environment during validated rest.

A user-facing statement such as `Source principale : MAT · repos` is allowed only when the context-validity pipeline supports it.

## 8. TAG role

TAG provides mobile/contextual continuity.

TAG context does **not** independently authorise:

- emotion labels;
- stress/distress conclusions;
- medical alerts;
- published ELI conclusions.

Collar-only evidence may support/qualify context and may be insufficient for publication.

## 9. Guardian journal

Guardian entries are:

- first-person context;
- factual notes;
- frequency/timing observations;
- event/context tags.

They are not biological ground truth.

The UI must distinguish `Tu as noté` from `EMOPET a observé`.

## 10. Disagreement

If journal context and sensor-derived patterns differ:

- retain both;
- do not force reconciliation;
- do not label the Guardian “wrong”;
- do not silently overwrite the model.

## 11. Epistemic silence

Care must support an explicit no-result state, for example:

> **Pas assez d’éléments fiables pour afficher une observation maintenant.**

This is a product state, not an error.

## 12. No automatic cross-domain action

A Care observation does not automatically:

- post to Community;
- start Together;
- alter World avatar behaviour;
- trigger Voice Cue;
- create Relay/Rescue;
- disclose location.

## 13. Success criteria

Care succeeds when users can distinguish:

- device state;
- signal quality;
- observation;
- Guardian note;
- uncertainty;
- no-result state.

It does not succeed by maximising alerts, daily opens or the number of observations published.

**STATUS: MASTER READY FOR FOUNDER / SCIENCE / UX REVIEW.**
