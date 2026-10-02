# EMOPET — MotsPet v0.5 explicit Owner preference

**Date:** 2026-10-02  
**Status:** `IMPLEMENTED CONTROLLED-SEED EXPANSION / OWNER-DECLARED / NOT DOG-STATE AUTHORITY`

## Purpose

Together, Breiz and other relationship surfaces may use explicit or confirmed Owner preferences when the product authority allows it.

MotsPet previously tracked this concept only as a review candidate.

v0.5 promotes one bounded concept:

`explicit_preference`

Public projection:

- FR: `préférence déclarée`;
- EN: `explicit preference`.

## Meaning

A preference is:

> a preference, constraint or refusal explicitly declared or confirmed by the Owner for the purpose of personalising a suggestion.

It is an `OWNER_PREFERENCE` truth class.

It is not:

- a sensor-derived fact;
- evidence of the dog's emotional state;
- proof that the dog likes an activity;
- a relationship score;
- a judgement about whether the Owner is good or sufficiently engaged.

## Authority basis

The Together Relationship Engine states that the engine is a context-and-preference engine, not a relationship evaluator.

Its preferred inputs include:

1. current explicit intent;
2. explicit constraints;
3. confirmed preferences;
4. confirmed refusals/cooldowns.

It also states:

> Learn choices, not worth. Learn context, not intimacy scores.

The Experience Doctrine and Surface Necessity Matrix likewise permit explicit/confirmed preferences while prohibiting bond scores, good-owner scores, coercion and emotional/medical inference.

The Product Authority Map defines `OWNER_PREFERENCE` as an explicit/confirmed preference that is **not evidence about the dog**.

## Provenance

`explicit_preference` requires provenance.

The system must be able to distinguish:

- explicitly declared;
- explicitly confirmed;
- inferred candidate.

An inferred candidate must not be silently upgraded into this controlled concept.

## Semantic QA

Cross-locale semantic contract:

- truth class: `OWNER_PREFERENCE`;
- provenance: `REQUIRED`;
- causal boundary: `NO_CAUSAL_UPGRADE`;
- medical boundary: `NON_DIAGNOSTIC`;
- privacy boundary: `PRESERVE_PURPOSE_AND_CONSENT`.

## Prohibited shortcuts

Public wording must not turn this concept into claims such as:

- “le chien préfère”;
- “le chien aime”;
- “preuve de lien”;
- “score de relation”;
- “bon propriétaire”.

A user saying “je préfère les petites balades de groupe” is a preference.

EMOPET observing acceptance/rejection patterns may create a candidate for confirmation, but it does not become an explicit preference until the Owner confirms it under the applicable product rules.

## Candidate queue after v0.5

Now controlled:

- uncertainty;
- trend / longitudinal change;
- explicit preference.

Still review-only:

- share scope;
- Moment;
- Memory;
- Community visibility.

Still HOLD:

- activation/arousal public wording.

## Non-goals

This slice does not:

- implement preference persistence;
- infer preferences from sensor evidence;
- turn repeated behaviour into confirmed preference automatically;
- score the relationship;
- alter privacy consent semantics;
- authorize Community publication;
- alter ELI scientific authority.
