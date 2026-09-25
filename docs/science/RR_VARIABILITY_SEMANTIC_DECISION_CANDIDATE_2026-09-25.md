# RR / inter-breath-interval variability semantic decision candidate

**Issue:** #86  
**Date:** 2026-09-25  
**Status:** `DECISION CANDIDATE / REVIEW REQUIRED / NO ELI PUBLICATION AUTHORITY`

## 1. Recommendation

Do **not** choose between the current ambiguous `rr_variability` branches by declaring either existing implementation authoritative.

Instead:

1. retire `rr_variability` as an ambiguous semantic name;
2. define two explicit research/engineering measurements computed from the **same qualified IBI window**:
   - `resp_ibi_sd_s_300s` — sample standard deviation of qualified inter-breath intervals, seconds;
   - `resp_ibi_cv_300s` — sample SD / mean IBI, dimensionless;
3. use a 300 s rolling Phase-0 window with a minimum of 30 valid IBIs;
4. keep both features **out of ELI latent publication** until canine/EMOPET validation selects a justified mapping.

This is a semantic/engineering recommendation, not proof that either metric predicts canine arousal.

## 2. Why the current 60 s / 30-breath contract is internally poor for resting dogs

The current documentation simultaneously asks for:

- a **60 s** rolling window;
- at least **30 valid IBIs**.

That implies a dog must contribute roughly 30 breaths/min or more merely to produce a value.

Published home measurements in apparently healthy adult dogs reported mean sleeping respiratory rate around **13 breaths/min**, and mean resting rates around the high teens; sleeping rates were generally below 30 breaths/min.

At those rates:

- 13 breaths/min gives roughly 13 breaths in 60 s, but ~65 in 300 s;
- 19 breaths/min gives roughly 19 breaths in 60 s, but ~95 in 300 s.

Therefore a 60 s window with a 30-valid-breath minimum would systematically abstain in much of the exact calm/rest context where MAT is intended to operate.

Source:
- Rishniw M. et al. (2012), *Sleeping respiratory rates in apparently healthy adult dogs*, Research in Veterinary Science 93(2):965–969. DOI: 10.1016/j.rvsc.2011.12.014.

This supports the **window/sample-count engineering choice only**. It does not validate respiratory variability as an affect feature.

## 3. Why the literature does not justify silently choosing CV or SD as the affect metric

The citation currently attached to the feature, Homma & Masaoka (2008), is a broad review of breathing/emotion relationships. It does not define EMOPET's 60 s CV metric or validate it in dogs.

Relevant human respiratory-variability literature uses multiple statistics:

- Van Diest et al. (2006) studied within-subject variability in respiratory timing/volume parameters and linked anxiety with changes in variability, but this is human evidence and not a canine sensor-validation study.
- Later respiratory-variability work explicitly uses coefficient of variation as a total-variability measure.
- Reviews of wearable anxiety features also include standard deviation of inter-breath intervals among respiratory features.

Sources:
- Homma I., Masaoka Y. (2008), *Breathing rhythms and emotions*, Experimental Physiology 93(9):1011–1021. DOI: 10.1113/expphysiol.2008.042424.
- Van Diest I. et al. (2006), *Anxiety and respiratory variability*, Physiology & Behavior 89(2):189–195. DOI: 10.1016/j.physbeh.2006.05.041.
- Guyon A. et al. (2020), *Respiratory Variability, Sighing, Anxiety, and Breathing Symptoms in Low- and High-Anxious Music Students Before and After Performing*, Frontiers in Psychology 11. Uses CV as a total-variability measure in 10-minute periods.

Conclusion:

`LITERATURE DOES NOT CURRENTLY SELECT ONE EMOPET CANINE AFFECT METRIC`

Therefore preserving both SD and normalized CV as separately named research features is safer than pretending the current field name has one scientific meaning.

## 4. Proposed Phase-0 measurement contract

### Common IBI qualification

Input:

- MAT respiratory event timestamps produced by the controlled future IBI extractor.

Candidate qualification rule carried from existing implementation intent:

- reject IBI < 0.3 s;
- reject IBI > 10.0 s;
- rolling horizon: 300 s;
- require >=30 valid IBIs;
- if valid count <30 -> both outputs are `null`;
- if mean IBI <=0 or numerically unsafe -> CV is `null`;
- artifact-rejected breaths are excluded, not zero-filled.

The 0.3–10 s bounds themselves still require signal/physiology validation; carrying them here preserves current engineering behavior, not scientific approval.

### Metric A

`resp_ibi_sd_s_300s`

Definition:

`sqrt(sum((ibi_i - mean)^2) / (n - 1))`

Unit: seconds.

### Metric B

`resp_ibi_cv_300s`

Definition:

`resp_ibi_sd_s_300s / mean(ibi)`

Unit: dimensionless ratio.

Do not multiply by 100 in the transport contract. Percentage rendering, if ever needed, belongs in presentation.

## 5. Why compute both from one window

Advantages:

- eliminates silent unit ambiguity;
- preserves the existing firmware SD lineage;
- provides a normalized statistic for research comparison;
- allows later evidence to select/drop one without changing historical meaning;
- gives cross-layer tests a deterministic exact contract;
- avoids calibrating baselines against an unnamed unit.

Cost:

- one additional scalar field;
- schema/version migration;
- explicit deprecation of the ambiguous field.

That cost is preferable to one field whose meaning changes silently.

## 6. Versioning and migration

This is a semantic break and must not be shipped as an in-place meaning change.

Recommended transport move:

- old `rr_variability` -> `DEPRECATED_AMBIGUOUS / DO_NOT_PERSIST_NEW_DATA`;
- new feature-contract major version;
- add the two explicit fields;
- stored legacy `rr_variability` rows remain tagged with their producer firmware/contract version and must not be mixed with new metrics;
- no automatic numerical conversion unless the source row's exact historical statistic/window is known.

Existing contextual baseline columns named only `rrVariabilityMean/Std` cannot safely mix both metrics. A later implementation change should version or split baseline storage.

## 7. ELI boundary

Neither new field is authorized as a direct arousal observation merely because the measurement contract is precise.

Before either enters the ELI observation model:

1. MAT IBI extraction must be physically validated;
2. metric repeatability/missingness must be characterized in dogs;
3. contextual confounds (sleep stage, panting, exercise recovery, temperature, posture, disease/medication where relevant) must be studied or gated;
4. the exact feature-to-latent hypothesis must be preregistered/tested;
5. model coefficients/function shape must have controlled provenance.

Current `rr_variability -> arousal` model path remains HOLD.

## 8. Cross-layer vector required after approval

A canonical test vector should begin with a known IBI series and prove:

`IBI series -> qualification -> 300 s selection -> sample SD -> CV -> transport fields -> persisted units -> baseline fields`

The vector must fail on:

- 60 s truncation;
- population SD denominator `n` instead of sample denominator `n-1`;
- CV omitted/division mismatch;
- seconds vs dimensionless swap;
- zero substitution for missing data.

## 9. Decision requested

Approve one of:

### A — recommended
`SPLIT_EXPLICIT_SD_AND_CV_300S / ELI_MAPPING_HOLD`

### B
choose one exact metric/window with a scientific rationale strong enough to retire the other.

### C
remove respiratory variability entirely from Phase 0 until a dedicated study defines it.

No option authorizes a canine affect claim by itself.
