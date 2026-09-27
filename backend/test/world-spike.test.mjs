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
  };
  const blocked = new Set();
  const policy = { lookups: 0, down: false, async isBlockedEitherWay(x, y) {
    policy.lookups++;
    if (policy.down) throw new Error('database down: secret-connection-string');
    return blocked.has(`${x}|${y}`) || blocked.has(`${y}|${x}`);
  } };
  const adapter = new WorldRealtimeAdapter(transport, new Set([A, B]), policy, () => now, async ms => { sleeps.push(ms); }, options.deadline ?? 100);
  t.after(() => adapter.close());
  return { adapter, connections, calls, sleeps, transport, policy, expire: () => { now += 400000; }, exp: now + 600000,
    block: (blocker, target) => blocked.add(`${blocker}|${target}`), unblock: (blocker, target) => blocked.delete(`${blocker}|${target}`) };
}
test('canonical mapping normalizes UUIDs and rejects arbitrary identities', () => {
  assert.equal(customIdentity(A), `emopet:world-spike:v1:${A}`);
  const uuid = 'abcdefab-abcd-4abc-8abc-abcdefabcdef';
  assert.equal(customIdentity(uuid.toUpperCase()), customIdentity(uuid));
  assert.throws(() => customIdentity('client-owner'), /forbidden/);
});
test('default off, production refused, allowlist and loopback configuration required', () => {
  assert.equal(configuredWorldSpike({}), null);
  assert.throws(() => configuredWorldSpike({ WORLD_NAKAMA_SPIKE_ENABLED: 'true', NODE_ENV: 'production' }), /local/);
  assert.throws(() => configuredWorldSpike({ WORLD_NAKAMA_SPIKE_ENABLED: 'true', NODE_ENV: 'development' }), /synthetic/);
  assert.throws(() => configuredWorldSpike({ WORLD_NAKAMA_SPIKE_ENABLED: 'true', NODE_ENV: 'test', WORLD_SPIKE_TEST_USER_IDS: A,
    NAKAMA_URL: 'https://example.com', NAKAMA_HTTP_KEY: 'a'.repeat(64) }), /loopback/);
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
  for (const value of [{ op: 'eli.update' }, { op: 'chat.send', groupId: GROUP, text: 'x'.repeat(1001) },
    { op: 'presence.update', status: 'diagnosis' }, { op: 'groups.create', name: 'test', billing: {} },
    { op: 'friends.request', targetUserId: 'arbitrary' }, { op: 'toString' }, null]) assert.throws(() => parseWorldCommand(value));
});
test('Friends, Groups, Presence and Chat go only through adapter transport', async t => {
  const { adapter, calls, exp } = setup(t);
  const a = await adapter.bootstrap(A, exp);
  await adapter.bootstrap(B, exp);
  const commands = [
    { op: 'friends.request', targetUserId: B }, { op: 'friends.accept', targetUserId: B }, { op: 'friends.list' },
    { op: 'groups.create', name: 'synthetic' }, { op: 'groups.list' }, { op: 'groups.join', groupId: GROUP },
    { op: 'presence.follow', targetUserId: B }, { op: 'presence.update', status: 'online' },
    { op: 'chat.join', groupId: GROUP }, { op: 'chat.send', groupId: GROUP, text: 'synthetic' },
    { op: 'groups.leave', groupId: GROUP },
  ];
  for (const command of commands) await adapter.execute(A, a.handle, parseWorldCommand(command));
  assert.deepEqual(calls.map(c => c.command), commands);
  assert.equal(calls[0].target, B);
});
test('bounded event polling signals overflow and consumes events once', async t => {
  const { adapter, connections, exp } = setup(t);
  const session = await adapter.bootstrap(A, exp);
  for (let i = 0; i < 105; i++) connections[0].event({ type: 'chat', value: { senderId: A, index: i } });
  const events = await adapter.events(A, session.handle);
  assert.equal(events.events.length, 100);
  assert.equal(events.events[0].value.index, 5);
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
  await adapter.execute(A, a.handle, { op: 'chat.send', groupId: GROUP, text: 'once' });
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
  context.InitModule({}, {}, {}, new Proxy({}, { get: (_, name) => (...args) => { registered[name] = args; } }));
  const bootstrap = registered.registerRpc[1];
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
  await assert.rejects(adapter.execute(A, a.handle, { op: 'friends.request', targetUserId: A }), /invalid_request/);
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
  await assert.rejects(adapter.execute(A, a.handle, { op: 'chat.send', groupId: GROUP, text: 'x' }), /invalid_request/);
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
    for (const op of ['friends.request', 'friends.accept', 'presence.follow']) {
      await assert.rejects(adapter.execute(actor, handle, { op, targetUserId: target }), /unreachable/, `${op} from ${actor}`);
    }
  }
  assert.equal(calls.length, 0, 'a blocked command never reaches Nakama');
  assert.equal((await adapter.events(A, a.handle)).state, 'connected');
  assert.equal((await adapter.events(B, b.handle)).state, 'connected');
  // Same answer as offline: the blocked person cannot tell a block from absence.
  adapter.disconnect(A, a.handle);
  unblock(A, B);
  await assert.rejects(adapter.execute(B, b.handle, { op: 'friends.request', targetUserId: A }), /unreachable/);
});

test('friend lists, presence and chat hide blocked participants both ways, including buffered events', async t => {
  const { adapter, connections, exp, block } = setup(t, { execute: command => command.op === 'friends.list'
    ? { friends: [{ user: { id: B }, state: 0 }, { user: { id: 'unknown-transport-id' }, state: 0 }], cursor: 'c' } : { ok: true } });
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
  const friends = (await adapter.execute(A, a.handle, { op: 'friends.list' }));
  assert.deepEqual(friends.friends, [], 'blocked and unknown friends are hidden');
  assert.equal(friends.cursor, 'c');
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
  connections[0].event({ type: 'chat', value: { senderId: B, messageId: 'kept' } });
  policy.down = true;
  await assert.rejects(adapter.execute(A, a.handle, { op: 'friends.request', targetUserId: B }), /unavailable/);
  await assert.rejects(adapter.events(A, a.handle), /unavailable/);
  assert.equal(calls.length, 0);
  policy.down = false;
  const batch = await adapter.events(A, a.handle);
  assert.equal(batch.state, 'connected');
  assert.deepEqual(batch.events.map(e => e.value.messageId), ['kept'], 'events stay buffered until blocks can be checked');
  const blocked = await createWorldSpikeRoutes(adapter).request(`/sessions/${a.handle}/commands`, { method: 'POST',
    headers: { Authorization: `Bearer ${await signAccessToken(A)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'friends.request', targetUserId: A }) });
  assert.equal(blocked.status, 400, 'self target stays a 400');
});

test('World wires the canonical block repository by default and maps unreachable to 404', async () => {
  const route = readFileSync(new URL('../api/routes/world-spike.ts', import.meta.url), 'utf8');
  assert.match(route, /blocks: WorldBlockPolicy = drizzleUserBlockRepository\(\)/);
  assert.match(route, /code === 'unreachable' \? 404/);
  const { BLOCK_ENFORCEMENT } = await import('../dist/api/services/user-blocks.js');
  assert.equal(BLOCK_ENFORCEMENT.world, 'ENFORCED_WHEN_WORLD_ENABLED');
  assert.equal(BLOCK_ENFORCEMENT.community, 'NOT_ENFORCED');
});

test('World reports resolve the subject server-side and ignore client identity claims', async t => {
  const { adapter, exp, block } = setup(t);
  const filed = [];
  const sink = { async create(input) { filed.push(input); return { id: 'r1', kind: input.kind, status: 'open', createdAt: new Date(0) }; } };
  const app = createWorldSpikeRoutes(adapter, sink);
  const a = await adapter.bootstrap(A, exp);
  await adapter.bootstrap(B, exp);
  const post = async (body, actor = A, handle = a.handle) => app.request(`/sessions/${handle}/reports`, { method: 'POST',
    headers: { Authorization: `Bearer ${await signAccessToken(actor)}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  block(A, B);
  // Reporting stays possible across a block, for a user and for a received message.
  assert.equal((await post({ kind: 'world_user', targetUserId: B, reason: 'harassment' })).status, 201);
  const MESSAGE = '44444444-4444-4444-8444-444444444444';
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
  assert.match(route, /return createWorldSpikeRoutes\(adapter, reports\)/);
});
