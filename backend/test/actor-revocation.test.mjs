import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { onActorRevoked, revokeActor } = await import('../dist/api/services/actor-revocation.js');

test('WORLD-SOCIAL-03 (#596, L7): every subscribed surface hears a revocation, with its reason', async () => {
  const heard = [];
  const off = [
    onActorRevoked((userId, reason) => { heard.push(['a', userId, reason]); }),
    onActorRevoked(async (userId, reason) => { heard.push(['b', userId, reason]); }),
  ];
  await revokeActor('00000000-0000-4000-8000-000000000001', 'logout_all');
  assert.deepEqual(heard.sort(), [
    ['a', '00000000-0000-4000-8000-000000000001', 'logout_all'],
    ['b', '00000000-0000-4000-8000-000000000001', 'logout_all'],
  ]);
  off.forEach((unsubscribe) => unsubscribe());
  await revokeActor('00000000-0000-4000-8000-000000000001', 'logout');
  assert.equal(heard.length, 2, 'unsubscribed listeners are not called');
});

test('a failing surface never blocks the canonical revocation or the other surfaces', async () => {
  const heard = [];
  const warn = console.warn;
  const warnings = [];
  console.warn = (...args) => { warnings.push(args); };
  const off = [
    onActorRevoked(() => { throw new Error('socket already gone'); }),
    onActorRevoked(async () => { throw new Error('rejected'); }),
    onActorRevoked((userId) => { heard.push(userId); }),
  ];
  try {
    await assert.doesNotReject(revokeActor('00000000-0000-4000-8000-000000000002', 'world_access_revoked'));
  } finally {
    console.warn = warn;
    off.forEach((unsubscribe) => unsubscribe());
  }
  assert.deepEqual(heard, ['00000000-0000-4000-8000-000000000002']);
  assert.equal(warnings.length, 1);
  assert.doesNotMatch(JSON.stringify(warnings), /00000000-0000-4000-8000-000000000002/, 'no identifier in logs');
});

test('logout and logout_all notify revocation only after their transaction commits', () => {
  const source = readFileSync(new URL('../api/routes/auth.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const logout = source.slice(source.indexOf("auth.post('/logout',"), source.indexOf("auth.post('/logout-all'"));
  const logoutAll = source.slice(source.indexOf("auth.post('/logout-all'"));
  for (const [route, reason] of [[logout, 'logout'], [logoutAll, 'logout_all']]) {
    const call = route.indexOf(`revokeActor(`);
    assert.ok(call > 0, `${reason} calls revokeActor`);
    assert.match(route.slice(call, call + 80), new RegExp(`'${reason}'`));
    assert.ok(call > route.lastIndexOf('withAuthSessionTransaction'), `${reason}: revocation follows the transaction`);
  }
});
