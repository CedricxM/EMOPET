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
