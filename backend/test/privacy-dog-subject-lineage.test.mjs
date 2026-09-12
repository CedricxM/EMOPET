import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const schemaDir = new URL('../db/schema/', import.meta.url);

function latestMatchBefore(source, pattern, endIndex, label) {
  const prefix = source.slice(0, endIndex);
  const matches = [...prefix.matchAll(pattern)];
  assert.ok(matches.length > 0, `unable to resolve ${label} before dog identifier`);
  return matches.at(-1)[1];
}

function sortEntries(entries) {
  return [...entries].sort((a, b) =>
    `${a.table}.${a.column}.${a.source}`.localeCompare(`${b.table}.${b.column}.${b.source}`),
  );
}

async function scanDogLineage() {
  const fileNames = (await readdir(schemaDir)).filter((name) => name.endsWith('.ts')).sort();
  const canonicalForeignKeys = [];
  const allDogIdentifiers = [];

  for (const fileName of fileNames) {
    const source = await readFile(new URL(fileName, schemaDir), 'utf8');
    const sourcePath = `backend/db/schema/${fileName}`;

    for (const match of source.matchAll(/\b\w+:\s*\w+\('(dog_id|dog_a_id|dog_b_id)'/g)) {
      const table = latestMatchBefore(source, /pgTable\('([^']+)'/g, match.index, 'table');
      allDogIdentifiers.push({ table, column: match[1], source: sourcePath });
    }

    for (const match of source.matchAll(/\.references\(\(\)\s*=>\s*dogs\.id(?:\s*,\s*\{[^}]*\})?\)/g)) {
      const table = latestMatchBefore(source, /pgTable\('([^']+)'/g, match.index, 'table');
      const column = latestMatchBefore(
        source,
        /\b\w+:\s*\w+\('(dog_id|dog_a_id|dog_b_id)'/g,
        match.index,
        'dog column',
      );
      canonicalForeignKeys.push({ table, column, source: sourcePath });
    }
  }

  const canonicalKeys = new Set(
    canonicalForeignKeys.map((entry) => `${entry.table}.${entry.column}.${entry.source}`),
  );
  const unconstrainedDogIdentifiers = allDogIdentifiers.filter(
    (entry) => !canonicalKeys.has(`${entry.table}.${entry.column}.${entry.source}`),
  );

  return {
    canonicalForeignKeys: sortEntries(canonicalForeignKeys),
    unconstrainedDogIdentifiers: sortEntries(unconstrainedDogIdentifiers),
  };
}

test('machine-readable dog subject lineage classifies every dog-like schema identifier', async () => {
  const registry = JSON.parse(await readFile(
    new URL('../../config/privacy/dog-subject-lineage.json', import.meta.url),
    'utf8',
  ));

  assert.equal(
    registry.status,
    'TECHNICAL_DOG_LINEAGE_WITH_UNCONSTRAINED_IDENTIFIERS_NOT_ERASURE_OR_DISCLOSURE_POLICY',
  );
  assert.equal(registry.subject.table, 'dogs');
  assert.equal(registry.subject.column, 'id');
  assert.equal(registry.subject.canonicalType, 'uuid');
  assert.match(registry.lifecyclePolicyStatus, /TO_CONFIRM/);
  assert.match(registry.unconstrainedIdentifierStatus, /REQUIRED_BEFORE_ERASURE/);

  const declared = await scanDogLineage();

  assert.deepEqual(
    sortEntries(registry.canonicalForeignKeys),
    declared.canonicalForeignKeys,
    'every direct dogs.id FK must be registered and no stale canonical dog link may remain',
  );
  assert.deepEqual(
    sortEntries(registry.unconstrainedDogIdentifiers),
    declared.unconstrainedDogIdentifiers,
    'every dog-like schema identifier without a dogs.id FK must be explicitly classified as unconstrained',
  );

  for (const required of [
    'sensor_summaries.dog_id',
    'eli_states.dog_id',
    'professional_share_grants.dog_id',
    'behavioral_assessments.dog_id',
  ]) {
    assert.ok(
      registry.canonicalForeignKeys.some((entry) => `${entry.table}.${entry.column}` === required),
      `canonical dog lineage must include ${required}`,
    );
  }

  for (const required of [
    'copresence_events.dog_a_id',
    'copresence_events.dog_b_id',
    'professional_share_access_audits.dog_id',
    'dog_sub_baselines.dog_id',
    'user_config.dog_id',
  ]) {
    assert.ok(
      registry.unconstrainedDogIdentifiers.some((entry) => `${entry.table}.${entry.column}` === required),
      `unconstrained dog lineage must include ${required}`,
    );
  }
});
