# Flint et al. (2017) — Stranger-Directed Aggression in Domestic Dogs

## Reference

Hannah E. Flint, Jason B. Coe, James A. Serpell, David L. Pearl, Lee Niel. **Risk factors associated with stranger-directed aggression in domestic dogs.** *Applied Animal Behaviour Science* 197 (2017), 45–54. DOI: `10.1016/j.applanim.2017.08.007`.

## Why this paper matters to EMOPET

This paper is relevant not because EMOPET should become an aggression-prediction system, but because it shows both the value and the limits of owner-reported C-BARQ data when behavioural traits are used as scientific inputs.

## Study design

- C-BARQ data were analysed from a large international owner-reported dataset.
- The questionnaire used 100 items rated on 0–4 severity or frequency scales.
- Mixed logistic regression was used to examine associations with stranger-directed aggression.
- Participant and country were modelled as random effects.
- Factor analysis was used to examine the stability of behavioural constructs.

## Findings relevant to EMOPET

### 1. C-BARQ factor structure is meaningfully stable

The study found a factor structure broadly consistent with previous C-BARQ work. The extracted factors showed good internal consistency, and the authors concluded that the instrument is a reliable measure of **reported canine temperament traits**.

**EMOPET consequence:** the behavioural instrument should be treated as a structured psychometric measurement system, not a loose pool of interchangeable questions.

### 2. Stranger fear had the strongest association with stranger-directed aggression

Greater owner-reported stranger fear was strongly associated with stranger-directed aggression and with severe aggression among dogs already classified as aggressive.

**EMOPET consequence:** behavioural constructs can be informative as context or priors, but association must not be turned into an unsupported causal explanation. A system must not infer that fear *caused* aggression merely because the constructs co-occur.

### 3. Non-social fear is informative but not simple

Non-social fear showed associations with stranger-directed aggression, but the relationship was not monotonic or straightforward across severity categories.

**EMOPET consequence:** a behavioural prior must not be implemented as a deterministic rule such as "higher non-social fear = higher aggression risk". Contextual variables and uncertainty matter.

### 4. Owner / household effects are substantial

The participant-level random effect was meaningful. Dogs rated by the same participant were more similar than expected by chance, which may reflect owner perception, household management, shared environment, dog selection, or other unmeasured factors.

**EMOPET consequence:** owner-reported behavioural data should carry provenance and household context. They must remain distinguishable from sensor-derived observations.

### 5. Owner reports have limits

The paper explicitly notes that C-BARQ depends on owners reporting past behaviour and that owner-perceived aggression may not perfectly represent independently observed behaviour.

**EMOPET consequence:** C-BARQ responses should not be treated as sensor ground truth. The correct architecture is multi-source evidence: owner report, measured behaviour/proxies, context and history should remain identifiable inputs.

### 6. Cross-sectional associations are not causal

The authors repeatedly caution that the cross-sectional design cannot establish whether associated factors cause aggression. They frame the results as useful for generating hypotheses for future longitudinal studies.

**EMOPET consequence:** this strongly supports EMOPET's longitudinal research opportunity, while also imposing a rule: the product must not transform cross-sectional literature into causal inference logic.

### 7. Breed effects require caution

Breed group was associated with outcomes in the models, but the authors discuss possible contributions from genetics, early experience, owner selection, training, management and owner perception.

**EMOPET consequence:** breed can be contextual metadata, but should not be used as a deterministic behavioural diagnosis or as an automatic aggression prior without dedicated validation.

## Design rules derived for EMOPET

1. Preserve the distinction between **reported temperament**, **observed/measured signals**, **context**, and **model inference**.
2. Store C-BARQ responses with instrument version, item identity, timestamp, administration context and provenance.
3. Do not silently convert questionnaire constructs into certainty about internal emotional state.
4. Do not use this paper to justify diagnosis, aggression prediction, or causal claims.
5. Treat household and owner context as possible explanatory/context variables in future research datasets.
6. Prefer longitudinal validation against repeated independent observations where feasible.
7. Any use of C-BARQ as an ELI prior must be empirically calibrated and confidence-gated rather than hard-coded.

## Research opportunity

The paper explicitly identifies longitudinal work as a route for testing hypotheses that cross-sectional data cannot settle. EMOPET's potential contribution is therefore strongest if it can pair a validated behavioural profile with repeated, time-stamped observations in ordinary domestic conditions while preserving measurement uncertainty and provenance.

That is a research hypothesis and infrastructure opportunity, not evidence that EMOPET has already validated any behavioural inference.
