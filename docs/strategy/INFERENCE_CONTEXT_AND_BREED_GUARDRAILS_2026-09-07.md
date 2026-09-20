# EMOPET — Inference, Context & Breed Guardrails

**Control date:** 2026-09-07  
**Status:** `PROJECT_DECISION / SCIENCE-PRODUCT GUARDRAIL`

## 1. Three layers must remain distinct

EMOPET must not collapse territorial/contextual information into dog-state inference.

### Layer A — Territorial/public context

Examples include public/local datasets, places, events, weather, territorial knowledge and sourced cultural information.

Purpose: provide external context and local usefulness.

**Rule:** public/territorial data do not constitute evidence of a dog's internal state.

### Layer B — Breiz contextual companion

Breiz may retrieve controlled/local information, explain qualified EMOPET observations, use permitted preferences and suggest actions/places/events.

**Rule:** Breiz is not the dog-state inference engine and must not infer certainty from unrestricted raw telemetry or public data.

### Layer C — ELI / Care observation chain

Dog-state observations must come through the qualified product evidence chain: device/signal state → context/quality → inference/publication decision → user-facing observation.

The chain must preserve provenance, confidence, model/version and abstention.

## 2. No deterministic breed psychology

Breed/FCI information may be useful for taxonomy, onboarding, technical cohorts and physically relevant calibration/context.

It must not be used to assert deterministic:

- personality;
- emotion;
- temperament certainty;
- compatibility;
- medical state;
- wellbeing status.

No statement such as “this breed is anxious/happy/aggressive” may become an EMOPET product conclusion from breed identity alone.

## 3. Permitted breed/physical uses

Subject to scientific/engineering authority and validation, breed/size/age/weight/coat can support:

- initial contextual priors;
- morphology/fit constraints;
- expected sensing reliability;
- coat/signal attenuation reasoning;
- calibration planning;
- cohort definition for validation;
- false-positive reduction.

These uses remain calibration/context mechanisms, not dog-state ground truth.

## 4. Individual reference takes precedence

The intended longitudinal model converges toward comparing the dog primarily with **its own contextual references over time**.

EMOPET must not replace that with:

- a universal “normal dog” threshold;
- a breed percentile marketed as wellbeing;
- public ranking against other dogs.

## 5. Owner/Guardian report is a separate evidence class

Guardian input is contextual/declared information, not biological ground truth.

Product rules:

- prefer factual/frequency/timing observations;
- distinguish `Guardian reported` from `EMOPET observed`;
- retain disagreement between user report and sensor-derived patterns rather than forcibly reconciling them;
- no single owner response creates an ELI state;
- do not label the Guardian unreliable simply because streams disagree.

## 6. C-BARQ boundary

C-BARQ is behavioural-context instrumentation, not sensor evidence and not an ELI validation certificate.

Current scientific-memory rules apply:

- validated item wording/administration conditions must be respected unless separately validated;
- commercial use requires the licensing/permission route to be closed before product use is claimed;
- questionnaire results must not independently create medical/emotional certainty;
- Serpell feedback/recommendation must be attributed at its actual evidence level.

See `docs/research/SCIENTIFIC_FRAMEWORK_REGISTER.md`.

## 7. Product-language boundary

EMOPET should prefer language such as:

- “une habitude semble avoir changé”;
- “plusieurs explications restent possibles”;
- “pas assez d'éléments fiables pour aller plus loin”.

Automatic named-emotion or medical conclusions remain blocked unless a future validated authority explicitly changes that boundary.

## 8. Historical lineage warning

Historical FCI/textile documents remain useful evidence about physical diversity and sensing constraints, but their hardware-specific recommendations must not override the current MAT/TAG architecture without a new controlled decision.

Historical ELI/BOM/public-copy terminology must likewise be checked against current authorities before reuse.
