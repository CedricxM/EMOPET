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
  const adapter = new WorldRealtimeAdapter(transport, new Set([A, B]), () => now, async ms => { sleeps.push(ms); }, options.deadline ?? 100);
  t.after(() => adapter.close());
  return { adapter, connections, calls, sleeps, transport, expire: () => { now += 400000; }, exp: now + 600000 };
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
  assert.throws(() => adapter.events(B, session.handle), /invalid_session/);
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
  for (let i = 0; i < 105; i++) connections[0].event({ index: i });
  const events = adapter.events(A, session.handle);
  assert.equal(events.events.length, 100);
  assert.equal(events.events[0].index, 5);
  assert.equal(events.resyncRequired, true);
  assert.equal(adapter.events(A, session.handle).events.length, 0);
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
  assert.equal(adapter.events(A, a.handle).state, 'degraded');
  const old = a.handle;
  a = await adapter.bootstrap(A, exp, old);
  assert.notEqual(a.handle, old);
  assert.equal(connections[0].closed, true);
  assert.throws(() => adapter.events(A, old), /invalid_session/);
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
  assert.throws(() => adapter.events(A, first.handle), /invalid_session/);
  adapter.disconnect(A, second.handle);
  assert.equal(connections[1].closed, true);
  const third = await adapter.bootstrap(A, exp);
  expire();
  assert.throws(() => adapter.events(A, third.handle), /invalid_session/);
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
  assert.equal(adapter.events(A, session.handle).state, 'degraded');
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
