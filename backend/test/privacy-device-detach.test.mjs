import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');
const json = async (path) => JSON.parse(await source(path));

test('device dog binding is detachable in schema and migration', async () => {
  const [schema, migration] = await Promise.all([
    source('backend/db/schema/dogs.ts'),
    source('backend/db/migrations/0007_device_detach_on_dog_erasure.sql'),
  ]);

  assert.match(
    schema,
    /export const devices = pgTable\('devices'[\s\S]*dogId: uuid\('dog_id'\)\.references\(\(\) => dogs\.id, \{ onDelete: 'set null' \}\)/,
  );
  assert.equal(
    /export const devices = pgTable\('devices'[\s\S]*dogId: uuid\('dog_id'\)\.notNull\(\)/.test(schema),
    false,
  );

  assert.match(migration, /ALTER TABLE "devices" ALTER COLUMN "dog_id" DROP NOT NULL/);
  assert.match(migration, /FOREIGN KEY \("dog_id"\) REFERENCES "public"\."dogs"\("id"\)/);
  assert.match(migration, /ON DELETE SET NULL ON UPDATE NO ACTION/);
});

test('device detach keeps the existing bounded admin metadata lifecycle', async () => {
  const retention = await json('config/privacy/retention-schedule.json');
  const category = retention.categories.find((row) => row.id === 'device_binding_admin_metadata');

  assert.ok(category);
  assert.equal(category.trigger, 'device unbind');
  assert.deepEqual(category.activeRetention, {
    mode: 'DURATION',
    value: 24,
    unit: 'MONTHS',
  });
  assert.equal(category.finalDisposition, 'DELETE_OR_IRREVERSIBLY_PSEUDONYMIZE');
  assert.ok(category.holdConditions.includes('DOCUMENTED_SECURITY_OR_SUPPORT_HOLD'));
});

test('dog topology and canonical matrix record device DETACH as implemented', async () => {
  const [topology, matrix] = await Promise.all([
    json('config/privacy/dog-erasure-topology.json'),
    json('config/privacy/erasure-disposition-matrix.json'),
  ]);

  const topologyRow = topology.canonicalForeignKeys.find(
    (row) => row.table === 'devices' && row.column === 'dog_id',
  );
  assert.ok(topologyRow);
  assert.equal(topologyRow.databaseDeleteAction, 'SET_NULL');
  assert.equal(topologyRow.erasureDisposition, 'DETACH');

  const matrixRow = matrix.entries.find(
    (row) =>
      row.subjectRoot === 'dogs.id'
      && row.relationType === 'DIRECT_FK'
      && row.table === 'devices'
      && row.column === 'dog_id',
  );
  assert.ok(matrixRow);
  assert.equal(matrixRow.disposition, 'DETACH');
  assert.equal(matrixRow.executionStatus, 'IMPLEMENTED');
  assert.equal(matrixRow.testEvidence, 'backend/test/privacy-device-detach.test.mjs');
});

test('decision packet and conditional semantics promote device detach without authorising dog erasure', async () => {
  const [packet, semantics] = await Promise.all([
    json('config/privacy/erasure-disposition-decision-packet.json'),
    json('config/privacy/erasure-conditional-semantics.json'),
  ]);

  const packetRow = packet.relations.find(
    (row) =>
      row.subjectRoot === 'dogs.id'
      && row.relationType === 'DIRECT_FK'
      && row.table === 'devices'
      && row.column === 'dog_id',
  );
  assert.ok(packetRow);
  assert.equal(packetRow.disposition, 'DETACH');
  assert.equal(packetRow.executionStatus, 'IMPLEMENTED');
  assert.equal(packetRow.promotionAuthorized, true);
  assert.equal(
    packetRow.approvalRef,
    'config/privacy/retention-schedule.json#device_binding_admin_metadata',
  );

  const semanticRow = semantics.policyDetermined.find(
    (row) => row.relation === 'dogs.id|DIRECT_FK|devices|dog_id',
  );
  assert.ok(semanticRow);
  assert.equal(semanticRow.promotionAuthorized, true);
  assert.equal(semanticRow.executionStatus, 'IMPLEMENTED');
  assert.equal(semanticRow.matrixDisposition, 'DETACH');

  assert.equal(packet.claimsExecutableErasure, false);
  assert.equal(packet.claimsCompleteErasure, false);
  assert.equal(semantics.claimsExecutableErasure, false);
  assert.equal(semantics.claimsCompleteErasure, false);
});
