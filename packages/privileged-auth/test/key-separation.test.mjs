import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyPrivilegedAccessToken } from '../dist/index.js';

const ORDINARY_SECRET = 'o'.repeat(48);
const NOW = new Date('2026-09-04T09:00:00.000Z');

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
