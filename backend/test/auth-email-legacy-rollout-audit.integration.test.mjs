import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.AUTH_EMAIL_LEGACY_ROLLOUT_DB_INTEGRATION === '1';

let sql = null;
let service = null;
let closeDatabase = null;

const IDS = {
  legacyUnverified: 'd7600000-0000-4000-8000-000000000001',
  legacyVerified: 'd7600000-0000-4000-8000-000000000002',
  requiredUnverified: 'd7600000-0000-4000-8000-000000000003',
  requiredVerified: 'd7600000-0000-4000-8000-000000000004',
  inconsistent: 'd7600000-0000-4000-8000-000000000005',
};

if (enabled) {
  const [{ default: postgres }, serviceModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/auth-email-legacy-rollout-audit.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 2 });
  service = serviceModule;
  closeDatabase = dbModule.closeDatabase;
}

async function cleanup() {
  if (!sql) return;
  await sql`
    DELETE FROM auth_refresh_sessions
    WHERE user_id IN (${Object.values(IDS)})
       OR token_hash = ${'f'.repeat(64)}
  `;
  await sql`DELETE FROM users WHERE id IN (${Object.values(IDS)})`;
}

async function seed() {
  await cleanup();

  await sql`
    INSERT INTO users
      (id, email, password_hash, name, email_verified_at, email_verification_required_at)
    VALUES
      (${IDS.legacyUnverified}, 'legacy-unverified-760@emopet.invalid', 'test-only', 'Legacy Unverified', NULL, NULL),
      (${IDS.legacyVerified}, 'legacy-verified-760@emopet.invalid', 'test-only', 'Legacy Verified', '2026-09-01T10:00:00Z', NULL),
      (${IDS.requiredUnverified}, 'required-unverified-760@emopet.invalid', 'test-only', 'Required Unverified', NULL, '2026-09-29T10:00:00Z'),
      (${IDS.requiredVerified}, 'required-verified-760@emopet.invalid', 'test-only', 'Required Verified', '2026-09-29T10:05:00Z', '2026-09-29T10:00:00Z'),
      (${IDS.inconsistent}, 'inconsistent-760@emopet.invalid', 'test-only', 'Inconsistent', '2026-09-29T09:00:00Z', '2026-09-29T10:00:00Z')
  `;

  let i = 0;
  for (const userId of Object.values(IDS)) {
    i += 1;
    await sql`
      INSERT INTO auth_refresh_sessions
        (user_id, family_id, token_hash, expires_at, created_at)
      VALUES (
        ${userId},
        ${`d7600000-0000-4000-8000-0000000001${String(i).padStart(2, '0')}`},
        ${String(i).repeat(64).slice(0, 64)},
        '2026-10-30T12:00:00Z',
        '2026-09-30T10:00:00Z'
      )
    `;
  }

  await sql`
    INSERT INTO auth_refresh_sessions
      (user_id, family_id, token_hash, expires_at, created_at)
    VALUES (
      NULL,
      'd7600000-0000-4000-8000-000000000199',
      ${'f'.repeat(64)},
      '2026-10-30T12:00:00Z',
      '2026-09-30T10:00:00Z'
    )
  `;
}

async function snapshot() {
  const users = await sql`
    SELECT id, email, password_hash, name, email_verified_at, email_verification_required_at
    FROM users
    WHERE id IN (${Object.values(IDS)})
    ORDER BY id
  `;
  const sessions = await sql`
    SELECT id, user_id, family_id, token_hash, expires_at, revoked_at, revoke_reason, last_used_at, created_at
    FROM auth_refresh_sessions
    WHERE user_id IN (${Object.values(IDS)})
    ORDER BY user_id
  `;
  return { users, sessions };
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('legacy rollout census classifies aggregate cohorts without mutation or identifiers', {
  skip: !enabled,
}, async () => {
  await cleanup();
  const baseline = await service.collectAuthEmailLegacyRolloutCensus(
    () => new Date('2026-09-30T12:00:00.000Z'),
  );

  await seed();
  const before = await snapshot();

  const report = await service.collectAuthEmailLegacyRolloutCensus(
    () => new Date('2026-09-30T12:00:00.000Z'),
  );

  const afterState = await snapshot();
  assert.deepEqual(afterState, before, 'census must be read-only');

  assert.equal(report.schemaVersion, 'auth-email-legacy-rollout-census-v1');
  assert.equal(report.users.total - baseline.users.total, 5);
  assert.equal(report.users.legacyUnverified - baseline.users.legacyUnverified, 1);
  assert.equal(report.users.legacyVerified - baseline.users.legacyVerified, 1);
  assert.equal(
    report.users.verificationRequiredUnverified - baseline.users.verificationRequiredUnverified,
    1,
  );
  assert.equal(
    report.users.verificationRequiredVerified - baseline.users.verificationRequiredVerified,
    2,
  );
  assert.equal(
    report.users.inconsistentVerifiedBeforeRequirement
      - baseline.users.inconsistentVerifiedBeforeRequirement,
    1,
  );

  assert.equal(report.activeRefreshSessions.total - baseline.activeRefreshSessions.total, 6);
  assert.equal(report.activeRefreshSessions.detached - baseline.activeRefreshSessions.detached, 1);
  assert.equal(
    report.activeRefreshSessions.legacyUnverified
      - baseline.activeRefreshSessions.legacyUnverified,
    1,
  );
  assert.equal(
    report.activeRefreshSessions.legacyVerified - baseline.activeRefreshSessions.legacyVerified,
    1,
  );
  assert.equal(
    report.activeRefreshSessions.verificationRequiredUnverified
      - baseline.activeRefreshSessions.verificationRequiredUnverified,
    1,
  );
  assert.equal(
    report.activeRefreshSessions.verificationRequiredVerified
      - baseline.activeRefreshSessions.verificationRequiredVerified,
    2,
  );

  assert.deepEqual(report.authority, {
    mutationAuthorized: false,
    rolloutDecisionAuthorized: false,
  });

  const serialized = JSON.stringify(report);
  for (const forbidden of [
    'legacy-unverified-760@emopet.invalid',
    'required-verified-760@emopet.invalid',
    IDS.legacyUnverified,
    IDS.requiredVerified,
    'test-only',
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});
