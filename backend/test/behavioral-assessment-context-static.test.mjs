import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function source(relativePath) {
  return readFile(new URL('../../' + relativePath, import.meta.url), 'utf8');
}

test('BEHAV-DATA-01 schema, migration and semantic contract stay aligned', async () => {
  const [schema, migration, contract] = await Promise.all([
    source('backend/db/schema/behavioral-assessments.ts'),
    source('backend/db/migrations/0014_behavioral_applicability_context.sql'),
    source('docs/science/BEHAVIORAL_ASSESSMENT_RESPONSE_STATE_CONTRACT_2026-09-23.md'),
  ]);

  for (const state of ['answered', 'not_applicable', 'not_observed', 'skipped', 'missing']) {
    assert.equal(schema.includes("'" + state + "'"), true, 'schema missing ' + state);
    assert.equal(migration.includes("'" + state + "'"), true, 'migration missing ' + state);
    assert.equal(contract.includes(state), true, 'contract missing ' + state);
  }

  for (const field of [
    'household_dog_count',
    'household_context_version',
    'household_context_captured_at',
    'household_context',
  ]) {
    assert.equal(migration.includes(field), true, 'migration missing ' + field);
  }

  assert.match(migration, /household_dog_count IS NULL OR household_dog_count >= 1/);
  assert.match(
    migration,
    /response_status IN \([\s\S]*'not_applicable'[\s\S]*'not_observed'[\s\S]*'skipped'[\s\S]*'missing'[\s\S]*\)[\s\S]*response_value IS NULL/,
  );

  assert.ok(contract.includes('answered(0) != not_applicable != not_observed != skipped != missing'));
  assert.ok(contract.includes('must not be recomputed later from mutable present-day household/profile state'));
  assert.ok(contract.includes('does not grant a C-BARQ licence'));
});
