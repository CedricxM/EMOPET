import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveContactReadAuthority } from '../contact-read-authority';
import type { PrivilegedAuthorizationVerifier } from '../privileged-request';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const TOKEN = 'privileged-contact-token-value-1234567890';
const ACTION = 'contact.request.read' as const;

test('contact read preserves owner scope only when Authorization is absent', async () => {
  let calls = 0;
  const verifier: PrivilegedAuthorizationVerifier = {
    async authorize() {
      calls += 1;
      return { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION };
    },
  };

  const decision = await resolveContactReadAuthority(
    new Request('https://example.test/api/contact', {
      headers: {
        'x-contact-owner-token': 'owner-token-value',
        'x-admin-token': 'legacy-static-token',
      },
    }),
    verifier,
  );

  assert.deepEqual(decision, { status: 'OWNER_SCOPE' });
  assert.equal(calls, 0);
});

test('contact read requests exactly contact.request.read for a privileged bearer', async () => {
  const verifier: PrivilegedAuthorizationVerifier = {
    async authorize(input) {
      assert.deepEqual(input, { token: TOKEN, action: ACTION });
      return { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION };
    },
  };

  assert.deepEqual(
    await resolveContactReadAuthority(
      new Request('https://example.test/api/contact', {
        headers: { authorization: `Bearer ${TOKEN}` },
      }),
      verifier,
    ),
    { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION },
  );
});

test('denied or malformed privileged attempts never fall through to owner scope', async () => {
  let calls = 0;
  const deniedVerifier: PrivilegedAuthorizationVerifier = {
    async authorize() {
      calls += 1;
      return { status: 'DENIED' };
    },
  };

  const withOwner = {
    'x-contact-owner-token': 'valid-owner-token-for-existing-path',
  };

  assert.deepEqual(
    await resolveContactReadAuthority(
      new Request('https://example.test/api/contact', {
        headers: { ...withOwner, authorization: `Bearer ${TOKEN}` },
      }),
      deniedVerifier,
    ),
    { status: 'DENIED', reason: 'not_authorized' },
  );
  assert.equal(calls, 1);

  assert.deepEqual(
    await resolveContactReadAuthority(
      new Request('https://example.test/api/contact', {
        headers: { ...withOwner, authorization: 'Bearer short' },
      }),
      deniedVerifier,
    ),
    { status: 'DENIED', reason: 'invalid_bearer' },
  );
  assert.equal(calls, 1);
});

test('privileged verifier failure remains unavailable even when an owner token is present', async () => {
  const verifier: PrivilegedAuthorizationVerifier = {
    async authorize() {
      throw new Error('provider unavailable');
    },
  };

  assert.deepEqual(
    await resolveContactReadAuthority(
      new Request('https://example.test/api/contact', {
        headers: {
          authorization: `Bearer ${TOKEN}`,
          'x-contact-owner-token': 'valid-owner-token-for-existing-path',
        },
      }),
      verifier,
    ),
    { status: 'UNAVAILABLE', reason: 'verifier_unavailable' },
  );
});
