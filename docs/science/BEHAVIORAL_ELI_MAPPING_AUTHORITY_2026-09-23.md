# EMOPET behavioural assessment -> ELI mapping authority

**Status:** `CONTROLLED SCIENCE / INFERENCE AUTHORITY CONTRACT`  
**Date:** 2026-09-23  
**Gate:** `ELI-BEHAV-01`

## Core rule

A behavioural factor score can exist without being allowed to affect ELI.

`eligible_for_eli_prior = true` is a necessary flag, never sufficient authority.

An `eli_behavioral_priors` row may become `active` only when PostgreSQL can resolve a matching `behavioral_eli_mapping_authorities` row whose:

- lifecycle status is `approved`;
- assessment scientific-use status is `scoring_allowed`;
- dog, assessment and factor-score lineage agree;
- instrument code and version match exactly;
- scoring version matches exactly;
- source factor key matches exactly;
- target prior key matches exactly;
- algorithm version matches exactly;
- requested prior value is inside approved bounds;
- reviewed protocol and review authority are present.

Absence or mismatch is a hard failure.

## C-BARQ default

Current disposition:

`C-BARQ -> ELI = RESEARCH_ONLY / NO_ACTIVE_PRIOR`

The repository contains no approved C-BARQ mapping authority. The French validation paper is relevant external evidence, but it does not validate an EMOPET mapping between any C-BARQ construct and an ELI latent/state variable.

## Disagreement rule

Questionnaire evidence and sensor/model evidence may disagree. Neither stream silently overwrites the other. Provenance, quality, confidence and abstention remain visible.

## Runtime database authority

The cross-row activation invariant is enforced by PostgreSQL trigger/function objects owned by migration `0015_behavioral_eli_mapping_authority.sql`. Drizzle schema generation represents the tables, columns, indexes and row-local constraints, but does not generate PostgreSQL trigger/function objects. Fresh-baseline QA therefore replays migration 0015 after the generated schema before exercising activation semantics.

A deployment path that creates a fresh schema must preserve these migration-owned authority objects; a table-only Drizzle schema is not sufficient release authority.

## Lifecycle

Approved mappings are versioned rows. If an approved mapping is moved out of `approved`, active priors linked to that authority are automatically retired.

Changing the scientific mapping should create a new authority version rather than silently reinterpreting prior historical evidence.

## Non-authorities

This contract does not:

- implement the missing canonical ELI runtime (#479);
- validate C-BARQ against ELI;
- grant a C-BARQ licence;
- authorize emotion/diagnosis labels;
- imply Penn or Serpell endorsement.
