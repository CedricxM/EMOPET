import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function relationBlockers(matrix) {
  const allowed = new Set(matrix.allowedFinalDispositions);
  const blockers = [];

  for (const entry of [...matrix.databaseRelations, ...matrix.transitiveRelations]) {
    const key = `${entry.subjectRoot}:${entry.table}.${entry.column}`;

    if (entry.approvedDisposition === 'TO_CONFIRM') {
      blockers.push(`${key}:DISPOSITION_TO_CONFIRM`);
      continue;
    }

    assert.ok(
      allowed.has(entry.approvedDisposition),
      `${key} has unsupported approved disposition ${entry.approvedDisposition}`,
    );
    assert.doesNotMatch(
      entry.approvalAuthority ?? '',
      /^TO_CONFIRM/,
      `${key} cannot be promoted with unresolved approval authority`,
    );
    assert.equal(
      entry.executionStatus,
      'IMPLEMENTED_AND_TESTED',
      `${key} cannot be promoted before implementation is tested`,
    );
    assert.ok(
      Array.isArray(entry.evidenceRefs) && entry.evidenceRefs.length > 0,
      `${key} cannot be promoted without machine-readable evidenceRefs`,
    );
  }

  return blockers;
}

function nonSqlBlockers(matrix) {
  const blockers = [];

  for (const entry of matrix.nonSqlCopies) {
    if (entry.status === 'TO_CONFIRM') {
      blockers.push(`${entry.surface}:STATUS_TO_CONFIRM`);
      continue;
    }

    assert.doesNotMatch(
      entry.approvalAuthority ?? '',
      /^TO_CONFIRM/,
      `${entry.surface} cannot be promoted with unresolved approval authority`,
    );
    assert.notEqual(
      entry.executionEvidence,
      'NOT_IMPLEMENTED',
      `${entry.surface} cannot be promoted without execution/expiry evidence`,
    );
    assert.ok(
      Array.isArray(entry.evidenceRefs) && entry.evidenceRefs.length > 0,
      `${entry.surface} cannot be promoted without machine-readable evidenceRefs`,
    );
  }

  return blockers;
}

test('erasure readiness cannot be promoted by changing a label without authority, execution and evidence', async () => {
  const matrix = JSON.parse(await readFile(
    new URL('../../config/privacy/erasure-disposition-matrix.json', import.meta.url),
    'utf8',
  ));

  const blockers = [
    ...relationBlockers(matrix),
    ...nonSqlBlockers(matrix),
  ];

  assert.equal(
    blockers.length,
    matrix.databaseRelations.length + matrix.transitiveRelations.length + matrix.nonSqlCopies.length,
    'the current candidate must remain blocked on every unresolved SQL/transitive/non-SQL disposition surface',
  );
  assert.ok(blockers.length > 0, 'current erasure readiness must have explicit blockers');
  assert.equal(matrix.claimsExecutableErasure, false);

  if (matrix.claimsExecutableErasure) {
    assert.deepEqual(
      blockers,
      [],
      'claimsExecutableErasure may become true only after every disposition surface has authority, tested execution and evidence',
    );
  }
});
