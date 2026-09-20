# EMOPET — Current UI / ELI Product-Authority Drift Audit — 2026-09-07

**Status:** `CONTROLLED MEMORY / PRODUCT IMPLEMENTATION DRIFT`  
**Scope:** current web prototype versus controlled founder/product doctrine.  
**Important:** observed code is implementation evidence, not automatic Product authority.

## Purpose

The repository contains a substantial ELI dashboard/prototype that predates or diverges from the current strategic/product doctrine. This record prevents polished UI and working mock logic from being mistaken for approved product semantics.

## 1. Current controlling product doctrine

### Founder strategic lock

`docs/strategy/FOUNDER_STRATEGIC_LOCKS_2026-09-07.md` is a `PROJECT_DECISION / STRATEGIC AUTHORITY` and states:

- EMOPET is relationship-first rather than metric-first;
- the interface should not flood the Guardian with generic scores;
- ELI is an interpretation architecture under uncertainty;
- no unsupported generic emotional score;
- confidence, provenance and abstention are core behaviours;
- model sophistication is not scientific validation.

### Care product authority candidate

`docs/product/EMOPET_CARE_PRODUCT_MASTER_v0.1.md` is `PROPOSED PRE-PRODUCTION AUTHORITY / NOT IMPLEMENTED / NOT RELEASED` and states:

- Care is not a generic health score;
- Care is not a discrete-emotion classifier;
- no “good/bad day” meter;
- no naked number;
- every observation must carry context, reference, provenance, confidence, limits, model/version and publication state;
- arousal/activation proxy is the only latent variable currently authorised for user publication under the cited v7.1 V1 authority;
- valence remains internal/gated;
- explicit epistemic silence is a valid product state.

The founder lock is controlling strategy. The Care master is the detailed proposed product authority to reconcile implementation toward.

## 2. Current dashboard still presents a generic composite ELI score

`apps/web/app/dashboard/page.tsx` currently renders:

- `Indice d'équilibre (ELI)` / `Balance index (ELI)`;
- a large numeric `MOCK_ELI.value`;
- weekly delta;
- a meter/gauge;
- a 14-day “daily ELI” trend.

Current mock data defines `MOCK_ELI.value = 72` and `delta = +4`.

This is exactly the kind of global metric-first surface the later founder/product doctrine warns against.

### Status

`IMPLEMENTED PROTOTYPE / CONFLICTS WITH CURRENT STRATEGIC DIRECTION`.

It must not be used as evidence that the current product has approved a 0–100 “balance” score.

## 3. `BienEtreSection` contains a stronger conflict

`apps/web/app/dashboard/BienEtreSection.tsx` currently renders:

- `Indice de bien-être (ELI)`;
- a numeric wellbeing gauge;
- delta to baseline;
- `composite des 4 familles`;
- WQI `Qualité de balade` numeric score;
- RSI `Stabilité de routine` numeric score;
- recovery minutes/trend;
- anticipation index;
- four numeric indicator families with expandable proxies.

The code comment itself says `Indicateur de bien-être global`, even while noting it is “PAS le WQI”.

### Why this matters

Current strategy does not merely forbid one old acronym. It rejects a generic global wellbeing/emotional score as the main product expression.

A confidence badge around a composite score does not automatically make that score compatible with the current evidence contract.

### Status

`PROTOTYPE SEMANTICS SUPERSEDED / REQUIRES PRODUCT RECONCILIATION`.

## 4. WQI / RSI historical residue

The controlled supersession record already warns:

- WQI historically meant **Walk Quality Index**;
- RSI historically meant **Routine Stability Index**;
- these labels must not be reused in product/public copy without checking current scientific/product authority and whether the indices remain authorised at all.

The current dashboard still exposes both as polished user-facing numeric indicators.

### Status

`LEGACY INDEX IMPLEMENTATION PRESENT / CURRENT AUTHORISATION NOT ESTABLISHED`.

Do not infer approval merely from code existence.

## 5. ELI model naming and latent-state drift

`docs/eli_model.md` and `packages/shared/src/types/eli.ts` still describe ELI as **Emotional Load Index** and the v5/v6 EKF around a 3D state including arousal, valence and load.

The current Care master is materially narrower for user publication:

- dimensional-affect architecture may remain conceptual/internal;
- arousal/activation proxy is the only latent variable currently authorised for user publication under the cited V1 authority;
- valence remains gated/internal;
- no discrete emotion or generic emotional/wellbeing score.

### Status

`INTERNAL MODEL LINEAGE MAY REMAIN / USER-FACING SEMANTICS MUST NOT INHERIT OLD LABELS AUTOMATICALLY`.

The model name and internal state are not by themselves a public claim.

## 6. Important maturity distinction

Current code contains:

- ELI EKF logic;
- feature schemas;
- synthetic/mock data;
- dynamic trackers;
- gauges/charts;
- unit/integration tests.

These are software artifacts.

They do not establish:

- physical MAT/TAG signal validity;
- scientific validation of ELI as a whole;
- validated relationship between sensor proxies and latent affect;
- authorisation to show a composite wellbeing number;
- regulatory/clinical meaning.

**Software implementation ≠ scientific validation ≠ Product approval.**

## 7. Current UI elements that align better with the new doctrine

The current prototype is not uniformly wrong. Several patterns are directionally compatible and worth preserving through redesign:

- explicit `VALID / DEGRADED / SUPPRESSED`-style confidence states;
- insufficient-capture messaging;
- `Comprendre les indicateurs` disclosure/explanation affordance;
- provenance/source concepts in the broader ELI component layer;
- contextual declarations;
- non-medical disclaimers;
- wording around observed routines rather than diagnoses in several screens.

The reconciliation should retain evidence-quality UX while removing or redesigning unsupported global verdicts.

## 8. Recommended reconciliation order

1. Freeze the current dashboard score semantics as **legacy prototype**, not product authority.
2. Map each existing UI surface to `EMOPET_CARE_PRODUCT_MASTER_v0.1.md` requirements.
3. Remove/replace the global `Indice de bien-être / Indice d'équilibre` concept unless a later explicit scientific/product authority reauthorises it.
4. Decide whether WQI and RSI survive at all, and if so under what evidence/publication conditions.
5. Reframe UI around observation + context + reference + provenance + confidence + limits.
6. Preserve explicit no-result/abstention states.
7. Keep valence/internal affect state out of user publication unless later authorised.
8. Treat existing ELI mock/synthetic numbers as development fixtures, never evidence.

## 9. Candidate migration pattern

Instead of:

`ELI = 72 / +4 this week / global wellbeing composite`

prefer a surface built from eligible observations, for example:

- what changed;
- compared with which individual/contextual baseline;
- source: MAT/TAG/Guardian context;
- confidence/publication state;
- what cannot be concluded;
- optional explanation;
- no card at all when evidence is insufficient.

This is a product-architecture pattern, not a prescribed final UI copy.

## 10. Open gates

- `OPEN-UI-ELI-001` — reconcile dashboard global ELI score with founder strategic lock.
- `OPEN-UI-ELI-002` — decide WQI/RSI current Product status.
- `OPEN-UI-ELI-003` — map current ELI web components to Care observation doctrine.
- `OPEN-UI-ELI-004` — separate internal model terminology from user-facing publication semantics.
- `OPEN-UI-ELI-005` — ensure prototype/synthetic data cannot be mistaken for measured validation evidence.

**The current web UI is useful implementation lineage. It is not the current Product decision simply because it renders cleanly.**
