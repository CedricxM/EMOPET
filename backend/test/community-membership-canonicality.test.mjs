import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const schema = readFileSync(new URL('../db/schema/community.ts', import.meta.url), 'utf8');
const baseline = readFileSync(new URL('../db/baseline-draft/0000_core_baseline.sql', import.meta.url), 'utf8');

test('Community membership schema declares one canonical row per community and user', () => {
  assert.match(schema, /uniqueIndex\(['"]uq_community_members_community_user['"]\)\.on\(table\.communityId, table\.userId\)/);
});

test('historical baseline is not silently rewritten to manufacture migration history', () => {
  const membership = baseline.match(/CREATE TABLE community_members \([\s\S]*?\n\);/i)?.[0] ?? '';
  assert.ok(membership.length > 0, 'community_members baseline table must remain present');
  assert.doesNotMatch(membership, /UNIQUE\s*\(\s*community_id\s*,\s*user_id\s*\)/i);
});
