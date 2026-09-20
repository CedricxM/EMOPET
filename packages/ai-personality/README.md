# @emopet/ai-personality

Bleiz content engine and lightweight personality helpers for EMOPET.

## Main exports

- `BLEIZ_TEMPLATES`
- `scheduleBleizContent()`
- `evaluateTrigger()`
- `publishDecision()`
- `filterPrompt()`
- `filterGeneratedText()`
- `getAiPersona()`

## Invariants

- Non-medical only: no diagnosis, no clinical tone, no certainty claims.
- Sensor or weather templates must declare `required_fields`.
- If a required field is missing, the template cannot trigger.
- Resting RR or PVDF resting signals must not be used without:
  - `days_with_valid_rest_data >= 7`
  - `coverage_14d >= 0.4`
  - `rest_rr_valid_today === true`
- Health templates do not publish as `push` when the gate is not `PUBLISH`.
- Daily anti-spam budget is fixed:
  - `push <= 1`
  - `home_insight <= 2`
  - `chat_message <= 1`
  - `community_post <= 3`

## Add a template

1. Add a `BleizTemplate` entry in `src/bleiz/bleiz-content-templates.ts`.
2. Set a stable `id`.
3. Fill `required_fields` with every data field the template really needs.
4. Keep `never_say` specific to the template.
5. Set `weeklyBudget`, `cooldownHours`, and optional `maxPerDay`.
6. Keep prompts non-medical and observational.

## Safety

- `GLOBAL_BLACKLIST` is enforced on prompts and generated text.
- Template `never_say` terms are applied in addition to the global blacklist.
- Morning greeting injection is only done for `chat_message` jobs in the morning when the chat budget is still available.

## Build and test

- `pnpm --filter @emopet/shared build`
- `pnpm --filter @emopet/ai-personality build`
- `pnpm --filter @emopet/ai-personality test`
