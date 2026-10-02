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

const professionalShareGrantRelations = (dog.unconstrainedGrantIdentifiers ?? []).map((row) => ({
  subjectRoot: row.references,
  relationType: 'UNCONSTRAINED_IDENTIFIER',
  table: row.table,
  column: row.column,
  databaseDeleteAction: row.databaseDeleteAction,
}));

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

test('account erasure preflight reflects approved detaches, auth lifecycle and World social relations', () => {
  const result = buildErasureReadinessReport(matrix, 'users.id', accountRelations);

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'PREFLIGHT_ONLY');
  assert.equal(result.destructiveActionAuthorized, false);
  assert.equal(result.status, 'BLOCKED');

  assert.equal(result.relational.total, 28);
  assert.equal(result.relational.unresolvedDisposition, 23);
  assert.equal(result.relational.notImplemented, 23);
  assert.deepEqual(result.relational.databaseMechanics, {
    NO_ACTION: 22,
    RESTRICT: 0,
    CASCADE: 1,
    SET_NULL: 6,
    SET_DEFAULT: 0,
    NO_FK_LIFECYCLE_NOT_ENFORCED: 0,
  });
  assert.equal(result.relational.rootDeleteBlockers.length, 21);
  assert.deepEqual(result.relational.automaticCascadeRelations, [
    {
      table: 'auth_email_verification_tokens',
      column: 'user_id',
      relationType: 'DIRECT_FK',
    },
  ]);

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

test('dog erasure preflight reflects detachable device binding plus remaining blockers', () => {
  const result = buildErasureReadinessReport(matrix, 'dogs.id', dogRelations);

  assert.equal(result.ok, true);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.destructiveActionAuthorized, false);

  assert.equal(result.relational.total, 28);
  assert.equal(result.relational.unresolvedDisposition, 28);
  assert.equal(result.relational.notImplemented, 28);
  assert.deepEqual(result.relational.databaseMechanics, {
    NO_ACTION: 21,
    RESTRICT: 0,
    CASCADE: 4,
    SET_NULL: 1,
    SET_DEFAULT: 0,
    NO_FK_LIFECYCLE_NOT_ENFORCED: 1,
  });

  assert.equal(result.relational.rootDeleteBlockers.length, 20);
  assert.deepEqual(
    result.relational.automaticCascadeRelations
      .map((row) => `${row.table}.${row.column}`)
      .sort(),
    [
      'administration_sessions.assessment_id',
      'behavioral_factor_scores.assessment_id',
      'behavioral_responses.assessment_id',
      'instrument_administration_events.assessment_id',
    ],
  );

  assert.equal(
    result.relational.rootDeleteBlockers.some((row) => row.relationType !== 'DIRECT_FK'),
    false,
  );
});

test('professional-share grant-root preflight remains blocked without inventing FK lifecycle authority', () => {
  const result = buildErasureReadinessReport(
    matrix,
    'professional_share_grants.id',
    professionalShareGrantRelations,
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.destructiveActionAuthorized, false);
  assert.equal(result.relational.total, 1);
  assert.equal(result.relational.unresolvedDisposition, 1);
  assert.equal(result.relational.notImplemented, 1);
  assert.equal(result.relational.databaseMechanics.NO_FK_LIFECYCLE_NOT_ENFORCED, 1);
  assert.deepEqual(result.relational.rootDeleteBlockers, []);
  assert.ok(result.reasons.includes('POLICY_DISPOSITIONS_UNRESOLVED'));
  assert.ok(result.reasons.includes('RELATIONAL_EXECUTION_NOT_IMPLEMENTED'));
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
  assert.equal(result.relational.databaseMechanics.NO_ACTION, 21);
});
