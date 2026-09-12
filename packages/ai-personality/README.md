# @emopet/ai-personality

Breiz content engine and lightweight personality helpers for EMOPET.

## Product authority

The package contains a historical Breiz catalog that is still required for migration and regression tests. It is **not** release authority.

Release authority is:

- `BLEIZ_RELEASE_TEMPLATES`
- `scheduleBleizContent()` exported from `bleiz-release-scheduler`
- `guardReleaseGeneratedText()` for generated output
- `releaseTemplateBlockReason()` / `filterReleaseTemplates()`
- machine-readable `releaseClass` + `semanticAuthority`

The historical catalog is exposed from the package root only as `LEGACY_BLEIZ_TEMPLATES` / `LEGACY_BLEIZ_TEMPLATE_STATS`. New production behavior must not bypass the release scheduler or treat the historical catalog as an approved product surface.

Compatibility facades `src/content-templates.ts` and `src/content-scheduler.ts` are also routed through release authority. The historical scheduler/catalog are internal migration dependencies, not product entry points.

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
- `BLEIZ_RELEASE_BLOCKED_LEGACY`
- `BLEIZ_RELEASE_COLLISIONS`
- `scheduleBleizContent()`
- `guardReleaseGeneratedText()`
- `releaseTemplateBlockReason()`
- `filterReleaseTemplates()`
- `evaluateTrigger()`
- `publishDecision()`
- `filterPrompt()`
- `filterGeneratedText()`
- `getAiPersona()`

Legacy/migration exports:

- `LEGACY_BLEIZ_TEMPLATES` — historical catalog, **not release authority**
- `LEGACY_BLEIZ_TEMPLATE_STATS` — historical regression counts only

## Invariants

- Non-medical only: no diagnosis, no clinical tone, no certainty claims.
- Observable evidence must not be renamed as a hidden emotional or medical state.
- A blocked legacy semantic identity is never silently re-authorized under the same ID.
- MAT/TAG/ELI confidence, data adherence, distance records and MAT streaks must not drive milestones, rewards or celebratory progression.
- Sensor/computed evidence must not become relationship/bond/emotional-balance truth.
- Automatic sentimental Memories must not be manufactured from usage/activity metrics.
- Duplicate legacy template IDs fail closed in release rather than relying on array order.
- Sensor or weather templates must declare `required_fields`.
- If a required field is missing, the template cannot trigger.
- Resting RR or PVDF resting signals must not be used without:
  - `days_with_valid_rest_data >= 7`
  - `coverage_14d >= 0.4`
  - `rest_rr_valid_today === true`
- Health-adjacent templates do not publish as `push` when the gate is not `PUBLISH`.
- `DEGRADE` can reduce channel/assertiveness. It may never be rewritten by Breiz as higher certainty.
- `REJECT` produces no release job.
- Generated text must pass `guardReleaseGeneratedText()` before presentation. A semantic violation rejects the candidate instead of cosmetically rewriting it into apparent compliance.
- Rejected generated raw text is not returned by the release output guard.
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
6. Do not derive relationship quality from Care/ELI/sensor/computed evidence.
7. Keep `never_say` as defense-in-depth, not as the primary scientific control.
8. Add a release test proving the template cannot cross its semantic ceiling.
9. Add adversarial output examples for any new semantic class or risky wording path.
10. If migrating a legacy template, prefer a new observable-pattern identity over silently renaming the user-facing copy while retaining the old latent-state semantics.

## Current migration example

Historical:

- `BHV_ANXIETY_PATTERN` — blocked from release.

Release replacement:

- `BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN`
- class: `OBSERVATION_EXPLANATION`
- authority: `OBSERVATION_ONLY`

The replacement can describe the same observable combination while explicitly leaving multiple explanations open.

## Generated-output guard

The release path is two-stage:

1. template/scheduler authority decides whether a content job exists;
2. `guardReleaseGeneratedText(template, candidate)` decides whether generated copy may be surfaced.

The output guard evaluates the **raw candidate before lexical rewriting**, then applies the lexical safety filter and checks the filtered result again. This is deliberate: a generated diagnostic or emotional claim must not become acceptable merely because a word replacement makes it sound softer.

Examples that fail closed for `OBSERVATION_ONLY` include:

- hidden emotional state assertions;
- causal claims such as `parce que ...` presented as known explanation;
- mind-reading or motivation claims;
- relationship/bond-quality conclusions;
- diagnostic/pathological certainty.

## Safety

- `GLOBAL_BLACKLIST` is enforced on prompts and generated text.
- Template `never_say` terms are applied in addition to the global blacklist.
- Release filtering happens **before** scheduling, including when a caller explicitly supplies a template list.
- The release scheduler also rejects ad-hoc templates that are not present in the canonical release registry.
- Generated-output semantic violations fail closed after scheduling.
- Morning greeting injection is only done for `chat_message` jobs in the morning when the chat budget is still available.

## Build and test

- `pnpm --filter @emopet/shared build`
- `pnpm --filter @emopet/ai-personality build`
- `pnpm --filter @emopet/ai-personality test`

The package test script includes:

- legacy regression tests;
- release-registry/firewall tests;
- adversarial generated-output semantic-ceiling tests.
