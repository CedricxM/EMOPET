import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [authoritySource, serviceSource, workerSource] = await Promise.all([
  readFile(new URL('../../config/security/auth-email-legacy-rollout-v1.json', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/services/auth-email-legacy-rollout-audit.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/workers/auth-email-legacy-rollout-audit.ts', import.meta.url), 'utf8'),
]);

const authority = JSON.parse(authoritySource);

test('#760 legacy rollout authority is census-only and cannot authorize mutation', () => {
  assert.equal(authority.issue, 760);
  assert.equal(authority.authority.databaseMode, 'SELECT_ONLY');
  assert.equal(authority.authority.automaticBackfill, false);
  assert.equal(authority.authority.automaticReverification, false);
  assert.equal(authority.authority.legacyMeansVerified, false);
  assert.equal(authority.authority.rolloutDecisionAuthorizedByCensus, false);

  assert.doesNotMatch(serviceSource, /\.insert\s*\(/);
  assert.doesNotMatch(serviceSource, /\.update\s*\(/);
  assert.doesNotMatch(serviceSource, /\.delete\s*\(/);
  assert.doesNotMatch(serviceSource, /\b(?:INSERT|UPDATE|DELETE)\b/i);
});

test('census output shape exposes aggregate counts, not direct account identifiers', () => {
  assert.equal(authority.report.aggregateCountsOnly, true);
  assert.equal(authority.report.directIdentifiersAllowed, false);
  assert.equal(authority.report.emailsAllowed, false);
  assert.equal(authority.report.userIdsAllowed, false);
  assert.equal(authority.report.namesAllowed, false);
  assert.equal(authority.report.tokenMaterialAllowed, false);
  assert.equal(authority.report.sessionTokenMaterialAllowed, false);

  assert.doesNotMatch(serviceSource, /users\.email\b/);
  assert.doesNotMatch(serviceSource, /users\.id\b/);
  assert.doesNotMatch(serviceSource, /users\.name\b/);
  assert.doesNotMatch(serviceSource, /authRefreshSessions\.tokenHash\b/);
  assert.match(workerSource, /JSON\.stringify\(report/);
});

test('operator worker has no HTTP route or rollout side effect', () => {
  assert.doesNotMatch(workerSource, /app\.(?:get|post|put|patch|delete)\(/);
  assert.doesNotMatch(workerSource, /fetch\s*\(/);
  assert.doesNotMatch(workerSource, /email_verified_at\s*=/i);
});
