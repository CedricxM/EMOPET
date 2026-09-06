# EMOPET — C-BARQ / Flint 2017 Project Impact Assessment

**Date:** 2026-09-06  
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

### Impact level by subsystem

| Subsystem | Impact | Decision |
|---|---:|---|
| MAT hardware / sensing stack | Low | No immediate change |
| TAG hardware | Low | No immediate change |
| ELI 3D EKF core | Medium | Preserve core; review how questionnaire priors enter it |
| ELI confidence gating | Positive alignment | Keep and strengthen provenance-aware gating |
| Behavioural onboarding / app UX | High | Redesign around complete licensed instrument, subject to scientific review |
| Database / behavioural schema | High | Add instrument-aware response model; remove misleading C-BARQ shorthand |
| Scientific claims / copy | High | Association ≠ cause; reported behaviour ≠ measured ground truth |
| Research data governance | High | Build explicit consent, provenance and research-export boundaries |

---

## 1. The prior 20-item C-BARQ selection is superseded

The historical EMOPET proposal selected roughly twenty items across separation-related behaviour, excitability and non-social fear to initialise ELI priors.

The current direction is different: **seek licensing for the complete validated C-BARQ instrument** and work with Prof. Serpell / Penn and other scientific partners on the conditions under which it can be integrated into the product experience.

Therefore:

- the 20-item proposal must remain archived as design history only;
- its illustrative EMOPET-written items must not become production questions;
- no developer should implement the old subset because it appears in the repository;
- progressive administration by the AI remains a hypothesis until scientific review confirms that timing, sequencing and context do not invalidate interpretation.

## 2. C-BARQ should become a first-class data source, not a handful of profile fields

A validated behavioural instrument needs its own domain model.

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
- derived factor/subscale scores only where permitted by the licensed scoring method

This prevents questionnaire answers from becoming indistinguishable from sensor outputs or model conclusions.

## 3. Existing `C-BARQ simplified` naming in the repository should change

Current file:

`backend/db/schema/freemium.ts`

contains a breed-knowledge section labelled:

`// Behavior (C-BARQ simplified)`

with coarse fields such as separation-anxiety tendency, sociability and trainability.

The same semantics also appear in the corresponding migration.

This is now scientifically and semantically risky.

Those values are **breed knowledge / heuristic profile metadata**, not results from a dog's validated C-BARQ administration. They should not carry the C-BARQ name.

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

Nothing in Flint et al. requires replacing that mathematical structure.

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

The paper shows several reasons not to collapse behavioural evidence into deterministic rules:

- C-BARQ is owner-reported;
- participant/household effects are meaningful;
- stranger fear is associated with aggression but causality is not established;
- non-social fear relationships are not simple or monotonic;
- breed associations can reflect genetics, environment, selection, management or perception;
- the cross-sectional design explicitly cannot establish causal direction.

This is strongly aligned with EMOPET's existing rule that insufficient information should not be promoted into a conclusion.

### Product rule

Never implement rules of the form:

- `fear score -> aggression`
- `breed -> behavioural risk`
- `neuter status -> aggression cause`
- `sensor arousal -> emotional diagnosis`

without dedicated longitudinal validation and approved scientific interpretation.

## 6. Owner report must stay separate from measured observation

Flint et al. explicitly discuss uncertainty in owner perception.

That is not a reason to discard owner reports. It is a reason to preserve provenance.

EMOPET should model at least four evidence classes separately:

1. **Owner-reported behavioural profile** — e.g. licensed C-BARQ.
2. **Measured sensor observations** — MAT/TAG signals and derived physical proxies.
3. **Declared context** — owner-entered events, household context, environment.
4. **Model inference** — ELI hypotheses / estimates with confidence.

A fifth class may later be useful:

5. **Professional/veterinary observation** — where a research protocol or partner provides it.

## 7. EMOPET's longitudinal model becomes more scientifically interesting

A key limitation of Flint et al. is the cross-sectional design. The authors explicitly state that their associations can generate hypotheses for future longitudinal studies but cannot prove causality.

EMOPET's architecture could eventually provide precisely the type of repeated domestic observation needed to study temporal relationships, provided that:

- data quality is characterised;
- missingness is preserved;
- timing is reliable;
- owner-report provenance is retained;
- sensor changes are not mislabeled as causes;
- research protocols are designed with qualified partners;
- consent and privacy governance allow the proposed use.

This is a **research opportunity**, not a validation claim.

## 8. Household context should be taken more seriously in the research schema

Flint et al. found meaningful participant-level clustering and discuss possible owner, household, management and perception effects.

Future research exports should therefore consider metadata such as:

- household identifier under privacy-preserving governance;
- number of dogs / multi-dog household;
- major changes in household composition;
- owner-declared routines and absences;
- acquisition history where scientifically justified;
- relevant context changes over time.

These should be treated as context variables, not simplistic behavioural causes.

## 9. Breed-aware code is not directly invalidated, but behavioural breed priors need a firewall

Current `breed-aware-interpretation.ts` is relatively safe because it uses morphology/environmental context (fur type, size, temperature, humidity) and explicitly does not alter measured values or confidence.

That pattern should remain.

Behavioural breed heuristics should **not** be expanded into aggression/fear inference merely because Flint et al. found breed-group associations.

## 10. Scientific-review questions to take to Serpell / Penn / Oniris

1. Can the complete C-BARQ be administered progressively without changing its psychometric interpretation?
2. If yes, what sequencing, time window and completion rules are acceptable?
3. Can individual factor scores be used as priors for a longitudinal inference engine, and under what calibration protocol?
4. How should repeat administrations be handled over months/years?
5. Which constructs are stable-trait references versus potentially time-varying measures?
6. What should EMOPET do when questionnaire and sensor-derived evidence disagree?
7. What claims should be explicitly prohibited before prospective validation?
8. What research data structure would be genuinely useful to canine-behaviour researchers?
9. What independent observation protocol would be appropriate for validating owner reports and model outputs?

## Immediate repository actions

### Do now

- Keep the historical 20-item proposal archived and clearly marked superseded.
- Store Flint et al. as a research reference note.
- Treat full licensed C-BARQ as the current scientific direction.
- Create a dedicated instrument-aware schema before implementing questionnaire UX.
- Rename/remove `C-BARQ simplified` from breed heuristic fields.
- Preserve existing non-medical and confidence-gating rules.

### Do not do yet

- Do not implement AI-driven question sequencing as scientifically valid before review.
- Do not feed C-BARQ values directly into ELI with arbitrary weights.
- Do not generate aggression-risk labels from Flint et al.
- Do not turn breed group, sex, neuter status or acquisition source into causal rules.
- Do not claim longitudinal validation before a study exists.

## Bottom line

The documents do not break EMOPET. They **force a cleaner scientific architecture**.

The strongest change is conceptual: C-BARQ should no longer be treated as onboarding metadata that helps the model guess better. It should be treated as a validated, licensed evidence source with its own administration rules, provenance, uncertainty and scientific governance.

That change makes the project more defensible and makes the future longitudinal dataset more valuable, provided EMOPET keeps owner report, sensor observation and model inference distinct.
