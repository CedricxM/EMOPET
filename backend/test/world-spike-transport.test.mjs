import test from 'node:test';
import assert from 'node:assert/strict';
import { NakamaTransport } from '../dist/api/services/world-spike/nakama.js';
import { NakamaSocket } from '../dist/api/services/world-spike/socket.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const G = '33333333-3333-4333-8333-333333333333';
function sockets(t, { open = true, respond = true } = {}) {
  const original = globalThis.WebSocket;
  const instances = [];
  class FakeSocket {
    static OPEN = 1;
    readyState = 0;
    sent = [];
    closed = false;
    constructor(url) {
      this.url = url; instances.push(this);
      if (open) queueMicrotask(() => { this.readyState = 1; this.onopen?.(); });
    }
    emit(data) { this.onmessage?.({ data: JSON.stringify(data) }); }
    send(raw) {
      const request = JSON.parse(raw); this.sent.push(request);
      if (!respond) return;
      queueMicrotask(() => this.emit({ cid: request.cid,
        ...(request.channel_join ? { channel: { id: 'group-channel' } } : {}),
        ...(request.channel_message_send ? { channel_message_ack: { message_id: 'message-1' } } : {}),
        ...(request.status_follow ? { status: { presences: [] } } : {}),
      }));
    }
    close() { this.closed = true; this.readyState = 3; queueMicrotask(() => this.onclose?.()); }
  }
  globalThis.WebSocket = FakeSocket;
  t.after(() => { globalThis.WebSocket = original; });
  return instances;
}
test('real transport emits official REST and socket contracts, never forwards canonical credentials', async t => {
  const instances = sockets(t), requests = [], events = [];
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ uid: A, usn: 'synthetic', exp: Math.floor(Date.now() / 1000) + 300 })).toString('base64url')}.test`;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    requests.push({ url: String(url), init });
    let body = {};
    if (String(url).includes('/rpc/')) body = { token, userId: A };
    else if (String(url).includes('/friend') && (!init?.method || init.method === 'GET')) body = { friends: [{ user: { id: B }, state: 2 }] };
    else if (String(url).endsWith('/group') && init?.method === 'POST') body = { id: G, name: 'spike-test' };
    return new Response(JSON.stringify(body), { status: 200 });
  });
  const connection = await new NakamaTransport('http://127.0.0.1:7350', 'a'.repeat(64))
    .connect(`emopet:world-spike:v1:${A}`, new AbortController().signal, event => events.push(event), () => {});
  t.after(() => connection.close());
  assert.equal(connection.userId, A);
  const socket = instances[0];
  assert.equal(new URL(socket.url).searchParams.get('token'), token);
  await connection.execute({ op: 'groups.create', name: 'test' });
  await connection.execute({ op: 'groups.list' });
  await connection.execute({ op: 'groups.join', groupId: G });
  await connection.execute({ op: 'presence.follow', targetUserId: B }, B);
  await connection.execute({ op: 'presence.update', status: 'away' });
  await connection.execute({ op: 'chat.join', groupId: G });
  await connection.execute({ op: 'chat.send', groupId: G, presetId: 'salut' });
  socket.emit({ channel_message: { channel_id: 'group-channel', sender_id: B, message_id: 'incoming', content: '{"preset":"salut"}' } });
  assert.equal(events[0].value.content.preset, 'salut');
  assert.deepEqual(socket.sent.find(x => x.channel_join).channel_join, { target: G, type: 3, persistence: false, hidden: false });
  // Only the preset id travels (#596, #48 L4); clients render the label.
  assert.equal(socket.sent.find(x => x.channel_message_send).channel_message_send.content, '{"preset":"salut"}');
  assert.deepEqual(JSON.parse(requests[0].init.body), { customId: `emopet:world-spike:v1:${A}` });
  assert.equal(new URL(requests[0].url).searchParams.has('http_key'), false);
  assert.equal(requests[0].init.headers.Authorization, `Basic ${Buffer.from(`${'a'.repeat(64)}:`).toString('base64')}`);
  // #595: World writes and reads no Nakama friend edge; connections are canonical.
  assert.ok(!requests.some(x => x.url.includes('/v2/friend')));
  assert.ok(requests.some(x => x.url.includes(`/v2/group/${G}/join`)));
  // Regression (live run): nakama-js 2.8.0 swaps state/limit, and Nakama rejects state=100.
  const userGroups = new URL(requests.find(x => x.url.includes(`/v2/user/${A}/group`)).url);
  assert.equal(userGroups.searchParams.has('state'), false);
  await connection.execute({ op: 'groups.leave', groupId: G });
  await assert.rejects(connection.execute({ op: 'chat.send', groupId: G, presetId: 'merci' }), /invalid_request/);
  connection.close();
  assert.equal(socket.closed, true);
});
test('transport profiles isolate local HTTP from remote HTTPS release', () => {
  const key = 'a'.repeat(64);
  assert.doesNotThrow(() => new NakamaTransport('http://127.0.0.1:7350', key, 'local-spike'));
  assert.throws(() => new NakamaTransport('https://nakama.example.test', key, 'local-spike'), /loopback HTTP/);
  assert.throws(() => new NakamaTransport('http://nakama.example.test', key, 'release'), /remote HTTPS/);
  assert.throws(() => new NakamaTransport('https://127.0.0.1:7350', key, 'release'), /remote HTTPS/);
  assert.doesNotThrow(() => new NakamaTransport('https://nakama.example.test', key, 'release'));
});

test('HTTPS Nakama endpoints use WSS for the realtime socket', async t => {
  const instances = sockets(t);
  const socket = new NakamaSocket(() => {}, () => {});
  await socket.connect('https://nakama.example.test', 'synthetic', new AbortController().signal);
  assert.equal(new URL(instances[0].url).protocol, 'wss:');
  socket.close();
});

test('socket abort during connection closes CONNECTING native socket', async t => {
  const instances = sockets(t, { open: false });
  const socket = new NakamaSocket(() => {}, () => {});
  const controller = new AbortController();
  const connecting = socket.connect('http://127.0.0.1:7350', 'synthetic', controller.signal);
  controller.abort();
  await assert.rejects(connecting, /timeout/);
  assert.equal(instances[0].closed, true);
});
test('socket disconnect rejects pending requests and malformed frames fail closed', async t => {
  const instances = sockets(t, { respond: false });
  let disconnected = 0;
  const socket = new NakamaSocket(() => {}, () => { disconnected++; });
  await socket.connect('http://127.0.0.1:7350', 'synthetic', new AbortController().signal);
  const pending = socket.followUsers([B]);
  instances[0].onmessage({ data: 'invalid-json' });
  await assert.rejects(pending, /unavailable/);
  assert.equal(disconnected, 1);
  assert.equal(instances[0].closed, true);
});
test('SDK 4xx rejection maps to invalid_request; 5xx stays an uncertain failure', async t => {
  sockets(t);
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ uid: A, usn: 'synthetic', exp: Math.floor(Date.now() / 1000) + 300 })).toString('base64url')}.test`;
  let status = 400;
  t.mock.method(globalThis, 'fetch', async url => String(url).includes('/rpc/')
    ? new Response(JSON.stringify({ token, userId: A }), { status: 200 })
    : new Response('{}', { status }));
  const connection = await new NakamaTransport('http://127.0.0.1:7350', 'a'.repeat(64))
    .connect(`emopet:world-spike:v1:${A}`, new AbortController().signal, () => {}, () => {});
  t.after(() => connection.close());
  await assert.rejects(connection.execute({ op: 'groups.join', groupId: G }), /invalid_request/);
  status = 503;
  await assert.rejects(connection.execute({ op: 'groups.join', groupId: G }), error => !/invalid_request/.test(String(error?.message ?? error)));
});
