import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd(), '..');
const schemaPath = join(root, 'backend/db/schema/behavioral-assessments.ts');
const migrationPath = join(root, 'backend/db/migrations/0014_behavioral_response_applicability.sql');

function read(path) {
  return readFileSync(path, 'utf8');
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, acc);
    else if (/\.(?:ts|tsx|js|mjs|sql)$/.test(name)) acc.push(path);
  }
  return acc;
}

test('behavioral response contract distinguishes not_observed from every other non-answer state', () => {
  const schema = read(schemaPath);
  const migration = read(migrationPath);

  for (const status of ['answered', 'not_applicable', 'not_observed', 'skipped', 'missing']) {
    assert.equal(schema.includes("'" + status + "'"), true, 'schema must include ' + status);
    assert.equal(migration.includes("'" + status + "'"), true, 'migration must include ' + status);
  }

  assert.match(
    schema,
    /responseStatus} IN \('not_applicable','not_observed','skipped','missing'\) AND .*responseValue} IS NULL/s,
  );
  assert.match(
    migration,
    /response_status IN \('not_applicable','not_observed','skipped','missing'\)[\s\S]*response_value IS NULL/,
  );
});

test('assessment carries a versioned historical household/cohabitation snapshot', () => {
  const schema = read(schemaPath);
  const migration = read(migrationPath);

  for (const needle of [
    "householdDogCount: integer('household_dog_count')",
    "householdContextVersion: varchar('household_context_version'",
    "householdContextCapturedAt: timestamp('household_context_captured_at'",
    "cohabitationContext: jsonb('cohabitation_context')",
  ]) {
    assert.equal(schema.includes(needle), true, 'missing schema field: ' + needle);
  }

  for (const needle of [
    'household_dog_count INTEGER',
    'household_context_version VARCHAR(100)',
    'household_context_captured_at TIMESTAMPTZ',
    'cohabitation_context JSONB',
  ]) {
    assert.equal(migration.includes(needle), true, 'missing migration field: ' + needle);
  }

  assert.match(schema, /householdDogCount} IS NULL OR .*householdDogCount} >= 1/s);
  assert.match(schema, /jsonb_typeof\(.*cohabitationContext.*\) = 'object'/s);
});

test('current source does not coerce behavioral response missingness to zero', () => {
  const roots = [
    join(root, 'backend/api'),
    join(root, 'backend/db/schema'),
    join(root, 'packages'),
  ];

  const violations = [];
  const coercePatterns = [
    /responseValue\s*\?\?\s*0/g,
    /responseValue\s*\|\|\s*0/g,
    /COALESCE\s*\(\s*response_value\s*,\s*0\s*\)/gi,
  ];

  for (const dir of roots) {
    for (const path of walk(dir)) {
      const source = read(path);
      for (const pattern of coercePatterns) {
        if (pattern.test(source)) violations.push(path.replace(root + '/', ''));
        pattern.lastIndex = 0;
      }
    }
  }

  assert.deepEqual(
    [...new Set(violations)].sort(),
    [],
    'behavioral response missing/non-applicable states must never be silently coerced to score zero',
  );
});
