import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { SignJWT } from 'jose';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'emopet-auth-test-secret-32-characters-minimum';

const {
  hashPassword,
  verifyPassword,
  hashRefreshToken,
} = await import('../dist/api/services/auth-security.js');
const {
  issueRefreshCredential,
  rotateRefreshCredential,
} = await import('../dist/api/services/auth-sessions.js');
const {
  authMiddleware,
  signAccessToken,
  verifyAccessToken,
} = await import('../dist/api/middleware/auth.js');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const TEST_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

function makeRepository() {
  const rows = new Map();
  const locks = [];
  let reads = 0;
  let sequence = 0;

  return {
    rows,
    locks,
    get reads() {
      return reads;
    },
    repository: {
      async findByTokenHash(tokenHash) {
        reads += 1;
        return [...rows.values()].find((row) => row.tokenHash === tokenHash) ?? null;
      },
      async lockFamily(familyId) {
        locks.push(familyId);
      },
      async revokeIfActive(id, reason, at) {
        const row = rows.get(id);
        if (!row || row.revokedAt) return false;
        row.revokedAt = at;
        row.revokeReason = reason;
        return true;
      },
      async revokeActiveFamily(familyId, reason, at) {
        for (const row of rows.values()) {
          if (row.familyId === familyId && !row.revokedAt) {
            row.revokedAt = at;
            row.revokeReason = reason;
          }
        }
      },
      async insert(session) {
        sequence += 1;
        rows.set(`session-${sequence}`, {
          id: `session-${sequence}`,
          ...session,
          revokedAt: null,
          revokeReason: null,
        });
      },
    },
  };
}

test('password hashing is salted and verifies only the correct password', async () => {
  const first = await hashPassword('correct horse battery staple');
  const second = await hashPassword('correct horse battery staple');

  assert.notEqual(first, second);
  assert.equal(await verifyPassword('correct horse battery staple', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
  assert.equal(await verifyPassword('correct horse battery staple', 'not-a-valid-hash'), false);
});

test('refresh credentials persist only a digest, never the raw token', () => {
  const credential = issueRefreshCredential(USER_ID, new Date('2026-09-01T10:00:00Z'));

  assert.match(credential.rawToken, /^emopet_rt_/);
  assert.equal(credential.session.tokenHash, hashRefreshToken(credential.rawToken));
  assert.notEqual(credential.session.tokenHash, credential.rawToken);
  assert.match(credential.session.tokenHash, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(credential.session).includes(credential.rawToken), false);
});

test('access JWT enforces canonical UUID subject and controlled claims', async () => {
  const token = await signAccessToken(USER_ID);
  const verified = await verifyAccessToken(token);

  assert.equal(verified.sub, USER_ID);
  assert.equal(verified.tokenUse, 'access');

  await assert.rejects(() => signAccessToken('not-a-uuid'));

  const nonCanonicalSubject = await new SignJWT({ token_use: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-a')
    .setIssuer('emopet-api')
    .setAudience('emopet-client')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(TEST_SECRET);
  await assert.rejects(() => verifyAccessToken(nonCanonicalSubject));

  const wrongTokenUse = await new SignJWT({ token_use: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(USER_ID)
    .setIssuer('emopet-api')
    .setAudience('emopet-client')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(TEST_SECRET);
  await assert.rejects(() => verifyAccessToken(wrongTokenUse));

  const wrongAudience = await new SignJWT({ token_use: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(USER_ID)
    .setIssuer('emopet-api')
    .setAudience('not-emopet-client')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(TEST_SECRET);
  await assert.rejects(() => verifyAccessToken(wrongAudience));
});

test('auth middleware keeps token failures separate from downstream failures', async () => {
  const app = new Hono();

  app.onError((_error, c) => c.json({ error: 'internal_server_error' }, 500));
  app.use('/api/*', authMiddleware);
  app.get('/api/downstream-failure', () => {
    throw new Error('test-only downstream detail');
  });

  const validToken = await signAccessToken(USER_ID);
  const downstreamFailure = await app.request('/api/downstream-failure', {
    headers: { Authorization: `Bearer ${validToken}` },
  });

  assert.equal(downstreamFailure.status, 500);
  assert.deepEqual(await downstreamFailure.json(), { error: 'internal_server_error' });

  const invalidToken = await app.request('/api/downstream-failure', {
    headers: { Authorization: 'Bearer invalid-token' },
  });

  assert.equal(invalidToken.status, 401);
  assert.deepEqual(await invalidToken.json(), { error: 'Invalid or expired token' });
});

test('refresh rotation locks the family and re-reads state after the lock', async () => {
  const state = makeRepository();
  const initial = issueRefreshCredential(USER_ID, new Date('2026-09-01T10:00:00Z'));
  await state.repository.insert(initial.session);

  const result = await rotateRefreshCredential(
    state.repository,
    initial.rawToken,
    new Date('2026-09-01T10:01:00Z'),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(state.locks, [initial.session.familyId]);
  assert.equal(state.reads, 2);
});

test('refresh rotation consumes once and reuse revokes the active token family', async () => {
  const now = new Date('2026-09-01T10:00:00Z');
  const { rows, repository } = makeRepository();
  const initial = issueRefreshCredential(USER_ID, now);
  await repository.insert(initial.session);

  const rotated = await rotateRefreshCredential(repository, initial.rawToken, new Date('2026-09-01T10:01:00Z'));
  assert.equal(rotated.ok, true);
  if (!rotated.ok) throw new Error('rotation unexpectedly failed');
  assert.equal(rotated.userId, USER_ID);
  assert.notEqual(rotated.credential.rawToken, initial.rawToken);

  const initialRow = [...rows.values()].find((row) => row.tokenHash === initial.session.tokenHash);
  const activeRow = [...rows.values()].find((row) => row.tokenHash === rotated.credential.session.tokenHash);
  assert.equal(initialRow?.revokeReason, 'rotated');
  assert.equal(activeRow?.revokedAt, null);

  const reuse = await rotateRefreshCredential(repository, initial.rawToken, new Date('2026-09-01T10:02:00Z'));
  assert.deepEqual(reuse, { ok: false, reason: 'reuse_detected' });
  assert.equal(activeRow?.revokeReason, 'reuse_detected');
  assert.ok(activeRow?.revokedAt instanceof Date);

  const afterFamilyRevocation = await rotateRefreshCredential(
    repository,
    rotated.credential.rawToken,
    new Date('2026-09-01T10:03:00Z'),
  );
  assert.deepEqual(afterFamilyRevocation, { ok: false, reason: 'invalid_or_expired' });
});

test('expired refresh credential is revoked and cannot rotate', async () => {
  const { rows, repository } = makeRepository();
  const old = issueRefreshCredential(OTHER_USER_ID, new Date('2026-07-01T00:00:00Z'));
  await repository.insert(old.session);

  const result = await rotateRefreshCredential(repository, old.rawToken, new Date('2026-09-01T10:00:00Z'));
  assert.deepEqual(result, { ok: false, reason: 'invalid_or_expired' });

  const row = [...rows.values()][0];
  assert.equal(row.revokeReason, 'expired');
  assert.ok(row.revokedAt instanceof Date);
});
