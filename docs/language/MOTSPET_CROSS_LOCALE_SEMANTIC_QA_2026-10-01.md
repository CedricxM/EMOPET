# EMOPET — MotsPet cross-locale semantic QA

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED QA CONTRACT / STACKED ON MotsPet v0.2 / NOT TRANSLATION AUTHORITY`

## Purpose

MotsPet allows public wording to vary by language while preserving the same semantic ceiling.

This QA slice formalises that difference.

A French phrase and its English counterpart may use different words. They may not change:

- truth class;
- provenance requirement;
- causal strength;
- medical boundary;
- privacy/consent meaning;
- controlled MotsPet revision.

## Current semantic contracts

The controlled seed now has explicit QA contracts for:

- observation;
- Owner note;
- confidence;
- insufficient evidence / abstention;
- source/provenance;
- consent.

The `activation_change` concept remains HOLD and is excluded from locale projections.

## Truth classes

The current QA vocabulary distinguishes:

- `BOUNDED_OBSERVATION`;
- `OWNER_DECLARED_CONTEXT`;
- `CONFIDENCE_METADATA`;
- `EPISTEMIC_ABSTENTION`;
- `PROVENANCE_METADATA`;
- `PURPOSE_BOUND_PERMISSION`.

These labels are internal QA semantics. They are not public UI copy and do not create new scientific authority.

## Invariants

Every controlled locale projection carries:

- `NO_CAUSAL_UPGRADE`;
- `NON_DIAGNOSTIC`;
- `PRESERVE_PURPOSE_AND_CONSENT`;
- explicit provenance requirement;
- current MotsPet revision.

The semantic comparison deliberately ignores the human-facing `publicTerm` when checking equivalence.

That means:

> “niveau de confiance” and “confidence level”

may differ lexically while still being required to preserve the exact same semantic contract.

## Failure behaviour

CI tests fail when:

- a CONTROLLED_SEED concept has no semantic contract;
- a semantic contract has no controlled concept;
- FR or EN public wording is blank;
- provenance flags disagree with the MotsPet authority;
- one locale changes truth class;
- one locale weakens provenance;
- one locale changes a medical/causal/privacy invariant;
- one locale loses a concept.

## Regional relationship

Regional companions remain downstream.

They may later adapt rhythm/vocabulary only after review, but regional wording cannot change the semantic contract represented here.

A future regional semantic QA layer should compare its projected MotsPet concepts against the same invariant fingerprint rather than inventing a second truth model.

## Non-goals

This slice does not:

- certify the quality of French or English copy;
- validate Breton or Gallo wording;
- create translations;
- promote HOLD concepts;
- change ELI/scientific authority;
- grant cultural review status;
- migrate legacy UI copy.

Related:
- PR #830 — MotsPet v0.2 foundation;
- #817 — MotsPet + regional reviewer intake.
