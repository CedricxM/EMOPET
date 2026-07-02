# Veto Pipeline — v6

The veto pipeline gates raw observations before they reach the EKF. Each veto
returns one of:

- `ALLOW` — pass through
- `MODIFY` — pass through but suppress specific sensor channels (e.g. `mic`)
- `DENY` — drop the sample and apply a cooldown

The pipeline short-circuits on the first `DENY`. `MODIFY` suppressions accumulate.

Implementation: `packages/eli-engine/src/vetoes/index.ts`.

## Ordering

| # | ID | Action on trigger |
|---|---|---|
| V1 | `POST_EXERCISE` | DENY (10 min cooldown) |
| V2 | `HEAT_PANTING` | DENY (15 min) |
| V3 | `RETURN_HOME_GREETING` | DENY (3 min) |
| V4 | `BODY_SHAKE` | DENY (30 s) |
| V5 | `COLLAR_MISPOSITION` | MODIFY (suppress imu) |
| V6 | `AMBIENT_NOISE_HIGH` | MODIFY (suppress mic) |
| V7 | `MULTI_DOG_MAT` | DENY (ambiguous attribution) |
| V8 | `RECENT_MEAL` | DENY (20 min) |
| V9 | `ESTROUS_WINDOW` | MODIFY (widen priors) |
| V10 | `BRACHYCEPHALIC_HEAT` | DENY |
| V11 | `HIGH_ANIMAL_INTERACTION` | DENY (5 min) |

## V11 — HIGH_ANIMAL_INTERACTION (new in v6)

Suppresses observations during bursts of dog-dog or dog-human rough play
(Siguín et al., 2025 factor F10). These bursts inflate ODBA and RR in ways that
do not reflect emotional state.

Trigger: **3 of 4** conditions in the current feature vector:

1. `lateral_acc_rms > 0.6 g` (non-null)
2. `odba_mean > 3.0 g`
3. `gyro_std_deg_s > 200`
4. `vocal_event_in_window == true`

If `lateral_acc_rms` is `null` (TAG not reporting), V11 cannot fire regardless of
other channels — we require lateral accel data for this veto.

Cooldown: 5 minutes. Action: `DENY`.

## Cross-cutting rules

- Nulls in the feature vector are treated as "unknown"; they never trigger vetoes
  by themselves.
- `MODIFY` suppressions apply only to the current sample; they don't persist.
- `DENY` cooldowns are keyed by `(dogId, vetoId)`.
