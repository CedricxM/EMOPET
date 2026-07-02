# v6 Validation Dataset — Spec

Purpose: provide ground-truth data to validate the four v6 observables and V11
before any user-visible Bleiz message is enabled in production.

## Cohort

- **N = 10 dogs**
- Mixed breed, age 2–9 y, weight 5–35 kg
- Include at least 2 brachycephalic individuals (V10 sanity)
- At least 4 multi-dog households (V7, V11)

## Duration

30 consecutive days per dog, continuous wear of MAT + TAG.

## Instrumentation

- MAT v6.0.0 firmware
- TAG v6.0.0 firmware
- Raw sensor logs retained in addition to FeatureVector uplinks
- Synchronised video (minimum 12 h/day coverage in visible areas)

## Owner-annotated events

Owners mark the following via the mobile app, with timestamps:

- Owner departure / return
- Known stressor (vet visit, thunderstorm, fireworks, strangers)
- Playtime start / end (to verify V11)
- Meals (V8)
- Walks (V1)

## Video ground truth (scored by blinded rater)

Each annotated event is reviewed against video. The rater scores:

- Arousal class: `low / medium / high`
- Valence class: `negative / neutral / positive`
- Play interaction: `yes / no` (for V11 validation)
- Recovery time to neutral behaviour (minutes)

## Acceptance criteria

| Signal | Target |
|---|---|
| `rr_variability` observation residuals | median |z-score| < 1.5 |
| `activity_variability` coverage | ≥ 90% of 30-min windows yield non-null |
| `recovery_speed` EMA vs rater time | Spearman ρ ≥ 0.5 |
| `anticipation_index` flagged dogs | precision ≥ 0.8 against rater |
| V11 false-positive rate | < 5% of rater-confirmed non-play windows |

## Storage & privacy

- Raw video stays on-device with the owner; only rater-annotated event windows
  are uploaded
- Dataset is PII-stripped (no owner names, no GPS outside enrolled home)
- Retention: 18 months, then aggregate-only
