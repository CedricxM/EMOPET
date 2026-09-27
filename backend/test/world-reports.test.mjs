import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.NODE_ENV = 'test';
const { normaliseWorldReport, WORLD_REPORT_REASONS } = await import('../dist/api/services/world-reports.js');

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const M = '44444444-4444-4444-8444-444444444444';

test('world reports normalise ids and keep only the message id, never content', () => {
  assert.deepEqual(
    normaliseWorldReport({ reporterUserId: A.toUpperCase(), subjectUserId: B, kind: 'world_message', messageId: M.toUpperCase(), reason: 'harassment', details: '  context  ' }),
    { reporterUserId: A, subjectUserId: B, kind: 'world_message', messageId: M, reason: 'harassment', details: 'context' },
  );
  assert.deepEqual(
    normaliseWorldReport({ reporterUserId: A, subjectUserId: B, kind: 'world_user', reason: 'spam' }),
    { reporterUserId: A, subjectUserId: B, kind: 'world_user', reason: 'spam' },
  );
  assert.deepEqual([...WORLD_REPORT_REASONS], ['spam', 'harassment', 'illegal', 'unsafe', 'other']);
});

test('invalid world reports are rejected before any write', () => {
  const base = { reporterUserId: A, subjectUserId: B, kind: 'world_user', reason: 'spam' };
  for (const bad of [
    { ...base, subjectUserId: A },
    { ...base, subjectUserId: 'client-owner' },
    { ...base, reason: 'other-reason' },
    { ...base, kind: 'post' },
    { ...base, messageId: M },
    { ...base, kind: 'world_message' },
    { ...base, kind: 'world_message', messageId: 'not-a-uuid' },
    { ...base, details: 'x'.repeat(501) },
  ]) assert.throws(() => normaliseWorldReport(bad), /invalid_report/, JSON.stringify(bad));
});

test('schema and migration keep one moderation queue with an explicit target shape', () => {
  const code = (text) => text.replace(/^\s*(--|\/\/).*$/gm, '');
  const migration = code(readFileSync(new URL('../db/migrations/0021_world_report_intake.sql', import.meta.url), 'utf8'));
  const schema = code(readFileSync(new URL('../db/schema/community.ts', import.meta.url), 'utf8'));
  for (const source of [migration, schema]) {
    assert.match(source, /chk_community_reports_target_shape/);
    assert.match(source, /chk_community_reports_not_self/);
    assert.match(source, /idx_community_reports_subject_created/);
  }
  // Reported-person erasure is TO_CONFIRM: no delete action is inferred.
  assert.doesNotMatch(migration, /ON DELETE/i);
  assert.match(schema, /subjectUserId: uuid\('subject_user_id'\)\.references\(\(\) => users\.id\),/);
  // Message content is never stored: no content/text column is added.
  assert.doesNotMatch(migration, /ADD COLUMN IF NOT EXISTS (content|text|message_text)\b/i);
});
