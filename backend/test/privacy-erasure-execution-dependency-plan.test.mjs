import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function key(entry) {
  return `${entry.table}.${entry.column}.${entry.source}`;
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => key(a).localeCompare(key(b)));
}

test('technical erasure execution plan stays aligned with locked topology and does not become policy', async () => {
  const [accountTopology, dogTopology, transitiveLineage, dispositionMatrix, plan] = await Promise.all([
    readFile(new URL('../../config/privacy/account-erasure-topology.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/dog-erasure-topology.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/subject-transitive-lineage.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/erasure-disposition-matrix.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/erasure-execution-dependency-plan.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);

  assert.equal(plan.status, 'TECHNICAL_DELETE_DEPENDENCY_PLAN_NOT_ERASURE_AUTHORITY');
  assert.equal(plan.claimsExecutableErasure, false);
  assert.equal(plan.activationPrecondition, 'ONLY_APPLIES_WHERE_APPROVED_DISPOSITION_IS_DELETE');

  const accountExpected = sortEntries(accountTopology.directUserReferences)
    .map(({ table, column, source, databaseDeleteAction }) => ({ table, column, source, databaseDeleteAction }));
  const accountRegistered = sortEntries(plan.accountRoot.blockingForeignKeys)
    .map(({ table, column, source, databaseDeleteAction }) => ({ table, column, source, databaseDeleteAction }));
  assert.deepEqual(accountRegistered, accountExpected);

  const dogExpected = sortEntries(dogTopology.canonicalForeignKeys)
    .map(({ table, column, source, databaseDeleteAction }) => ({ table, column, source, databaseDeleteAction }));
  const dogRegistered = sortEntries(plan.dogRoot.blockingForeignKeys)
    .map(({ table, column, source, databaseDeleteAction }) => ({ table, column, source, databaseDeleteAction }));
  assert.deepEqual(dogRegistered, dogExpected);

  const accountUnconstrainedExpected = sortEntries(accountTopology.unconstrainedUserIdentifiers)
    .map(({ table, column, source }) => ({ table, column, source }));
  const accountUnconstrainedRegistered = sortEntries(plan.accountRoot.unconstrainedIdentifiers)
    .map(({ table, column, source }) => ({ table, column, source }));
  assert.deepEqual(accountUnconstrainedRegistered, accountUnconstrainedExpected);

  const dogUnconstrainedExpected = sortEntries(dogTopology.unconstrainedDogIdentifiers)
    .map(({ table, column, source }) => ({ table, column, source }));
  const dogUnconstrainedRegistered = sortEntries(plan.dogRoot.unconstrainedIdentifiers)
    .map(({ table, column, source }) => ({ table, column, source }));
  assert.deepEqual(dogUnconstrainedRegistered, dogUnconstrainedExpected);

  const transitiveExpected = [...transitiveLineage.directChildrenOfFirstOrder]
    .map((entry) => ({
      parentTable: entry.parentTable,
      childTable: entry.childTable,
      column: entry.column,
      source: entry.source,
    }))
    .sort((a, b) => `${a.parentTable}.${a.childTable}.${a.column}`.localeCompare(`${b.parentTable}.${b.childTable}.${b.column}`));
  const transitiveRegistered = [...plan.dogRoot.transitiveParentCascades]
    .map(({ parentTable, childTable, column, source }) => ({ parentTable, childTable, column, source }))
    .sort((a, b) => `${a.parentTable}.${a.childTable}.${a.column}`.localeCompare(`${b.parentTable}.${b.childTable}.${b.column}`));
  assert.deepEqual(transitiveRegistered, transitiveExpected);

  for (const entry of plan.accountRoot.blockingForeignKeys) {
    assert.equal(entry.databaseDeleteAction, 'NO_ACTION_DEFAULT');
    if (`${entry.table}.${entry.column}` === 'dogs.owner_id') {
      assert.equal(
        entry.executionRequirement,
        'RESOLVE_NESTED_DOG_ROOT_BEFORE_USERS_DELETE',
        'dogs.owner_id must preserve the nested dog-subject dependency before the user root is deleted',
      );
    } else {
      assert.match(entry.executionRequirement, /BEFORE_ROOT_DELETE/);
    }
  }
  for (const entry of plan.dogRoot.blockingForeignKeys) {
    assert.equal(entry.databaseDeleteAction, 'NO_ACTION_DEFAULT');
    assert.match(entry.executionRequirement, /BEFORE_ROOT_DELETE/);
  }
  for (const entry of plan.dogRoot.transitiveParentCascades) {
    assert.equal(entry.databaseDeleteAction, 'EXPLICIT_CASCADE_FROM_PARENT');
    assert.match(entry.executionRequirement, /PARENT_DELETE_IS_APPROVED_AND_EXECUTED/);
  }

  assert.deepEqual(plan.accountRoot.nestedSubjectRoots, [
    {
      viaTable: 'dogs',
      viaColumn: 'owner_id',
      nestedRoot: 'dogs.id',
      requirement: 'RESOLVE_DOG_DISPOSITION_AND_REQUIRED_DESCENDANTS_BEFORE_USERS_DELETE',
    },
  ]);

  const dispositionNonSql = dispositionMatrix.nonSqlCopies.map((entry) => entry.surface).sort();
  const planNonSql = plan.nonSqlCompletionGates.map((entry) => entry.surface).sort();
  assert.deepEqual(planNonSql, dispositionNonSql);
  assert.equal(new Set(planNonSql).size, planNonSql.length);

  for (const entry of plan.accountRoot.unconstrainedIdentifiers) {
    assert.match(entry.executionRequirement, /COMPLETE_ERASURE_CLAIM/);
  }
  for (const entry of plan.dogRoot.unconstrainedIdentifiers) {
    assert.match(entry.executionRequirement, /COMPLETE_ERASURE_CLAIM/);
  }

  assert.match(plan.accountRoot.rootDeletePhase, /^AFTER_/);
  assert.match(plan.dogRoot.rootDeletePhase, /^AFTER_/);

  const serialized = JSON.stringify(plan);
  assert.ok(serialized.includes('does not choose DELETE'));
  assert.ok(serialized.includes('NO ACTION foreign keys identify root-delete blockers'));
  assert.ok(serialized.includes('Non-SQL copies are completion gates'));
});
