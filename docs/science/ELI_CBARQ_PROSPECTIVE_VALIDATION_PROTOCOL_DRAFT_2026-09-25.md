# ELI × C-BARQ prospective external-criterion validation protocol

**Issue:** #541  
**Status:** `DRAFT RESEARCH DESIGN / NOT APPROVED / NOT PERFORMED`  
**Date:** 2026-09-25  
**Mandatory authority:** `docs/science/EMOPET_CBARQ_UPENN_SCIENTIFIC_AUTHORITY_2026-09-23.md`

## 1. Purpose

Evaluate whether selected longitudinal EMOPET-derived observations/features show reproducible, construct-specific relationships with an appropriately licensed C-BARQ administration.

C-BARQ is treated as a guardian-reported **external criterion**, not ground truth of internal canine state.

This protocol does not validate a global ELI score and does not authorize diagnostic or discrete-emotion claims.

## 2. Preconditions before recruitment

No participant recruitment or instrument administration starts until all applicable gates are documented:

- written instrument/licensing authority for the intended language, form and use;
- research consent/privacy authority;
- approved instrument version, translation and scoring provenance;
- stable feature definitions for every EMOPET variable entering analysis;
- data-quality and abstention rules;
- analysis plan/preregistration;
- qualified statistical/scientific review;
- ethics/IRB-equivalent review where required.

## 3. Cohort and baseline

At T0 collect only authorized variables:

- licensed French C-BARQ administration;
- dog age/sex/neuter status where scientifically justified;
- breed/mixed-breed status without deterministic behavioural priors;
- household dog count and applicability context;
- acquisition/household context only where protocol-justified;
- device/wear eligibility and signal-quality baseline;
- explicit research consent and withdrawal identity.

Do not treat the 2025 French study sample as a normative threshold source for EMOPET.

## 4. Longitudinal observation window

Planning hypothesis: **4–8 weeks**, to be confirmed by qualified review.

Collect only pre-authorized EMOPET observation families with frozen definitions and provenance, for example:

- activity/rest duration and transitions;
- temporal regularity;
- settling/recovery timing where the underlying contract is resolved;
- qualified respiration/rest features where scientifically settled;
- contextual Guardian annotations with explicit provenance;
- missingness, wear compliance and sensor quality.

No raw-audio retention authority is created by this protocol.

## 5. Unit of analysis and repeated measures

Preserve both:

- **within-dog** variation over time;
- **between-dog** differences.

Do not collapse repeated observations into a single subject-level number before the analysis plan justifies that aggregation.

Dog and household clustering must be represented where applicable, especially in multi-dog households.

## 6. Candidate hypothesis structure

Every preregistered hypothesis must identify:

- exact EMOPET feature/version;
- exact C-BARQ construct/subscale/version;
- expected direction only if scientifically justified;
- time window/aggregation;
- minimum data-quality coverage;
- confounders/covariates;
- primary statistical model;
- multiplicity handling;
- abstention/missingness rule;
- falsification/null interpretation.

No hypothesis may be written as `sensor feature = fear/aggression/anxiety`.

## 7. Analysis families

Candidate analyses, subject to statistical review:

1. **Convergent validity** — preregistered associations expected to align.
2. **Discriminant validity** — unrelated constructs should not show the same association pattern.
3. **Incremental validity** — test whether longitudinal EMOPET features add information beyond basic demographics/context.
4. **Within-dog modelling** — where repeated criterion/annotation data permit.
5. **Test-retest / stability** — only if repeated questionnaire administration is licensed and scientifically appropriate.
6. **Calibration/uncertainty** — preserve quality/confidence rather than forcing predictions.
7. **Subgroup robustness** — inspect performance across prespecified groups without overclaiming underpowered results.
8. **Missingness/applicability** — analyse `NOT_APPLICABLE`, `NOT_OBSERVED`, `MISSING` separately.
9. **External holdout** — keep a genuinely unused validation set/site/cohort when sample size permits.

## 8. Missingness and applicability

Raw assessment states remain distinct:

`answered(0) != not_applicable != not_observed != skipped != missing`

Product data paths must not impute silently.

Research imputation, if used, must be preregistered, versioned and performed on analysis copies while preserving the original response state.

Dog-rivalry-related applicability must be conditioned on household context rather than zero-filled.

## 9. Avoiding circular validation

If C-BARQ responses or derived scores are used for model fitting/tuning, those same observations cannot serve as independent validation evidence for the fitted mapping.

Training/tuning and evaluation must be separated by dog and by the preregistered split strategy.

Any future ELI mapping tuned on this study requires an independent validation stage before product authority.

## 10. Sample-size gate

No fixed sample size is asserted here.

Before recruitment, statistical review must define sample size from:

- primary hypothesis count;
- expected effect sizes and uncertainty;
- repeated-measures structure / ICC assumptions;
- anticipated attrition;
- missingness/wear compliance;
- subgroup objectives;
- holdout/replication requirements.

The 2025 French factorial-study sample size is not a substitute for this calculation because the study question and model are different.

## 11. Primary outputs

The study should produce:

- feature/construct effect estimates with uncertainty;
- negative/null findings;
- data-quality/missingness report;
- prespecified sensitivity analyses;
- model/version/provenance receipts;
- calibration/abstention performance where applicable;
- reproducibility package excluding protected instrument wording unless permitted.

## 12. Product-claim firewall

A statistically significant association does not by itself authorize Guardian copy such as:

- “your dog is afraid”;
- “your dog is aggressive”;
- “your dog is anxious”;
- “ELI detects C-BARQ behaviour X”.

Any product wording requires a separate claim-authority review after validation evidence exists.

## 13. Decisions required from Penn / scientific review

Before this draft can become an executable protocol, resolve:

- suitability of C-BARQ as external criterion for the proposed constructs;
- current authorized French instrument/version;
- repeated-administration rules and spacing;
- missing/NA scoring rules;
- appropriate primary outcomes;
- sample-size/replication expectations;
- short-form/repeated-use options, if any;
- multi-dog/Dog-rivalry handling;
- publication/authorship/data-sharing expectations;
- permitted storage/export of item-level responses and derived scores.

## 14. Current disposition

`ELI_VALIDATION_AGAINST_CBARQ = PROPOSED / NOT_PERFORMED`

`CBARQ_EXTERNAL_CRITERION = CANDIDATE / NOT_GROUND_TRUTH`

`STUDY_RECRUITMENT = BLOCKED_PENDING_INSTRUMENT+SCIENCE+PRIVACY_AUTHORITY`
