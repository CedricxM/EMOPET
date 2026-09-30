import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { SignJWT } from 'jose';
import { WorldRealtimeAdapter, customIdentity } from '../dist/api/services/world-spike/adapter.js';
import { createWorldSpikeRoutes, configuredWorldSpike, parseWorldCommand } from '../dist/api/routes/world-spike.js';
import { signAccessToken } from '../dist/api/middleware/auth.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'world-spike-synthetic-test-secret-not-production';
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const GROUP = '33333333-3333-4333-8333-333333333333';
function setup(t, options = {}) {
  let now = Date.now();
  const connections = [], calls = [], sleeps = [];
  const transport = {
    async connect(identity, signal, event, disconnected) {
      if (options.connect) return options.connect(identity, signal, event, disconnected);
      const connection = { identity, event, disconnected, closed: false,
        userId: identity.endsWith(A) ? A : B, expiresAt: now + 300000,
        close() { this.closed = true; },
        async execute(command, target) { calls.push({ command, target }); return options.execute ? options.execute(command) : { ok: true }; },
      };
      connections.push(connection);
      return connection;
    },
    deleted: [],
    async deleteAccount(identity) { transport.deleted.push(identity); return !options.noAccount; },
  };
  const blocked = new Set();
  const policy = { lookups: 0, down: false, async isBlockedEitherWay(x, y) {
    policy.lookups++;
    if (policy.down) throw new Error('database down: secret-connection-string');
    return blocked.has(`${x}|${y}`) || blocked.has(`${y}|${x}`);
  } };
  // Canonical pilot access (#596): invited adult tester with a live login, re-read on every request.
  const access = { eligible: new Set([A, B]), down: false, async isEligible(id) {
    if (access.down) throw new Error('database down: secret-connection-string');
    return access.eligible.has(id);
  } };
  // Canonical connections and presence consent (#595): A and B connected, both opted in.
  const pair = (x, y) => [x, y].sort().join('|');
  const social = { connected: new Set([pair(A, B)]), consent: new Set([A, B]), down: false, grants: [], withdrawals: [],
    check() { if (social.down) throw new Error('database down: secret-connection-string'); },
    async isMutuallyConnected(x, y) { social.check(); return social.connected.has(pair(x, y)) && !blocked.has(`${x}|${y}`) && !blocked.has(`${y}|${x}`); },
    async connectedPeers(u) { social.check(); return [A, B].filter(o => o !== u && social.connected.has(pair(u, o))); },
    async hasPresenceConsent(u) { social.check(); return social.consent.has(u); },
    async grantPresenceConsent(u, expiresAt) { social.check(); social.grants.push([u, expiresAt]); social.consent.add(u); },
    async withdrawPresenceConsent(u) { social.withdrawals.push(u); social.check(); social.consent.delete(u); } };
  const adapter = new WorldRealtimeAdapter(transport, access, policy, social, () => now, async ms => { sleeps.push(ms); }, options.deadline ?? 100,
    { freeText: options.freeText === true });
  t.after(() => adapter.close());
  return { adapter, connections, calls, sleeps, transport, policy, access, social, expire: () => { now += 400000; }, exp: now + 600000,
    block: (blocker, target) => blocked.add(`${blocker}|${target}`), unblock: (blocker, target) => blocked.delete(`${blocker}|${target}`) };
}
test('canonical mapping normalizes UUIDs and rejects arbitrary identities', () => {
  assert.equal(customIdentity(A), `emopet:world-spike:v1:${A}`);
  const uuid = 'abcdefab-abcd-4abc-8abc-abcdefabcdef';
  assert.equal(customIdentity(uuid.toUpperCase()), customIdentity(uuid));
  assert.throws(() => customIdentity('client-owner'), /forbidden/);
});
test('default off, production refused, loopback configuration required', () => {
  assert.equal(configuredWorldSpike({}), null);
  assert.throws(() => configuredWorldSpike({ WORLD_NAKAMA_SPIKE_ENABLED: 'true', NODE_ENV: 'production' }), /local/);
  assert.throws(() => configuredWorldSpike({ WORLD_NAKAMA_SPIKE_ENABLED: 'true', NODE_ENV: 'test',
    NAKAMA_URL: 'https://example.com', NAKAMA_HTTP_KEY: 'a'.repeat(64) }), /loopback/);
});
test('a valid configuration is still refused on a runtime without WebSocket (Node 20)', t => {
  const original = globalThis.WebSocket;
  t.after(() => { globalThis.WebSocket = original; });
  globalThis.WebSocket = undefined;
  assert.throws(() => configuredWorldSpike({ WORLD_NAKAMA_SPIKE_ENABLED: 'true', NODE_ENV: 'test',
    NAKAMA_URL: 'https://example.com', NAKAMA_HTTP_KEY: 'a'.repeat(64) }), /loopback/, 'configuration is refused first');
  assert.throws(() => configuredWorldSpike({ WORLD_NAKAMA_SPIKE_ENABLED: 'true', NODE_ENV: 'test',
    NAKAMA_URL: 'http://127.0.0.1:7350', NAKAMA_HTTP_KEY: 'a'.repeat(64) }), /Node >=22/);
});
test('unconfigured actor and cross-user handles fail closed', async t => {
  const { adapter, exp } = setup(t);
  await assert.rejects(adapter.bootstrap(GROUP, exp), /forbidden/);
  await assert.rejects(adapter.bootstrap(A, NaN), /invalid_session/);
  const session = await adapter.bootstrap(A, exp);
  await assert.rejects(adapter.events(B, session.handle), /invalid_session/);
  await assert.rejects(adapter.execute(B, session.handle, { op: 'friends.list' }), /invalid_session/);
  assert.throws(() => adapter.disconnect(B, session.handle), /invalid_session/);
});
test('routes reject missing, malformed, expired and wrong-purpose canonical JWTs before bootstrap', async t => {
  const { adapter, connections } = setup(t);
  const app = createWorldSpikeRoutes(adapter);
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const expired = await new SignJWT({ token_use: 'access' }).setProtectedHeader({ alg: 'HS256' }).setSubject(A)
    .setIssuer('emopet-api').setAudience('emopet-client').setExpirationTime('0s').sign(secret);
  const wrong = await new SignJWT({ token_use: 'refresh' }).setProtectedHeader({ alg: 'HS256' }).setSubject(A)
    .setIssuer('emopet-api').setAudience('emopet-client').setExpirationTime('15m').sign(secret);
  for (const token of ['', 'not-a-jwt', expired, wrong]) {
    const response = await app.request('/bootstrap', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: '{}' });
    assert.equal(response.status, 401);
  }
  assert.equal(connections.length, 0);
});
test('routes bind actor to JWT and reject injected ownership or protected payloads', async t => {
  const { adapter, connections } = setup(t);
  const app = createWorldSpikeRoutes(adapter);
  const headers = { Authorization: `Bearer ${await signAccessToken(A)}`, 'Content-Type': 'application/json', 'X-User-Id': B };
  for (const body of [{ userId: B }, { ownerId: B }, { previousHandle: null }, { consent: true }]) {
    assert.equal((await app.request('/bootstrap', { method: 'POST', headers, body: JSON.stringify(body) })).status, 400);
  }
  const response = await app.request('/bootstrap', { method: 'POST', headers, body: '{}' });
  assert.equal(response.status, 200);
  const session = await response.json();
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(connections[0].identity, customIdentity(A));
  assert.deepEqual(Object.keys(session).sort(), ['expiresAt', 'handle', 'state']);
  const bad = await app.request(`/sessions/${session.handle}/commands`, { method: 'POST', headers,
    body: JSON.stringify({ op: 'presence.update', status: 'online', userId: B }) });
  assert.equal(bad.status, 400);
  const tooLarge = await app.request('/bootstrap', { method: 'POST', headers, body: JSON.stringify({ text: 'x'.repeat(5000) }) });
  assert.equal(tooLarge.status, 413);
});
test('strict social contracts reject protected-domain input and unbounded text', () => {
  for (const value of [{ op: 'eli.update' }, { op: 'chat.send', groupId: GROUP, text: 'free text' },
    { op: 'chat.send', groupId: GROUP, presetId: 'insulte' }, { op: 'chat.send', groupId: GROUP, presetId: 'toString' },
    { op: 'chat.send_text', groupId: GROUP, text: 'x' },
    { op: 'presence.update', status: 'diagnosis' }, { op: 'groups.create', name: 'test', billing: {} },
    { op: 'friends.request', targetUserId: 'arbitrary' }, { op: 'friends.request', targetUserId: B },
    { op: 'friends.accept', targetUserId: B }, { op: 'toString' }, null]) assert.throws(() => parseWorldCommand(value));
});
test('Friends, Groups, Presence and Chat go only through adapter transport', async t => {
  const { adapter, calls, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  await adapter.bootstrap(B, exp);
  await adapter.showPresence(A, a.handle);
  assert.deepEqual(await adapter.execute(A, a.handle, { op: 'friends.list' }), { friends: [{ userId: B }] });
  const commands = [
    { op: 'groups.create', name: 'synthetic' }, { op: 'groups.list' }, { op: 'groups.join', groupId: GROUP },
    { op: 'presence.follow', targetUserId: B }, { op: 'presence.update', status: 'online' },
    { op: 'chat.join', groupId: GROUP }, { op: 'chat.send', groupId: GROUP, presetId: 'salut' },
    { op: 'groups.leave', groupId: GROUP },
  ];
  for (const command of commands) await adapter.execute(A, a.handle, parseWorldCommand(command));
  assert.deepEqual(calls.map(c => c.command), commands, 'the connection list never reaches Nakama');
  assert.equal(calls.find(c => c.command.op === 'presence.follow').target, B);
});
test('bounded event polling signals overflow and consumes events once', async t => {
  const { adapter, connections, exp } = setup(t);
  const session = await adapter.bootstrap(A, exp);
  for (let i = 0; i < 105; i++) connections[0].event({ type: 'chat', value: { senderId: A, messageId: String(i), content: { preset: 'salut' } } });
  const events = await adapter.events(A, session.handle);
  assert.equal(events.events.length, 100);
  assert.equal(events.events[0].value.messageId, '5');
  assert.equal(events.resyncRequired, true);
  assert.equal((await adapter.events(A, session.handle)).events.length, 0);
});
test('unavailable bootstrap returns controlled degraded response without upstream secrets', async t => {
  const { adapter } = setup(t, { connect: async () => { throw new Error('secret-upstream-detail'); } });
  const app = createWorldSpikeRoutes(adapter);
  const response = await app.request('/bootstrap', { method: 'POST', headers: { Authorization: `Bearer ${await signAccessToken(A)}` }, body: '{}' });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'unavailable', state: 'degraded' });
});
test('late connect after deadline is closed and never installed', async t => {
  let release, closed = false;
  const { adapter, exp } = setup(t, { deadline: 10, connect: () => new Promise(resolve => {
    release = () => resolve({ userId: A, expiresAt: Date.now() + 10000, close: () => { closed = true; } });
  }) });
  await assert.rejects(adapter.bootstrap(A, exp), /timeout/);
  release();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(closed, true);
});
test('reconnect restores subscriptions but never replays chat or social writes', async t => {
  const { adapter, connections, calls, exp } = setup(t);
  let a = await adapter.bootstrap(A, exp);
  await adapter.bootstrap(B, exp);
  await adapter.execute(A, a.handle, { op: 'presence.follow', targetUserId: B });
  await adapter.execute(A, a.handle, { op: 'chat.join', groupId: GROUP });
  await adapter.execute(A, a.handle, { op: 'chat.send', groupId: GROUP, presetId: 'merci' });
  connections[0].disconnected();
  assert.equal((await adapter.events(A, a.handle)).state, 'degraded');
  const old = a.handle;
  a = await adapter.bootstrap(A, exp, old);
  assert.notEqual(a.handle, old);
  assert.equal(connections[0].closed, true);
  await assert.rejects(adapter.events(A, old), /invalid_session/);
  assert.equal(calls.filter(c => c.command.op === 'chat.send').length, 1);
  assert.equal(calls.filter(c => c.command.op === 'chat.join').length, 2);
  assert.equal(calls.filter(c => c.command.op === 'presence.follow').length, 2);
});
test('reconnect has three attempts, bounded backoff, and no unauthenticated retry loop', async t => {
  const { adapter, transport, sleeps, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  let attempts = 0;
  transport.connect = async () => { attempts++; throw Error('down'); };
  await assert.rejects(adapter.bootstrap(A, exp, a.handle), /unavailable/);
  assert.equal(attempts, 3);
  assert.deepEqual(sleeps, [250, 500]);
});
test('expiry, replacement and explicit disconnect close sessions', async t => {
  const { adapter, connections, expire, exp } = setup(t);
  const first = await adapter.bootstrap(A, exp);
  const second = await adapter.bootstrap(A, exp);
  assert.equal(connections[0].closed, true);
  await assert.rejects(adapter.events(A, first.handle), /invalid_session/);
  adapter.disconnect(A, second.handle);
  assert.equal(connections[1].closed, true);
  const third = await adapter.bootstrap(A, exp);
  expire();
  await assert.rejects(adapter.events(A, third.handle), /invalid_session/);
  assert.equal(connections[2].closed, true);
});
test('mutation timeout degrades socket, discards late result, and rejects concurrent commands', async t => {
  let finish;
  const { adapter, connections, exp } = setup(t, { deadline: 15, execute: () => new Promise(resolve => { finish = resolve; }) });
  const session = await adapter.bootstrap(A, exp);
  const pending = adapter.execute(A, session.handle, { op: 'groups.create', name: 'uncertain' });
  await assert.rejects(adapter.execute(A, session.handle, { op: 'friends.list' }), /busy/);
  await assert.rejects(pending, /timeout/);
  finish({ secret: 'must not escape' });
  assert.equal(connections[0].closed, true);
  assert.equal((await adapter.events(A, session.handle)).state, 'degraded');
});
test('runtime bootstrap rejects direct sessions, unmapped users, and malformed identity before account creation', () => {
  const context = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../../infra/nakama/runtime/world.js', import.meta.url), 'utf8'), context);
  const registered = {};
  const rpcs = {};
  context.InitModule({}, {}, {}, new Proxy({}, { get: (_, name) => (...args) => {
    if (name === 'registerRpc') rpcs[args[0]] = args[1]; else registered[name] = args;
  } }));
  const bootstrap = rpcs.emopet_bootstrap;
  let writes = 0;
  const nk = { authenticateCustom: () => { writes++; return { userId: B, username: 'synthetic' }; },
    authenticateTokenGenerate: () => ({ token: 'server-generated' }) };
  const ctx = { env: { WORLD_SPIKE_TEST_USER_IDS: A } };
  const spaced = { env: { WORLD_SPIKE_TEST_USER_IDS: ` ${B}, ${A.toUpperCase()} ` } };
  assert.equal(JSON.parse(bootstrap(spaced, {}, nk, JSON.stringify({ customId: customIdentity(A) }))).userId, B);
  writes = 0;
  assert.throws(() => bootstrap({ ...ctx, userId: B }, {}, nk, JSON.stringify({ customId: customIdentity(A) })));
  assert.throws(() => bootstrap(ctx, {}, nk, JSON.stringify({ customId: customIdentity(B) })));
  assert.throws(() => bootstrap(ctx, {}, nk, JSON.stringify({ customId: customIdentity(A), ownerId: B })));
  assert.equal(writes, 0);
  const result = JSON.parse(bootstrap(ctx, {}, nk, JSON.stringify({ customId: customIdentity(A) })));
  assert.equal(result.userId, B);
  assert.equal(writes, 1);
  for (const [name, args] of Object.entries(registered)) if (name !== 'registerRpc') assert.throws(() => args[0]());
});
test('authority firewall: spike modules have no durable repositories or protected-state imports', () => {
  const directory = new URL('../api/services/world-spike/', import.meta.url);
  for (const name of readdirSync(directory)) {
    const source = readFileSync(new URL(name, directory), 'utf8');
    const imports = source.match(/(?:import|export)[\s\S]*?from\s+['"][^'"]+['"]/g) ?? [];
    for (const statement of imports) assert.doesNotMatch(statement, /db\/|eli-engine|consent|moderation|billing|dog-ownership/);
  }
});
test('rejected commands keep the session; self-target and offline target fail without degrading', async t => {
  const { adapter, connections, calls, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  await assert.rejects(adapter.execute(A, a.handle, { op: 'presence.follow', targetUserId: A }), /invalid_request/);
  await assert.rejects(adapter.execute(A, a.handle, { op: 'presence.follow', targetUserId: B }), /unreachable/);
  assert.equal(calls.length, 0, 'target errors must not reach the transport');
  assert.equal((await adapter.events(A, a.handle)).state, 'connected');
  assert.equal(connections[0].closed, false);
  await adapter.execute(A, a.handle, { op: 'friends.list' });
  assert.equal((await adapter.events(A, a.handle)).state, 'connected');
});
test('transport invalid_request does not degrade, and renewal skips a follow whose target is offline', async t => {
  const { WorldError } = await import('../dist/api/services/world-spike/contracts.js');
  let reject = false;
  const { adapter, connections, calls, exp } = setup(t, { execute: () => {
    if (reject) throw new WorldError('invalid_request');
    return { ok: true };
  } });
  let a = await adapter.bootstrap(A, exp);
  const b = await adapter.bootstrap(B, exp);
  await adapter.execute(A, a.handle, { op: 'presence.follow', targetUserId: B });
  await adapter.execute(A, a.handle, { op: 'chat.join', groupId: GROUP });
  reject = true;
  await assert.rejects(adapter.execute(A, a.handle, { op: 'chat.send', groupId: GROUP, presetId: 'attends' }), /invalid_request/);
  assert.equal((await adapter.events(A, a.handle)).state, 'connected');
  reject = false;
  adapter.disconnect(B, b.handle);
  connections[0].disconnected();
  a = await adapter.bootstrap(A, exp, a.handle);
  assert.equal(a.state, 'connected');
  assert.equal(calls.filter(c => c.command.op === 'presence.follow').length, 1, 'offline follow not replayed');
  assert.equal(calls.filter(c => c.command.op === 'chat.join').length, 2, 'chat subscription restored');
});

test('blocks either way make targeted commands unreachable exactly like an offline participant', async t => {
  const { adapter, calls, exp, block, unblock } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  const b = await adapter.bootstrap(B, exp);
  block(A, B);
  for (const [actor, handle, target] of [[A, a.handle, B], [B, b.handle, A]]) {
    for (const op of ['presence.follow']) {
      await assert.rejects(adapter.execute(actor, handle, { op, targetUserId: target }), /unreachable/, `${op} from ${actor}`);
    }
  }
  assert.equal(calls.length, 0, 'a blocked command never reaches Nakama');
  assert.equal((await adapter.events(A, a.handle)).state, 'connected');
  assert.equal((await adapter.events(B, b.handle)).state, 'connected');
  // Same answer as offline: the blocked person cannot tell a block from absence.
  adapter.disconnect(A, a.handle);
  unblock(A, B);
  await assert.rejects(adapter.execute(B, b.handle, { op: 'presence.follow', targetUserId: A }), /unreachable/);
});

test('friend lists, presence and chat hide blocked participants both ways, including buffered events', async t => {
  const { adapter, connections, exp, block, social } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  const b = await adapter.bootstrap(B, exp);
  const chat = (sender, text) => ({ type: 'chat', value: { channelId: 'g', senderId: sender, messageId: text, content: { text } } });
  const presence = (...ids) => ({ type: 'presence', value: { joins: ids.map(user_id => ({ user_id, status: 'online' })), leaves: [] } });
  // Buffered before the block exists: filtering at read time still applies.
  connections[0].event(chat(B, 'from-b'));
  connections[0].event(chat(A, 'own-echo'));
  connections[0].event(presence(B));
  connections[0].event(chat('unknown-transport-id', 'unknown'));
  connections[0].event({ type: 'unexpected', value: {} });
  connections[1].event(chat(A, 'from-a'));
  connections[1].event(presence(A, B));
  block(A, B);
  const forA = await adapter.events(A, a.handle);
  assert.deepEqual(forA.events.map(e => e.value.messageId ?? 'presence'), ['own-echo']);
  const forB = await adapter.events(B, b.handle);
  assert.equal(forB.events.length, 1);
  assert.deepEqual(forB.events[0].value.joins.map(p => p.user_id), [B], 'the blocker is not visible to the blocked person');
  // The canonical block dissolves the connection (#595), so the canonical list drops B.
  social.connected.clear();
  assert.deepEqual((await adapter.execute(A, a.handle, { op: 'friends.list' })).friends, []);
});

test('renewal drops a follow whose target is now blocked', async t => {
  const { adapter, connections, calls, exp, block } = setup(t);
  let a = await adapter.bootstrap(A, exp);
  await adapter.bootstrap(B, exp);
  await adapter.execute(A, a.handle, { op: 'presence.follow', targetUserId: B });
  await adapter.execute(A, a.handle, { op: 'chat.join', groupId: GROUP });
  block(B, A);
  connections[0].disconnected();
  a = await adapter.bootstrap(A, exp, a.handle);
  assert.equal(a.state, 'connected');
  assert.equal(calls.filter(c => c.command.op === 'presence.follow').length, 1, 'blocked follow is not restored');
  assert.equal(calls.filter(c => c.command.op === 'chat.join').length, 2);
});

test('unknown block state fails closed without degrading the session or losing events', async t => {
  const { adapter, connections, calls, policy, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  await adapter.bootstrap(B, exp);
  connections[0].event({ type: 'chat', value: { senderId: B, messageId: 'kept', content: { preset: 'salut' } } });
  policy.down = true;
  await assert.rejects(adapter.execute(A, a.handle, { op: 'presence.follow', targetUserId: B }), /unavailable/);
  await assert.rejects(adapter.events(A, a.handle), /unavailable/);
  assert.equal(calls.length, 0);
  policy.down = false;
  const batch = await adapter.events(A, a.handle);
  assert.equal(batch.state, 'connected');
  assert.deepEqual(batch.events.map(e => e.value.messageId), ['kept'], 'events stay buffered until blocks can be checked');
  const blocked = await createWorldSpikeRoutes(adapter).request(`/sessions/${a.handle}/commands`, { method: 'POST',
    headers: { Authorization: `Bearer ${await signAccessToken(A)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'presence.follow', targetUserId: A }) });
  assert.equal(blocked.status, 400, 'self target stays a 400');
});

test('World wires the canonical block repository by default and maps unreachable to 404', async () => {
  const route = readFileSync(new URL('../api/routes/world-spike.ts', import.meta.url), 'utf8');
  assert.match(route, /blocks: WorldBlockPolicy = drizzleUserBlockRepository\(\)/);
  assert.match(route, /code === 'unreachable' \? 404/);
  const { BLOCK_ENFORCEMENT } = await import('../dist/api/services/user-blocks.js');
  assert.equal(BLOCK_ENFORCEMENT.world, 'ENFORCED_WHEN_WORLD_ENABLED');
  assert.equal(BLOCK_ENFORCEMENT.community, 'ENFORCED');
});

test('World reports resolve only people and messages delivered to the verified session', async t => {
  const { adapter, connections, exp, block } = setup(t);
  const filed = [];
  const sink = { async create(input) { filed.push(input); return { id: 'r1', kind: input.kind, status: 'open', createdAt: new Date(0) }; } };
  const app = createWorldSpikeRoutes(adapter, sink);
  const a = await adapter.bootstrap(A, exp);
  await adapter.bootstrap(B, exp);
  const post = async (body, actor = A, handle = a.handle) => app.request(`/sessions/${handle}/reports`, { method: 'POST',
    headers: { Authorization: `Bearer ${await signAccessToken(actor)}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const MESSAGE = '44444444-4444-4444-8444-444444444444';
  const OTHER_MESSAGE = '55555555-5555-4555-8555-555555555555';
  // Merely existing in the same process is not enough.
  assert.equal((await post({ kind: 'world_user', targetUserId: B, reason: 'harassment' })).status, 400);
  assert.equal((await post({ kind: 'world_message', senderId: B, messageId: MESSAGE, reason: 'spam' })).status, 400);
  // A receives this exact message; only then does server-side attribution become reportable.
  connections[0].event({ type: 'chat', value: { channelId: 'g', senderId: B, messageId: MESSAGE, content: { preset: 'merci' } } });
  assert.equal((await adapter.events(A, a.handle)).events.length, 1);
  block(A, B);
  // Reporting remains possible after a block because the encounter receipt predates it.
  assert.equal((await post({ kind: 'world_user', targetUserId: B, reason: 'harassment' })).status, 201);
  assert.equal((await post({ kind: 'world_message', senderId: B, messageId: MESSAGE, reason: 'spam', details: 'x' })).status, 201);
  assert.deepEqual(filed, [
    { reporterUserId: A, subjectUserId: B, kind: 'world_user', reason: 'harassment' },
    { reporterUserId: A, subjectUserId: B, kind: 'world_message', messageId: MESSAGE, reason: 'spam', details: 'x' },
  ]);
  for (const bad of [
    { kind: 'world_user', targetUserId: A, reason: 'spam' },
    { kind: 'world_user', targetUserId: B, reason: 'spam', reporterUserId: B },
    { kind: 'world_user', targetUserId: B, reason: 'not-a-reason' },
    { kind: 'world_message', senderId: 'unknown-transport-id', messageId: MESSAGE, reason: 'spam' },
    { kind: 'world_message', senderId: B, messageId: OTHER_MESSAGE, reason: 'spam' },
    { kind: 'world_message', senderId: B, messageId: 'nope', reason: 'spam' },
    { kind: 'post', contentId: MESSAGE, reason: 'spam' },
  ]) assert.equal((await post(bad)).status, 400, JSON.stringify(bad));
  assert.equal(filed.length, 2);
  // Another actor cannot file through A's session.
  assert.equal((await post({ kind: 'world_user', targetUserId: A, reason: 'spam' }, B, a.handle)).status, 401);
  // No canonical queue wired: refuse instead of pretending the report was filed.
  const unwired = await createWorldSpikeRoutes(adapter).request(`/sessions/${a.handle}/reports`, { method: 'POST',
    headers: { Authorization: `Bearer ${await signAccessToken(A)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'world_user', targetUserId: B, reason: 'spam' }) });
  assert.equal(unwired.status, 503);
});

test('World wires the canonical moderation queue for reports by default', () => {
  const route = readFileSync(new URL('../api/routes/world-spike.ts', import.meta.url), 'utf8');
  assert.match(route, /reports: WorldReportSink = drizzleWorldReportSink\(\)/);
  assert.match(route, /return createWorldSpikeRoutes\(adapter, reports, \{ freeText \}\)/);
});

// WORLD-SOCIAL-03 (#596): canonical pilot access, immediate revocation, presets only.
test('an account without pilot access is refused at bootstrap; access is re-read on every request', async t => {
  const { adapter, connections, access, exp } = setup(t);
  access.eligible.delete(B);
  await assert.rejects(adapter.bootstrap(B, exp), /forbidden/);
  assert.equal(connections.length, 0, 'no transport session for an unflagged account');
  const a = await adapter.bootstrap(A, exp);
  access.eligible.delete(A); // revoked outside this process (operator, logout_all elsewhere)
  await assert.rejects(adapter.execute(A, a.handle, { op: 'friends.list' }), /forbidden/);
  assert.equal(connections[0].closed, true, 'the live socket is closed within that one request');
  await assert.rejects(adapter.events(A, a.handle), /invalid_session/);
});
test('revokeActor closes the live World session at once and refuses its handle', async t => {
  const { adapter, connections, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  const b = await adapter.bootstrap(B, exp);
  adapter.revokeActor(A);
  assert.equal(connections[0].closed, true);
  assert.equal(connections[1].closed, false, 'other people keep their session');
  await assert.rejects(adapter.execute(A, a.handle, { op: 'friends.list' }), /invalid_session/);
  assert.equal((await adapter.events(B, b.handle)).state, 'connected');
  adapter.revokeActor('not-a-canonical-id');
});
test('a revocation during bootstrap never registers the new handle', async t => {
  let revokeMidway;
  const { adapter, connections, exp } = setup(t, { connect: (identity) => {
    revokeMidway();
    const connection = { userId: A, expiresAt: Date.now() + 300000, closed: false, close() { this.closed = true; },
      async execute() { return { ok: true }; } };
    connections.push(connection);
    return connection;
  } });
  revokeMidway = () => adapter.revokeActor(A);
  await assert.rejects(adapter.bootstrap(A, exp), /forbidden/);
  assert.equal(connections[0].closed, true);
});
test('a target revoked elsewhere looks offline and its session is closed', async t => {
  const { adapter, connections, access, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  await adapter.bootstrap(B, exp);
  access.eligible.delete(B);
  await assert.rejects(adapter.execute(A, a.handle, { op: 'presence.follow', targetUserId: B }), /unreachable/);
  assert.equal(connections[1].closed, true);
  assert.equal((await adapter.events(A, a.handle)).state, 'connected', 'the actor keeps its session');
});
test('an unknown access state fails closed without leaking the cause', async t => {
  const { adapter, access, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  access.down = true;
  await assert.rejects(adapter.bootstrap(B, exp), /unavailable/);
  await assert.rejects(adapter.execute(A, a.handle, { op: 'friends.list' }), error => error.code === 'unavailable' && !/secret/.test(error.message));
});
test('chat carries only a closed-list preset id; free text stays behind a default-off flag', async t => {
  const { adapter, calls, exp } = setup(t);
  assert.deepEqual(parseWorldCommand({ op: 'chat.send', groupId: GROUP, presetId: 'merci' }), { op: 'chat.send', groupId: GROUP, presetId: 'merci' });
  assert.throws(() => parseWorldCommand({ op: 'chat.send_text', groupId: GROUP, text: 'hello' }), /invalid_request/);
  assert.equal(parseWorldCommand({ op: 'chat.send_text', groupId: GROUP, text: 'hello' }, { freeText: true }).text, 'hello');
  const a = await adapter.bootstrap(A, exp);
  const headers = { Authorization: `Bearer ${await signAccessToken(A)}`, 'Content-Type': 'application/json' };
  const send = (app, body) => app.request(`/sessions/${a.handle}/commands`, { method: 'POST', headers, body: JSON.stringify(body) });
  const presetsOnly = createWorldSpikeRoutes(adapter);
  assert.equal((await send(presetsOnly, { op: 'chat.send_text', groupId: GROUP, text: 'hello' })).status, 400);
  assert.equal((await send(presetsOnly, { op: 'chat.send', groupId: GROUP, presetId: 'nope' })).status, 400);
  assert.equal((await send(presetsOnly, { op: 'chat.send', groupId: GROUP, presetId: 'bien-joue' })).status, 200);
  assert.deepEqual(calls.at(-1).command, { op: 'chat.send', groupId: GROUP, presetId: 'bien-joue' });
  const flagged = createWorldSpikeRoutes(adapter, undefined, { freeText: true });
  assert.equal((await send(flagged, { op: 'chat.send_text', groupId: GROUP, text: 'hello' })).status, 200);
});
test('the preset list is the #46 Quiet Social Layer first slice, labels only for clients', async () => {
  const { WORLD_PRESETS } = await import('../dist/api/services/world-spike/contracts.js');
  assert.deepEqual(Object.values(WORLD_PRESETS), ['Salut', 'Par ici', 'J’ai trouvé quelque chose', 'Prêt·e', 'Attends',
    'Bien joué', 'Merci', 'Je quitte', 'Pas maintenant']);
});
test('World user reports require an encounter actually delivered to this session', async t => {
  const { adapter, connections, exp } = setup(t);
  const sink = { async create(input) { return { id: 'r1', kind: input.kind, status: 'open', createdAt: new Date(0) }; } };
  const app = createWorldSpikeRoutes(adapter, sink);
  const a = await adapter.bootstrap(A, exp);
  const headers = { Authorization: `Bearer ${await signAccessToken(A)}`, 'Content-Type': 'application/json' };
  const report = (targetUserId) => app.request(`/sessions/${a.handle}/reports`, { method: 'POST', headers,
    body: JSON.stringify({ kind: 'world_user', targetUserId, reason: 'spam' }) });
  assert.equal((await report(B)).status, 400, 'never seen in World');
  const b = await adapter.bootstrap(B, exp);
  assert.equal((await report(B)).status, 400, 'bootstrap alone is not an encounter');
  connections[0].event({ type: 'chat', value: { channelId: 'g', senderId: B,
    messageId: '66666666-6666-4666-8666-666666666666', content: { preset: 'salut' } } });
  await adapter.events(A, a.handle);
  adapter.disconnect(B, b.handle);
  assert.equal((await report(B)).status, 201, 'a delivered encounter remains reportable after leaving');
});
test('the configured spike subscribes the adapter to canonical revocation', () => {
  const route = readFileSync(new URL('../api/routes/world-spike.ts', import.meta.url), 'utf8');
  assert.match(route, /onActorRevoked\(async \(userId, reason\) => \{\s+adapter\.revokeActor\(userId\);/);
  assert.match(route, /access: WorldAccessPolicy = drizzleWorldPilotAccess\(\)/);
  assert.doesNotMatch(route, /env\['WORLD_SPIKE_TEST_USER_IDS'\]/);
  assert.match(route, /const freeText = env\['WORLD_SPIKE_FREE_TEXT'\] === 'true';/);
  assert.match(route, /new WorldRealtimeAdapter\(transport, access, blocks, social, undefined, undefined, undefined, \{ freeText \}\)/);
});

// WORLD-SOCIAL-02 (#595): canonical connections and presence consent.
test('presence is invisible by default: a status needs this session\'s opt-in, recorded canonically', async t => {
  const { adapter, calls, social, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  await assert.rejects(adapter.execute(A, a.handle, { op: 'presence.update', status: 'online' }), /forbidden/);
  assert.equal(calls.length, 0);
  const shown = await adapter.showPresence(A, a.handle);
  assert.equal(shown.presence, 'visible');
  assert.deepEqual(social.grants.map(([u, until]) => [u, until.getTime()]), [[A, shown.until]], 'consent ends with the session');
  await adapter.execute(A, a.handle, { op: 'presence.update', status: 'away' });
  social.consent.delete(A); // withdrawn or expired elsewhere
  await assert.rejects(adapter.execute(A, a.handle, { op: 'presence.update', status: 'online' }), /forbidden/);
});
test('presence is followed only between mutually connected people who opted in; otherwise it looks offline', async t => {
  const { adapter, calls, social, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  await adapter.bootstrap(B, exp);
  social.connected.clear();
  await assert.rejects(adapter.execute(A, a.handle, { op: 'presence.follow', targetUserId: B }), /unreachable/);
  social.connected.add([A, B].sort().join('|'));
  social.consent.delete(B);
  await assert.rejects(adapter.execute(A, a.handle, { op: 'presence.follow', targetUserId: B }), /unreachable/);
  assert.equal(calls.length, 0, 'nothing reaches Nakama');
  social.consent.add(B);
  await adapter.execute(A, a.handle, { op: 'presence.follow', targetUserId: B });
});
test('presence events show arrivals only for consenting connections, departures to connections, and only who and online/away', async t => {
  const { adapter, connections, social, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  await adapter.bootstrap(B, exp);
  const join = { type: 'presence', value: { joins: [{ user_id: B, status: 'online', location: { lat: 47.7, lon: -3.3 }, dog: 'Gus', eli: 72, session_id: 's' }], leaves: [], stream: 'x' } };
  connections[0].event(join);
  assert.deepEqual((await adapter.events(A, a.handle)).events, [{ type: 'presence', value: { joins: [{ user_id: B, status: 'online' }], leaves: [] } }]);
  social.consent.delete(B);
  connections[0].event(join);
  connections[0].event({ type: 'presence', value: { joins: [], leaves: [{ user_id: B }] } });
  assert.deepEqual((await adapter.events(A, a.handle)).events, [{ type: 'presence', value: { joins: [], leaves: [{ user_id: B }] } }],
    'no arrival without consent, but a known departure is still shown');
  social.connected.clear();
  connections[0].event({ type: 'channel-presence', value: { joins: [], leaves: [{ user_id: B }] } });
  assert.deepEqual((await adapter.events(A, a.handle)).events, [], 'strangers are never shown');
  connections[0].event({ type: 'presence', value: { joins: [{ user_id: B, status: 'diagnosis: anxious' }] } });
  assert.deepEqual((await adapter.events(A, a.handle)).events, []);
});
test('chat events carry only sender, message id and a preset (or allowed text)', async t => {
  const { adapter, connections, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  await adapter.bootstrap(B, exp);
  connections[0].event({ type: 'chat', value: { channelId: 'g', senderId: B, messageId: 'm1', content: { preset: 'merci', lat: 1 }, dogId: 'x' } });
  connections[0].event({ type: 'chat', value: { channelId: 'g', senderId: B, messageId: 'm2', content: { preset: 'not-a-preset' } } });
  connections[0].event({ type: 'chat', value: { channelId: 'g', senderId: B, messageId: 'm3', content: { text: 'must stay hidden' } } });
  assert.deepEqual((await adapter.events(A, a.handle)).events, [{ type: 'chat', value: { channelId: 'g', senderId: B, messageId: 'm1', content: { preset: 'merci' } } }]);
});
test('incoming free text is visible only behind the explicit free-text flag', async t => {
  const { adapter, connections, exp } = setup(t, { freeText: true });
  const a = await adapter.bootstrap(A, exp);
  await adapter.bootstrap(B, exp);
  connections[0].event({ type: 'chat', value: { channelId: 'g', senderId: B, messageId: 'm4', content: { text: 'explicitly enabled' } } });
  assert.deepEqual((await adapter.events(A, a.handle)).events,
    [{ type: 'chat', value: { channelId: 'g', senderId: B, messageId: 'm4', content: { text: 'explicitly enabled' } } }]);
});
test('withdrawing presence closes the socket first, even if recording the withdrawal fails', async t => {
  const { adapter, connections, social, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  await adapter.showPresence(A, a.handle);
  social.down = true;
  await assert.rejects(adapter.hidePresence(A, a.handle), /unavailable/);
  assert.equal(connections[0].closed, true, 'Nakama shows A offline at once');
  assert.deepEqual(social.withdrawals, [A]);
  social.down = false;
  const again = await adapter.bootstrap(A, exp);
  await assert.rejects(adapter.execute(A, again.handle, { op: 'presence.update', status: 'online' }), /forbidden/, 'a new session starts invisible');
});
test('a renewal keeps the opt-in only while canonical consent lasts; the status is not restored otherwise', async t => {
  const { adapter, connections, calls, social, exp } = setup(t);
  let a = await adapter.bootstrap(A, exp);
  await adapter.showPresence(A, a.handle);
  await adapter.execute(A, a.handle, { op: 'presence.update', status: 'away' });
  connections[0].disconnected();
  a = await adapter.bootstrap(A, exp, a.handle);
  assert.equal(calls.filter(c => c.command.op === 'presence.update').length, 2, 'status restored while consent lasts');
  social.consent.delete(A);
  connections[1].disconnected();
  a = await adapter.bootstrap(A, exp, a.handle);
  assert.equal(calls.filter(c => c.command.op === 'presence.update').length, 2, 'not restored after withdrawal');
  await assert.rejects(adapter.execute(A, a.handle, { op: 'presence.update', status: 'online' }), /forbidden/);
});
test('the connection list is canonical and an unknown social state fails closed', async t => {
  const { adapter, calls, social, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  assert.deepEqual(await adapter.execute(A, a.handle, { op: 'friends.list' }), { friends: [{ userId: B }] });
  social.down = true;
  await assert.rejects(adapter.execute(A, a.handle, { op: 'friends.list' }), error => error.code === 'unavailable' && !/secret/.test(error.message));
  assert.equal(calls.length, 0);
  assert.equal((await adapter.events(A, a.handle)).state, 'connected', 'a canonical read failure never degrades the transport');
});
test('presence consent routes: opt in for the session, withdraw with 204', async t => {
  const { adapter, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  const app = createWorldSpikeRoutes(adapter);
  const headers = { Authorization: `Bearer ${await signAccessToken(A)}` };
  const shown = await app.request(`/sessions/${a.handle}/presence`, { method: 'POST', headers });
  assert.equal(shown.status, 200);
  assert.equal((await shown.json()).presence, 'visible');
  assert.equal((await app.request(`/sessions/${a.handle}/presence`, { method: 'DELETE', headers })).status, 204);
  assert.equal((await app.request(`/sessions/${a.handle}/events`, { headers })).status, 401, 'the session is closed');
});
test('the configured spike wires the canonical connections and consent', () => {
  const route = readFileSync(new URL('../api/routes/world-spike.ts', import.meta.url), 'utf8');
  assert.match(route, /social: WorldSocialPolicy = drizzleWorldSocialPolicy\(\)/);
  assert.match(route, /access, blocks, social\)/);
});

// #48 L6: account erasure deletes the Nakama account; nothing else of the person stays in Nakama.
test('purging an account closes sessions and deletes its report-attribution receipts', async t => {
  const { adapter, connections, transport, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  const b = await adapter.bootstrap(B, exp);
  const MESSAGE = '44444444-4444-4444-8444-444444444444';
  connections[0].event({ type: 'chat', value: { channelId: 'g', senderId: B, messageId: MESSAGE, content: { preset: 'merci' } } });
  await adapter.events(A, a.handle);
  const filed = [];
  const sink = { async create(input) { filed.push(input); return { id: 'r1', kind: input.kind, status: 'open', createdAt: new Date(0) }; } };
  const app = createWorldSpikeRoutes(adapter, sink);
  const report = async () => app.request(`/sessions/${a.handle}/reports`, { method: 'POST',
    headers: { Authorization: `Bearer ${await signAccessToken(A)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'world_message', senderId: B, messageId: MESSAGE, reason: 'spam' }) });
  assert.equal((await report()).status, 201, 'delivered message is reportable before erasure');
  assert.equal(await adapter.purgeTransportAccount(B.toUpperCase()), true);
  assert.deepEqual(transport.deleted, [customIdentity(B)]);
  assert.equal(connections[1].closed, true);
  await assert.rejects(adapter.events(B, b.handle), /invalid_session/);
  assert.equal((await report()).status, 400, 'erasure removes the in-memory attribution receipt');
  assert.equal(filed.length, 1);
});
test('purging someone without a Nakama account reports false', async t => {
  const { adapter } = setup(t, { noAccount: true });
  assert.equal(await adapter.purgeTransportAccount(A), false);
});
test('the runtime deletion RPC is server-to-server, strict, not allowlist-gated and leaves no tombstone', () => {
  const context = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../../infra/nakama/runtime/world.js', import.meta.url), 'utf8'), context);
  const rpcs = {};
  context.InitModule({}, {}, {}, new Proxy({}, { get: (_, name) => (...args) => { if (name === 'registerRpc') rpcs[args[0]] = args[1]; } }));
  const remove = rpcs.emopet_delete_account;
  const deleted = [];
  const nk = { authenticateCustom: (id, username, create) => {
    assert.equal(create, false, 'deletion never creates an account');
    if (id.endsWith(B)) throw new Error('User account not found');
    return { userId: 'nakama-a' };
  }, accountDeleteId: (userId, recorded) => { deleted.push([userId, recorded]); } };
  const noAllowlist = { env: {} };
  assert.throws(() => remove({ ...noAllowlist, userId: 'nakama-a' }, {}, nk, JSON.stringify({ customId: customIdentity(A) })));
  assert.throws(() => remove(noAllowlist, {}, nk, JSON.stringify({ customId: 'emopet:world-spike:v1:not-a-uuid' })));
  assert.throws(() => remove(noAllowlist, {}, nk, JSON.stringify({ customId: customIdentity(A), ownerId: B })));
  assert.equal(JSON.parse(remove(noAllowlist, {}, nk, JSON.stringify({ customId: customIdentity(A) }))).deleted, true);
  assert.deepEqual(deleted, [['nakama-a', false]]);
  assert.equal(JSON.parse(remove(noAllowlist, {}, nk, JSON.stringify({ customId: customIdentity(B) }))).deleted, false);
});
test('account deletion (and only it) purges the Nakama account; Nakama logs stay at WARN', () => {
  const route = readFileSync(new URL('../api/routes/world-spike.ts', import.meta.url), 'utf8');
  assert.match(route, /if \(reason === 'account_deletion'\) await adapter\.purgeTransportAccount\(userId\);/);
  const start = readFileSync(new URL('../../infra/nakama/start.sh', import.meta.url), 'utf8');
  assert.match(start, /--logger\.level WARN/);
  for (const name of readdirSync(new URL('../api/services/world-spike/', import.meta.url))) {
    const source = readFileSync(new URL(`../api/services/world-spike/${name}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /console\.(log|info|debug)/, `${name}: no chat content or identifiers in logs`);
  }
});
