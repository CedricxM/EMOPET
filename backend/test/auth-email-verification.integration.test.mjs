import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.AUTH_EMAIL_VERIFICATION_DB_INTEGRATION === '1';

let sql = null;
let service = null;
let closeDatabase = null;
let verifyPassword = null;

if (enabled) {
  const [{ default: postgres }, serviceModule, authSecurityModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/auth-email-verification.js'),
    import('../dist/api/services/auth-security.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 4 });
  service = serviceModule;
  verifyPassword = authSecurityModule.verifyPassword;
  closeDatabase = dbModule.closeDatabase;
}

const USER = 'a7380000-0000-4000-8000-000000000001';
const EMAIL = 'verify-core@emopet.invalid';

async function reset({ verificationRequired = true } = {}) {
  if (!sql) return;
  await sql.unsafe("DELETE FROM users WHERE id = '" + USER + "'");
  await sql.unsafe(
    "INSERT INTO users (id, email, password_hash, name, email_verification_required_at) VALUES ('"
      + USER + "','" + EMAIL + "','provisional-test-only','Verify Core',"
      + (verificationRequired ? "'2026-09-30T07:59:00.000Z'" : "NULL")
      + ")"
  );
}

after(async () => {
  if (sql) {
    await sql.unsafe("DELETE FROM users WHERE id = '" + USER + "'");
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('email verification stores only a digest and enforces cooldown', { skip: !enabled }, async () => {
  await reset();

  const first = await service.issueEmailVerificationToken(
    USER,
    EMAIL,
    () => new Date('2026-09-30T08:00:00.000Z'),
  );
  assert.equal(first.ok, true);
  if (!first.ok) return;

  const [row] = await sql.unsafe(
    "SELECT token_hash, consumed_at, revoked_at FROM auth_email_verification_tokens WHERE user_id = '" + USER + "'"
  );

  assert.equal(row.token_hash, service.hashEmailVerificationToken(first.rawToken));
  assert.notEqual(row.token_hash, first.rawToken);
  assert.equal(row.consumed_at, null);
  assert.equal(row.revoked_at, null);

  assert.deepEqual(
    await service.issueEmailVerificationToken(
      USER,
      EMAIL,
      () => new Date('2026-09-30T08:00:59.999Z'),
    ),
    { ok: false, reason: 'cooldown' },
  );
});

test('concurrent consume has exactly one winner and verifies the user once', { skip: !enabled }, async () => {
  await reset();

  const issued = await service.issueEmailVerificationToken(
    USER,
    EMAIL,
    () => new Date('2026-09-30T09:00:00.000Z'),
  );
  assert.equal(issued.ok, true);
  if (!issued.ok) return;

  const at = new Date('2026-09-30T09:01:00.000Z');
  const passwordA = 'Email Owner Password A 2026!';
  const passwordB = 'Email Owner Password B 2026!';
  const results = await Promise.all([
    service.consumeEmailVerificationToken(issued.rawToken, passwordA, () => at),
    service.consumeEmailVerificationToken(issued.rawToken, passwordB, () => at),
  ]);

  assert.equal(results.filter(Boolean).length, 1);

  const winningPassword = results[0] ? passwordA : passwordB;
  const losingPassword = results[0] ? passwordB : passwordA;

  const [user] = await sql.unsafe(
    "SELECT email_verified_at, password_hash FROM users WHERE id = '" + USER + "'"
  );
  assert.ok(user.email_verified_at instanceof Date);
  assert.equal(await verifyPassword(winningPassword, user.password_hash), true);
  assert.equal(await verifyPassword(losingPassword, user.password_hash), false);
  assert.notEqual(user.password_hash, 'provisional-test-only');

  assert.equal(
    await service.consumeEmailVerificationToken(
      issued.rawToken,
      'Another Password 2026!',
      () => new Date('2026-09-30T09:02:00.000Z'),
    ),
    false,
  );
});


test('legacy account outside rollout cannot receive a verification token', { skip: !enabled }, async () => {
  await reset({ verificationRequired: false });

  assert.deepEqual(
    await service.issueEmailVerificationToken(
      USER,
      EMAIL,
      () => new Date('2026-09-30T10:00:00.000Z'),
    ),
    { ok: false, reason: 'verification_not_required' },
  );

  const rows = await sql.unsafe(
    "SELECT id FROM auth_email_verification_tokens WHERE user_id = '" + USER + "'"
  );
  assert.equal(rows.length, 0);
});
