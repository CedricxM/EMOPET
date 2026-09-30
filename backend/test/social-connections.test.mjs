import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Hono } from 'hono';

const { createConnectionRoutes } = await import('../dist/api/routes/connections.js');
const { orderedPair } = await import('../dist/api/services/social-connections.js');

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const migration = read('../db/migrations/0030_world_social_connections.sql');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

test('WORLD-SOCIAL-02 (#595): one row per unordered pair, states gate actions only', () => {
  for (const constraint of [
    'CONSTRAINT chk_social_connections_ordered_pair CHECK (user_low_id < user_high_id)',
    "CONSTRAINT chk_social_connections_status CHECK (status IN ('PENDING', 'CONNECTED', 'DECLINED'))",
    "CONSTRAINT chk_social_connections_connected_at CHECK ((status = 'CONNECTED') = (connected_at IS NOT NULL))",
    'CONSTRAINT uq_social_connections_pair UNIQUE (user_low_id, user_high_id)',
  ]) assert.ok(migration.includes(constraint), constraint);
  assert.match(migration, /CHECK \(status = 'CONNECTED' OR \(NOT low_trusts_high AND NOT high_trusts_low\)\)/);
  assert.doesNotMatch(migration, /\b(score|rank|points|level|message|text|lat|lon|dog_id)\b\s+(INT|NUMERIC|TEXT|VARCHAR|UUID|DOUBLE)/i);
  assert.doesNotMatch(migration, /ON DELETE/i);
});

test('presence consent is per session, purpose-bound and withdrawable', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS world_presence_consents/);
  assert.match(migration, /CONSTRAINT chk_world_presence_consents_window CHECK \(expires_at > granted_at\)/);
  assert.match(migration, /withdrawn_at TIMESTAMPTZ,/);
});

test('pairs are ordered the way PostgreSQL compares UUIDs, and a pair with oneself is refused', () => {
  assert.deepEqual(orderedPair(B, A.toUpperCase()), { low: A, high: B, aIsLow: false });
  assert.throws(() => orderedPair(A, A.toUpperCase()), /invalid_request/);
});

function app(repository) {
  const outer = new Hono();
  outer.use('*', async (c, next) => { c.set('userId', A); await next(); });
  outer.route('/', createConnectionRoutes(repository));
  return outer;
}
const call = (target, method, path, body) => target.request(path, { method, headers: { 'Content-Type': 'application/json' },
  ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });

test('routes: strict bodies, the verified actor only, and silence for declines and blocks', async () => {
  const seen = [];
  const outcome = { request: 'pending', accept: 'connected', trust: 'ok' };
  const repository = {
    async request(actor, target) { seen.push(['request', actor, target]); return outcome.request; },
    async accept(actor, requester) { seen.push(['accept', actor, requester]); return outcome.accept; },
    async decline(actor, requester) { seen.push(['decline', actor, requester]); },
    async cancel(actor, target) { seen.push(['cancel', actor, target]); },
    async remove(actor, other) { seen.push(['remove', actor, other]); },
    async setTrust(actor, other, trusted) { seen.push(['trust', actor, other, trusted]); return outcome.trust; },
    async list(actor) { return { connections: [], incoming: [], outgoing: [], actor }; },
  };
  const api = app(repository);
  for (const body of [{}, { targetUserId: 'x' }, { targetUserId: A }, { targetUserId: B, ownerId: B }, 'nope']) {
    assert.equal((await call(api, 'POST', '/requests', body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await call(api, 'POST', '/requests', { targetUserId: B })).status, 202);
  outcome.request = 'connected';
  assert.equal((await call(api, 'POST', '/requests', { targetUserId: B.toUpperCase() })).status, 200);
  outcome.request = 'target_not_found'; // unknown user, or blocked either way: same answer
  assert.equal((await call(api, 'POST', '/requests', { targetUserId: B })).status, 404);
  assert.equal((await call(api, 'POST', `/requests/${B}/decline`)).status, 204);
  assert.equal((await call(api, 'POST', `/requests/${A}/accept`)).status, 400, 'self');
  outcome.accept = 'not_found';
  assert.equal((await call(api, 'POST', `/requests/${B}/accept`)).status, 404);
  assert.equal((await call(api, 'DELETE', `/requests/${B}`)).status, 204);
  assert.equal((await call(api, 'DELETE', `/${B}`)).status, 204);
  assert.equal((await call(api, 'PUT', `/${B}/trust`, { trusted: 'yes' })).status, 400);
  assert.equal((await call(api, 'PUT', `/${B}/trust`, { trusted: true, score: 5 })).status, 400);
  assert.deepEqual(await (await call(api, 'PUT', `/${B}/trust`, { trusted: true })).json(), { state: 'TRUSTED' });
  outcome.trust = 'not_connected';
  assert.equal((await call(api, 'PUT', `/${B}/trust`, { trusted: false })).status, 404);
  assert.ok(seen.every(([, actor]) => actor === A), 'the actor is always the verified subject');
  assert.ok(seen.every((entry) => entry.slice(2, 3).every((id) => id === B)), 'ids are normalised to lowercase');
});

test('routes fail closed with a controlled 503 when the database is unavailable', async () => {
  const down = new Proxy({}, { get: () => async () => { throw new Error('database down: secret-connection-string'); } });
  const response = await call(app(down), 'POST', '/requests', { targetUserId: B });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret/);
});
