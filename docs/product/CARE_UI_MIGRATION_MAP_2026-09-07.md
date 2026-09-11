# EMOPET — Care UI Migration Map

**Control date:** 2026-09-07  
**Canonical terminology revision:** 2026-09-11 under DOMAIN-TERM #245  
**Status:** `PRODUCT RECONCILIATION MAP / NOT IMPLEMENTATION AUTHORITY`  
**Primary source:** `EMOPET_CARE_PRODUCT_MASTER_v0.1.md`  
**Related audit:** `../records/memory/CURRENT_UI_ELI_PRODUCT_DRIFT_AUDIT_2026-09-07.md`

## Purpose

The current dashboard is valuable prototype lineage, but several polished score surfaces predate or conflict with the current Care doctrine.

This map classifies the existing UI before any destructive refactor. It does not itself approve new scientific outputs, WQI/RSI, recovery, anticipation, or public ELI scoring.

## Decision legend

- `KEEP` — pattern is directionally compatible; preserve through redesign.
- `REFRAME` — useful information/pattern, but current semantics or presentation conflict with Care.
- `GATE` — do not publish as current Product behaviour until explicit Product/science authority exists.
- `LEGACY` — retain as implementation history/mock fixture, not current user-facing authority.

## Current dashboard mapping

| Current surface | Current implementation | Decision | Care-compatible destination |
|---|---|---|---|
| Insufficient-capture status | explicit message when capture is too short | `KEEP` | `NOW` epistemic-silence / insufficient-evidence state |
| Confidence/status pill | visible quality state | `KEEP` | observation publication/quality state |
| `Indice d'équilibre (ELI)` numeric 0–100 | `MOCK_ELI.value`, weekly delta, meter | `LEGACY / REFRAME` | replace with eligible observation(s), context, reference, provenance, confidence and limits |
| Global weekly ELI delta | `+4 this week` | `LEGACY` | longitudinal change only when tied to a named observation and individual/contextual reference |
| Global ELI meter | generic score gauge | `LEGACY` | no generic good/bad or wellbeing meter under current Care master |
| `daily ELI` 14-day chart | global score trend | `LEGACY / REFRAME` | `HISTORY` of eligible observations by context, not a universal score curve |
| Rest card | interruptions, duration, confidence | `REFRAME` | candidate Care observation if source, context, reference, limits and publication state are attached |
| Partial-capture wording | explicitly acknowledges limits | `KEEP` | preserve as evidence-quality UX |
| Recovery card | minutes to baseline | `GATE / REFRAME` | only if scientific/product authority defines the observable, reference and publication conditions; never naked number |
| Anticipation card | anticipation message/index | `GATE` | contextual observation only if separately authorised and evidenced |
| `Comprendre les indicateurs` | explanation affordance | `KEEP` | explanation/provenance/limits disclosure |
| Export summary | printable/export affordance | `KEEP WITH CONTROL` | `SHARE`, subject to privacy, scope and provenance controls |
| Non-medical disclaimer | explicit boundary | `KEEP` | continue, without relying on disclaimer to rescue unsupported claims |

## `BienEtreSection` mapping

| Current surface | Decision | Rationale / migration direction |
|---|---|---|
| `Indice de bien-être (ELI)` composite | `LEGACY` | conflicts with Care's no generic health/wellbeing score and no naked-number doctrine |
| Composite of four families | `GATE` | aggregation logic may be useful internally, but public authority is not established |
| WQI `Qualité de balade` numeric score | `GATE / LEGACY` | historical index exists in code; current Product authorisation not established |
| RSI `Stabilité de routine` numeric score | `GATE / LEGACY` | historical index exists in code; current Product authorisation not established |
| Family numeric scores | `GATE / REFRAME` | may be internal feature/inference summaries; do not publish as wellbeing verdicts by default |
| Expandable proxy details | `KEEP / REFRAME` | useful explainability pattern if proxy names, source, quality, reference and limits are controlled |
| Confidence badges | `KEEP` | compatible with evidence-quality UX |
| Declared contexts | `KEEP` | strongly compatible with Care context doctrine, provided Owner declaration is clearly distinguished from system observation |
| Veto/context chips | `KEEP` | compatible when they explain why evidence is qualified/suppressed rather than pretending certainty |
| Scientific footer / provenance concepts | `KEEP` | useful for model/version/source/limits disclosure |
| Recovery numeric summary | `GATE` | requires current observable/publication authority |
| Anticipation numeric index | `GATE` | requires current observable/publication authority |

## Target Care observation card contract

A migrated user-facing observation should not be rendered from a naked scalar. The minimum presentation contract is:

```text
OBSERVATION
what changed / what was observed

CONTEXT + WINDOW
when and under which eligible context

REFERENCE
which individual/contextual baseline or prior window

SOURCE / PROVENANCE
MAT / TAG / Owner declaration / derived feature

QUALITY / PUBLICATION STATE
valid / degraded / suppressed / insufficient evidence

LIMITS
what cannot be concluded

MODEL / VERSION
traceable where appropriate
```

The UI may compress these fields visually, but the underlying semantics must remain separable.

## Example migration pattern

### Legacy

```text
Indice de bien-être
72
+4 cette semaine
[global gauge]
```

### Care-oriented structure

```text
Repos observé plus fragmenté que la référence habituelle
22:10–06:40 · contexte repos éligible
Référence : nuits comparables des 14 derniers jours
Source principale : MAT · qualité suffisante
Limite : cette observation ne permet pas de conclure à une cause ni à un état médical ou émotionnel
```

This is a structural example only, not approved final copy or proof that the underlying observation is currently validated.

## Epistemic-silence migration

When the publication gate is not satisfied, prefer a first-class no-result state rather than falling back to a low-confidence score:

> Pas assez d'éléments fiables pour afficher une observation maintenant.

The system may still show device/signal state separately, but must not convert missing evidence into a pseudo-observation.

## Owner-note separation

Any declared context or journal entry must retain source identity:

- `Tu as noté …` = Owner-authored context;
- `EMOPET a observé …` = system-derived eligible observation.

Do not blend them into one apparent biological ground truth.

## Implementation sequence

1. Mark `MOCK_ELI` and global score surfaces as legacy fixtures in developer documentation.
2. Introduce an observation-view model that can carry context, reference, provenance, quality, limits, model/version and publication state.
3. Build the explicit no-result state first.
4. Migrate the rest/observation surface before touching secondary indices.
5. Keep WQI/RSI/recovery/anticipation behind Product/science gates until explicitly decided.
6. Rebuild history around observations by context rather than a global ELI curve.
7. Preserve confidence/provenance/explanation patterns that already work well.
8. Only after Product review, remove obsolete score UI from the public route.

## Open decisions

- `OPEN-UI-ELI-001` — global ELI score: current map recommends removal from user-facing Care unless explicitly reauthorised.
- `OPEN-UI-ELI-002` — WQI/RSI: remain gated pending founder/science decision.
- `OPEN-UI-ELI-003` — component migration: this map provides the first surface-level mapping; implementation contract still required.
- `OPEN-UI-ELI-004` — internal ELI/latent terminology versus public Care vocabulary remains to be formalised at data/view-model boundaries.
- `OPEN-UI-ELI-005` — mocks/synthetic data must remain visibly development-only and non-evidentiary.

## Non-goal

This document does not rewrite the dashboard code and does not convert the proposed Care master into a released feature. It creates a controlled bridge so implementation can move without importing superseded score semantics.
