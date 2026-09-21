import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repoRoot = new URL('../../', import.meta.url);
const source = (path) => readFile(new URL(path, repoRoot), 'utf8');

test('moderation evidence has a nullable final-action retention clock without invented history', async () => {
  const [schema, migration, scheduleText] = await Promise.all([
    source('backend/db/schema/community.ts'),
    source('backend/db/migrations/0011_moderation_final_action_clock.sql'),
    source('config/privacy/retention-schedule.json'),
  ]);
  const schedule = JSON.parse(scheduleText);
  const row = schedule.categories.find((entry) => entry.id === 'moderation_evidence');

  const reportBlock = schema.match(
    /export const communityReports = pgTable\('community_reports'[\s\S]*?(?=export const communityEvents)/,
  )?.[0];
  assert.ok(reportBlock);
  assert.match(reportBlock, /finalActionAt: timestamp\('final_action_at', \{ withTimezone: true \}\)/);
  assert.doesNotMatch(reportBlock, /finalActionAt:[^\n]*\.notNull\(\)/);
  assert.match(reportBlock, /idx_community_reports_final_action_at/);

  assert.match(migration, /ADD COLUMN IF NOT EXISTS "final_action_at" timestamptz/);
  assert.doesNotMatch(migration, /DEFAULT\s+(CURRENT_TIMESTAMP|NOW\(\))/i);
  assert.doesNotMatch(migration, /UPDATE\s+"?community_reports"?/i);
  assert.doesNotMatch(migration, /CREATE\s+TRIGGER/i);

  assert.equal(row.trigger, 'final moderation action');
  assert.deepEqual(row.activeRetention, { mode: 'DURATION', value: 12, unit: 'MONTHS' });
  assert.equal(row.clockSupportStatus, 'IMPLEMENTED_SCHEMA_ONLY');
  assert.equal(row.clockField, 'community_reports.final_action_at');
  assert.equal(
    row.clockBoundary,
    'RUNTIME_FINAL_ACTION_STAMPING_NOT_IMPLEMENTED_NO_HISTORICAL_BACKFILL',
  );
});
