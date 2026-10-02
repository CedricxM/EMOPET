import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const gate = JSON.parse(
  await readFile(
    new URL('../../config/world/world-progression-persistence-gate-v1.json', import.meta.url),
    'utf8',
  ),
);

test('World progression persistence remains blocked until privacy topology is reconciled', () => {
  assert.equal(gate.status, 'BLOCKED_PENDING_PRIVACY_TOPOLOGY_RECONCILIATION');
  assert.equal(gate.productionAuthority, false);
  assert.equal(gate.migrationGate.migrationNumberMustBeRecheckedAtImplementationTime, true);
});

test('every planned durable World economy table is directly Owner-linked and uniqueness-constrained', () => {
  const tables = Object.entries(gate.plannedTables);
  assert.ok(tables.length >= 3);

  for (const [name, table] of tables) {
    assert.equal(table.ownerReference, 'users.id', `${name} must remain Owner-linked`);
    assert.ok(table.requiredColumns.includes('owner_id'), `${name} must include owner_id`);
    assert.ok(table.uniqueKeys.length > 0, `${name} must define a uniqueness boundary`);
  }

  assert.deepEqual(
    gate.plannedTables.world_progression_events.uniqueKeys,
    [
      ['owner_id', 'idempotency_key'],
      ['owner_id', 'event_kind', 'source_ref'],
    ],
  );
  assert.deepEqual(
    gate.plannedTables.world_owned_items.uniqueKeys,
    [['owner_id', 'item_id']],
  );
  assert.deepEqual(
    gate.plannedTables.world_resource_spends.uniqueKeys,
    [['owner_id', 'idempotency_key']],
  );
});

test('atomic build contract forbids negative balances and duplicate ownership', () => {
  const text = gate.transactionRules.join(' ').toLowerCase();
  assert.match(text, /one database transaction/);
  assert.match(text, /negative resource balance/);
  assert.match(text, /duplicate ownership/);
  assert.match(text, /idempotent/);
  assert.match(text, /canonical server source authorization/);
  assert.match(text, /at most once per owner and event kind/);
  assert.match(text, /exact owner and event kind/);
  assert.match(text, /fails closed/);
});

test('privacy gates cover erasure, discovery, residue, export and retention before activation', () => {
  const text = gate.privacyGates.join(' ').toLowerCase();

  for (const required of [
    'erasure topology',
    'subject discovery',
    'residue verification',
    'data export',
    'retention',
  ]) {
    assert.match(text, new RegExp(required));
  }
});

test('durable store contract makes atomicity, replay and concurrency requirements machine-readable', () => {
  assert.deepEqual(gate.durableStoreContract, {
    isolationRequirement: 'SERIALIZABLE_OR_EQUIVALENT_CONFLICT_SAFE',
    appendAndBalanceAtomic: true,
    buildSpendAndOwnershipAtomic: true,
    replayReturnsCommittedEntry: true,
    idempotencyConflictFailsClosed: true,
    canonicalSourceUniquenessDatabaseEnforced: true,
    ownerBoundaryDatabaseEnforced: true,
    negativeBalanceForbidden: true,
  });
});


test('dry-run proof is explicit, disposable-only and non-authoritative', () => {
  assert.deepEqual(gate.dryRunProof, {
    status: 'DISPOSABLE_POSTGRES_ONLY',
    productionAuthority: false,
    testPath: 'backend/test/world-progression-postgres-dry-run.integration.test.mjs',
    requiresDatabaseUrl: true,
    createsPermanentTables: false,
    reservesMigrationNumber: false,
    proves: [
      'owner foreign-key boundary',
      'same logical replay returns committed entry',
      'idempotency-key reuse for another logical event fails closed',
      'canonical source uniqueness per Owner and event kind',
      'same canonical source remains independent across Owners',
      'conflict-safe concurrent build spending',
      'negative resource balance is prevented',
      'duplicate ownership is prevented',
    ],
  });
});


test('G2 durable foundation is explicit without production activation', () => {
  assert.deepEqual(gate.migrationGate.currentReservation, {
    migration: '0046_world_gamification_persistence.sql',
    recheckedAgainstMain: true,
    schemaFoundationPresent: true,
  });
  assert.deepEqual(gate.durableImplementation, {
    status: 'SCHEMA_AND_STORE_PRESENT_NOT_ACTIVATED',
    productionAuthority: false,
    schema: 'backend/db/schema/world-gamification.ts',
    ledgerStore: 'backend/api/services/world-progression-postgres.ts',
    buildService: 'backend/api/services/world-build-postgres.ts',
    activeHttpRoute: false,
    privacyLifecyclePromoted: false,
  });
});

test('privacy candidate remains a hard production block', () => {
  assert.deepEqual(gate.privacyCandidateContract, {
    path: 'config/world/world-progression-privacy-candidate-v1.json',
    status: 'CANDIDATE_NOT_PROMOTED',
    blocksProductionPersistence: true,
  });
});
