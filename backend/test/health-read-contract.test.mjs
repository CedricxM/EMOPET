import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../api/routes/health.ts', import.meta.url), 'utf8');

test('health entry read is an authoritative PostgreSQL query, not a fabricated empty result', () => {
  assert.match(source, /\.select\(\)/);
  assert.match(source, /\.from\(healthEntries\)/);
  assert.match(source, /\.where\(eq\(healthEntries\.dogId, dogId\)\)/);
  assert.match(source, /databaseUnavailable\(c, 'list_entries'\)/);
  assert.match(source, /HEALTH_DATABASE_UNAVAILABLE/);
  assert.doesNotMatch(source, /health_entry_read_not_implemented/);
  assert.doesNotMatch(source, /return c\.json\(\{ dogId, entries: \[\] \}\)/);
});

test('health reminder read remains explicitly gated instead of reporting a fake empty set', () => {
  assert.match(source, /HEALTH_REMINDER_POLICY_NOT_READY/);
  assert.match(source, /reminderPolicyUnavailable\(c\)/);
  assert.match(source, /operation:\s*'list_reminders'/);
  assert.match(source, /retryable:\s*false/);
  assert.doesNotMatch(source, /health_reminder_read_not_implemented/);
  assert.doesNotMatch(source, /return c\.json\(\{ dogId, reminders: \[\] \}\)/);
});

test('health create/read failures remain distinguishable from successful durable operations', () => {
  assert.match(source, /databaseUnavailable\(c, 'create_entry'\)/);
  assert.match(source, /databaseUnavailable\(c, 'list_entries'\)/);
  assert.match(source, /},\s*503\);/);
  assert.match(source, /Cache-Control',\s*'private, no-store'/);
  assert.doesNotMatch(source, /health_entry_persistence_not_implemented/);
});
