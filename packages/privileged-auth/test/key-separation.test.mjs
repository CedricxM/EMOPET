import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertPrivilegedTokenKeyConfig,
  verifyPrivilegedAccessToken,
} from '../dist/index.js';

const ORDINARY_SECRET = 'o'.repeat(48);
const PRIVILEGED_SECRET = 'p'.repeat(48);
const NOW = new Date('2026-09-04T09:00:00.000Z');

test('canonical key assertion rejects short and ordinary-secret reuse while accepting separated keys', () => {
  assert.throws(
    () => assertPrivilegedTokenKeyConfig({ secret: 'short' }),
    /32 characters/i,
  );
  assert.throws(
    () => assertPrivilegedTokenKeyConfig({
      secret: ORDINARY_SECRET,
      ordinaryJwtSecret: ORDINARY_SECRET,
    }),
    /distinct/i,
  );
  assert.doesNotThrow(() => assertPrivilegedTokenKeyConfig({
    secret: PRIVILEGED_SECRET,
    ordinaryJwtSecret: ORDINARY_SECRET,
  }));
});

test('privileged verification refuses a key reused from the ordinary Guardian JWT secret', async () => {
  await assert.rejects(
    verifyPrivilegedAccessToken(
      'not-a-real-jwt-but-long-enough-for-key-validation',
      { secret: ORDINARY_SECRET, ordinaryJwtSecret: ORDINARY_SECRET },
      NOW,
    ),
    /distinct/i,
  );
});
