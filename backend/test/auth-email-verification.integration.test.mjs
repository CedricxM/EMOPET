import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.AUTH_EMAIL_VERIFICATION_DB_INTEGRATION === '1';

let sql = null;
let service = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, serviceModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/auth-email-verification.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 4 });
  service = serviceModule;
  closeDatabase = dbModule.closeDatabase;
}

const USER = 'a7380000-0000-4000-8000-000000000001';
const EMAIL = 'verify-core@emopet.invalid';

async function reset() {
  if (!sql) return;
  await sql.unsafe("DELETE FROM users WHERE id = '" + USER + "'");
  await sql.unsafe(
    "INSERT INTO users (id, email, password_hash, name) VALUES ('"
      + USER + "','" + EMAIL + "','test-only','Verify Core')"
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
  const results = await Promise.all([
    service.consumeEmailVerificationToken(issued.rawToken, () => at),
    service.consumeEmailVerificationToken(issued.rawToken, () => at),
  ]);

  assert.equal(results.filter(Boolean).length, 1);

  const [user] = await sql.unsafe(
    "SELECT email_verified_at FROM users WHERE id = '" + USER + "'"
  );
  assert.ok(user.email_verified_at instanceof Date);

  assert.equal(
    await service.consumeEmailVerificationToken(
      issued.rawToken,
      () => new Date('2026-09-30T09:02:00.000Z'),
    ),
    false,
  );
});
