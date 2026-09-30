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
  // Canonical blocks are exercised by user-blocks.integration against PostgreSQL; here an
  // in-memory policy drives the same WorldBlockPolicy port against the real Nakama transport.
  const blocked = new Set();
  const blocks = { async isBlockedEitherWay(x, y) { return blocked.has(`${x}|${y}`) || blocked.has(`${y}|${x}`); } };
  // Canonical pilot access is exercised by world-pilot-access.integration against PostgreSQL; here an
  // in-memory policy drives the WorldAccessPolicy port. The Nakama runtime keeps the env projection.
  const access = { eligible: new Set(ids), async isEligible(id) { return access.eligible.has(id); } };
  // Canonical connections and consent are exercised by social-connections.integration against
  // PostgreSQL; here an in-memory policy drives the WorldSocialPolicy port (#595). A block
  // dissolves the connection, as the canonical repository does.
  const pair = [a, b].sort().join('|');
  const social = { connected: new Set([pair]), consent: new Set(),
    async isMutuallyConnected(x, y) { return social.connected.has([x, y].sort().join('|')) && !await blocks.isBlockedEitherWay(x, y); },
    async connectedPeers(u) { return ids.filter(o => o !== u && social.connected.has([u, o].sort().join('|'))); },
    async hasPresenceConsent(u) { return social.consent.has(u); },
    async grantPresenceConsent(u) { social.consent.add(u); },
    async withdrawPresenceConsent(u) { social.consent.delete(u); } };
  const adapter = new WorldRealtimeAdapter(new NakamaTransport(process.env.NAKAMA_URL ?? 'http://127.0.0.1:7350',
    process.env.NAKAMA_HTTP_KEY ?? ''), access, blocks, social);
  t.after(() => adapter.close());
  // The canonical report sink is covered by world-reports.integration; here a capturing sink
  // checks that a real Nakama sender id is resolved to the canonical subject.
  const filedReports = [];
  const reportSink = { async create(input) { filedReports.push(input); return { id: 'live', kind: input.kind, status: 'open', createdAt: new Date() }; } };
  const app = createWorldSpikeRoutes(adapter, reportSink);
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
  // #595: connections are canonical; World writes no Nakama friend edge.
  assert.deepEqual((await cmd(a, sa, { op: 'friends.list' })).friends, [{ userId: b }]);
  await request(a, `/sessions/${sa.handle}/commands`, { op: 'friends.request', targetUserId: b }, 'POST', 400);
  const group = await cmd(a, sa, { op: 'groups.create', name: `test-${Date.now()}` });
  await cmd(b, sb, { op: 'groups.join', groupId: group.groupId });
  const memberships = await cmd(b, sb, { op: 'groups.list' });
  assert.ok(memberships.user_groups.some(entry => entry.group.id === group.groupId));
  // Invisible by default (#48 L2): B can neither be followed nor publish a status before opting in.
  await request(a, `/sessions/${sa.handle}/commands`, { op: 'presence.follow', targetUserId: b }, 'POST', 404);
  await request(b, `/sessions/${sb.handle}/commands`, { op: 'presence.update', status: 'away' }, 'POST', 403);
  await request(b, `/sessions/${sb.handle}/presence`, undefined, 'POST');
  await cmd(a, sa, { op: 'presence.follow', targetUserId: b });
  await cmd(b, sb, { op: 'presence.update', status: 'away' });
  for (const [id, session] of [[a, sa], [b, sb]]) await cmd(id, session, { op: 'chat.join', groupId: group.groupId });
  // Presets only (#596, #48 L4): a message is identified by its id, never by free text.
  const same = (x, y) => String(x).toLowerCase() === String(y).toLowerCase();
  const first = await cmd(a, sa, { op: 'chat.send', groupId: group.groupId, presetId: 'salut' });
  async function waitFor(id, session, predicate) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const batch = await request(id, `/sessions/${session.handle}/events`, undefined, 'GET');
      if (batch.events.some(predicate)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.fail('Expected realtime event not received');
  }
  await waitFor(b, sb, event => event.type === 'chat' && same(event.value.messageId, first.messageId) && event.value.content.preset === 'salut');
  await waitFor(a, sa, event => event.type === 'presence');

  // #594: A blocks B. Both become mutually and silently invisible on the real transport.
  blocked.add(`${a}|${b}`);
  social.connected.delete(pair); // the canonical block dissolves the connection
  const refused = await request(b, `/sessions/${sb.handle}/commands`, { op: 'presence.follow', targetUserId: a }, 'POST', 404);
  assert.deepEqual(refused, { error: 'unreachable', state: 'rejected' }, 'same answer as an offline participant');
  const fromBlocked = await cmd(b, sb, { op: 'chat.send', groupId: group.groupId, presetId: 'par-ici' });
  const marker = await cmd(a, sa, { op: 'chat.send', groupId: group.groupId, presetId: 'attends' });
  const seen = [];
  const blockDeadline = Date.now() + 10000;
  while (Date.now() < blockDeadline && !seen.some(id => same(id, marker.messageId))) {
    const batch = await request(a, `/sessions/${sa.handle}/events`, undefined, 'GET');
    seen.push(...batch.events.filter(event => event.type === 'chat').map(event => event.value.messageId));
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(seen.some(id => same(id, marker.messageId)), 'own message delivered after the block');
  assert.ok(!seen.some(id => same(id, fromBlocked.messageId)), 'blocked sender filtered out');
  assert.deepEqual((await cmd(a, sa, { op: 'friends.list' })).friends, [], 'the dissolved connection is gone');
  blocked.delete(`${a}|${b}`);
  assert.deepEqual((await cmd(a, sa, { op: 'friends.list' })).friends, [], 'unblocking restores nothing');
  social.connected.add(pair); // a new request was accepted
  tokens.set(a, await signAccessToken(a));
  const oldHandle = sa.handle;
  sa = await request(a, '/bootstrap', { previousHandle: oldHandle });
  await request(a, `/sessions/${oldHandle}/events`, undefined, 'GET', 401);
  const afterReconnect = await cmd(b, sb, { op: 'chat.send', groupId: group.groupId, presetId: 'pret' });
  await waitFor(a, sa, event => event.type === 'chat' && same(event.value.messageId, afterReconnect.messageId));

  // #594 World report: A reports a real message from B using only what the event exposes.
  const reportableSent = await cmd(b, sb, { op: 'chat.send', groupId: group.groupId, presetId: 'merci' });
  await request(b, `/sessions/${sb.handle}/commands`, { op: 'chat.send_text', groupId: group.groupId, text: 'free text' }, 'POST', 400);
  let reportable;
  const reportDeadline = Date.now() + 10000;
  while (!reportable && Date.now() < reportDeadline) {
    const batch = await request(a, `/sessions/${sa.handle}/events`, undefined, 'GET');
    reportable = batch.events.find(event => event.type === 'chat' && same(event.value.messageId, reportableSent.messageId));
    if (!reportable) await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(reportable, 'reportable message received');
  assert.notEqual(reportable.value.senderId, b, 'events expose the Nakama sender id, not the canonical id');
  await request(a, `/sessions/${sa.handle}/reports`, { kind: 'world_message', senderId: reportable.value.senderId,
    messageId: reportable.value.messageId, reason: 'spam' }, 'POST', 201);
  assert.deepEqual(filedReports.at(-1), { reporterUserId: a, subjectUserId: b, kind: 'world_message',
    messageId: reportable.value.messageId.toLowerCase(), reason: 'spam' });
  await cmd(b, sb, { op: 'groups.leave', groupId: group.groupId });

  // #596 (#48 L1 + L7): pilot access revoked elsewhere -> B's next request is refused and its
  // live Nakama socket closed; a canonical revocation (logout hook) closes a new session at once.
  access.eligible.delete(b);
  await request(b, `/sessions/${sb.handle}/commands`, { op: 'friends.list' }, 'POST', 403);
  await request(b, `/sessions/${sb.handle}/events`, undefined, 'GET', 401);
  await request(b, '/bootstrap', {}, 'POST', 403);
  await request(a, `/sessions/${sa.handle}/commands`, { op: 'presence.follow', targetUserId: b }, 'POST', 404);
  access.eligible.add(b);
  const sb2 = await request(b, '/bootstrap', {});
  adapter.revokeActor(b);
  await request(b, `/sessions/${sb2.handle}/events`, undefined, 'GET', 401);

  // #595 (#48 L2): a new session starts invisible; opting in shows B to A, and withdrawing
  // closes B's socket so A sees B leave.
  const sb3 = await request(b, '/bootstrap', {});
  await request(b, `/sessions/${sb3.handle}/commands`, { op: 'presence.update', status: 'online' }, 'POST', 403);
  await request(b, `/sessions/${sb3.handle}/presence`, undefined, 'POST');
  await cmd(b, sb3, { op: 'presence.update', status: 'online' });
  await waitFor(a, sa, event => event.type === 'presence' && event.value.joins.some(row => row.status === 'online'));
  await request(b, `/sessions/${sb3.handle}/presence`, undefined, 'DELETE', 204);
  await request(b, `/sessions/${sb3.handle}/events`, undefined, 'GET', 401);
  await waitFor(a, sa, event => event.type === 'presence' && event.value.leaves.length > 0);
  assert.equal(social.consent.has(b), false);

  // #48 L6: account erasure deletes B's Nakama account; a later bootstrap gets a new Nakama id.
  const erasedTransportId = reportable.value.senderId;
  assert.equal(await adapter.purgeTransportAccount(b), true);
  assert.equal(await adapter.purgeTransportAccount(b), false, 'idempotent: nothing left to delete');
  const recreate = await fetch(new URL('/v2/rpc/emopet_bootstrap?unwrap', process.env.NAKAMA_URL ?? 'http://127.0.0.1:7350'), {
    method: 'POST', headers: { 'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${process.env.NAKAMA_HTTP_KEY}:`).toString('base64')}` },
    body: JSON.stringify({ customId: `emopet:world-spike:v1:${b}` }) });
  assert.equal(recreate.status, 200);
  assert.notEqual((await recreate.json()).userId, erasedTransportId, 'the erased Nakama account is gone');

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
