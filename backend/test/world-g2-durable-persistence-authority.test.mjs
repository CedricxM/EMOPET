import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), '..');

const read = (...parts) => readFile(resolve(root, ...parts), 'utf8');

test('WORLD-G2 migration locks Owner, idempotency, canonical-source and ownership uniqueness', async () => {
  const sql = await read('backend', 'db', 'migrations', '0045_world_gamification_persistence.sql');

  for (const table of [
    'world_progression_events',
    'world_owned_items',
    'world_resource_spends',
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE ${table}`));
    assert.match(sql, new RegExp(`${table.replaceAll('_', '.?')}[\\s\\S]*owner_id uuid NOT NULL REFERENCES users\\(id\\)`));
  }

  assert.match(sql, /UNIQUE \(owner_id, idempotency_key\)/);
  assert.match(sql, /UNIQUE \(owner_id, event_kind, source_ref\)/);
  assert.match(sql, /UNIQUE \(owner_id, item_id\)/);
  assert.match(sql, /chk_world_progression_events_grants_exact/);
  assert.match(sql, /chk_world_resource_spends_cost_keys/);
  assert.match(sql, /chk_world_resource_spends_cost_positive_integers/);
  const spendCostConstraint = sql.match(
    /CONSTRAINT chk_world_resource_spends_cost_positive_integers([\s\S]*?)\n\);/,
  );
  assert.ok(spendCostConstraint, 'spend cost constraint must remain complete');
  assert.doesNotMatch(spendCostConstraint[1], /CREATE INDEX/);
  assert.equal(
    (spendCostConstraint[1].match(/\^\[1-9\]\[0-9\]\*\$/g) ?? []).length,
    5,
    'all five resource-cost branches must require complete positive-integer syntax',
  );
  for (const resource of [
    'knowledgeFragments',
    'localDiscoveries',
    'walkTraces',
    'communitySeeds',
    'memoryThreads',
  ]) {
    assert.match(sql, new RegExp(resource));
  }
  assert.match(sql, /'knowledge\.card_read'[\s\S]*"knowledgeFragments": 1/);
  assert.match(sql, /'local\.route_saved'[\s\S]*"walkTraces": 2[\s\S]*"localDiscoveries": 1/);
  assert.match(sql, /'community\.contribution_created'[\s\S]*"communitySeeds": 2/);
  assert.doesNotMatch(sql, /ON DELETE CASCADE/i);
});

test('WORLD-G2 runtime store derives balance from journals and uses conflict-safe Owner locks', async () => {
  const [ledger, build] = await Promise.all([
    read('backend', 'api', 'services', 'world-progression-postgres.ts'),
    read('backend', 'api', 'services', 'world-build-postgres.ts'),
  ]);

  assert.match(ledger, /pg_advisory_xact_lock/);
  assert.match(ledger, /worldProgressionEvents/);
  assert.match(ledger, /worldResourceSpends/);
  assert.match(ledger, /WORLD_PROGRESSION_PERSISTED_BALANCE_NEGATIVE/);
  assert.match(ledger, /WORLD_PROGRESSION_PERSISTED_GRANT_MISMATCH/);
  assert.match(ledger, /SAFE_WORLD_REWARDS/);
  assert.match(ledger, /Number\.isSafeInteger/);

  assert.match(build, /SET TRANSACTION ISOLATION LEVEL SERIALIZABLE/);
  assert.match(build, /pg_advisory_xact_lock/);
  assert.match(build, /worldResourceSpends/);
  assert.match(build, /worldOwnedItems/);
  assert.match(build, /WORLD_BUILD_IDEMPOTENCY_CONFLICT/);
  assert.match(build, /existingSpend\.itemId !== input\.itemId/);
  assert.doesNotMatch(build, /sameCost/);
});

test('WORLD-G2 durable store is not activated by any HTTP route', async () => {
  const routesDir = resolve(root, 'backend', 'api', 'routes');
  const names = (await readdir(routesDir)).filter((name) => name.endsWith('.ts'));

  for (const name of names) {
    const source = await readFile(resolve(routesDir, name), 'utf8');
    assert.doesNotMatch(source, /world-progression-postgres/);
    assert.doesNotMatch(source, /world-build-postgres/);
    assert.doesNotMatch(source, /postgresWorldProgressionLedgerStore/);
    assert.doesNotMatch(source, /postgresWorldBuildService/);
  }
});

test('WORLD-G2 privacy lifecycle remains explicit and unpromoted', async () => {
  const [candidate, topology, coverage] = await Promise.all([
    read('config', 'world', 'world-progression-privacy-candidate-v1.json').then(JSON.parse),
    read('config', 'privacy', 'account-erasure-topology.json').then(JSON.parse),
    read('config', 'privacy', 'subject-persistence-privacy-coverage.json').then(JSON.parse),
  ]);

  const tables = [
    'world_progression_events',
    'world_owned_items',
    'world_resource_spends',
  ];

  assert.equal(candidate.productionAuthority, false);
  assert.equal(candidate.durableSchemaFoundation.productionWritesActivated, false);

  for (const table of tables) {
    const relation = topology.directUserReferences.find(
      (row) => row.table === table && row.column === 'owner_id',
    );
    assert.ok(relation, `missing erasure topology relation for ${table}`);
    assert.equal(relation.databaseDeleteAction, 'NO_ACTION');
    assert.equal(relation.erasureDisposition, 'TO_CONFIRM');

    const row = coverage.tables.find((entry) => entry.table === table);
    assert.ok(row, `missing privacy coverage for ${table}`);
    assert.equal(row.classificationStatus, 'UNCLASSIFIED_REQUIRES_PRIVACY_CLASSIFICATION');
    assert.deepEqual(row.inventoryCategories, []);
  }
});
