import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  inspectAiZeroDurableRetention,
} from '../dist/api/services/ai-zero-durable-retention-readiness.js';

test('AI zero-durable readiness is read-only and aligned with founder decision R4', async () => {
  const [source, schedule] = await Promise.all([
    readFile(
      new URL('../api/services/ai-zero-durable-retention-readiness.ts', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../../config/privacy/retention-schedule.json', import.meta.url),
      'utf8',
    ).then(JSON.parse),
  ]);

  for (const forbidden of [
    '.delete(',
    '.update(',
    '.insert(',
    'DELETE FROM',
    'UPDATE ai_messages',
    'INSERT INTO ai_messages',
    'content:',
    'metadata:',
    'targetUserId:',
    'dogId:',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }

  assert.match(source, /REPEATABLE READ, READ ONLY/);
  assert.match(source, /destructiveActionAuthorized: false/);
  assert.match(source, /claimsPurgeExecuted: false/);
  assert.match(source, /claimsWritePreventionImplemented: false/);

  assert.equal(
    schedule.decisions.R4,
    'AI_MESSAGES_NO_DURABLE_RETENTION_UNTIL_SEPARATE_PRODUCT_NEED',
  );
  const row = schedule.categories.find((entry) => entry.id === 'ai_messages');
  assert.deepEqual(row.activeRetention, {
    mode: 'NO_DURABLE_RETENTION',
    value: 0,
    unit: 'SECONDS',
  });
  assert.equal(row.purgeEvidence, 'NEGATIVE_EVIDENCE_REQUIRED');
});

test('AI readiness reports any durable row as a policy violation signal without authorising deletion', async () => {
  const result = await inspectAiZeroDurableRetention({
    async countDurableRows() {
      return 3;
    },
  });

  assert.deepEqual(result, {
    ok: true,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsWritePreventionImplemented: false,
    categoryId: 'ai_messages',
    policySeconds: 0,
    status: 'DURABLE_AI_ROWS_PRESENT',
    durableRowCount: 3,
    policyBoundary: 'DETECTION_ONLY_WRITE_PREVENTION_AND_PURGE_NOT_IMPLEMENTED',
  });
});

test('an empty AI table is negative evidence only and never a write-prevention claim', async () => {
  const result = await inspectAiZeroDurableRetention({
    async countDurableRows() {
      return 0;
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'NO_DURABLE_AI_ROWS_PRESENT');
  assert.equal(result.durableRowCount, 0);
  assert.equal(result.claimsWritePreventionImplemented, false);
  assert.equal(result.claimsPurgeExecuted, false);
});

test('AI readiness fails closed on impossible counts and repository outages', async () => {
  for (const bad of [-1, 1.5, Number.NaN]) {
    const result = await inspectAiZeroDurableRetention({
      async countDurableRows() {
        return bad;
      },
    });
    assert.deepEqual(result, {
      ok: false,
      mode: 'READ_ONLY_RETENTION_READINESS',
      destructiveActionAuthorized: false,
      claimsPurgeExecuted: false,
      claimsWritePreventionImplemented: false,
      error: 'invalid_repository_result',
    });
  }

  const unavailable = await inspectAiZeroDurableRetention({
    async countDurableRows() {
      throw new Error('database offline');
    },
  });
  assert.deepEqual(unavailable, {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsWritePreventionImplemented: false,
    error: 'database_unavailable',
    retryable: true,
  });
});
