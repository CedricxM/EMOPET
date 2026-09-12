import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function relationKey(entry) {
  return `${entry.subjectRoot}:${entry.relationType}:${entry.table}.${entry.column}:${entry.source}`;
}

function transitiveKey(entry) {
  return `${entry.subjectRoot}:${entry.relationType}:${entry.parentTable}->${entry.table}.${entry.column}:${entry.source}`;
}

function sortByKey(entries, keyFn = relationKey) {
  return [...entries].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}

function topologyDatabaseRelations(accountTopology, dogTopology) {
  return sortByKey([
    ...accountTopology.directUserReferences.map((entry) => ({
      subjectRoot: 'users.id',
      relationType: 'DIRECT_FK',
      ...entry,
    })),
    ...accountTopology.unconstrainedUserIdentifiers.map((entry) => ({
      subjectRoot: 'users.id',
      relationType: 'UNCONSTRAINED_IDENTIFIER',
      ...entry,
    })),
    ...dogTopology.canonicalForeignKeys.map((entry) => ({
      subjectRoot: 'dogs.id',
      relationType: 'DIRECT_FK',
      ...entry,
    })),
    ...dogTopology.unconstrainedDogIdentifiers.map((entry) => ({
      subjectRoot: 'dogs.id',
      relationType: 'UNCONSTRAINED_IDENTIFIER',
      ...entry,
    })),
  ]);
}

test('erasure disposition matrix covers every locked subject relation without inventing approval', async () => {
  const [accountTopology, dogTopology, transitiveLineage, matrix] = await Promise.all([
    readFile(new URL('../../config/privacy/account-erasure-topology.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/dog-erasure-topology.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/subject-transitive-lineage.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/erasure-disposition-matrix.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);

  assert.equal(matrix.status, 'DISPOSITION_AUTHORITY_OPEN_NOT_EXECUTABLE_ERASURE_POLICY');
  assert.equal(matrix.claimsExecutableErasure, false);
  assert.equal(matrix.unresolvedDisposition, 'TO_CONFIRM');
  assert.match(matrix.promotionGate, /^BLOCK_EXECUTABLE_ERASURE_CLAIM_/);

  assert.deepEqual(
    [...matrix.allowedFinalDispositions].sort(),
    ['ANONYMIZE', 'DELETE', 'DETACH', 'RETAIN_WITH_JUSTIFICATION'].sort(),
    'future approved disposition vocabulary must remain closed and explicit',
  );

  const expectedDatabase = topologyDatabaseRelations(accountTopology, dogTopology)
    .map(({ subjectRoot, relationType, table, column, source, databaseDeleteAction }) => ({
      subjectRoot,
      relationType,
      table,
      column,
      source,
      databaseDeleteAction,
    }));
  const registeredDatabase = sortByKey(matrix.databaseRelations)
    .map(({ subjectRoot, relationType, table, column, source, databaseDeleteAction }) => ({
      subjectRoot,
      relationType,
      table,
      column,
      source,
      databaseDeleteAction,
    }));

  assert.deepEqual(
    registeredDatabase,
    expectedDatabase,
    'every locked account/dog topology relation must have exactly one disposition-control row and no stale row may remain',
  );
  assert.equal(
    new Set(matrix.databaseRelations.map(relationKey)).size,
    matrix.databaseRelations.length,
    'database disposition rows must be unique',
  );

  const expectedTransitive = sortByKey(
    transitiveLineage.directChildrenOfFirstOrder.map((entry) => ({
      subjectRoot: 'dogs.id',
      relationType: 'TRANSITIVE_FK',
      parentTable: entry.parentTable,
      table: entry.childTable,
      column: entry.column,
      source: entry.source,
    })),
    transitiveKey,
  );
  const registeredTransitive = sortByKey(matrix.transitiveRelations, transitiveKey)
    .map(({ subjectRoot, relationType, parentTable, table, column, source }) => ({
      subjectRoot,
      relationType,
      parentTable,
      table,
      column,
      source,
    }));

  assert.deepEqual(
    registeredTransitive,
    expectedTransitive,
    'every registered one-hop transitive subject descendant must have a disposition-control row',
  );
  assert.equal(
    new Set(matrix.transitiveRelations.map(transitiveKey)).size,
    matrix.transitiveRelations.length,
    'transitive disposition rows must be unique',
  );

  for (const entry of [...matrix.databaseRelations, ...matrix.transitiveRelations]) {
    assert.equal(
      entry.approvedDisposition,
      'TO_CONFIRM',
      `${entry.table}.${entry.column} must not acquire an unapproved erasure disposition`,
    );
    assert.match(entry.executionStatus, /^NOT_IMPLEMENTED/);
    assert.match(entry.approvalAuthority, /^TO_CONFIRM/);
  }

  for (const entry of matrix.transitiveRelations) {
    assert.equal(
      entry.databaseDeleteAction,
      'EXPLICIT_CASCADE_FROM_PARENT',
      `${entry.parentTable}->${entry.table} should preserve the current explicit parent cascade mechanic`,
    );
  }

  const expectedNonSql = [
    'ANALYTICS_TELEMETRY',
    'BACKUPS',
    'CACHES_SEARCH_INDEXES',
    'OBJECT_MEDIA_STORAGE',
    'PROVIDER_HELD_COPIES',
  ];
  const registeredNonSql = matrix.nonSqlCopies.map((entry) => entry.surface).sort();
  assert.deepEqual(registeredNonSql, expectedNonSql.sort());
  assert.equal(new Set(registeredNonSql).size, registeredNonSql.length, 'non-SQL erasure surfaces must be unique');

  for (const entry of matrix.nonSqlCopies) {
    assert.equal(entry.status, 'TO_CONFIRM');
    assert.equal(entry.executionEvidence, 'NOT_IMPLEMENTED');
    assert.equal(entry.approvalAuthority, 'TO_CONFIRM');
  }

  assert.ok(matrix.databaseRelations.length > 0);
  assert.ok(matrix.transitiveRelations.length > 0);
  assert.ok(matrix.nonSqlCopies.length > 0);

  const serialized = JSON.stringify(matrix);
  assert.ok(serialized.includes('A database cascade is an execution mechanic, not authorization'));
  assert.ok(serialized.includes('No complete erasure claim is allowed'));
});
