import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function key(entry) {
  return `${entry.table}.${entry.column}`;
}

test('account access coverage stays one-to-one with direct user subject lineage and cannot claim completeness', async () => {
  const [lineage, coverage] = await Promise.all([
    readFile(new URL('../../config/privacy/user-subject-lineage.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/account-access-coverage.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);

  assert.equal(coverage.status, 'INCOMPLETE_ACCOUNT_ACCESS_COVERAGE_NOT_COMPLETE_DSAR');
  assert.equal(coverage.claimsCompleteAccountExport, false);
  assert.match(coverage.promotionGate, /^BLOCK_COMPLETE_ACCOUNT_ACCESS_CLAIM_/);
  assert.match(coverage.rootAccountProjection.status, /FIELD_LEVEL_PROJECTION_REQUIRED/);

  const lineageKeys = lineage.directReferences.map(key).sort();
  const coverageKeys = coverage.directReferences.map(key).sort();
  assert.deepEqual(
    coverageKeys,
    lineageKeys,
    'every direct users.id relation must have an explicit account-access coverage state and no stale coverage row may remain',
  );
  assert.equal(new Set(coverageKeys).size, coverageKeys.length, 'account-access coverage rows must be unique');

  for (const entry of coverage.directReferences) {
    assert.ok(entry.implementationStatus, `${key(entry)} must declare implementationStatus`);
    assert.ok(entry.projectionAuthority, `${key(entry)} must declare projectionAuthority`);
  }

  const byKey = new Map(coverage.directReferences.map((entry) => [key(entry), entry]));
  assert.equal(
    byKey.get('dogs.owner_id').implementationStatus,
    'SEPARATE_DOG_SCOPED_EXPORT_EXISTS_NOT_ACCOUNT_PACKAGE',
  );
  assert.equal(
    byKey.get('contact_requests.requester_user_id').implementationStatus,
    'OWNER_SELF_LIST_EXISTS_NOT_ACCOUNT_EXPORT_PACKAGE',
  );
  assert.match(
    byKey.get('auth_refresh_sessions.user_id').implementationStatus,
    /SECURITY_SENSITIVE/,
  );

  assert.ok(
    coverage.directReferences.some((entry) => entry.implementationStatus === 'NOT_IN_ACCOUNT_ACCESS_PACKAGE'),
    'coverage must remain visibly incomplete until explicit projections are implemented',
  );

  const serialized = JSON.stringify(coverage);
  for (const scopeGap of ['backups', 'provider-held copies', 'object/media storage']) {
    assert.ok(serialized.includes(scopeGap), `coverage must preserve known non-FK gap: ${scopeGap}`);
  }
});
