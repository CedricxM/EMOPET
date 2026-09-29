# UPenn / C-BARQ meeting pack

**Issue:** #541  
**Date:** 2026-09-25  
**Status:** `MEETING PREP / NO AGREEMENT IMPLIED`

## 1. Desired meeting outputs

By the end of the call, EMOPET should ideally know:

1. which French C-BARQ version/form Penn considers current for the intended use;
2. who controls licensing/permission and what the application process is;
3. which digital/repeated-use rights require explicit permission;
4. whether the proposed external-criterion study direction is scientifically sensible;
5. which constructs and study-design risks Penn would prioritize;
6. what follow-up material Penn would want before discussing collaboration.

A useful meeting can still end with several items marked `TO_CONFIRM`.

## 2. Five-minute project framing

### Product

EMOPET combines:

- wearable TAG context;
- resting-context MAT, conditional on demonstrated incremental value;
- longitudinal application/Care observations;
- explicit provenance/confidence/abstention.

### Scientific boundary

Care is not:

- a diagnosis surface;
- a generic health/wellbeing score;
- a discrete-emotion classifier;
- a “good/bad day” meter.

Current user-publication constraint:

- arousal/activation is the only latent candidate currently permitted by the Care doctrine;
- valence remains internal/gated;
- model sophistication is not treated as validation.

### Maturity

2026: foundation/preparation.

2027: beginning of launch phase / Brittany operational integration, subject to evidence and readiness.

No exact launch month, pilot size or production volume is currently frozen.

## 3. Material to send before/after the call

Recommended minimal package:

1. this one-page overview;
2. `ELI_CBARQ_PROSPECTIVE_VALIDATION_PROTOCOL_DRAFT_2026-09-25.md`;
3. concise list of licensing questions;
4. optional high-level MAT/TAG architecture diagram with no unsupported performance claims.

Do not send:

- protected questionnaire item wording;
- speculative “emotion detection” slides;
- polished mock dashboards as evidence of validated inference;
- claims of Penn partnership/endorsement;
- a 63-item “short C-BARQ” derived from the 2025 EFA.

## 4. Licensing question order

Ask the rights questions before implementation-detail questions.

### A. Instrument identity

- What is the current version/form recommended for French use?
- Which French translation/revision should EMOPET use?
- Is the version used in the 2025 France study the relevant/current one for a new project?

### B. Digital rights

- May the questionnaire be embedded in a commercial mobile/web product?
- May item-level responses be stored?
- May official subscales/scores be computed in software?
- May derived visualizations be shown to Owners/professionals?

### C. Repeated administration

- Is repeated/longitudinal administration allowed?
- Is there a recommended minimum interval?
- Are there concerns about response learning/retest effects?
- Is a shorter authorized instrument available for repeated use?

### D. Missingness / applicability

- Official treatment of missing responses?
- Official treatment of not-observed/not-applicable?
- Dog-rivalry applicability in single-dog households?
- Any scoring rules EMOPET must not reinterpret?

### E. Research/publication

- What licence applies for research use versus product use?
- Any restrictions on exporting item-level responses?
- Any publication review/acknowledgment requirements?
- Any restrictions on publishing derived analyses/scores?

## 5. Scientific-design question order

### A. Criterion suitability

- Is C-BARQ appropriate as an external criterion for selected longitudinal behavioral constructs?
- Which constructs are most defensible to study?
- Which constructs should not be inferred from passive sensors?

### B. Timing

- Baseline questionnaire at T0 only, or repeated administration?
- If repeated, what spacing is scientifically defensible?
- Is a 4–8 week longitudinal sensor window sensible, or should it change?

### C. Statistics

- Strongest design for within-dog vs between-dog effects?
- How should household clustering be handled?
- What should count as primary versus exploratory outcomes?
- What multiplicity/replication standard would Penn expect?
- Would an external holdout cohort/site materially strengthen the design?

### D. Sample size

Do not ask “is N=100 enough?”

Instead ask what inputs Penn/statistical review would use to power the study:

- primary hypotheses;
- expected effect sizes;
- repeated-measures ICC;
- attrition/wear compliance;
- subgroup analysis;
- holdout requirement.

### E. Interpretation

Ask what evidence threshold would justify language such as:

- “associated with”;
- “tracks with”;
- “adds information beyond context”;

and what would **not** justify product language.

## 6. Collaboration questions

Keep collaboration separate from licence.

Ask whether Penn would be open to discussing any of:

- protocol review;
- scientific advisory input;
- formal research collaboration;
- data-analysis collaboration;
- publication/authorship;
- student/research-project involvement.

Do not assume any of these from a positive licensing conversation.

## 7. Bilateral collaboration ladder

Do not present collaboration as “Penn gives EMOPET credibility” or “EMOPET gives Penn data.”

The useful exchange is more specific and must remain permissioned.

### What EMOPET can credibly offer now

Without changing the current IP doctrine, EMOPET can offer to discuss:

- implementation of a prospective, preregistered longitudinal study under an agreed protocol;
- instrumented real-world observation infrastructure combining TAG/MAT/context where scientifically appropriate;
- well-documented provenance, missingness, device/model versions and quality gates;
- consented research cohorts rather than opportunistic reuse of product data;
- governed de-identified research datasets where consent, ethics and a DUA permit it;
- independent/reproducible analysis packages for the agreed study;
- publication of limitations, negative/null findings and failed hypotheses rather than only positive product-friendly results;
- scientific methods, validation protocols and claim boundaries that can be inspected and criticised;
- appropriate academic credit, authorship or acknowledgement according to actual contribution and journal/institution rules;
- possible student/research-project participation if Penn identifies a useful structure.

### What remains protected unless separately approved

The current EMOPET governance direction does **not** automatically offer:

- product source code;
- proprietary ELI implementation/parameters;
- sensing architecture and industrial know-how;
- security architecture;
- unrestricted product-user data;
- perpetual model-training rights;
- ownership of EMOPET IP.

If EMOPET later wants an open-source scientific artifact, the safer current option is a **research-specific validation/evaluation harness, protocol implementation or reproducibility package** that does not expose the proprietary product engine. Open-sourcing the production inference engine would require a separate explicit IP decision.

### What EMOPET can ask Penn for

Keep the ask modular:

| Lane | EMOPET can ask | Separate authority needed |
|---|---|---|
| C-BARQ commercial use | exact instrument/version, digital rights, scoring/storage/repeated-use terms, quote path | copyright licence |
| Scientific protocol | critique of hypotheses, constructs, timing, outcomes, analysis and interpretation boundaries | scientific advice / collaboration scope |
| Research collaboration | prospective study co-design, analysis, replication/holdout design, publication pathway | written research/collaboration agreement as applicable |
| Reference data | availability of norms/benchmarks or other suitable reference material | explicit data-use right / DUA if offered |
| Publication | contribution roles, authorship/acknowledgement expectations, publication review mechanics | research/publication agreement as applicable |
| Student/research involvement | suitable thesis/project/lab involvement | institutional/project approval |

Do not bundle these into a single “partnership” ask.

### Recommended collaboration ladder

Prefer the smallest useful step first:

1. **Call + written follow-up** — instrument/licensing and scientific questions.
2. **Protocol review** — bounded comments on the prospective validation design.
3. **Pilot/research design** — define cohort, outcomes, governance and analysis before recruitment.
4. **Formal study collaboration** — only if both sides identify a real scientific project and the required agreements exist.
5. **Longer-term scientific commons** — governed data access, replication, reproducibility artifacts or additional studies if the first work produces useful evidence.

A positive answer at one level does not imply the next.

### Conflict-of-interest / personal-recognition boundary

Do not offer an informal personal payment, gift, equity interest or other private benefit to Professor Serpell in exchange for scientific guidance, favourable conclusions or institutional access.

If paid advisory work ever becomes appropriate, handle it as a transparent, written consulting/advisory arrangement compatible with Penn's rules and disclose it where required. Scientific credit should follow actual contribution; authorship should not be used as compensation.

This is an EMOPET governance safeguard, not a statement that Penn has requested compensation.

## 8. Red-line language during the meeting

Prefer:

- “candidate external criterion”
- “proposed validation protocol”
- “we want to test whether…”
- “current engineering hypothesis”
- “not yet validated”
- “subject to licensing/permission”

Avoid:

- “C-BARQ validates ELI”
- “Penn validates EMOPET”
- “our 63-item short form”
- “the sensors detect anxiety/aggression”
- “scientifically proven”
- “partnership with Penn” unless formally agreed.

## 9. Meeting notes template

For every answer record:

- question;
- speaker;
- exact answer summary;
- decision versus suggestion;
- permission/licence implication;
- scientific implication;
- action owner;
- due date;
- written follow-up required?;
- authority status after call.

Suggested statuses:

- `INFORMAL_GUIDANCE`
- `WRITTEN_CONFIRMATION_REQUIRED`
- `LICENCE_PROCESS_IDENTIFIED`
- `SCIENTIFIC_RECOMMENDATION`
- `AGREED_NEXT_STEP`
- `UNRESOLVED`

## 10. Post-call rule

Do not convert verbal guidance into repository licence authority unless the relevant permission is actually documented in writing.

Scientific advice may be recorded as expert guidance with attribution, but it must remain distinct from:

- licence;
- institutional approval;
- product validation;
- research collaboration agreement.
