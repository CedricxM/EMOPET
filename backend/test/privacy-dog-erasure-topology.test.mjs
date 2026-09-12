import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const schemaDir = new URL('../db/schema/', import.meta.url);

function latestMatchBefore(source, pattern, endIndex, label) {
  const prefix = source.slice(0, endIndex);
  const matches = [...prefix.matchAll(pattern)];
  assert.ok(matches.length > 0, `unable to resolve ${label} before dogs.id reference`);
  return matches.at(-1)[1];
}

function sortEntries(entries) {
  return [...entries].sort((a, b) =>
    `${a.table}.${a.column}.${a.source}`.localeCompare(`${b.table}.${b.column}.${b.source}`),
  );
}

function normalizeDeleteAction(options = '') {
  const match = options.match(/onDelete:\s*['"]([^'"]+)['"]/);
  if (!match) return 'NO_ACTION_DEFAULT';
  return `EXPLICIT_${match[1].toUpperCase().replaceAll(' ', '_')}`;
}

async function declaredDirectDogDeleteActions() {
  const fileNames = (await readdir(schemaDir)).filter((name) => name.endsWith('.ts')).sort();
  const references = [];

  for (const fileName of fileNames) {
    const source = await readFile(new URL(fileName, schemaDir), 'utf8');
    for (const match of source.matchAll(
      /\.references\(\(\)\s*=>\s*dogs\.id(?:\s*,\s*\{([^}]*)\})?\)/g,
    )) {
      const table = latestMatchBefore(source, /pgTable\('([^']+)'/g, match.index, 'table');
      const column = latestMatchBefore(source, /\b\w+:\s*uuid\('([^']+)'\)/g, match.index, 'column');
      references.push({
        table,
        column,
        source: `backend/db/schema/${fileName}`,
        databaseDeleteAction: normalizeDeleteAction(match[1]),
      });
    }
  }

  return sortEntries(references);
}

test('dog erasure topology mirrors canonical and unconstrained dog lineage without claiming policy', async () => {
  const [lineage, topology, transitive] = await Promise.all([
    readFile(new URL('../../config/privacy/dog-subject-lineage.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/dog-erasure-topology.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/subject-transitive-lineage.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);

  assert.equal(topology.status, 'TECHNICAL_DATABASE_ERASURE_TOPOLOGY_NOT_ERASURE_POLICY');
  assert.equal(topology.claimsCompleteDogErasure, false);
  assert.match(topology.promotionGate, /^BLOCK_COMPLETE_DOG_ERASURE_CLAIM_/);
  assert.equal(topology.subject.table, 'dogs');
  assert.equal(topology.subject.column, 'id');
  assert.equal(topology.transitiveLineageAuthority, 'config/privacy/subject-transitive-lineage.json');

  const declared = await declaredDirectDogDeleteActions();
  const registered = sortEntries(topology.canonicalForeignKeys).map(({ table, column, source, databaseDeleteAction }) => ({
    table,
    column,
    source,
    databaseDeleteAction,
  }));
  assert.deepEqual(
    registered,
    declared,
    'every canonical dogs.id FK must expose its actual database ON DELETE behavior and no stale relation may remain',
  );

  assert.deepEqual(
    sortEntries(topology.canonicalForeignKeys).map(({ table, column, source }) => ({ table, column, source })),
    sortEntries(lineage.canonicalForeignKeys),
    'dog erasure topology must cover the canonical dog subject lineage exactly',
  );

  const unconstrainedTopology = sortEntries(topology.unconstrainedDogIdentifiers ?? []);
  const unconstrainedLineage = sortEntries(lineage.unconstrainedDogIdentifiers ?? []);
  assert.deepEqual(
    unconstrainedTopology.map(({ table, column, source }) => ({ table, column, source })),
    unconstrainedLineage,
    'every unconstrained dog identifier must remain visible in the erasure topology',
  );
  for (const entry of unconstrainedTopology) {
    assert.equal(entry.databaseDeleteAction, 'NO_FK_LIFECYCLE_NOT_ENFORCED');
    assert.ok(entry.erasureDisposition, `${entry.table}.${entry.column} must expose a lifecycle disposition state`);
  }

  assert.ok(
    topology.canonicalForeignKeys.some((entry) => entry.databaseDeleteAction === 'NO_ACTION_DEFAULT'),
    'dog topology must preserve blocking/default database behavior instead of implying automatic cascade',
  );
  for (const entry of topology.canonicalForeignKeys) {
    assert.ok(entry.erasureDisposition, `${entry.table}.${entry.column} must expose an explicit unresolved disposition`);
  }

  assert.ok(
    transitive.directChildrenOfFirstOrder.length > 0,
    'dog erasure completeness must remain aware of registered transitive descendants',
  );

  const serialized = JSON.stringify(topology);
  for (const requiredGap of ['backups', 'providers', 'object media']) {
    assert.ok(serialized.toLowerCase().includes(requiredGap), `dog erasure topology must preserve non-SQL gap: ${requiredGap}`);
  }
});
