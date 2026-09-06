# @emopet/ai-personality

Breiz content engine and lightweight personality helpers for EMOPET.

## Product authority

The package contains a historical Breiz catalog that is still required for migration and regression tests. It is **not** release authority.

Release authority is:

- `BLEIZ_RELEASE_TEMPLATES`
- `scheduleBleizContent()` exported from `bleiz-release-scheduler`
- `releaseTemplateBlockReason()` / `filterReleaseTemplates()`
- machine-readable `releaseClass` + `semanticAuthority`

`BLEIZ_TEMPLATES` is retained as a legacy catalog only. New production behavior must not bypass the release scheduler or treat the historical catalog as an approved product surface.

## Release classes

Every release-authorized template is classified as exactly one of:

- `OBSERVATION_EXPLANATION`
- `GENERAL_EDUCATION`
- `SEASONAL_CONTEXT`
- `SUGGESTION`
- `COMMUNITY_CONTENT`

Each release template also carries a semantic ceiling:

- `OBSERVATION_ONLY`
- `EDUCATION_ONLY`
- `CONTEXT_ONLY`
- `SUGGESTION_ONLY`
- `COMMUNITY_ONLY`

The class describes the product role. It is **not** a clinical or scientific conclusion.

## Main exports

- `BLEIZ_RELEASE_TEMPLATES`
- `BLEIZ_RELEASE_TEMPLATE_STATS`
- `scheduleBleizContent()`
- `releaseTemplateBlockReason()`
- `filterReleaseTemplates()`
- `evaluateTrigger()`
- `publishDecision()`
- `filterPrompt()`
- `filterGeneratedText()`
- `getAiPersona()`

Legacy/migration export:

- `BLEIZ_TEMPLATES` — historical catalog, **not release authority**

## Invariants

- Non-medical only: no diagnosis, no clinical tone, no certainty claims.
- Observable evidence must not be renamed as a hidden emotional or medical state.
- A blocked legacy semantic identity is never silently re-authorized under the same ID.
- MAT/TAG/ELI confidence, data adherence, distance records and MAT streaks must not drive milestones, rewards or celebratory progression.
- Sensor or weather templates must declare `required_fields`.
- If a required field is missing, the template cannot trigger.
- Resting RR or PVDF resting signals must not be used without:
  - `days_with_valid_rest_data >= 7`
  - `coverage_14d >= 0.4`
  - `rest_rr_valid_today === true`
- Health-adjacent templates do not publish as `push` when the gate is not `PUBLISH`.
- `DEGRADE` can reduce channel/assertiveness. It may never be rewritten by Breiz as higher certainty.
- `REJECT` produces no release job.
- Daily anti-spam budget is fixed:
  - `push <= 1`
  - `home_insight <= 2`
  - `chat_message <= 1`
  - `community_post <= 3`

## Adding or migrating a template

1. Define the observable evidence or non-sensor context first.
2. Decide the release class and semantic ceiling before copywriting.
3. Add every required field explicitly.
4. Avoid latent-state IDs such as `ANXIETY`, `DEPRESSION`, `PAIN`, `HAPPY`, etc. unless a future controlled authority explicitly permits that scientific construct.
5. Do not use `mat_streak`, `personal_best`, distance goals, sensor confidence or data-volume fields as reward/milestone triggers.
6. Keep `never_say` as defense-in-depth, not as the primary scientific control.
7. Add a release test proving the template cannot cross its semantic ceiling.
8. If migrating a legacy template, prefer a new observable-pattern identity over silently renaming the user-facing copy while retaining the old latent-state semantics.

## Current migration example

Historical:

- `BHV_ANXIETY_PATTERN` — blocked from release.

Release replacement:

- `BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN`
- class: `OBSERVATION_EXPLANATION`
- authority: `OBSERVATION_ONLY`

The replacement can describe the same observable combination while explicitly leaving multiple explanations open.

## Safety

- `GLOBAL_BLACKLIST` is enforced on prompts and generated text.
- Template `never_say` terms are applied in addition to the global blacklist.
- Release filtering happens **before** scheduling, including when a caller explicitly supplies a template list.
- Morning greeting injection is only done for `chat_message` jobs in the morning when the chat budget is still available.

## Build and test

- `pnpm --filter @emopet/shared build`
- `pnpm --filter @emopet/ai-personality build`
- `pnpm --filter @emopet/ai-personality test`
