import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled =
  process.env.DEVICE_CREDENTIAL_ACTIVATION_M5_DB_INTEGRATION === '1';

const OWNER = 'd8560000-0000-4000-8000-000000000001';
const DOG = 'd8560000-0000-4000-8000-000000000002';
const TAG = 'd8560000-0000-4000-8000-000000000003';
const DEBUG = 'd8560000-0000-4000-8000-000000000010';
const TARGET = 'd8560000-0000-4000-8000-000000000011';

let sql = null;
let debugRepo = null;
let targetRepo = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, repoModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/security/device-credential-activation-m5-evidence-repository.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 2 });
  debugRepo = repoModule.durableDeviceCredentialActivationDebugEvidenceRepository;
  targetRepo = repoModule.durableDeviceCredentialActivationTargetEvidenceRepository;
  closeDatabase = dbModule.closeDatabase;
}

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM device_credential_activation_debug_receipts WHERE device_id = ${TAG}`;
  await sql`DELETE FROM device_credential_activation_target_receipts WHERE device_id = ${TAG}`;
  await sql`DELETE FROM devices WHERE id = ${TAG}`;
  await sql`DELETE FROM dogs WHERE id = ${DOG}`;
  await sql`DELETE FROM users WHERE id = ${OWNER}`;
}

async function seed() {
  await cleanup();
  await sql`INSERT INTO users (id,email,password_hash,name) VALUES (${OWNER},'m5-856@emopet.invalid','test-only','M5 Owner')`;
  await sql`INSERT INTO dogs (id,owner_id,name,breed,birth_date,sex,weight,fur_class) VALUES (${DOG},${OWNER},'M5 Dog','Test','2020-01-01','female',20,'FC2')`;
  await sql`INSERT INTO devices (id,dog_id,type,mac_address,firmware_version) VALUES (${TAG},${DOG},'TAG','02:00:00:85:60:01','6.1.0')`;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('read-only repositories return exact controlled M5 + target evidence', { skip: !enabled }, async () => {
  await seed();
  const at = '2026-10-01T13:00:00.000Z';

  await sql`
    INSERT INTO device_credential_activation_debug_receipts
      (receipt_id,device_id,credential_version,authority,debug_state_result,firmware_version,hardware_revision,bootstrap_revision,recorded_at)
    VALUES
      (${DEBUG},${TAG},7,'SERVER_SIDE_PRODUCTION_DEBUG_AUTHORITY','APPROTECT_PRODUCTION_POLICY_VERIFIED','6.1.0','MS88SF3-REV-B','boot-2026-10-01',${at})
  `;
  await sql`
    INSERT INTO device_credential_activation_target_receipts
      (receipt_id,device_id,credential_version,authority,target_result,firmware_version,hardware_revision,bootstrap_revision,recorded_at)
    VALUES
      (${TARGET},${TAG},7,'SERVER_SIDE_TARGET_EVIDENCE_AUTHORITY','REPRESENTATIVE_MS88SF3_NRF52840_VERIFIED','6.1.0','MS88SF3-REV-B','boot-2026-10-01',${at})
  `;

  assert.deepEqual(await debugRepo.findByReceiptId(DEBUG), {
    receiptId: DEBUG,
    authority: 'SERVER_SIDE_PRODUCTION_DEBUG_AUTHORITY',
    deviceId: TAG,
    credentialVersion: 7,
    debugStateResult: 'APPROTECT_PRODUCTION_POLICY_VERIFIED',
    firmwareVersion: '6.1.0',
    hardwareRevision: 'MS88SF3-REV-B',
    bootstrapRevision: 'boot-2026-10-01',
    recordedAt: at,
  });

  assert.deepEqual(await targetRepo.findByReceiptId(TARGET), {
    receiptId: TARGET,
    authority: 'SERVER_SIDE_TARGET_EVIDENCE_AUTHORITY',
    deviceId: TAG,
    credentialVersion: 7,
    targetResult: 'REPRESENTATIVE_MS88SF3_NRF52840_VERIFIED',
    firmwareVersion: '6.1.0',
    hardwareRevision: 'MS88SF3-REV-B',
    bootstrapRevision: 'boot-2026-10-01',
    recordedAt: at,
  });

  assert.equal(await debugRepo.findByReceiptId('not-a-uuid'), null);
  assert.equal(await targetRepo.findByReceiptId('not-a-uuid'), null);
});

test('database rejects forged authorities/results and non-canonical device references', { skip: !enabled }, async () => {
  await seed();
  const at = '2026-10-01T13:00:00.000Z';

  await assert.rejects(sql`
    INSERT INTO device_credential_activation_debug_receipts
      (receipt_id,device_id,credential_version,authority,debug_state_result,firmware_version,hardware_revision,bootstrap_revision,recorded_at)
    VALUES
      (${DEBUG},${TAG},7,'CALLER_ASSERTED','APPROTECT_PRODUCTION_POLICY_VERIFIED','6.1.0','MS88SF3-REV-B','boot-2026-10-01',${at})
  `);

  await assert.rejects(sql`
    INSERT INTO device_credential_activation_target_receipts
      (receipt_id,device_id,credential_version,authority,target_result,firmware_version,hardware_revision,bootstrap_revision,recorded_at)
    VALUES
      (${TARGET},${TAG},7,'SERVER_SIDE_TARGET_EVIDENCE_AUTHORITY','SIMULATED_TARGET_OK','6.1.0','MS88SF3-REV-B','boot-2026-10-01',${at})
  `);

  await assert.rejects(sql`
    INSERT INTO device_credential_activation_debug_receipts
      (receipt_id,device_id,credential_version,authority,debug_state_result,firmware_version,hardware_revision,bootstrap_revision,recorded_at)
    VALUES
      ('d8560000-0000-4000-8000-000000000012','d8560000-0000-4000-8000-000000009999',7,'SERVER_SIDE_PRODUCTION_DEBUG_AUTHORITY','APPROTECT_PRODUCTION_POLICY_VERIFIED','6.1.0','MS88SF3-REV-B','boot-2026-10-01',${at})
  `);
});
