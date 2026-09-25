/** SPIKE / NOT PRODUCTION AUTHORITY. Explicitly opt-in, synthetic users only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WorldRealtimeAdapter } from '../dist/api/services/world-spike/adapter.js';
import { NakamaTransport } from '../dist/api/services/world-spike/nakama.js';
import { createWorldSpikeRoutes } from '../dist/api/routes/world-spike.js';
import { signAccessToken } from '../dist/api/middleware/auth.js';

const enabled = process.env.WORLD_SPIKE_INTEGRATION === 'true';
test('live two-user Hono → Nakama social slice, renewal, and service outage', { skip: !enabled, timeout: 120000 }, async t => {
  assert.notEqual(process.env.NODE_ENV, 'production');
  process.env.NODE_ENV = 'test';
  // Local test issuer only: exercise the canonical signer/middleware, not account provisioning.
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  const ids = (process.env.WORLD_SPIKE_TEST_USER_IDS ?? '').split(',').map(id => id.trim());
  assert.equal(ids.length, 2, 'Configure exactly two synthetic UUIDs for this harness');
  const [a, b] = ids;
  const adapter = new WorldRealtimeAdapter(new NakamaTransport(process.env.NAKAMA_URL ?? 'http://127.0.0.1:7350',
    process.env.NAKAMA_HTTP_KEY ?? ''), new Set(ids));
  t.after(() => adapter.close());
  const app = createWorldSpikeRoutes(adapter);
  const tokens = new Map(await Promise.all(ids.map(async id => [id, await signAccessToken(id)])));
  async function request(id, path, body, method = 'POST', expected = 200) {
    const response = await app.request(path, { method,
      headers: { Authorization: `Bearer ${tokens.get(id)}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = response.status === 204 ? null : await response.json();
    assert.equal(response.status, expected, JSON.stringify(result));
    return result;
  }
  let sa = await request(a, '/bootstrap', {});
  const sb = await request(b, '/bootstrap', {});
  const cmd = async (id, session, command) => (await request(id, `/sessions/${session.handle}/commands`, command)).result;
  await cmd(a, sa, { op: 'friends.request', targetUserId: b });
  // Repeated harness runs may already be friends; inspect before accepting.
  const incoming = await cmd(b, sb, { op: 'friends.list' });
  if (incoming.friends.some(friend => friend.state === 2)) await cmd(b, sb, { op: 'friends.accept', targetUserId: a });
  const friends = await cmd(a, sa, { op: 'friends.list' });
  assert.ok(friends.friends.some(friend => friend.state === 0));
  const group = await cmd(a, sa, { op: 'groups.create', name: `test-${Date.now()}` });
  await cmd(b, sb, { op: 'groups.join', groupId: group.groupId });
  const memberships = await cmd(b, sb, { op: 'groups.list' });
  assert.ok(memberships.user_groups.some(entry => entry.group.id === group.groupId));
  await cmd(a, sa, { op: 'presence.follow', targetUserId: b });
  await cmd(b, sb, { op: 'presence.update', status: 'away' });
  for (const [id, session] of [[a, sa], [b, sb]]) await cmd(id, session, { op: 'chat.join', groupId: group.groupId });
  await cmd(a, sa, { op: 'chat.send', groupId: group.groupId, text: 'synthetic-test-message' });
  async function waitFor(id, session, predicate) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const batch = await request(id, `/sessions/${session.handle}/events`, undefined, 'GET');
      if (batch.events.some(predicate)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.fail('Expected realtime event not received');
  }
  await waitFor(b, sb, event => event.type === 'chat' && event.value.content.text === 'synthetic-test-message');
  await waitFor(a, sa, event => event.type === 'presence');
  tokens.set(a, await signAccessToken(a));
  const oldHandle = sa.handle;
  sa = await request(a, '/bootstrap', { previousHandle: oldHandle });
  await request(a, `/sessions/${oldHandle}/events`, undefined, 'GET', 401);
  await cmd(b, sb, { op: 'chat.send', groupId: group.groupId, text: 'after-reconnect' });
  await waitFor(a, sa, event => event.type === 'chat' && event.value.content.text === 'after-reconnect');
  await cmd(b, sb, { op: 'groups.leave', groupId: group.groupId });
  await request(b, `/sessions/${sb.handle}`, undefined, 'DELETE', 204);

  // Direct custom authentication and user-session bootstrap must not be an identity bypass.
  const base = process.env.NAKAMA_URL ?? 'http://127.0.0.1:7350';
  const direct = await fetch(`${base}/v2/account/authenticate/custom?create=true`, { method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${process.env.NAKAMA_SERVER_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json' }, body: JSON.stringify({ id: `emopet:world-spike:v1:${a}` }) });
  assert.equal(direct.status, 403);
  const noKey = await fetch(`${base}/v2/rpc/emopet_bootstrap?unwrap`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customId: `emopet:world-spike:v1:${a}` }) });
  assert.equal(noKey.status, 401);
  const bootstrapUrl = new URL('/v2/rpc/emopet_bootstrap', base);
  bootstrapUrl.searchParams.set('unwrap', '');
  const bootstrap = await fetch(bootstrapUrl, { method: 'POST', headers: { 'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${process.env.NAKAMA_HTTP_KEY}:`).toString('base64')}` },
    body: JSON.stringify({ customId: `emopet:world-spike:v1:${a}` }) });
  assert.equal(bootstrap.status, 200);
  const serverSession = await bootstrap.json();
  const fromUser = await fetch(`${base}/v2/rpc/emopet_bootstrap?unwrap`, { method: 'POST',
    headers: { Authorization: `Bearer ${serverSession.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ customId: `emopet:world-spike:v1:${b}` }) });
  assert.equal(fromUser.status, 403);

  if (process.env.WORLD_SPIKE_OUTAGE_TEST === 'true') {
    const cwd = fileURLToPath(new URL('../../infra/nakama/', import.meta.url));
    const compose = args => {
      const result = spawnSync('docker', ['compose', '--env-file', '.env', '-f', 'compose.yml', ...args],
        { cwd, encoding: 'utf8', timeout: 60000, windowsHide: true });
      assert.equal(result.status, 0, 'Docker Compose lifecycle command failed');
    };
    try {
      compose(['stop', 'nakama']);
      const response = await request(a, '/bootstrap', { previousHandle: sa.handle }, 'POST', 503);
      assert.equal(response.state, 'degraded');
    } finally { compose(['up', '-d', '--wait', 'nakama']); }
    sa = await request(a, '/bootstrap', {});
    assert.equal(sa.state, 'connected');
  } else t.diagnostic('Service interruption NOT RUN: set WORLD_SPIKE_OUTAGE_TEST=true for the full acceptance gate.');
});
