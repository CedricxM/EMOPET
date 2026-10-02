import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../api/services/world-community-progression-source.ts', import.meta.url),
  'utf8',
);
const cfg = JSON.parse(
  await readFile(
    new URL('../../config/world/world-community-progression-source-v1.json', import.meta.url),
    'utf8',
  ),
);
const progression = JSON.parse(
  await readFile(
    new URL('../../config/world/world-progression-authority-v1.json', import.meta.url),
    'utf8',
  ),
);
const sourceAuthority = JSON.parse(
  await readFile(
    new URL('../../config/world/world-progression-source-authority-v1.json', import.meta.url),
    'utf8',
  ),
);
const integration = await readFile(
  new URL('./world-community-progression-source.integration.test.mjs', import.meta.url),
  'utf8',
);
const p0Workflow = await readFile(
  new URL('../../.github/workflows/p0-db-baseline.yml', import.meta.url),
  'utf8',
);

test('Community source slice is bounded to an already-authorised G1 event kind', () => {
  assert.equal(cfg.status, 'CONTROLLED_DRAFT_NOT_RUNTIME_AUTHORITY');
  assert.equal(cfg.productionAuthority, false);
  assert.equal(cfg.eventKind, 'community.contribution_created');
  assert.equal(
    Object.prototype.hasOwnProperty.call(progression.rewards, cfg.eventKind),
    true,
  );
});

test('only canonical post and event source shapes are declared', () => {
  assert.deepEqual(
    Object.keys(cfg.allowedSourceShapes).sort(),
    ['community:event:<uuid>', 'community:post:<uuid>'],
  );
  assert.deepEqual(cfg.allowedSourceShapes['community:post:<uuid>'], {
    table: 'posts',
    ownerColumn: 'author_id',
    requiredOwnerMatch: true,
  });
  assert.deepEqual(cfg.allowedSourceShapes['community:event:<uuid>'], {
    table: 'community_events',
    ownerColumn: 'created_by',
    requiredOwnerMatch: true,
  });

  assert.match(source, /community:\(post\|event\)/);
  assert.doesNotMatch(source, /community:\(post\|event\|comment\)/);
});

test('excluded Community signals cannot become reward evidence in this slice', () => {
  for (const excluded of [
    'comments',
    'likes',
    'membership alone',
    'moderation state',
    'sensorOverlay',
    'event latitude/longitude',
    'event location text',
    'popularity/rank',
  ]) {
    assert.equal(cfg.excludedEvidence.includes(excluded), true);
  }
});

test('Drizzle verifier selects identity only and binds canonical row to exact Owner', () => {
  assert.match(source, /select\(\{ id: posts\.id \}\)/);
  assert.match(source, /eq\(posts\.id, postId\)/);
  assert.match(source, /eq\(posts\.authorId, ownerId\)/);

  assert.match(source, /select\(\{ id: communityEvents\.id \}\)/);
  assert.match(source, /eq\(communityEvents\.id, eventId\)/);
  assert.match(source, /eq\(communityEvents\.createdBy, ownerId\)/);
});

test('source verifier is read-only and this slice creates no route or progression write', () => {
  assert.doesNotMatch(source, /\.insert\(/);
  assert.doesNotMatch(source, /\.update\(/);
  assert.doesNotMatch(source, /\.delete\(/);
  assert.doesNotMatch(source, /\.set\(/);
  assert.doesNotMatch(source, /new Hono|\.post\(|\.put\(|\.patch\(/);
});

test('configuration explicitly prevents Community content/location leakage into World progression', () => {
  const rules = cfg.rules.join(' ');
  assert.match(rules, /read-only/i);
  assert.match(rules, /No Community content body, media, sensor overlay or location is copied/i);
  assert.match(rules, /fail closed/i);
  assert.match(rules, /not automatically wired into a public route/i);
});

test('Community source proof traverses routed authority and durable G2 storage', () => {
  assert.deepEqual(sourceAuthority.routes['community.contribution_created'], {
    authorityDomain: 'community',
    sourceRefPrefix: 'community:',
    ownerScopeRequired: true,
    canonicalExistenceRequired: true,
  });

  assert.match(integration, /RoutedWorldProgressionSourceAuthority/);
  assert.match(integration, /PostgresWorldProgressionLedgerStore/);
  assert.doesNotMatch(integration, /InMemoryWorldProgressionLedgerStore/);
  assert.match(integration, /WORLD_PROGRESSION_SOURCE_NOT_AUTHORIZED/);
});

test('Community source integration remains explicit on both PostgreSQL authority paths', () => {
  assert.equal(
    (p0Workflow.match(/WORLD-G3 canonical Community progression source on historical migrations/g) ?? []).length,
    1,
  );
  assert.equal(
    (p0Workflow.match(/WORLD-G3 canonical Community progression source on generated baseline/g) ?? []).length,
    1,
  );
  assert.equal(
    (p0Workflow.match(/WORLD_COMMUNITY_SOURCE_DB_INTEGRATION: '1'/g) ?? []).length,
    2,
  );
  assert.equal(
    (p0Workflow.match(/test\/world-community-progression-source\.integration\.test\.mjs/g) ?? []).length,
    2,
  );
});
