# EMOPET Scientific Authority Note — C-BARQ France × UPenn × ELI

**Status:** `MANDATORY_CONTEXT / SCIENTIFIC-AND-PARTNERSHIP AUTHORITY NOTE`  
**Date:** 2026-09-23  
**Scope:** C-BARQ, University of Pennsylvania / Penn Vet, James A. Serpell, canine-behaviour questionnaires, ELI scientific validation, TAG/MAT behavioural interpretation, longitudinal validation design, licensing discussions.  
**Read-before rule:** Any human or AI agent working on one of those topics MUST read this file before proposing, coding, documenting, scoring, validating, licensing, or presenting related work.

> This file is a controlled scientific-context record. It does **not** grant a C-BARQ licence, validate ELI, authorize clinical claims, or replace a research protocol, data-use agreement, licence agreement, or qualified scientific/legal review.

---

## 1. Why this file exists

A 2025 peer-reviewed French validation study of the Canine Behavioral Assessment & Research Questionnaire (C-BARQ) materially changes how EMOPET should frame:

- the role of owner-reported behavioural questionnaires;
- the scientific purpose of ELI;
- the interpretation of TAG/MAT signals;
- French-language C-BARQ access/licensing;
- discussions with Penn / Penn Vet / James A. Serpell;
- future validation studies;
- missing/not-applicable semantics;
- claims around fear, aggression, compulsive-like behaviour, energy and social excitation.

This is not a “nice to know” literature note. It is mandatory context for affected workstreams.

---

## 2. Primary scientific source

**Article**  
Audrey Besegher, Nancy Rebout, Dalila Bovet, Sarah Jeannin, Thierry Bedossa, James A. Serpell, Sara Hoummady.  
*Evaluation of the factorial structures of the canine behavioral assessment and research questionnaire (C-BARQ) in France.*  
**Applied Animal Behaviour Science**, Volume 292 (2025), Article 106816.  
DOI: **10.1016/j.applanim.2025.106816**  
ScienceDirect PII: **S0168159125003144**

Primary URL:  
https://www.sciencedirect.com/science/article/pii/S0168159125003144

Important affiliation for EMOPET / Penn discussions:  
**James A. Serpell — Department of Clinical Sciences & Advanced Medicine, School of Veterinary Medicine, University of Pennsylvania.**

### Source-use boundary

The article is open-access under CC BY 4.0, but the paper itself states that **permission to use the C-BARQ was granted** and that the researchers received the most recent questionnaire plus a French translation. Therefore:

- do **not** infer from the article's open-access status that EMOPET has a commercial or product licence to reproduce, embed, modify or redistribute the C-BARQ;
- do **not** copy the 100 questionnaire items or Appendix S1 into the repository unless a licence/permission expressly permits it;
- access to the instrument, French wording, scoring, digital implementation and commercial/repeated use remain separate Penn/licensing questions.

---

## 3. Study design and instrument facts

### 3.1 C-BARQ version used

The study used the then-most-recent C-BARQ:

- **100 items**;
- **14 subscales**;
- five-point Likert-type responses;
- permission to use the questionnaire was granted;
- a **French translation was provided by James Serpell (personal communication, 2024)**;
- the authors used a **revised French version developed in consultation with Prof. Serpell**.

This matters for EMOPET: if a French C-BARQ is licensed, the target should be the **current Penn-authorized French instrument**, not a home translation or reconstructed version.

### 3.2 Recruitment and data collection

- questionnaire distributed to French citizens owning at least one dog;
- owners with multiple dogs could complete one questionnaire per dog;
- recruitment through events in France, professional/personal networks and social media;
- collection window: **2024-10-23 to 2024-12-10**;
- **248 participants/responses** initially described;
- **246 completed questionnaires** retained for final analysis after participant-level missingness filtering.

### 3.3 Sample characteristics worth remembering

The final sample is informative but not a population norm for France.

Reported characteristics include:

- dog age median: **5 years [2–8]**;
- 67.48% purebred, 32.52% mixed breed;
- guardian sex: **82.11% female**, 16.67% male, 1.22% prefer not to say;
- **25.20%** of guardians reported a dog-related job;
- recruitment was voluntary and network/social-media based.

**Implication:** do not use this sample as a definitive French normative reference for ELI thresholds.

---

## 4. Missing-data handling and why EMOPET must care

The study applied a **25% missing-data threshold** at both item and participant levels.

For retained data, missing values were handled using multiple imputation with ordinal logistic regression (`polr`) via the R `mice` package.

The four items associated with **Dog rivalry** had insufficient responses for the study's analysis context, so the factor was not retained in the CFA used for comparison.

### Mandatory EMOPET data-model consequence

**NOT_APPLICABLE / NOT_OBSERVED / MISSING must not collapse to zero.**

Examples:

- a single-dog household cannot provide meaningful household dog-rivalry observations;
- a guardian who has never exposed a dog to a situation is not reporting “no behaviour”;
- absence of a questionnaire response is not evidence of behavioural absence.

Any future questionnaire model, API, database schema, ELI feature transform or analytics pipeline must preserve these semantics explicitly.

---

## 5. Exploratory factor analysis (EFA): hard results

Data adequacy and EFA results:

- **KMO = 0.77**;
- Bartlett's test: **χ²(1953) = 8522.832, p < 0.001**;
- **96 items** entered the analysed EFA after missingness-related exclusions;
- factor-retention informed by eigenvalues > 1, scree plot and parallel analysis;
- Varimax rotation;
- item-retention threshold: loading **≥ 0.40**;
- **13 factors** retained;
- **63 items** loaded ≥ 0.40 on at least one factor;
- factors explained **54.1%** of total variance;
- Cronbach's alpha across factors: **0.693 to 0.914**.

### Mandatory interpretation rule

The **63 retained items are NOT an EMOPET-approved “63-item C-BARQ short form.”**

They are items that met the loading criterion in this specific study sample. Do not:

- build a 63-item product questionnaire from this result;
- call it “validated short C-BARQ”;
- assume the removed items are scientifically unnecessary;
- use the EFA result as permission to create a derivative instrument.

A short-form discussion requires Penn/Serpell input and separate validation.

---

## 6. Confirmatory factor analysis (CFA): hard results

The CFA assessed correspondence with the previously established US factor model, excluding Dog rivalry because of insufficient responses.

Reported fit:

- **χ²(2549) = 3927.211, p < 0.001**;
- **CFI = 0.970**;
- **TLI = 0.969**;
- **RMSEA = 0.047**;
- **SRMR = 0.090**.

Interpretation in the paper:

- CFI/TLI/RMSEA support good correspondence with the original model;
- SRMR is slightly above the preferred threshold;
- the French structure is broadly consistent with prior C-BARQ structures while showing culture/sample/context-specific differences.

---

## 7. Behavioural-structure findings that directly affect EMOPET

### 7.1 Stranger-directed aggression and fear merged

In the French EFA, items usually associated with:

- stranger-directed aggression; and
- stranger-directed fear

loaded together as **Stranger-directed aggression/fear**.

The authors propose that non-expert guardians may have difficulty distinguishing fear from aggression in observed behaviour.

#### EMOPET consequence

Never convert a guardian label such as “aggressive” directly into an inferred latent cause.

A defensible architecture separates:

1. **observed/declared event**;
2. **sensor-derived signal**;
3. **context**;
4. **uncertainty**;
5. **interpretation hypothesis**;
6. **clinical/behaviourist assessment**, which EMOPET does not replace.

Do not make:
`guardian says aggressive -> ELI fear/aggression state`

into deterministic logic.

### 7.2 New factor: Passerby-directed aggression

A distinct factor emerged around reactions to passing/approaching people in the dog's home environment, including delivery-worker and moving-passersby contexts.

#### EMOPET consequence

**Contextual trigger events matter.**

For TAG/MAT/ELI design, an activity/vocalisation spike has limited behavioural meaning without event context.

Potential research direction:

- sensor event window;
- location/context category;
- guardian-entered trigger;
- recovery duration;
- repeated-event pattern over time.

Do **not** claim that sensors can identify “delivery worker aggression” without independently validated context recognition.

### 7.3 New factor: Compulsive-like behaviour

A factor grouped several repetitive/atypical behaviours.

The authors intentionally use **compulsive-like**, not a clinical diagnosis.

#### EMOPET consequence

Mandatory wording hierarchy:

- acceptable: “repetitive pattern observed”, “pattern compatible with…”, “guardian-reported compulsive-like behaviour”;
- prohibited without clinical evidence: “compulsive disorder”, “OCD”, or any diagnosis.

This reinforces the project-wide rule:

**observation != interpretation != diagnosis**

### 7.4 Social excitability / energy

Some attachment-related items clustered with energy/hyperactivity-style items, producing a **Social excitability/energy** factor.

#### EMOPET consequence

This creates a scientifically interesting bridge to longitudinal activity sensing, but not a shortcut.

TAG may help quantify:

- activity;
- rest/activity transitions;
- agitation-like movement periods;
- settling/recovery duration;
- temporal regularity.

But:

**high activity != social excitability**

without context and validation.

### 7.5 Dog rivalry absent from the retained comparison model

The factor could not be meaningfully retained because of insufficient relevant responses.

#### EMOPET consequence

Household structure must condition question applicability.

At onboarding / study design, capture at least:

- number of dogs in household;
- relevant cohabitation context;
- whether a question was applicable/observed.

---

## 8. Core scientific positioning for EMOPET

### 8.1 What C-BARQ is useful for

For EMOPET, C-BARQ is best treated as a **validated guardian-reported behavioural instrument / external criterion**, subject to licence terms.

It can potentially contribute:

- baseline behavioural profile;
- structured guardian perception;
- research stratification;
- convergent/divergent validity analyses;
- external criterion for evaluating ELI/features;
- longitudinal questionnaire checkpoints if Penn authorizes repeated use.

### 8.2 What C-BARQ is NOT

C-BARQ is not:

- objective ground truth of a dog's internal emotional state;
- a licence for EMOPET to diagnose;
- direct validation of TAG/MAT signals;
- automatic validation of ELI;
- justification for mapping sensor patterns directly onto C-BARQ labels.

### 8.3 What TAG/MAT signals are useful for

TAG/MAT can provide longitudinal, time-stamped, instrument-derived observations/signals.

They should be positioned as **complementary** to questionnaire data, not inherently superior.

Useful scientific question:

> Do longitudinal EMOPET-derived features show stable, interpretable and reproducible relationships with validated behavioural questionnaire dimensions while retaining appropriate uncertainty and abstention?

That is a research question, not an already-proven product claim.

---

## 9. ELI: mandatory scientific constraints after this paper

ELI must not become an emotion-label machine.

Any future ELI scientific validation should distinguish:

- raw/derived sensor measures;
- behavioural/context annotations;
- guardian-reported questionnaire dimensions;
- latent/internal model variables;
- user-visible observations;
- clinical interpretation.

### 9.1 No one-to-one label mapping

Prohibited pattern:

`C-BARQ subscale X -> ELI state X`

without validation.

### 9.2 No circular validation

If C-BARQ labels are used to train a model, the same labels cannot be treated as independent validation evidence without a separate design.

### 9.3 No “naked” global score validation

A correlation between one global ELI number and a questionnaire total would be scientifically weak and inconsistent with current EMOPET product authority.

Prefer:

- preregistered feature families;
- construct-specific hypotheses;
- confidence/quality gates;
- repeated measures;
- within-dog baselines;
- external validation;
- explicit negative/null findings.

---

## 10. Proposed EMOPET × Penn validation direction

**Status: RESEARCH DIRECTION / NOT YET APPROVED PROTOCOL**

A credible study could use:

### Phase A — baseline

- authorized French C-BARQ at T0;
- household/context metadata;
- dog demographics;
- device-quality eligibility.

### Phase B — longitudinal observation

Possible window: **4–8 weeks** as a planning hypothesis, not a locked protocol.

Collect:

- TAG activity/rest-derived features;
- MAT qualified rest/context features;
- contextual guardian annotations;
- data-quality / missingness / wear-compliance metrics;
- no raw-audio storage under current privacy constraints.

### Phase C — validation analyses

Candidate analyses:

- test-retest stability where repeated questionnaires are authorized;
- convergent validity;
- discriminant validity;
- construct-specific associations;
- within-dog vs between-dog effects;
- sensitivity to context;
- calibration and uncertainty;
- subgroup robustness;
- missingness / NOT_APPLICABLE analysis;
- holdout/external validation.

### Phase D — scientific outputs

Potential outputs, subject to agreement:

- validation paper;
- methods paper;
- digital/longitudinal C-BARQ study;
- short-form feasibility study;
- sensor/questionnaire complementarity study.

None of these are authorized merely by this document.

---

## 11. Questions EMOPET must take to Penn / Penn Vet

### Licensing / instrument

1. What is the current licensable French C-BARQ version?
2. Is it the French wording used/revised in the Besegher et al. study?
3. May EMOPET embed it digitally in a commercial product?
4. May EMOPET store item-level responses?
5. May EMOPET compute/store subscale scores?
6. What official scoring rules and missing/NA rules must be used?
7. Is repeated longitudinal administration permitted?
8. Are there frequency limits or user-experience constraints?
9. Is commercial use priced per user, per administration, annual licence, or another model?
10. Are derivative displays/visualizations permitted?

### Research

11. Would Penn/Serpell consider C-BARQ an appropriate external criterion for ELI validation?
12. What outcomes would they consider scientifically meaningful?
13. Is a validated/research-backed shorter repeated-use form available?
14. If not, would Penn be interested in jointly validating one?
15. How should Dog rivalry / household structure be handled?
16. What minimum sample size / replication design would Penn expect?
17. Would Penn support a longitudinal TAG/MAT + C-BARQ study?
18. What publication/data-authorship expectations would apply?

### IP / data / publications

19. What may EMOPET publish about the questionnaire/scoring?
20. What requires separate DUA / research agreement / licence?
21. What data may be shared back with Penn?
22. Who owns derived models/features?
23. What validation wording may EMOPET use commercially?
24. What wording would incorrectly imply Penn/Serpell endorsement?

---

## 12. Mandatory product wording boundary

Unless and until separately validated/authorized:

### Allowed direction

- “guardian-reported behavioural profile”;
- “longitudinal activity/rest pattern”;
- “contextual observation”;
- “pattern associated with…”;
- “insufficient evidence / not enough reliable data”;
- “research comparison with validated questionnaire dimensions”.

### Not allowed as a sensor conclusion

- “your dog is afraid”;
- “your dog is aggressive”;
- “your dog is anxious”;
- “your dog has a compulsive disorder”;
- “ELI proves C-BARQ behaviour X”;
- “Penn validated EMOPET”;
- “Serpell endorses EMOPET”.

---

## 13. Licensing and endorsement firewall

This file must not be used to imply:

- a C-BARQ commercial licence;
- permission to reproduce the French questionnaire;
- permission to create a short form;
- permission to create derivative scoring;
- Penn endorsement;
- Serpell endorsement;
- research collaboration already agreed;
- access to Penn databases;
- access to C-BARQ normative data.

Required agreements may include, depending on scope:

- CDA/NDA;
- C-BARQ licence;
- data-use agreement;
- collaborative research agreement;
- publication/IP terms;
- ethics/IRB-equivalent approvals where applicable.

---

## 14. Known study limitations relevant to EMOPET

The paper itself warrants caution:

- owner-report data are subjective;
- cultural/contextual interpretation matters;
- voluntary recruitment may produce selection bias;
- sample strongly skewed toward female respondents;
- sample size (**246 for 96 analysed items**) is modest for an EFA;
- some factor groupings may be sample-specific;
- the 63-item EFA result is not automatically generalizable as a short form;
- Dog rivalry could not be assessed as in the original structure because of insufficient relevant responses;
- future larger samples are needed to confirm generalizability.

EMOPET must not turn this paper into “French C-BARQ solved forever.”

---

## 15. Concrete engineering consequences

Any implementation touching C-BARQ/behavioural questionnaires should support:

- explicit `NOT_APPLICABLE`;
- explicit `NOT_OBSERVED`;
- explicit `MISSING`;
- questionnaire/version provenance;
- language/version provenance;
- administration timestamp;
- scoring-version provenance;
- licence/usage authority;
- raw response vs derived score separation;
- no silent imputation in product-facing paths;
- no implicit zero-filling;
- no label-to-diagnosis mapping;
- longitudinal administration identity where licensed;
- export/delete/privacy semantics.

Any ELI integration must also preserve:

- sensor quality;
- context quality;
- confidence;
- abstention;
- feature/model version;
- external-criterion provenance;
- research vs product publication status.

---

## 16. Repository instructions for AI and human contributors

Before changing any of the following, read this file in full:

- ELI semantics;
- behavioural labels;
- questionnaire schemas;
- C-BARQ integration;
- Penn/Serpell collaboration;
- research validation;
- sensor-to-behaviour mappings;
- behavioural onboarding;
- dog-household context;
- longitudinal validation;
- French C-BARQ;
- claims involving aggression, fear, anxiety, energy, compulsive-like behaviour or trainability.

When this file conflicts with an older prototype, deck, mock, local dataset, UI copy or unreviewed code path, **do not assume the older implementation is authoritative**.

If a newer controlled scientific authority supersedes this file, update the repository pointers explicitly and preserve supersession history.

---

## 17. Source links

Primary peer-reviewed article:  
https://www.sciencedirect.com/science/article/pii/S0168159125003144

DOI:  
https://doi.org/10.1016/j.applanim.2025.106816

C-BARQ / Penn Vet public information:  
https://vetapps.vet.upenn.edu/cbarq/

---

## 18. Current disposition

`FRENCH_CBARQ_PSYCHOMETRIC_EVIDENCE = PUBLISHED / PEER-REVIEWED`

`EMOPET_CBARQ_LICENCE = NOT_ESTABLISHED`

`EMOPET_FRENCH_CBARQ_DIGITAL_USE = NOT_AUTHORIZED_BY_THIS_RECORD`

`ELI_VALIDATION_AGAINST_CBARQ = PROPOSED / NOT YET PERFORMED`

`PENN_RESEARCH_COLLABORATION = DISCUSSION / NOT YET AGREED`

`C_BARQ_63_ITEM_SHORT_FORM = NOT VALIDATED FOR EMOPET`

`C_BARQ_OWNER_REPORT = EXTERNAL_CRITERION_CANDIDATE, NOT GROUND_TRUTH`

`SENSOR_TO_DISCRETE_EMOTION_MAPPING = NOT AUTHORIZED`
