import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  authorizePrivilegedRequestOrSession,
  type PrivilegedAuthorizationVerifier,
} from '../privileged-request';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const ACTION = 'moderation.queue.read' as const;
const SESSION_TOKEN = 'privileged-session-token-value-1234567890';
const BEARER_TOKEN = 'privileged-bearer-token-value-1234567890';

test('request without Authorization may use the separately read privileged session token', async () => {
  const verifier: PrivilegedAuthorizationVerifier = {
    async authorize(input) {
      assert.deepEqual(input, { token: SESSION_TOKEN, action: ACTION });
      return { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION };
    },
  };

  assert.deepEqual(
    await authorizePrivilegedRequestOrSession(
      new Request('https://example.test/api/admin/moderation'),
      SESSION_TOKEN,
      ACTION,
      verifier,
    ),
    { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION },
  );
});

test('explicit valid Bearer authority is terminal and ignores the session token', async () => {
  const verifier: PrivilegedAuthorizationVerifier = {
    async authorize(input) {
      assert.deepEqual(input, { token: BEARER_TOKEN, action: ACTION });
      return { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION };
    },
  };

  assert.deepEqual(
    await authorizePrivilegedRequestOrSession(
      new Request('https://example.test/api/admin/moderation', {
        headers: { authorization: `Bearer ${BEARER_TOKEN}` },
      }),
      SESSION_TOKEN,
      ACTION,
      verifier,
    ),
    { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION },
  );
});

test('explicit malformed Authorization never falls back to a valid session', async () => {
  let calls = 0;
  const verifier: PrivilegedAuthorizationVerifier = {
    async authorize() {
      calls += 1;
      return { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION };
    },
  };

  for (const authorization of ['', 'Basic abcdefghijklmnop', 'Bearer short', 'Bearer token with spaces']) {
    assert.deepEqual(
      await authorizePrivilegedRequestOrSession(
        new Request('https://example.test/api/admin/moderation', {
          headers: { authorization },
        }),
        SESSION_TOKEN,
        ACTION,
        verifier,
      ),
      { status: 'DENIED', reason: 'invalid_bearer' },
    );
  }

  assert.equal(calls, 0);
});

test('moderation read route uses canonical bearer-or-session authority and no legacy token', async () => {
  const routeUrl = new URL('../../../app/api/admin/moderation/route.ts', import.meta.url);
  const source = await readFile(routeUrl, 'utf8');

  assert.equal(source.includes('authorizePrivilegedRequestOrSession'), true);
  assert.equal(source.includes('PRIVILEGED_SESSION_COOKIE'), true);
  assert.equal(source.includes("'moderation.queue.read'"), true);
  assert.equal(source.includes('canonicalPrivilegedAuthorizationVerifier'), true);

  for (const legacy of ['isAdmin(', 'ADMIN_TOKEN', 'x-admin-token', 'breiz-admin-token']) {
    assert.equal(source.includes(legacy), false, `legacy authority must be absent: ${legacy}`);
  }
});
