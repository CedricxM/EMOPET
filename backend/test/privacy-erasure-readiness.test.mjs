import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildErasureReadinessReport } from '../dist/api/services/erasure-readiness.js';

const readJson = async (relative) => JSON.parse(
  await readFile(new URL(relative, import.meta.url), 'utf8'),
);

const matrix = await readJson('../../config/privacy/erasure-disposition-matrix.json');
const account = await readJson('../../config/privacy/account-erasure-topology.json');
const dog = await readJson('../../config/privacy/dog-erasure-topology.json');

const accountRelations = account.directUserReferences.map((row) => ({
  subjectRoot: 'users.id',
  relationType: 'DIRECT_FK',
  table: row.table,
  column: row.column,
  databaseDeleteAction: row.databaseDeleteAction,
}));

const dogRelations = [
  ...dog.canonicalForeignKeys.map((row) => ({
    subjectRoot: 'dogs.id',
    relationType: 'DIRECT_FK',
    table: row.table,
    column: row.column,
    databaseDeleteAction: row.databaseDeleteAction,
  })),
  ...dog.unconstrainedDogIdentifiers.map((row) => ({
    subjectRoot: 'dogs.id',
    relationType: 'UNCONSTRAINED_IDENTIFIER',
    table: row.table,
    column: row.column,
    databaseDeleteAction: row.databaseDeleteAction,
  })),
  ...dog.transitiveDescendants.map((row) => ({
    subjectRoot: 'dogs.id',
    relationType: 'TRANSITIVE_FK',
    table: row.table,
    column: row.column,
    databaseDeleteAction: row.databaseDeleteAction,
  })),
];

test('erasure readiness service remains pure and cannot mutate persistence', async () => {
  const source = await readFile(
    new URL('../api/services/erasure-readiness.ts', import.meta.url),
    'utf8',
  );

  for (const forbidden of [
    "from '../../db",
    "from '../db",
    'drizzle-orm',
    'postgres',
    '.delete(',
    '.update(',
    '.insert(',
    'DELETE FROM',
    'UPDATE ',
    'INSERT INTO',
    'fetch(',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }

  assert.equal(source.includes("mode: 'PREFLIGHT_ONLY'"), true);
  assert.equal(source.includes('destructiveActionAuthorized: false'), true);
});

test('account erasure preflight reflects four approved SET NULL detaches while remaining fail closed', () => {
  const result = buildErasureReadinessReport(matrix, 'users.id', accountRelations);

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'PREFLIGHT_ONLY');
  assert.equal(result.destructiveActionAuthorized, false);
  assert.equal(result.status, 'BLOCKED');

  assert.equal(result.relational.total, 15);
  assert.equal(result.relational.unresolvedDisposition, 11);
  assert.equal(result.relational.notImplemented, 15);
  assert.deepEqual(result.relational.databaseMechanics, {
    NO_ACTION: 11,
    RESTRICT: 0,
    CASCADE: 0,
    SET_NULL: 4,
    SET_DEFAULT: 0,
  });
  assert.equal(result.relational.rootDeleteBlockers.length, 11);
  assert.deepEqual(result.relational.automaticCascadeRelations, []);

  assert.deepEqual(result.nonSql, {
    total: 5,
    unresolvedDisposition: 5,
    notImplemented: 5,
    surfaces: matrix.nonSqlSurfaces,
  });

  for (const reason of [
    'POLICY_DISPOSITIONS_UNRESOLVED',
    'RELATIONAL_EXECUTION_NOT_IMPLEMENTED',
    'NON_SQL_DISPOSITIONS_UNRESOLVED',
    'NON_SQL_EXECUTION_NOT_IMPLEMENTED',
    'ROOT_DELETE_BLOCKED_BY_DATABASE_REFERENCES',
    'MATRIX_DOES_NOT_CLAIM_EXECUTABLE_ERASURE',
    'MATRIX_DOES_NOT_CLAIM_COMPLETE_ERASURE',
  ]) {
    assert.ok(result.reasons.includes(reason), reason);
  }
});

test('dog erasure preflight distinguishes direct NO ACTION blockers from transitive CASCADE mechanics', () => {
  const result = buildErasureReadinessReport(matrix, 'dogs.id', dogRelations);

  assert.equal(result.ok, true);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.destructiveActionAuthorized, false);

  assert.equal(result.relational.total, 22);
  assert.equal(result.relational.unresolvedDisposition, 22);
  assert.equal(result.relational.notImplemented, 22);
  assert.deepEqual(result.relational.databaseMechanics, {
    NO_ACTION: 20,
    RESTRICT: 0,
    CASCADE: 2,
    SET_NULL: 0,
    SET_DEFAULT: 0,
  });

  assert.equal(result.relational.rootDeleteBlockers.length, 18);
  assert.deepEqual(
    result.relational.automaticCascadeRelations
      .map((row) => `${row.table}.${row.column}`)
      .sort(),
    [
      'behavioral_factor_scores.assessment_id',
      'behavioral_responses.assessment_id',
    ],
  );

  assert.equal(
    result.relational.rootDeleteBlockers.some((row) => row.relationType !== 'DIRECT_FK'),
    false,
  );
});

test('preflight fails closed when matrix and generated technical topology drift apart', () => {
  const missing = accountRelations.slice(1);
  const result = buildErasureReadinessReport(matrix, 'users.id', missing);

  assert.deepEqual(result, {
    ok: false,
    mode: 'PREFLIGHT_ONLY',
    destructiveActionAuthorized: false,
    error: 'topology_matrix_mismatch',
  });
});

test('preflight rejects malformed matrix and malformed technical topology', () => {
  const badMatrix = structuredClone(matrix);
  badMatrix.schemaVersion = 'wrong';

  assert.equal(
    buildErasureReadinessReport(badMatrix, 'users.id', accountRelations).error,
    'invalid_matrix',
  );

  const badTopology = structuredClone(accountRelations);
  badTopology[0].databaseDeleteAction = 'MAGIC';

  assert.equal(
    buildErasureReadinessReport(matrix, 'users.id', badTopology).error,
    'invalid_technical_topology',
  );
});

test('resolved and implemented ordered handling can clear NO ACTION as a control-plane blocker without authorising mutation', () => {
  const futureMatrix = structuredClone(matrix);
  futureMatrix.claimsExecutableErasure = true;
  futureMatrix.claimsCompleteErasure = true;

  for (const row of futureMatrix.entries) {
    row.disposition = 'DELETE';
    row.executionStatus = 'IMPLEMENTED';
    row.testEvidence = 'FUTURE_TEST_FIXTURE';
  }
  for (const surface of futureMatrix.nonSqlSurfaces) {
    surface.disposition = 'DELETE';
    surface.executionStatus = 'IMPLEMENTED';
  }

  const result = buildErasureReadinessReport(futureMatrix, 'users.id', accountRelations);

  assert.equal(result.ok, true);
  assert.equal(result.status, 'CONTROL_PLANE_READY');
  assert.equal(result.destructiveActionAuthorized, false);
  assert.deepEqual(result.reasons, []);
  assert.deepEqual(result.relational.rootDeleteBlockers, []);
  assert.equal(result.relational.databaseMechanics.NO_ACTION, 15);
});
