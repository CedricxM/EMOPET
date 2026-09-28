import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFile(path.join(root, rel), 'utf8');

const [configSource, schema, migration, service] = await Promise.all([
  read('config/security/device-credential-repository-v1.json'),
  read('backend/db/schema/device-identity.ts'),
  read('backend/db/migrations/0020_device_identity_credentials.sql'),
  read('backend/api/security/device-credential-repository.ts'),
]);
const config = JSON.parse(configSource);

async function collectFiles(target) {
  const entries = await readdir(target, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(child));
    else files.push(child);
  }
  return files;
}

test('credential persistence is bound to canonical devices.id and public material only', () => {
  assert.match(schema, /references\(\(\) => devices\.id\)/);
  assert.match(migration, /device_id uuid NOT NULL REFERENCES devices\(id\)/);

  for (const required of [
    'credential_version',
    'key_slot',
    'psa_key_id',
    'public_key_base64url',
    'firmware_version',
    'hardware_revision',
    'bootstrap_revision',
    'private_key_exported',
  ]) {
    assert.ok(migration.includes(required), required);
  }

  assert.doesNotMatch(
    migration,
    /\bprivate_key\s+(?:bytea|text|varchar|jsonb)/i,
  );
  assert.doesNotMatch(
    migration,
    /\bsecret(?:_material|_key)?\s+(?:bytea|text|varchar|jsonb)/i,
  );
});

test('database invariants preserve one active, one pending and exact slot mapping', () => {
  for (const token of [
    'uq_device_identity_credentials_device_version',
    'uq_device_identity_credentials_device_slot',
    'uq_device_identity_credentials_one_active_per_device',
    'uq_device_identity_credentials_one_pending_per_device',
    "WHERE state = 'ACTIVE'",
    "WHERE state = 'PENDING_PROOF'",
    "(key_slot = 'A' AND psa_key_id = 65536)",
    "(key_slot = 'B' AND psa_key_id = 65537)",
    "'PENDING_PROOF', 'ACTIVE', 'REVOKED_PENDING_ERASE'",
    "^B[A-P][A-Za-z0-9_-]{85}$",
  ]) {
    assert.ok(migration.includes(token), token);
  }
});

test('enrollment writes PENDING_PROOF only and owns no lifecycle mutation', () => {
  assert.match(service, /DeviceIdentityEnrollmentReceiptV1Schema\.safeParse/);
  assert.match(service, /\.for\('update'\)/);
  assert.match(service, /device\.type !== 'TAG'/);
  assert.match(service, /bytes\.length !== 65/);
  assert.match(service, /bytes\[0\] !== 0x04/);
  assert.match(service, /state:\s*'PENDING_PROOF'/);

  assert.doesNotMatch(service, /\.update\(deviceIdentityCredentials\)/);
  assert.doesNotMatch(service, /\.delete\(deviceIdentityCredentials\)/);
  // ACTIVE may appear in the read-only resolver contract, but enrollment owns
  // no credential UPDATE/DELETE path and its only insert state is PENDING_PROOF.
  assert.equal(config.runtime.activeTransitionImplemented, false);
  assert.equal(config.runtime.httpEnrollmentRouteImplemented, false);
  assert.equal(config.hardStops.deviceDataTrust, 'BLOCKED');
  assert.equal(config.hardStops.telemetryPersistence, 'BLOCKED');
});

test('ACTIVE resolver is read-only and cannot expose PENDING_PROOF', () => {
  assert.match(service, /durableDevicePopCredentialRepository/);
  assert.match(
    service,
    /eq\(deviceIdentityCredentials\.state, 'ACTIVE'\)/,
  );
  assert.match(service, /if \(!row \|\| row\.state !== 'ACTIVE'\) return null/);
});

test('no public backend route imports the enrollment repository', async () => {
  const routeDir = path.join(root, 'backend/api/routes');
  const routeFiles = (await collectFiles(routeDir))
    .filter((file) => /\.(?:ts|js)$/.test(file));
  for (const file of routeFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /device-credential-repository/,
      `unexpected enrollment runtime route: ${path.relative(root, file)}`,
    );
  }
});
