# ELI Model — v6

This document describes the v6 additions to the Emotional Load Index (ELI) model.
It assumes familiarity with the v5 EKF core (3D state: arousal, valence, load) and
focuses on the four new observables and two new dynamics trackers.

## State vector

Unchanged from v5:

```
x = [a, v, L]   with a ∈ [0,1], v ∈ [-1,1], L ∈ [0,1]
```

## New observation: rr_variability

Respiratory rate variability (coefficient of variation of inter-breath intervals
over the last 60 s), as defined in Homma & Masaoka (2008).

> **CONTESTED DEFINITION — recorded 2026-09-22.** The MAT firmware does not
> compute this. `firmware/mat/main/sensors/rr_variability.{h,c}` returns a
> **standard deviation over 300 s** (seconds), not a **CV over 60 s**
> (dimensionless). Unit and window both differ, so `baseline.rrVariabilityMean`
> and `rrVariabilityStd` — and therefore the observation model and Jacobian
> below — are calibrated against a quantity the device does not currently
> produce. Neither definition is authority yet. Gate: #86 (FW-SCI-01). See
> `docs/firmware_protocol.md` for the side-by-side evidence.

> **THE OBSERVATION MODEL BELOW IS NOT WHAT RUNS — recorded 2026-09-22.**
> `packages/eli-engine/src/ekf/observation-model.ts:48-70` implements a
> different shape from the three segments described below, and in the opposite
> direction at moderate arousal:
>
> | | this document | `observation-model.ts` |
> |---|---|---|
> | `a ∈ [0, 0.4]` | slope positive | slope positive (`0.5`) |
> | `a ∈ (0.4, 0.7]` | slope **negative**, variability decreases | slope still **positive** (`0.5`) |
> | `a > 0.7` | plateau at `rrVariabilityMean · 0.5` | plateau at `rrVariabilityMean · 1.35` |
> | Jacobian | *"changes sign — handled in `observation-model.ts` by piecewise segment selection"* | `dh_da = vBase * slope`, `slope ∈ {0.5, 0}` — **never negative, no sign change** |
>
> The implemented model is monotonic up to a plateau. The freeze-like decrease
> at moderate arousal, the sign change and the sub-baseline plateau exist only
> in this document. The plateau values differ by a factor of 2.7.
>
> The engine's own comment also reads *"Expected **STD** of IBI"*, siding with
> the firmware against the CV stated above. So the statistic disagreement is
> 2 documents vs 2 implementations, not 3 vs 1.
>
> **This is one fork with two self-consistent branches, not five separate
> mismatches.** The implementation branch agrees with itself across three
> artefacts — `rr_variability.{h,c}` (SD, 300 s), `observation-model.ts`
> (monotonic, plateau `· 1.35`) and `packages/eli-engine/src/__tests__/rr-variability.test.ts`,
> whose header says *"synthetic IBI sequence with known **std**"* and whose first
> case asserts `expect(s1.x[0]).toBeGreaterThan(predicted.x[0])` — a passing test
> that **locks** the monotonic reading. The documentation branch agrees with
> itself too (CV, 60 s, sign change, plateau `· 0.5`). Whoever resolves #86 is
> choosing a branch, not patching mismatches.
>
> Operational consequence: implementing the model described in this document
> **will fail that test**, by design rather than by accident. That failure is the
> signal, not a regression.
>
> Neither side is authority. Per `CLAUDE.md`, an existing implementation does
> not become authority by being already coded — and a document does not become
> authority by being more detailed. Gate: #86 (FW-SCI-01), with the model-shape
> disagreement arguably prior to the unit question. See #88 for the citation
> provenance issue.

Observation model `h_rr_variability(a, baseline)` is **non-monotonic**:

- For `a ∈ [0, 0.4]` (rest): slope positive, `h = baseline.rrVariabilityMean + a · k1`
- For `a ∈ (0.4, 0.7]` (moderate arousal): slope negative, variability decreases as
  breathing becomes more regular (freeze-like)
- For `a > 0.7` (high arousal): plateau at `baseline.rrVariabilityMean · 0.5`

Because the model is not monotonic, the Jacobian `∂h/∂a` changes sign — this is
handled in `observation-model.ts` by piecewise segment selection.

When `baseline.rrVariabilityMean == null` (cold start), the row's observation
variance is set to `1e6` so the update has effectively zero gain.

## New observation: activity_variability

Coefficient of variation of per-second ODBA within a 30-min window (Robert et al.,
2009).

`h_activity_variability(a, baseline) = baseline.activityVariabilityMean + a · k2`

Linear and monotonic increasing. Again falls back to an effectively infinite R
when baseline is missing.

## New dynamic: recovery_speed

Time to return to baseline after an arousal spike. Implemented in
`dynamics/recovery-tracker.ts`.

- **Episode start**: sustained `a > a_high` for ≥ 60 s
- **Episode end**: sustained `a < a_low` for ≥ 5 min
- **Metric**: minutes between start and end
- **Bounce rule**: if `a` crosses back above `a_high` before the 5-min
  confirmation, the recovery timer resets
- **EMA**: `recovery_time_ema = 0.9 · prev + 0.1 · new_sample`
- **Trend**: `recoveryTrend4wPct = (recent_14d_mean − prior_14d_mean) / prior · 100`

When `recoveryTrend4wPct > +20%`, the state-transition multiplies the load decay
time constant by `1.10` (slower decay) per McEwen (1998) Type 3 overload. See
`ekf/state-transition.ts::effectiveLoadDecayPerDay`.

## New dynamic: anticipation_index

Detects whether the dog shows elevated activity in a 15-min window before a
recurring owner-departure hour. Implemented in
`dynamics/anticipation-tracker.ts`.

- **Eligibility**: ≥ 7 departure occurrences in 30 d at a mode hour with ≥ 50%
  day-coverage
- **Signal**: ratio of mean ODBA in the 15 min before departure versus same
  clock-hour on non-event days
- **Detection**: `ratio > 1.5` **and** `occurrences ≥ 7` ⇒
  `detection_threshold_met = true`

Non-medical language rule: the output never labels the dog as "anxious" or
references a clinical separation-anxiety diagnosis. Surface strings must pass the
Bleiz `never_say` list for `SEP_ANTICIPATION_DETECTED`.

## Non-goals

v6 does **not** change:

- The 3D EKF structure
- The agent/intent routing
- The confidence thresholds that gate user-visible inferences

## References

- Homma I., Masaoka Y. (2008). *Breathing rhythms and emotions*. Exp Physiol.
- Robert K. et al. (2009). *ODBA as a proxy for energy expenditure*.
- McEwen B.S. (1998). *Stress, adaptation, and disease. Allostasis and allostatic load*.
- Siguín et al. (2025). *20-Factors Framework for canine behavioural inference*, factor F10.
