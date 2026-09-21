import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { inspectExpiredRefreshSessionRetention } from '../dist/api/services/auth-session-retention-readiness.js';

test('refresh expiry readiness source is read-only and aggregate-only', async () => {
  const source = await readFile(
    new URL('../api/services/auth-session-retention-readiness.ts', import.meta.url),
    'utf8',
  );

  for (const forbidden of [
    '.delete(',
    '.update(',
    '.insert(',
    'DELETE FROM',
    'UPDATE auth_refresh_sessions',
    'INSERT INTO auth_refresh_sessions',
    'tokenHash:',
    'sessionId:',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }

  assert.match(source, /REPEATABLE READ, READ ONLY/);
  assert.match(source, /destructiveActionAuthorized: false/);
  assert.match(source, /claimsPurgeExecuted: false/);
});

test('readiness reports aggregate expired rows without authorising purge', async () => {
  let observedCutoff = null;
  const result = await inspectExpiredRefreshSessionRetention(
    '2026-09-21T10:00:00.000Z',
    {
      async countExpiredAt(cutoff) {
        observedCutoff = cutoff;
        return {
          expiredTotal: 7,
          detachedExpired: 3,
          linkedExpired: 4,
          revokedExpired: 5,
          unrevokedExpired: 2,
        };
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'READ_ONLY_RETENTION_READINESS');
  assert.equal(result.destructiveActionAuthorized, false);
  assert.equal(result.claimsPurgeExecuted, false);
  assert.equal(result.categoryId, 'auth_refresh_sessions');
  assert.equal(result.status, 'EXPIRED_ROWS_PRESENT');
  assert.equal(result.policyBoundary, 'DELETE_ONLY_AFTER_ORIGINAL_EXPIRY');
  assert.deepEqual(result.counts, {
    expiredTotal: 7,
    detachedExpired: 3,
    linkedExpired: 4,
    revokedExpired: 5,
    unrevokedExpired: 2,
  });
  assert.equal(observedCutoff.toISOString(), '2026-09-21T10:00:00.000Z');
});

test('readiness distinguishes an empty expired set', async () => {
  const result = await inspectExpiredRefreshSessionRetention(
    '2026-09-21T10:00:00Z',
    {
      async countExpiredAt() {
        return {
          expiredTotal: 0,
          detachedExpired: 0,
          linkedExpired: 0,
          revokedExpired: 0,
          unrevokedExpired: 0,
        };
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, 'NO_EXPIRED_ROWS');
  assert.equal(result.evaluationAt, '2026-09-21T10:00:00.000Z');
});

test('readiness fails closed on invalid time, inconsistent aggregates and repository failure', async () => {
  let calls = 0;
  const invalidTime = await inspectExpiredRefreshSessionRetention(
    'not-a-time',
    {
      async countExpiredAt() {
        calls += 1;
        throw new Error('must not run');
      },
    },
  );
  assert.deepEqual(invalidTime, {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    error: 'invalid_evaluation_at',
  });
  assert.equal(calls, 0);

  const inconsistent = await inspectExpiredRefreshSessionRetention(
    '2026-09-21T10:00:00.000Z',
    {
      async countExpiredAt() {
        return {
          expiredTotal: 2,
          detachedExpired: 2,
          linkedExpired: 1,
          revokedExpired: 2,
          unrevokedExpired: 0,
        };
      },
    },
  );
  assert.deepEqual(inconsistent, {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    error: 'invalid_repository_result',
  });

  const unavailable = await inspectExpiredRefreshSessionRetention(
    '2026-09-21T10:00:00.000Z',
    {
      async countExpiredAt() {
        throw new Error('database offline');
      },
    },
  );
  assert.deepEqual(unavailable, {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    error: 'database_unavailable',
    retryable: true,
  });
});
