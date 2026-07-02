# Bleiz Templates — v6

Bleiz is the user-facing voice layer. Templates carry triggers, priority,
cooldown, tone, and — critically — a `never_say` list that blocks medical or
diagnostic language.

v6 adds two templates under the new `behavior_education` category.

Implementation: `packages/ai-personality/src/bleiz/bleiz-v6-templates.ts`.

## SEP_ANTICIPATION_DETECTED

| Field | Value |
|---|---|
| Category | `behavior_education` |
| Priority | 78 |
| Cooldown | 30 days per dog |
| Tone | Gentle, informative, non-clinical |
| Trigger | `anticipation_index.detection_threshold_met === true` |

**Never say**: `"anxiété de séparation"`, `"séparation anxiety"`, `"trouble"`,
`"pathologie"`, `"maladie"`, `"anxieux"`.

The template describes an observed activity pattern, not a diagnosis. It points
to generic enrichment ideas and never prescribes treatment.

## ALLO_RECOVERY_SLOWING

| Field | Value |
|---|---|
| Category | `behavior_education` |
| Priority | 80 |
| Cooldown | 21 days per dog |
| Tone | Measured, concerned but non-alarmist |
| Trigger | `recoverySpeedCurrent.trend4wPct > 20%` sustained ≥ 7 days |

**Never say**: `"charge allostatique"`, `"stress chronique"`, `"cortisol"`,
`"épuisement"`.

Appends a vet-referral suffix: *"Si cela persiste, en parler à votre
vétérinaire."*

## Cross-cutting rules

- Templates are fired by the scheduler, not inline during the EKF step.
- The `never_say` check runs as a post-render linter: if any banned substring
  appears in the rendered copy, the template is dropped and logged.
- French is the primary locale; English fallbacks mirror the `never_say` rules.
