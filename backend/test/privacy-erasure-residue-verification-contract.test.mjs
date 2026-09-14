import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function routeKey(subjectRoot, relationType, parentTable = '') {
  return `${subjectRoot}:${relationType}:${parentTable}`;
}

test('negative residue verification contract covers every disposition class and subject-link route', async () => {
  const [matrix, contract] = await Promise.all([
    readFile(new URL('../../config/privacy/erasure-disposition-matrix.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/erasure-residue-verification-contract.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);

  assert.equal(contract.status, 'TECHNICAL_NEGATIVE_RESIDUE_CONTRACT_NOT_ERASURE_POLICY');
  assert.equal(contract.claimsResidueVerificationImplemented, false);
  assert.equal(
    contract.snapshotTiming,
    'CAPTURE_REQUIRED_IDENTIFIERS_BEFORE_ANY_APPROVED_ERASURE_MUTATION',
  );
  assert.match(contract.completionRule, /^NO_COMPLETE_ERASURE_EVIDENCE_/);

  const snapshotKeys = new Set(contract.snapshotKeys.map((entry) => entry.key));
  assert.deepEqual(
    [...snapshotKeys].sort(),
    ['ACCOUNT_ID', 'ASSESSMENT_IDS_SNAPSHOT', 'DOG_IDS_SNAPSHOT'].sort(),
  );
  assert.equal(snapshotKeys.size, contract.snapshotKeys.length, 'snapshot keys must be unique');

  const rootBySubject = new Map(contract.rootProbes.map((entry) => [entry.subjectRoot, entry]));
  assert.equal(rootBySubject.get('users.id')?.snapshotKey, 'ACCOUNT_ID');
  assert.equal(rootBySubject.get('dogs.id')?.snapshotKey, 'DOG_IDS_SNAPSHOT');
  for (const entry of contract.rootProbes) {
    assert.ok(snapshotKeys.has(entry.snapshotKey), `${entry.subjectRoot} references unknown snapshot key`);
  }

  const routeMap = new Map();
  for (const route of contract.relationProbeRoutes) {
    assert.ok(snapshotKeys.has(route.snapshotKey), `route references unknown snapshot key ${route.snapshotKey}`);
    for (const relationType of route.relationTypes) {
      const key = routeKey(route.subjectRoot, relationType, route.parentTable ?? '');
      assert.equal(routeMap.has(key), false, `duplicate residue probe route ${key}`);
      routeMap.set(key, route);
    }
  }

  for (const entry of matrix.databaseRelations) {
    const key = routeKey(entry.subjectRoot, entry.relationType);
    const route = routeMap.get(key);
    assert.ok(route, `missing residue probe route for ${key}`);
    assert.match(route.predicate, /^COLUMN_/);
  }

  for (const entry of matrix.transitiveRelations) {
    const key = routeKey(entry.subjectRoot, entry.relationType, entry.parentTable);
    const route = routeMap.get(key);
    assert.ok(route, `missing transitive residue probe route for ${key}`);
    assert.equal(route.snapshotKey, 'ASSESSMENT_IDS_SNAPSHOT');
    assert.equal(route.predicate, 'COLUMN_IN_SNAPSHOT_SET');
  }

  const dispositionKeys = Object.keys(contract.verificationByDisposition).sort();
  assert.deepEqual(dispositionKeys, [...matrix.allowedFinalDispositions].sort());

  const deleteRule = contract.verificationByDisposition.DELETE;
  assert.equal(deleteRule.expectedOriginalSubjectLinkMatches, 0);
  assert.equal(deleteRule.rowMayRemain, false);

  for (const disposition of ['DETACH', 'ANONYMIZE']) {
    const rule = contract.verificationByDisposition[disposition];
    assert.equal(rule.expectedOriginalSubjectLinkMatches, 0);
    assert.equal(rule.rowMayRemain, true);
    assert.ok(rule.additionalEvidence.length > 0, `${disposition} requires additional verification evidence`);
  }

  const retainRule = contract.verificationByDisposition.RETAIN_WITH_JUSTIFICATION;
  assert.equal(retainRule.expectedOriginalSubjectLinkMatches, 'MAY_REMAIN');
  assert.equal(retainRule.rowMayRemain, true);
  for (const evidence of [
    'APPROVED_RETENTION_JUSTIFICATION',
    'ACCESS_RESTRICTION_EVIDENCE',
    'EXPIRY_OR_HOLD_RELEASE_RULE',
    'RETENTION_SCOPE_TEST_EVIDENCE',
  ]) {
    assert.ok(retainRule.additionalEvidence.includes(evidence), `retention verification requires ${evidence}`);
  }

  const matrixSurfaces = matrix.nonSqlCopies.map((entry) => entry.surface).sort();
  const contractSurfaces = contract.nonSqlProbes.map((entry) => entry.surface).sort();
  assert.deepEqual(contractSurfaces, matrixSurfaces);
  assert.equal(new Set(contractSurfaces).size, contractSurfaces.length, 'non-SQL probes must be unique');

  for (const entry of contract.nonSqlProbes) {
    assert.equal(entry.probeStatus, 'NOT_IMPLEMENTED');
    assert.match(entry.requiredEvidenceClass, /EVIDENCE|PROOF|CONFIRMATION/);
  }

  const serialized = JSON.stringify(contract);
  assert.ok(serialized.includes('captured before parent deletion'));
  assert.ok(serialized.includes('surviving row is not automatically a failure'));
  assert.ok(serialized.includes('zero-row SQL result cannot prove deletion'));
});
