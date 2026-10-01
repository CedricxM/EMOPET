import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const authorityUrl = new URL('../../config/world/world-progression-authority-v1.json', import.meta.url);
const serviceUrl = new URL('../api/services/world-progression-ledger.ts', import.meta.url);

const authority = JSON.parse(await readFile(authorityUrl, 'utf8'));
const serviceSource = await readFile(serviceUrl, 'utf8');

const SAFE_EVENTS = new Set([
  'knowledge.card_read',
  'local.place_saved',
  'local.route_saved',
  'community.contribution_created',
  'world.group_joined',
  'memory.created',
]);

const SAFE_RESOURCES = new Set([
  'knowledgeFragments',
  'localDiscoveries',
  'walkTraces',
  'communitySeeds',
  'memoryThreads',
]);

const REQUIRED_FORBIDDEN_PREFIXES = [
  'eli.',
  'sensor.',
  'care.eli.',
  'dog.activity.',
  'dog.sleep.',
  'dog.rest.',
  'dog.wellbeing.',
  'dog.health.',
  'dog.emotion.',
  'relationship.score.',
  'steps.',
];

test('World progression authority is owner-only, World-only and explicitly non-production', () => {
  assert.equal(authority.status, 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY');
  assert.equal(authority.subject, 'owner');
  assert.equal(authority.visibleProgressionSurface, 'world');
  assert.equal(authority.principles.dogPerformanceScoring, false);
  assert.equal(authority.principles.careSignalRewards, false);
  assert.equal(authority.principles.publicRanking, false);
  assert.equal(authority.principles.paidHumanConnection, false);
  assert.equal(authority.principles.callerSuppliedRewardAmounts, false);
  assert.equal(authority.principles.sourceRefsMustBeServerAuthorized, true);
});

test('only the bounded owner-action catalogue can grant World resources', () => {
  const events = Object.keys(authority.rewards);
  assert.deepEqual(new Set(events), SAFE_EVENTS);
  assert.deepEqual(new Set(authority.resources), SAFE_RESOURCES);

  for (const [eventKind, grants] of Object.entries(authority.rewards)) {
    assert.equal(
      authority.forbiddenEventPrefixes.some((prefix) => eventKind.startsWith(prefix)),
      false,
      `${eventKind} must not overlap a forbidden event prefix`,
    );

    for (const [resource, amount] of Object.entries(grants)) {
      assert.equal(SAFE_RESOURCES.has(resource), true, `unknown resource ${resource}`);
      assert.equal(Number.isInteger(amount), true, `${eventKind}.${resource} must be integer`);
      assert.equal(amount > 0 && amount <= 5, true, `${eventKind}.${resource} must stay bounded`);
    }
  }
});

test('Care, ELI, sensors and dog performance remain structurally forbidden reward sources', () => {
  for (const prefix of REQUIRED_FORBIDDEN_PREFIXES) {
    assert.equal(authority.forbiddenEventPrefixes.includes(prefix), true, `missing forbidden prefix ${prefix}`);
    assert.equal(
      Object.keys(authority.rewards).some((eventKind) => eventKind.startsWith(prefix)),
      false,
      `forbidden source ${prefix} leaked into reward catalogue`,
    );
  }
});

test('server ledger derives rewards itself and keeps idempotency fail-closed', () => {
  assert.match(serviceSource, /SAFE_WORLD_REWARDS/);
  assert.match(serviceSource, /appendIfAbsent/);
  assert.match(serviceSource, /WORLD_PROGRESSION_IDEMPOTENCY_CONFLICT/);
  assert.match(serviceSource, /WorldProgressionSourceAuthority/);
  assert.match(serviceSource, /isAuthorizedSource/);
  assert.match(serviceSource, /WORLD_PROGRESSION_SOURCE_NOT_AUTHORIZED/);
  assert.match(serviceSource, /WORLD_PROGRESSION_SOURCE_AUTHORITY_UNAVAILABLE/);
  assert.match(serviceSource, /caller|server-owned reward catalogue/i);
  assert.match(serviceSource, /InMemoryWorldProgressionLedgerStore is not production authority/);

  const inputInterface = serviceSource.match(
    /export interface WorldProgressionEventInput \{([\s\S]*?)\n\}/,
  );
  assert.ok(inputInterface, 'WorldProgressionEventInput contract must exist');
  assert.doesNotMatch(inputInterface[1], /grants|points|xp|level|rank|score/i);
});

test('machine-readable rewards exactly match the executable server catalogue', async () => {
  const output = ts.transpileModule(serviceSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const mod = await import(
    `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(mod.SAFE_WORLD_REWARDS)),
    authority.rewards,
  );
});

test('config and ledger service expose the same authorised event kinds and resources', () => {
  for (const eventKind of Object.keys(authority.rewards)) {
    assert.equal(serviceSource.includes(`'${eventKind}'`), true, `service missing ${eventKind}`);
  }
  for (const resource of authority.resources) {
    assert.equal(serviceSource.includes(`'${resource}'`), true, `service missing ${resource}`);
  }
});
