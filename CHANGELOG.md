# Changelog

## [6.0.0] — 2026-04-18

### Added

- **New observables**
  - `rr_variability` — non-monotonic observation model (Homma & Masaoka, 2008)
  - `activity_variability` — 30-min ODBA CV (Robert et al., 2009)
  - `tremor_detected` — 8–15 Hz IIR bandpass on TAG IMU
  - `lateral_acc_rms`, `gyro_std_deg_s` — raw channels for V11
- **New dynamics**
  - `recovery_speed` tracker with 5-min sustained-return rule, EMA, 4-week trend
  - `anticipation_index` tracker (ratio ≥ 1.5, ≥ 7 occurrences, ≥ 50% coverage)
- **State transition**
  - `effectiveLoadDecayPerDay` multiplies base τ by 1.10 when 4-week recovery
    trend exceeds +20% (McEwen Type 3)
- **Veto V11** — `HIGH_ANIMAL_INTERACTION`, 3-of-4 trigger, 5-min cooldown
- **Bleiz** — `behavior_education` category with `SEP_ANTICIPATION_DETECTED`
  and `ALLO_RECOVERY_SLOWING` templates (non-medical language enforced)
- **Firmware 6.0.0** — MAT RR-variability module, TAG activity-variability and
  tremor modules
- **Database migration** `0004_v6_additions.sql`
  - `dog_sub_baselines` — new `rr_variability_*`, `activity_variability_*`,
    `recovery_*` columns
  - New tables `recovery_events`, `anticipation_events`
  - `devices` — `firmware_major/minor/patch`, `supports_v6_features`
- **Mobile app** — `AnticipationCard`, `RecoveryTooltip`, firmware version row
- **Tests** — six Vitest suites covering RR-variability, recovery, anticipation,
  vetoes, α_L modulation, and a 14-day integration scenario
- **Documentation** — `docs/eli_model.md`, `docs/veto_pipeline.md`,
  `docs/bleiz_templates.md`, `docs/firmware_protocol.md`,
  `docs/v6_validation_dataset_spec.md`

### Unchanged (explicit non-goals)

- 3D EKF state structure
- Agent/intent routing
- Confidence thresholds for user-visible inferences
