import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.ACTIVITY_FEATURE_NETWORK_AUTHORITY_DB_INTEGRATION === '1';

const OWNER_A = 'c8111111-1111-4111-8111-111111111111';
const OWNER_B = 'c8222222-2222-4222-8222-222222222222';
const DOG_A = 'd8111111-1111-4111-8111-111111111111';
const DOG_B = 'd8222222-2222-4222-8222-222222222222';
const TAG_A = 'e8111111-1111-4111-8111-111111111111';
const TAG_B = 'e8222222-2222-4222-8222-222222222222';
const MAT_A = 'e8333333-3333-4333-8333-333333333333';

let sql = null;
let authorize = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, authorityModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/activity-feature-network-authority.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  authorize = authorityModule.authorizeActivityFeatureNetworkIngress;
  closeDatabase = dbModule.closeDatabase;
}

const candidate = {
  schemaVersion: 'activity-feature-forwarding-v1',
  dogId: DOG_A,
  deviceId: TAG_A,
  frame: {
    transportVersion: 1,
    source: 'TAG',
    featureKey: 'activity_variability',
    featureContractVersion: 'tag-activity-variability-cv30m-v1',
    sequence: 44,
    bootSessionId: 0x10203040,
    windowEndMs: 3_600_000,
    windowSeconds: 1800,
    validSeconds: 1700,
    observationStatus: 'OBSERVED',
    nullReason: null,
    qualityState: 'VALID',
    value: 0.42,
  },
  clockAnchor: {
    strategy: 'BOOT_ANCHOR_V1',
    bootSessionId: 0x10203040,
    anchorDeviceMs: 3_700_000,
    anchorUtc: '2026-09-27T15:00:00.000Z',
    uncertaintyMs: 80,
  },
};

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM devices WHERE id IN (${TAG_A}, ${TAG_B}, ${MAT_A})`;
  await sql`DELETE FROM dogs WHERE id IN (${DOG_A}, ${DOG_B})`;
  await sql`DELETE FROM users WHERE id IN (${OWNER_A}, ${OWNER_B})`;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('network ingress authority rechecks Owner/dog/TAG registry binding and then fails on Device Trust', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await sql`
    INSERT INTO users (id, email, password_hash, name) VALUES
      (${OWNER_A}, 'network-authority-a@emopet.invalid', 'test-only', 'Owner A'),
      (${OWNER_B}, 'network-authority-b@emopet.invalid', 'test-only', 'Owner B')
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class) VALUES
      (${DOG_A}, ${OWNER_A}, 'Dog A', 'Test', '2020-01-01', 'female', 20.0, 'FC2'),
      (${DOG_B}, ${OWNER_B}, 'Dog B', 'Test', '2021-01-01', 'male', 21.0, 'FC2')
  `;

  await sql`
    INSERT INTO devices (id, dog_id, type, mac_address, firmware_version) VALUES
      (${TAG_A}, ${DOG_A}, 'TAG', '02:00:00:00:81:11', '6.1.0'),
      (${TAG_B}, ${DOG_B}, 'TAG', '02:00:00:00:82:22', '6.1.0'),
      (${MAT_A}, ${DOG_A}, 'MAT', '02:00:00:00:83:33', '6.1.0')
  `;

  assert.deepEqual(
    await authorize(OWNER_B, candidate),
    { ok: false, error: 'OWNER_OR_DOG_NOT_FOUND' },
  );

  assert.deepEqual(
    await authorize(OWNER_A, { ...candidate, deviceId: TAG_B }),
    { ok: false, error: 'DEVICE_BINDING_INVALID' },
  );

  assert.deepEqual(
    await authorize(OWNER_A, { ...candidate, deviceId: MAT_A }),
    { ok: false, error: 'DEVICE_BINDING_INVALID' },
  );

  assert.deepEqual(
    await authorize(OWNER_A, candidate),
    { ok: false, error: 'DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED' },
  );

  const trusted = {
    async verify(request) {
      return {
        ok: true,
        principalId: request.deviceId,
        evidenceVersion: 'test-device-trust-v1',
      };
    },
  };

  assert.deepEqual(
    await authorize(OWNER_A, candidate, trusted),
    {
      ok: true,
      canonicalDeviceId: TAG_A,
      trustEvidenceVersion: 'test-device-trust-v1',
    },
  );

  const mismatchedPrincipal = {
    async verify() {
      return {
        ok: true,
        principalId: TAG_B,
        evidenceVersion: 'test-device-trust-v1',
      };
    },
  };

  assert.deepEqual(
    await authorize(OWNER_A, candidate, mismatchedPrincipal),
    { ok: false, error: 'DEVICE_BINDING_INVALID' },
  );
});
