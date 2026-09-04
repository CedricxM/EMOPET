import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  authorizePrivilegedSessionToken,
  type PrivilegedAuthorizationVerifier,
} from '../privileged-request';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const TOKEN = 'privileged-session-token-value-1234567890';
const ACTION = 'contact.request.manage' as const;

test('contact PATCH composes origin guard, session-only authority and exact action before mutation', async () => {
  const routeUrl = new URL('../../../app/api/admin/contact/[id]/route.ts', import.meta.url);
  const source = await readFile(routeUrl, 'utf8');
  const patchStart = source.indexOf('export async function PATCH');

  assert.notEqual(patchStart, -1);
  const patchSource = source.slice(patchStart);

  assert.equal(patchSource.includes('isAdmin('), false);
  assert.equal(patchSource.includes('x-admin-token'), false);
  assert.equal(patchSource.includes('breiz-admin-token'), false);
  assert.equal(patchSource.includes('ADMIN_TOKEN'), false);
  assert.equal(patchSource.includes('authorizePrivilegedRequestOrSession'), false);
  assert.equal(patchSource.includes('authorizePrivilegedRequest('), false);

  assert.equal(patchSource.includes('resolvePrivilegedWebOrigin()'), true);
  assert.equal(patchSource.includes('evaluatePrivilegedMutationOrigin'), true);
  assert.equal(patchSource.includes("req.headers.has('authorization')"), true);
  assert.equal(patchSource.includes('PRIVILEGED_SESSION_COOKIE'), true);
  assert.equal(patchSource.includes('authorizePrivilegedSessionToken'), true);
  assert.equal(patchSource.includes('canonicalPrivilegedAuthorizationVerifier'), true);
  assert.equal(patchSource.includes("'contact.request.manage'"), true);
  assert.equal(patchSource.includes('PRIVATE_NO_STORE'), true);

  const rateLimit = patchSource.indexOf('enforceRateLimit');
  const originConfig = patchSource.indexOf('resolvePrivilegedWebOrigin()');
  const originGuard = patchSource.indexOf('evaluatePrivilegedMutationOrigin');
  const bearerReject = patchSource.indexOf("req.headers.has('authorization')");
  const cookieRead = patchSource.indexOf('await cookies()');
  const authorization = patchSource.indexOf('authorizePrivilegedSessionToken');
  const paramsRead = patchSource.indexOf('await ctx.params');
  const bodyRead = patchSource.indexOf('await req.json()');
  const mutation = patchSource.indexOf("collection<ContactRequest>('contact-requests').update");

  for (const position of [
    rateLimit,
    originConfig,
    originGuard,
    bearerReject,
    cookieRead,
    authorization,
    paramsRead,
    bodyRead,
    mutation,
  ]) {
    assert.notEqual(position, -1);
  }

  assert.ok(rateLimit < originConfig);
  assert.ok(originConfig < originGuard);
  assert.ok(originGuard < bearerReject);
  assert.ok(bearerReject < cookieRead);
  assert.ok(cookieRead < authorization);
  assert.ok(authorization < paramsRead);
  assert.ok(paramsRead < bodyRead);
  assert.ok(bodyRead < mutation);
});

test('contact mutation session authority asks the canonical verifier for contact.request.manage', async () => {
  const verifier: PrivilegedAuthorizationVerifier = {
    async authorize(input) {
      assert.deepEqual(input, { token: TOKEN, action: ACTION });
      return { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION };
    },
  };

  assert.deepEqual(
    await authorizePrivilegedSessionToken(TOKEN, ACTION, verifier),
    { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION },
  );
});
