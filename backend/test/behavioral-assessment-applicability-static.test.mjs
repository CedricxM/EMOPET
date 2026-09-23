import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync(
  new URL('../db/schema/behavioral-assessments.ts', import.meta.url),
  'utf8',
);

const migration = readFileSync(
  new URL('../db/migrations/0014_behavioral_applicability_context.sql', import.meta.url),
  'utf8',
);

test('BEHAV-DATA-01 models five distinct response states including not_observed', () => {
  for (const state of ['answered', 'not_applicable', 'not_observed', 'skipped', 'missing']) {
    assert.ok(schema.includes("'"+state+"'"), 'schema must contain '+state);
    assert.ok(migration.includes("'"+state+"'"), 'migration must contain '+state);
  }
});

test('non-answered behavioural states require NULL rather than numeric zero', () => {
  assert.match(
    migration,
    /response_status = 'answered'[\s\S]*response_value IS NOT NULL[\s\S]*response_value BETWEEN scale_min AND scale_max/,
  );
  assert.match(
    migration,
    /response_status IN \([\s\S]*'not_applicable'[\s\S]*'not_observed'[\s\S]*'skipped'[\s\S]*'missing'[\s\S]*\)[\s\S]*response_value IS NULL/,
  );

  // A legitimate 0 remains possible only through the answered branch because
  // the configured scale still permits values between scale_min (default 0)
  // and scale_max.
  assert.match(schema, /scaleMin: integer\('scale_min'[\s\S]*default\(0\)/);
  assert.doesNotMatch(
    migration,
    /COALESCE\s*\(\s*response_value\s*,\s*0\s*\)/i,
  );
});

test('household applicability context is a historical assessment snapshot', () => {
  for (const field of [
    'householdDogCount',
    'multiDogHousehold',
    'cohabitationContext',
    'contextVersion',
    'contextCapturedAt',
  ]) {
    assert.ok(schema.includes(field), 'schema must contain '+field);
  }

  assert.match(migration, /household_dog_count >= 1/);
  assert.match(migration, /multi_dog_household = \(household_dog_count > 1\)/);
  assert.match(migration, /context_version IS NOT NULL/);
  assert.match(migration, /context_captured_at IS NOT NULL/);
});

test('BEHAV-DATA-01 does not add protected C-BARQ wording or activate ELI', () => {
  assert.doesNotMatch(migration, /question_text|item_wording|cbarq_item_text/i);
  assert.doesNotMatch(migration, /UPDATE\s+eli_behavioral_priors[\s\S]*status\s*=\s*'active'/i);
});
