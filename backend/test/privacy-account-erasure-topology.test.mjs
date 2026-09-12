import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const schemaDir = new URL('../db/schema/', import.meta.url);

function latestMatchBefore(source, pattern, endIndex, label) {
  const prefix = source.slice(0, endIndex);
  const matches = [...prefix.matchAll(pattern)];
  assert.ok(matches.length > 0, `unable to resolve ${label} before users.id reference`);
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

async function declaredDirectUserDeleteActions() {
  const fileNames = (await readdir(schemaDir)).filter((name) => name.endsWith('.ts')).sort();
  const references = [];

  for (const fileName of fileNames) {
    const source = await readFile(new URL(fileName, schemaDir), 'utf8');
    for (const match of source.matchAll(
      /\.references\(\(\)\s*=>\s*users\.id(?:\s*,\s*\{([^}]*)\})?\)/g,
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

test('account erasure topology mirrors direct database delete mechanics without claiming policy', async () => {
  const [lineage, topology] = await Promise.all([
    readFile(new URL('../../config/privacy/user-subject-lineage.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/account-erasure-topology.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);

  assert.equal(topology.status, 'TECHNICAL_DATABASE_ERASURE_TOPOLOGY_NOT_ERASURE_POLICY');
  assert.equal(topology.claimsCompleteAccountErasure, false);
  assert.match(topology.promotionGate, /^BLOCK_COMPLETE_ACCOUNT_ERASURE_CLAIM_/);
  assert.equal(topology.subject.table, 'users');
  assert.equal(topology.subject.column, 'id');

  const declared = await declaredDirectUserDeleteActions();
  const registered = sortEntries(topology.directUserReferences).map(({ table, column, source, databaseDeleteAction }) => ({
    table,
    column,
    source,
    databaseDeleteAction,
  }));
  assert.deepEqual(
    registered,
    declared,
    'every direct users.id FK must expose its actual database ON DELETE behavior and no stale relation may remain',
  );

  assert.deepEqual(
    sortEntries(topology.directUserReferences).map(({ table, column, source }) => ({ table, column, source })),
    sortEntries(lineage.directReferences),
    'erasure topology must cover the same direct user lineage as the canonical subject registry',
  );

  const unconstrainedTopology = sortEntries(topology.unconstrainedUserIdentifiers ?? []);
  const unconstrainedLineage = sortEntries(lineage.unconstrainedUserIdentifiers ?? []);
  assert.deepEqual(
    unconstrainedTopology.map(({ table, column, source }) => ({ table, column, source })),
    unconstrainedLineage,
    'every unconstrained user identifier must remain visible in the erasure topology',
  );
  for (const entry of unconstrainedTopology) {
    assert.equal(entry.databaseDeleteAction, 'NO_FK_LIFECYCLE_NOT_ENFORCED');
    assert.equal(entry.erasureDisposition, 'TO_CONFIRM');
  }

  assert.ok(
    topology.directUserReferences.some((entry) => entry.databaseDeleteAction === 'NO_ACTION_DEFAULT'),
    'the topology must preserve blocking/default database behavior instead of implying automatic cascade',
  );
  for (const entry of topology.directUserReferences) {
    assert.ok(entry.erasureDisposition, `${entry.table}.${entry.column} must expose an explicit unresolved disposition`);
  }

  const serialized = JSON.stringify(topology);
  for (const requiredGap of ['backups', 'provider-held copies', 'Object/media storage']) {
    assert.ok(serialized.includes(requiredGap), `erasure topology must preserve non-SQL gap: ${requiredGap}`);
  }
});
