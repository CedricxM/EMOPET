# EMOPET — C-BARQ / Flint 2017 Project Impact Assessment

**Date:** 2026-09-06  
**Reconciled:** 2026-09-07 against connected Gmail correspondence  
**Status:** Scientific architecture review  
**Scope:** C-BARQ integration, ELI priors, behavioural data model, claims, research governance

## Executive conclusion

These materials **do influence EMOPET materially**, but they do **not require a redesign of MAT/TAG hardware or replacement of the ELI core today**.

The largest impact is on the layer between the user, the behavioural instrument and the inference engine:

- questionnaire administration;
- provenance and storage of behavioural evidence;
- how C-BARQ is allowed to influence ELI;
- language and causal claims;
- future longitudinal validation;
- scientific/research governance.

### Critical attribution correction

Professor James Serpell did **not** simply instruct EMOPET to use the complete C-BARQ in all circumstances.

His 2 July 2026 feedback established that:

1. owner judgements of behavioural extremity can be unreliable;
2. changing validated C-BARQ wording risks invalidation;
3. specific items can be eliminated when they do not load strongly on their factor/subscale, with Flint et al. cited for factor-loading examples;
4. commercial use is likely to require UPenn licensing.

EMOPET subsequently chose a **more conservative project direction**: seek the appropriate licence and investigate use of the complete item set, while asking whether progressive administration can preserve validity.

That is an EMOPET design decision triggered by the feedback, **not a direct Serpell requirement to always use the full instrument**.

### Impact level by subsystem

| Subsystem | Impact | Decision |
|---|---:|---|
| MAT hardware / sensing stack | Low | No immediate change |
| TAG hardware | Low | No immediate change |
| ELI 3D EKF core | Medium | Preserve core; review how questionnaire priors enter it |
| ELI confidence gating | Positive alignment | Keep and strengthen provenance-aware gating |
| Behavioural onboarding / app UX | High | Redesign around a licensed, instrument-aware model; current EMOPET direction is complete-item use subject to scientific review |
| Database / behavioural schema | High | Add instrument-aware response model; remove misleading C-BARQ shorthand |
| Scientific claims / copy | High | Association ≠ cause; reported behaviour ≠ measured ground truth |
| Research data governance | High | Build explicit consent, provenance and research-export boundaries |

---

## 1. The prior 20-item EMOPET selection is superseded as current Product direction

The historical EMOPET proposal selected roughly twenty items/constructs to reduce questionnaire burden and initialise behavioural context.

The current EMOPET direction is different: **seek licensing and investigate integration of the complete C-BARQ item set**, with qualified scientific/instrument-owner review of the administration conditions.

Therefore:

- the old 20-item proposal remains archived as design history;
- its illustrative EMOPET-written items must not become production C-BARQ questions;
- no developer should implement the old subset merely because it appears in the repository;
- progressive administration by the AI remains a hypothesis until scientific review confirms acceptable timing, sequencing and completion rules.

### Important nuance

The fact that the old proposal is superseded does **not** mean scientific item reduction is categorically invalid.

Serpell explicitly noted that item elimination may be acceptable where item factor loadings justify it. If EMOPET ever revisits a shortened form, that would need a new scientifically controlled design, licensing review and validation plan rather than resurrection of the old UX-driven subset.

## 2. C-BARQ should become a first-class data source, not a handful of profile fields

A licensed behavioural instrument or scientifically governed derivative needs its own domain model.

Recommended future entities / concepts:

- `behavioral_instrument`
- `instrument_version`
- `instrument_administration`
- `instrument_item_ref` or licensed item identifier
- `response_value`
- `response_timestamp`
- `presentation_timestamp`
- `administration_context`
- `completion_state`
- `respondent_role`
- `source_provenance = owner_report`
- `licence / display restrictions`
- derived factor/subscale scores only where permitted by the licensed/scientifically controlled scoring method

This prevents questionnaire answers from becoming indistinguishable from sensor outputs or model conclusions.

## 3. Existing `C-BARQ simplified` naming in the repository should change

Current file:

`backend/db/schema/freemium.ts`

contains a breed-knowledge section labelled:

`// Behavior (C-BARQ simplified)`

with coarse fields such as separation-anxiety tendency, sociability and trainability.

The same semantics also appear in the corresponding migration.

This is scientifically and semantically risky.

Those values are **breed knowledge / heuristic profile metadata**, not results from a dog's C-BARQ administration. They should not carry the C-BARQ name.

### Recommended action

Rename the conceptual block to something like:

`// Breed behavioural context — non-diagnostic heuristic metadata`

and keep it completely separate from future licensed C-BARQ response tables.

Do not map breed-level tendencies directly into individual C-BARQ factor scores.

## 4. ELI core can remain, but the evidence interface must be reviewed

Current ELI documentation uses a 3D state:

- arousal;
- valence (internal);
- cumulative load.

It also includes anticipation tracking and explicit confidence gating.

Nothing in the cited behavioural material requires replacing that mathematical structure.

However, the previous plan to use selected behavioural subscales as direct priors should be replaced by a controlled **evidence-adapter layer**.

### Principle

C-BARQ is owner-reported behavioural evidence.

It may eventually inform prior distributions or disambiguation, but only if:

1. the mapping is scientifically justified;
2. the mapping is versioned;
3. contribution strength is bounded;
4. provenance remains visible internally;
5. sensor evidence can disagree with questionnaire evidence;
6. disagreement does not get silently resolved by forcing one source to become truth;
7. output remains subject to ELI confidence gating.

## 5. Flint 2017 strengthens EMOPET's uncertainty philosophy

The paper gives several reasons not to collapse behavioural evidence into deterministic rules:

- C-BARQ is owner-reported;
- participant/household effects are meaningful;
- associations do not establish causal direction;
- breed associations can reflect multiple genetic/environmental/management/perception pathways;
- cross-sectional evidence cannot establish temporal causality.

This aligns with EMOPET's existing rule that insufficient information should not be promoted into a conclusion.

### Product rule

Never implement deterministic rules such as:

- `fear score -> aggression`
- `breed -> behavioural risk`
- `neuter status -> aggression cause`
- `sensor arousal -> emotional diagnosis`

without dedicated longitudinal validation and approved scientific interpretation.

## 6. Owner report must stay separate from measured observation

Uncertainty in owner perception is not a reason to discard owner reports. It is a reason to preserve provenance.

EMOPET should model at least four evidence classes separately:

1. **Owner-reported behavioural profile** — e.g. licensed C-BARQ.
2. **Measured sensor observations** — MAT/TAG signals and derived physical proxies.
3. **Declared context** — owner-entered events, household context, environment.
4. **Model inference** — ELI hypotheses / estimates with confidence.

A fifth class may later be useful:

5. **Professional/veterinary observation** — where a research protocol or partner provides it.

## 7. EMOPET's longitudinal model becomes more scientifically interesting

Cross-sectional behavioural research can generate longitudinal hypotheses without proving causality.

EMOPET's architecture could eventually contribute repeated domestic observation, provided that:

- data quality is characterised;
- missingness is preserved;
- timing is reliable;
- owner-report provenance is retained;
- sensor changes are not mislabeled as causes;
- research protocols are designed with qualified partners;
- consent and privacy governance allow the proposed use.

This is a **research opportunity**, not a validation claim.

## 8. Household context should be taken seriously in the research schema

Future research exports may need context such as:

- privacy-preserving household identifier;
- number of dogs / multi-dog household;
- major changes in household composition;
- owner-declared routines and absences;
- acquisition history where scientifically justified;
- relevant context changes over time.

These remain context variables, not simplistic behavioural causes.

## 9. Breed-aware code is not directly invalidated, but behavioural breed priors need a firewall

Current `breed-aware-interpretation.ts` is relatively safe when it uses morphology/environmental context and does not alter measured values or confidence.

Behavioural breed heuristics should **not** be expanded into aggression/fear inference merely because literature reports breed-group associations.

## 10. Scientific-review questions to take to Serpell / Penn / Oniris

1. Can the complete C-BARQ be administered progressively without changing its psychometric interpretation?
2. If yes, what sequencing, time window and completion rules are acceptable?
3. If a scientifically justified shorter form is ever considered, what factor-loading / validation / scoring rules are required?
4. Can individual factor scores be used as priors for a longitudinal inference engine, and under what calibration protocol?
5. How should repeat administrations be handled over months/years?
6. Which constructs are stable-trait references versus potentially time-varying measures?
7. What should EMOPET do when questionnaire and sensor-derived evidence disagree?
8. What claims should be explicitly prohibited before prospective validation?
9. What research data structure would be genuinely useful to canine-behaviour researchers?
10. What independent observation protocol would be appropriate for validating owner reports and model outputs?

## Immediate repository actions

### Do now

- Keep the historical 20-item proposal archived and clearly marked superseded as the current Product direction.
- Keep the exact July Serpell feedback separately attributable.
- Treat complete licensed C-BARQ as **EMOPET's current conservative direction**, not an external mandate.
- Create a dedicated instrument-aware schema before implementing questionnaire UX.
- Rename/remove `C-BARQ simplified` from breed heuristic fields.
- Preserve existing non-medical and confidence-gating rules.

### Do not do yet

- Do not implement AI-driven question sequencing as scientifically valid before review.
- Do not feed C-BARQ values directly into ELI with arbitrary weights.
- Do not generate aggression-risk labels from Flint et al.
- Do not turn breed group, sex, neuter status or acquisition source into causal rules.
- Do not claim longitudinal validation before a study exists.
- Do not say `Serpell requires the full C-BARQ` unless a later explicit message actually says that.

## Bottom line

The behavioural work does not break EMOPET. It **forces a cleaner scientific architecture and cleaner attribution**.

C-BARQ should not be treated as casual onboarding metadata. EMOPET currently chooses the conservative route of a licensed, instrument-aware integration while keeping open the scientific question of administration format.

That distinction matters: **external feedback constrains the problem; EMOPET still owns its Product decision.**
