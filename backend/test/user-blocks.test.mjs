import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Hono } from 'hono';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'user-blocks-synthetic-test-secret-not-production';

const { createBlockRoutes } = await import('../dist/api/routes/blocks.js');
const { BLOCK_ENFORCEMENT } = await import('../dist/api/services/user-blocks.js');
const { authMiddleware, signAccessToken } = await import('../dist/api/middleware/auth.js');

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

function fakeRepository({ known = [A, B], fail = false } = {}) {
  const rows = [];
  const calls = [];
  const guard = () => { if (fail) throw new Error('database down: secret-connection-string'); };
  return {
    rows, calls,
    async create(blocker, blocked) {
      guard(); calls.push(['create', blocker, blocked]);
      if (!known.includes(blocked)) return { result: 'target_not_found' };
      const existing = rows.find((r) => r.blocker === blocker && r.blocked === blocked);
      if (existing) return { result: 'exists', block: { blockedUserId: blocked, createdAt: existing.createdAt } };
      const row = { blocker, blocked, createdAt: new Date('2026-09-27T10:00:00Z') };
      rows.push(row);
      return { result: 'created', block: { blockedUserId: blocked, createdAt: row.createdAt } };
    },
    async remove(blocker, blocked) {
      guard(); calls.push(['remove', blocker, blocked]);
      const i = rows.findIndex((r) => r.blocker === blocker && r.blocked === blocked);
      if (i >= 0) rows.splice(i, 1);
    },
    async list(blocker) {
      guard(); calls.push(['list', blocker]);
      return rows.filter((r) => r.blocker === blocker).map((r) => ({ blockedUserId: r.blocked, createdAt: r.createdAt }));
    },
    async isBlockedEitherWay(a, b) {
      return rows.some((r) => (r.blocker === a && r.blocked === b) || (r.blocker === b && r.blocked === a));
    },
  };
}

function app(repository) {
  const root = new Hono();
  root.use('*', authMiddleware);
  root.route('/api/blocks', createBlockRoutes(repository));
  return root;
}

async function call(root, userId, method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (userId) headers.Authorization = `Bearer ${await signAccessToken(userId)}`;
  const response = await root.request(path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers };
}

test('block requires a verified JWT and binds the blocker to the token subject', async () => {
  const repository = fakeRepository();
  const root = app(repository);
  assert.equal((await call(root, null, 'POST', '/api/blocks', { targetUserId: B })).status, 401);
  assert.equal(repository.calls.length, 0);

  // A client-supplied owner/blocker field is rejected, never trusted.
  const spoofed = await call(root, A, 'POST', '/api/blocks', { targetUserId: B, blockerUserId: C });
  assert.equal(spoofed.status, 400);
  assert.equal(repository.calls.length, 0);

  const created = await call(root, A, 'POST', '/api/blocks', { targetUserId: B });
  assert.equal(created.status, 201);
  assert.deepEqual(repository.calls.at(-1), ['create', A, B]);
  assert.equal(created.headers.get('Cache-Control'), 'private, no-store');
});

test('block is idempotent, one-sided, and discloses that no surface enforces it yet', async () => {
  const repository = fakeRepository();
  const root = app(repository);
  const first = await call(root, A, 'POST', '/api/blocks', { targetUserId: B });
  const again = await call(root, A, 'POST', '/api/blocks', { targetUserId: B });
  assert.equal(first.status, 201);
  assert.equal(again.status, 200);
  assert.equal(repository.rows.length, 1);
  assert.deepEqual(first.body.enforcement, { community: 'ENFORCED', world: 'NOT_ENFORCED' });
  assert.deepEqual(first.body.enforcement, BLOCK_ENFORCEMENT);

  // One-sided: B's own list is empty, and nothing tells B about A's block.
  assert.deepEqual((await call(root, B, 'GET', '/api/blocks')).body.blocks, []);
  assert.equal((await call(root, A, 'GET', '/api/blocks')).body.blocks[0].blockedUserId, B);
  assert.equal(await repository.isBlockedEitherWay(B, A), true);
});

test('invalid, self and unknown targets are rejected without storing anything', async () => {
  const repository = fakeRepository();
  const root = app(repository);
  for (const body of [{}, { targetUserId: 'not-a-uuid' }, { targetUserId: B, reason: 'free text' }, [B], null]) {
    assert.equal((await call(root, A, 'POST', '/api/blocks', body)).status, 400, JSON.stringify(body));
  }
  const self = await call(root, A, 'POST', '/api/blocks', { targetUserId: A.toUpperCase() });
  assert.equal(self.status, 400);
  const unknown = await call(root, A, 'POST', '/api/blocks', { targetUserId: C });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.code, 'BLOCK_TARGET_NOT_FOUND');
  assert.equal(repository.rows.length, 0);
});

test('unblock is scoped to the caller, idempotent and reveals nothing', async () => {
  const repository = fakeRepository();
  const root = app(repository);
  await call(root, A, 'POST', '/api/blocks', { targetUserId: B });
  // B cannot remove A's block on B.
  assert.equal((await call(root, B, 'DELETE', `/api/blocks/${A}`)).status, 204);
  assert.equal(repository.rows.length, 1);
  assert.equal((await call(root, A, 'DELETE', `/api/blocks/${B}`)).status, 204);
  assert.equal(repository.rows.length, 0);
  assert.equal((await call(root, A, 'DELETE', `/api/blocks/${B}`)).status, 204);
  assert.equal((await call(root, A, 'DELETE', '/api/blocks/nope')).status, 400);
});

test('database failure is a controlled 503 without upstream details', async () => {
  const root = app(fakeRepository({ fail: true }));
  const response = await call(root, A, 'POST', '/api/blocks', { targetUserId: B });
  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { error: 'Blocks are temporarily unavailable', code: 'BLOCKS_DATABASE_UNAVAILABLE' });
});

test('schema and migration keep blocks canonical, minimal and erasure-neutral', () => {
  const migration = readFileSync(new URL('../db/migrations/0021_user_blocks.sql', import.meta.url), 'utf8');
  const schema = readFileSync(new URL('../db/schema/user-blocks.ts', import.meta.url), 'utf8');
  const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(--|\/\/).*$/gm, '');
  for (const source of [code(migration), code(schema)]) {
    assert.match(source, /chk_user_blocks_not_self/);
    assert.match(source, /uq_user_blocks_pair/);
    assert.doesNotMatch(source, /reason|ON DELETE|onDelete/i, 'no stored reason and no inferred erasure behaviour');
  }
  assert.match(migration, /user_blocks_blocker_user_id_users_id_fk/);
  assert.match(migration, /user_blocks_blocked_user_id_users_id_fk/);
  const index = readFileSync(new URL('../api/index.ts', import.meta.url), 'utf8');
  assert.match(index, /app\.route\('\/api\/blocks', blocks\)/);
  // Community enforces blocks on the feed, events and comment creation (#594).
  const community = readFileSync(new URL('../api/routes/community.ts', import.meta.url), 'utf8');
  assert.match(community, /eq\(posts\.communityId, communityId\), notBlockedWith\(userId, posts\.authorId\)/);
  assert.match(community, /notBlockedWith\(userId, communityEvents\.createdBy\)/);
  assert.match(community, /eq\(posts\.id, body\.postId\), notBlockedWith\(userId, posts\.authorId\)/);
});

test('every account-topology user relation has an erasure residue probe and a discovery count', () => {
  const topology = JSON.parse(readFileSync(new URL('../../config/privacy/account-erasure-topology.json', import.meta.url), 'utf8'));
  const residue = readFileSync(new URL('../api/services/erasure-residue-verification.ts', import.meta.url), 'utf8');
  const missing = topology.directUserReferences
    .map((row) => `${row.table}.${row.column}`)
    .filter((relation) => !residue.includes(`probe('${relation}'`));
  assert.deepEqual(missing, [], 'a user relation without a residue probe would let erasure leave undetected rows');
  const discovery = readFileSync(new URL('../api/services/subject-discovery.ts', import.meta.url), 'utf8');
  assert.match(discovery, /userBlocksCreated: counted\(await countWhere\(tx, userBlocks, eq\(userBlocks\.blockerUserId, userId\)\)\)/);
  assert.match(discovery, /userBlocksReceived: counted\(await countWhere\(tx, userBlocks, eq\(userBlocks\.blockedUserId, userId\)\)/);
});
