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

Coefficient of variation of per-second ODBA within a 30-min window. The 30-minute
CV transform is an EMOPET engineering feature; the currently cited ODBA literature
is measurement context and does not establish its affective interpretation.

`h_activity_variability(a, baseline) = baseline.activityVariabilityMean + a · k2`

Linear and monotonic increasing. Again falls back to an effectively infinite R
when baseline is missing.

> **THE DEFINITION IS COHERENT; THE FUNCTIONAL FORM IS NOT — recorded 2026-09-22.**
>
> Unlike `rr_variability`, the *measurement* agrees across all three layers.
> `firmware/collar/main/sensors/activity_variability.{h,c}` implements exactly what
> is documented: `ACTIVITY_WINDOW_SEC 1800`, `ACTIVITY_MIN_VALID_COUNT 900`,
> `return sqrt(var) / mean`, `NAN` below 50% valid. One undocumented guard,
> `mean < 1e-3 → NAN`, which is a sensible division guard. So the v6 round was not
> uniformly unreliable — this feature's contract holds.
>
> **What does not hold is the form above.** It is **additive** with a constant
> slope `k2`; `observation-model.ts:104` is **proportional**:
>
> | | this document | `observation-model.ts` |
> |---|---|---|
> | `h` | `mean + a · k2` | `vBase · (1 + 0.4 · a)` |
> | `∂h/∂a` | `k2` — independent of baseline | `vBase · 0.4` — **scales with baseline** |
>
> The same mismatch applies to `rr_variability` above (`mean + a · k1` versus
> `vBase · (1 + 0.5 a)`), so it is systematic rather than a slip. And **`k1` and
> `k2` are never assigned a value anywhere in this document**, while the code
> hardcodes `0.5` and `0.4`.
>
> **Consequence, which runs against the product's own premise.** Under the coded
> proportional form, a dog whose baseline variability is low gets proportionally
> muted sensitivity — `∂h/∂a` shrinks with `vBase`, so the observation can barely
> move the latent state. Under the documented additive form the slope is
> baseline-independent, so a very regular dog still produces a signal. The coded
> form therefore **mutes this feature for the calmest, most regular dogs**, which
> is the population where a subtle change is most worth catching in a within-dog
> comparison.
>
> **The citation supports the signal, not the inference.** The firmware header is
> careful and narrow — *"Robert et al. (2009) … ODBA as activity intensity proxy in
> mammals"* — which supports ODBA as an activity measure. The engine's comment then
> asserts, with no citation, *"Linear growth in arousal — elevated arousal makes
> activity more irregular."* An ODBA-validation paper does not support
> variability-of-ODBA tracking arousal. That gap is this feature's actual open
> question, and it is an EMOPET hypothesis rather than a cited result.
>
> **Coefficient provenance, across all six rows.** `observation-model.ts` hardcodes
> `0.4`, `0.5`, `1.2`, `0.4`, `0.6` and `0.3 / −0.2`. None is recorded here; this
> document uses unassigned symbols instead. Whoever fixes the forms above should
> record the values in the same change.
>
> Neither side is authority. Gate: #87 (FW-SCI-02).

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

> **FOUR OF THESE RULES ARE NOT WHAT RUNS — recorded 2026-09-22.** Checked
> against `dynamics/recovery-tracker.ts` and the test that defends it. Unlike
> `rr_variability` above, this is not two competing branches: half the spec is
> implemented exactly.
>
> | Rule | This document | `recovery-tracker.ts` |
> |---|---|---|
> | Episode start | sustained `a > a_high` for **≥ 60 s** | **no sustain at all** — the episode opens on the first sample above `thresholdHigh` |
> | Episode end | sustained `a < a_low` for ≥ 5 min | `SUSTAINED_RETURN_SECONDS = 300` ✔ |
> | Metric | minutes between start and **end** (the confirmation) | `belowThresholdSince − startedAt` — start to the **first** crossing, i.e. 5 minutes shorter |
> | Bounce rule | resets if `a` crosses back above **`a_high`** | resets when `a >= thresholdLow` — **`a_low`**, a far more sensitive trigger |
> | EMA `0.9·prev + 0.1·new` | — | exact ✔ |
> | Trend `(recent14 − prior14)/prior·100` | — | exact ✔ |
> | Minimum samples | *not documented* | `recent.length < 4` over 28 days returns `null` |
> | `+20%` → load decay `×1.10` | — | `RECOVERY_TREND_PCT_THRESHOLD = 20.0`, `LOAD_DECAY_TREND_MULTIPLIER = 1.10` ✔ |
>
> **The divergences are asserted as correct by `__tests__/recovery-tracker.test.ts`,
> with its own comments spelling them out** — `// back above low -> reset` on a
> sample of `0.5` where `low = 0.3` and `high = 0.6`, and
> `// startedAt = 10:00:00, belowThresholdSince = 10:10:00 => recoveryMinutes = 10`.
> So the engine's unit tests are the de facto specification for this dynamic, and
> they disagree with this document deliberately rather than by accident. A green
> suite proves conformance to the tests, not to this spec.
>
> **Predictable behavioural consequence, worth stating because it is not
> obvious.** With no start sustain, a single noisy sample opens an episode; with
> the reset firing at `a_low` rather than `a_high`, any excursion above
> `base + 0.5σ` restarts the 5-minute confirmation. Taken together the tracker is
> biased toward **many episodes that open easily and rarely close**, so
> `recovery_minutes` would be produced far less often than the spec implies, and
> the episodes that do close are measured 5 minutes short.
>
> **Also unreached.** `RecoveryTracker` is exported by `dynamics/index.ts` but
> **never constructed** outside its test — no caller in the engine, the backend or
> either app. The `thresholdHigh` / `thresholdLow` values are parameters, so the
> baseline derivation this document implies does not exist anywhere. The file also
> contradicts itself about it: its class docstring says thresholds are
> `rrMean`-derived "+ 1.5*std", while `update()`'s docstring says arousal is
> unitless so "the thresholds are absolute, not in RR/std units".
>
> Neither side is authority. Gate: #90 (ELI-SCI-04).

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

> **THE THRESHOLDS MATCH; THE ELIGIBILITY TEST DOES NOT — recorded 2026-09-22.**
> Checked against `dynamics/anticipation-tracker.ts`. `MIN_OCCURRENCES = 7`,
> `RATIO_THRESHOLD = 1.5`, `PRE_EVENT_WINDOW_MIN = 15`, the trailing 30 days and
> the 50% coverage gate are all implemented as written. One rule is not.
>
> **"±30 minutes" is implemented as an hour bucket, and the code asserts they are
> the same thing.** `detectRecurringHour` buckets occurrences by
> `o.at.getUTCHours()` and computes `coverage = modeCount / occurrences.length`,
> under the comment *"Occurrences within ±30 min of mode hour => within the same
> hour bucket"*. That equivalence is false in both directions:
>
> - **07:45 and 08:15** are 30 minutes apart and both within ±30 min of 08:00, but
>   land in **different** buckets — a tight cluster is split;
> - **08:05 and 08:55** are 50 minutes apart and in the **same** bucket, though
>   08:55 is outside ±30 min of 08:00 — a loose cluster is merged.
>
> So the gate can reject a dog with a very regular 07:50 routine whose
> occurrences straddle 07:xx/08:xx, while admitting one whose departures wander
> anywhere inside 08:00–08:59. That inverts the intent stated in the function's
> own docstring — *"narrow enough to yield a predictable event time"*.
>
> **The bucketing is also in UTC.** A departure routine is a local-time
> behaviour. An 08:00 local routine in France is 07:00 UTC in winter and 06:00 UTC
> in summer, so any trailing-30-day window crossing a DST change splits across two
> UTC buckets and can fail the 50% gate for calendar reasons alone. The same class
> of issue the privacy work addressed for retention anniversaries.
>
> **Why no test caught it.** `__tests__/anticipation-tracker.test.ts` builds every
> occurrence with `Date.UTC(2026, 3, day, hour, 0, 0)` — exactly on the hour. Under
> that fixture the bucket and the ±30 min window are indistinguishable, so the
> divergence is invisible by construction rather than asserted. This is a
> different failure mode from `recovery_speed` above, where the tests assert the
> divergence deliberately.
>
> **General rule that follows from all three dynamics.** The engine's unit tests
> are **not** independent evidence about this document. For `recovery_speed` they
> encode a competing specification; here the fixture is too idealised to reach the
> code path that diverges. Either way, a green suite does not mean the
> implementation conforms to `docs/eli_model.md`.
>
> Neither side is authority. Gate: #89 (ELI-SCI-03).

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
