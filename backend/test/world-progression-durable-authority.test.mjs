import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readText = (relative) =>
  readFile(new URL(relative, import.meta.url), 'utf8');
const readJson = async (relative) => JSON.parse(await readText(relative));

const WORLD_TABLES = [
  'world_progression_events',
  'world_owned_items',
  'world_resource_spends',
];

test('WORLD-G2 migration and Drizzle schema expose the same durable tables and named Owner FKs', async () => {
  const [migration, schema] = await Promise.all([
    readText('../db/migrations/0045_world_gamification_persistence.sql'),
    readText('../db/schema/world-gamification.ts'),
  ]);

  for (const table of WORLD_TABLES) {
    assert.match(migration, new RegExp(`CREATE TABLE ${table}\\b`));
    assert.match(schema, new RegExp(`pgTable\\(\\s*['"]${table}['"]`));
  }

  for (const name of [
    'fk_world_progression_events_owner',
    'fk_world_owned_items_owner',
    'fk_world_resource_spends_owner',
    'uq_world_progression_events_owner_idempotency',
    'uq_world_progression_events_owner_source',
    'uq_world_owned_items_owner_item',
    'uq_world_resource_spends_owner_idempotency',
  ]) {
    assert.match(migration, new RegExp(name));
    assert.match(schema, new RegExp(name));
  }

  assert.match(migration, /CONTROLLED DRAFT \/ NOT PRODUCTION AUTHORITY/);
  assert.doesNotMatch(migration, /ON DELETE CASCADE|ON DELETE SET NULL/i);
});

test('WORLD-G2 privacy topology sees every Owner-linked table while lifecycle stays unresolved', async () => {
  const [
    lineage,
    topology,
    coverage,
    matrix,
    packet,
    inventory,
  ] = await Promise.all([
    readJson('../../config/privacy/user-subject-lineage.json'),
    readJson('../../config/privacy/account-erasure-topology.json'),
    readJson('../../config/privacy/subject-persistence-privacy-coverage.json'),
    readJson('../../config/privacy/erasure-disposition-matrix.json'),
    readJson('../../config/privacy/erasure-disposition-decision-packet.json'),
    readJson('../../config/privacy/data-inventory.json'),
  ]);

  const inventoryCategory = inventory.categories.find((row) => row.id === 'world_progression');
  assert.ok(inventoryCategory);
  assert.match(String(inventoryCategory.exportable), /TO_CONFIRM/);
  assert.match(String(inventoryCategory.retention), /TO_CONFIRM/);
  assert.match(String(inventoryCategory.erasure), /TO_CONFIRM/);

  for (const table of WORLD_TABLES) {
    const direct = lineage.directReferences.find(
      (row) => row.table === table && row.column === 'owner_id',
    );
    assert.ok(direct, `missing user lineage for ${table}`);
    assert.equal(direct.source, 'backend/db/schema/world-gamification.ts');

    const topologyRow = topology.directUserReferences.find(
      (row) => row.table === table && row.column === 'owner_id',
    );
    assert.ok(topologyRow, `missing erasure topology for ${table}`);
    assert.equal(topologyRow.databaseDeleteAction, 'NO_ACTION');
    assert.equal(topologyRow.erasureDisposition, 'TO_CONFIRM');

    const coverageRow = coverage.tables.find((row) => row.table === table);
    assert.ok(coverageRow, `missing privacy coverage for ${table}`);
    assert.equal(coverageRow.classificationStatus, 'MAPPED_TO_EXISTING_PRIVACY_CATEGORY');
    assert.deepEqual(coverageRow.inventoryCategories, ['world_progression']);

    const matrixRow = matrix.entries.find(
      (row) =>
        row.subjectRoot === 'users.id'
        && row.relationType === 'DIRECT_FK'
        && row.table === table
        && row.column === 'owner_id',
    );
    assert.ok(matrixRow, `missing erasure matrix row for ${table}`);
    assert.equal(matrixRow.disposition, 'TO_CONFIRM');
    assert.equal(matrixRow.executionStatus, 'NOT_IMPLEMENTED');

    const packetRow = packet.relations.find(
      (row) =>
        row.subjectRoot === 'users.id'
        && row.relationType === 'DIRECT_FK'
        && row.table === table
        && row.column === 'owner_id',
    );
    assert.ok(packetRow, `missing decision packet row for ${table}`);
    assert.equal(packetRow.decisionSupportStatus, 'LEGAL_AUTHORITY_BLOCKED');
    assert.equal(packetRow.requiredAuthority, 'PRIVACY_LEGAL');
    assert.equal(packetRow.candidateDisposition, null);
    assert.equal(packetRow.promotionAuthorized, false);
  }

  assert.equal(topology.claimsCompleteAccountErasure, false);
  assert.equal(topology.claimsExecutableErasure, false);
  assert.equal(matrix.claimsCompleteErasure, false);
  assert.equal(matrix.claimsExecutableErasure, false);
});

test('WORLD-G2 runtime privacy probes cover the promoted relational surface and export stays partial', async () => {
  const [discovery, residue, exportRoute, lineage] = await Promise.all([
    readText('../api/services/subject-discovery.ts'),
    readText('../api/services/erasure-residue-verification.ts'),
    readText('../api/routes/data-export.ts'),
    readJson('../../config/privacy/user-subject-lineage.json'),
  ]);

  for (const table of WORLD_TABLES) {
    assert.match(discovery, new RegExp(table.replaceAll('_', '[A-Z]?|_'), 'i'));
  }

  for (const key of [
    'world_progression_events.owner_id',
    'world_owned_items.owner_id',
    'world_resource_spends.owner_id',
  ]) {
    assert.match(residue, new RegExp(key.replace('.', '\\.')));
  }

  assert.match(
    lineage.lifecyclePolicyStatus,
    /TO_CONFIRM_BEFORE_ACCOUNT_ERASURE_OR_COMPLETE_ACCOUNT_EXPORT/,
  );
  assert.match(exportRoute, /PARTIAL_CURRENT_BACKEND_PROJECTION/);
  assert.match(exportRoute, /not a complete dump of every dog-linked PostgreSQL relation/i);
});

test('WORLD-G2 durable service never accepts caller-supplied reward or build amounts', async () => {
  const [ledger, persistence] = await Promise.all([
    readText('../api/services/world-progression-ledger.ts'),
    readText('../api/services/world-progression-postgres.ts'),
  ]);

  assert.match(ledger, /SAFE_WORLD_REWARDS/);
  assert.doesNotMatch(ledger, /rewardAmount|grantAmount|caller.*grant/i);

  assert.match(
    persistence,
    /resolveWorldRegionalCollection\(input\.catalog, input\.regionCode\)/,
  );
  assert.match(
    persistence,
    /collection\.items\.find\(\(candidate\) => candidate\.id === input\.itemId\)/,
  );
  assert.doesNotMatch(
    persistence,
    /input\.(?:cost|grant|reward|amount)/,
  );
  assert.match(persistence, /WORLD_PERSISTENCE_CORRUPT_EVENT/);
  assert.match(persistence, /WORLD_PERSISTENCE_NEGATIVE_BALANCE/);
});
