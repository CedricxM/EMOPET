import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'auth-test-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
process.env.PRIVILEGED_JWT_SECRET = 'privileged-test-secret-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const { signAccessToken } = await import('../dist/api/middleware/auth.js');
const {
  completePrivilegedMfaStepUp,
  verifyPrivilegedAccessToken,
} = await import('../dist/api/security/privileged-mfa-step-up.js');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-04T09:20:00.000Z');

const POLICY = {
  allowedMethods: ['webauthn', 'idp_mfa'],
  maxAssertionAgeSeconds: 120,
  tokenTtlSeconds: 300,
};

function activeDirectory(role = 'admin') {
  return {
    async findBySubject(subject) {
      return { subject, role, active: true };
    },
  };
}

function verifiedMfa(overrides = {}) {
  return {
    async verify({ subject }) {
      return {
        status: 'VERIFIED',
        subject,
        method: 'webauthn',
        verifiedAt: '2026-09-04T09:19:30.000Z',
        assuranceRef: 'mfa:assertion_123',
        ...overrides,
      };
    },
  };
}

async function baseAccessToken() {
  return signAccessToken(USER_ID);
}

test('step-up binds to AUTH-01 subject, directory role and verified MFA before minting a privileged token', async () => {
  const baseToken = await baseAccessToken();
  const result = await completePrivilegedMfaStepUp({
    baseAccessToken: baseToken,
    assertion: { opaque: 'provider-owned-assertion' },
    policy: POLICY,
    directory: activeDirectory('support'),
    verifier: verifiedMfa(),
    now: NOW,
  });

  assert.equal(result.status, 'GRANTED');
  assert.equal(result.subject, USER_ID);
  assert.equal(result.role, 'support');
  assert.equal(result.mfaMethod, 'webauthn');
  assert.equal(result.expiresInSeconds, 300);

  const claims = await verifyPrivilegedAccessToken(result.accessToken, NOW);
  assert.deepEqual(claims, {
    sub: USER_ID,
    role: 'support',
    tokenUse: 'privileged',
    mfaMethod: 'webauthn',
    mfaAt: Math.floor(Date.parse('2026-09-04T09:19:30.000Z') / 1000),
  });
});

test('invalid base access token fails before directory or MFA verifier is consulted', async () => {
  let directoryCalls = 0;
  let verifierCalls = 0;

  const result = await completePrivilegedMfaStepUp({
    baseAccessToken: 'not-a-valid-access-token',
    assertion: {},
    policy: POLICY,
    directory: {
      async findBySubject() {
        directoryCalls += 1;
        return null;
      },
    },
    verifier: {
      async verify() {
        verifierCalls += 1;
        return { status: 'REJECTED' };
      },
    },
    now: NOW,
  });

  assert.deepEqual(result, { status: 'DENIED', reason: 'invalid_base_session' });
  assert.equal(directoryCalls, 0);
  assert.equal(verifierCalls, 0);
});

test('ordinary Guardian access token cannot be used as a privileged token', async () => {
  const ordinary = await baseAccessToken();
  await assert.rejects(() => verifyPrivilegedAccessToken(ordinary, NOW));
});

test('missing or inactive privileged directory identity fails closed', async () => {
  const baseToken = await baseAccessToken();

  const missing = await completePrivilegedMfaStepUp({
    baseAccessToken: baseToken,
    assertion: {},
    policy: POLICY,
    directory: { async findBySubject() { return null; } },
    verifier: verifiedMfa(),
    now: NOW,
  });
  assert.deepEqual(missing, { status: 'DENIED', reason: 'privileged_identity_not_found' });

  const inactive = await completePrivilegedMfaStepUp({
    baseAccessToken: baseToken,
    assertion: {},
    policy: POLICY,
    directory: {
      async findBySubject(subject) {
        return { subject, role: 'admin', active: false };
      },
    },
    verifier: verifiedMfa(),
    now: NOW,
  });
  assert.deepEqual(inactive, { status: 'DENIED', reason: 'privileged_identity_inactive' });
});

test('provider directory records must be exact canonical records before MFA is consulted', async () => {
  const baseToken = await baseAccessToken();
  let verifierCalls = 0;
  const verifier = {
    async verify() {
      verifierCalls += 1;
      return { status: 'REJECTED' };
    },
  };

  const directories = [
    {
      async findBySubject() {
        throw new Error('directory unavailable');
      },
    },
    {
      async findBySubject() {
        return { subject: OTHER_USER_ID, role: 'admin', active: true };
      },
    },
    {
      async findBySubject(subject) {
        return { subject, role: 'owner', active: true };
      },
    },
    {
      async findBySubject(subject) {
        return { subject, role: 'admin', active: true, providerGroup: 'global-admins' };
      },
    },
  ];

  for (const directory of directories) {
    const result = await completePrivilegedMfaStepUp({
      baseAccessToken: baseToken,
      assertion: {},
      policy: POLICY,
      directory,
      verifier,
      now: NOW,
    });
    assert.deepEqual(result, { status: 'DENIED', reason: 'privileged_identity_not_found' });
  }

  assert.equal(verifierCalls, 0);
});

test('provider verifier receives the canonical subject, original opaque assertion and exact request timestamp', async () => {
  const baseToken = await baseAccessToken();
  const assertion = Object.freeze({
    transaction: 'provider-owned-opaque-transaction',
    nested: Object.freeze({ challenge: 'opaque' }),
  });
  let observed;

  const result = await completePrivilegedMfaStepUp({
    baseAccessToken: baseToken,
    assertion,
    policy: POLICY,
    directory: activeDirectory(),
    verifier: {
      async verify(input) {
        observed = input;
        return {
          status: 'VERIFIED',
          subject: input.subject,
          method: 'webauthn',
          verifiedAt: '2026-09-04T09:19:30.000Z',
          assuranceRef: 'provider:challenge_42',
        };
      },
    },
    now: NOW,
  });

  assert.equal(result.status, 'GRANTED');
  assert.equal(observed.assertion, assertion);
  assert.deepEqual(observed, {
    subject: USER_ID,
    assertion,
    requestedAt: NOW.toISOString(),
  });
});

test('MFA rejection, verifier failure and subject mismatch cannot mint privileged authority', async () => {
  const baseToken = await baseAccessToken();

  const rejected = await completePrivilegedMfaStepUp({
    baseAccessToken: baseToken,
    assertion: {},
    policy: POLICY,
    directory: activeDirectory(),
    verifier: { async verify() { return { status: 'REJECTED' }; } },
    now: NOW,
  });
  assert.deepEqual(rejected, { status: 'DENIED', reason: 'mfa_rejected' });

  const failed = await completePrivilegedMfaStepUp({
    baseAccessToken: baseToken,
    assertion: {},
    policy: POLICY,
    directory: activeDirectory(),
    verifier: { async verify() { throw new Error('provider unavailable'); } },
    now: NOW,
  });
  assert.deepEqual(failed, { status: 'DENIED', reason: 'mfa_verification_failed' });

  const mismatch = await completePrivilegedMfaStepUp({
    baseAccessToken: baseToken,
    assertion: {},
    policy: POLICY,
    directory: activeDirectory(),
    verifier: verifiedMfa({ subject: OTHER_USER_ID }),
    now: NOW,
  });
  assert.deepEqual(mismatch, { status: 'DENIED', reason: 'mfa_subject_mismatch' });
});

test('provider MFA results reject malformed timestamps, assurance references and free-form metadata', async () => {
  const baseToken = await baseAccessToken();
  const malformedResults = [
    verifiedMfa({ verifiedAt: '2026-09-04T09:19:30+00:00' }),
    verifiedMfa({ verifiedAt: 'not-a-timestamp' }),
    verifiedMfa({ assuranceRef: 'provider assertion with spaces' }),
    verifiedMfa({ assuranceRef: 'a'.repeat(129) }),
    verifiedMfa({ providerAccessToken: 'must-never-cross-the-boundary' }),
    {
      async verify() {
        return { status: 'REJECTED', providerReason: 'free-form-provider-detail' };
      },
    },
  ];

  for (const verifier of malformedResults) {
    const result = await completePrivilegedMfaStepUp({
      baseAccessToken: baseToken,
      assertion: {},
      policy: POLICY,
      directory: activeDirectory(),
      verifier,
      now: NOW,
    });
    assert.deepEqual(result, { status: 'DENIED', reason: 'mfa_verification_failed' });
  }
});

test('stale, future and disallowed MFA assurance fail closed', async () => {
  const baseToken = await baseAccessToken();

  const stale = await completePrivilegedMfaStepUp({
    baseAccessToken: baseToken,
    assertion: {},
    policy: POLICY,
    directory: activeDirectory(),
    verifier: verifiedMfa({ verifiedAt: '2026-09-04T09:17:00.000Z' }),
    now: NOW,
  });
  assert.deepEqual(stale, { status: 'DENIED', reason: 'mfa_assertion_stale' });

  const future = await completePrivilegedMfaStepUp({
    baseAccessToken: baseToken,
    assertion: {},
    policy: POLICY,
    directory: activeDirectory(),
    verifier: verifiedMfa({ verifiedAt: '2026-09-04T09:20:01.000Z' }),
    now: NOW,
  });
  assert.deepEqual(future, { status: 'DENIED', reason: 'mfa_assertion_from_future' });

  const disallowed = await completePrivilegedMfaStepUp({
    baseAccessToken: baseToken,
    assertion: {},
    policy: POLICY,
    directory: activeDirectory(),
    verifier: verifiedMfa({ method: 'totp' }),
    now: NOW,
  });
  assert.deepEqual(disallowed, { status: 'DENIED', reason: 'mfa_method_not_allowed' });
});

test('verifier cannot inject role or arbitrary metadata into the trusted MFA result', async () => {
  const baseToken = await baseAccessToken();

  const injected = await completePrivilegedMfaStepUp({
    baseAccessToken: baseToken,
    assertion: {},
    policy: POLICY,
    directory: activeDirectory('support'),
    verifier: verifiedMfa({ role: 'admin' }),
    now: NOW,
  });

  assert.deepEqual(injected, { status: 'DENIED', reason: 'mfa_verification_failed' });
});

test('invalid or extra-field policy input cannot produce a privileged token', async () => {
  const baseToken = await baseAccessToken();

  for (const policy of [
    { ...POLICY, maxAssertionAgeSeconds: 0 },
    { ...POLICY, maxAssertionAgeSeconds: 3601 },
    { ...POLICY, tokenTtlSeconds: -1 },
    { ...POLICY, tokenTtlSeconds: 3601 },
    { ...POLICY, allowedMethods: [] },
    { ...POLICY, allowedMethods: ['sms'] },
    { ...POLICY, hiddenBypass: true },
  ]) {
    const result = await completePrivilegedMfaStepUp({
      baseAccessToken: baseToken,
      assertion: {},
      policy,
      directory: activeDirectory(),
      verifier: verifiedMfa(),
      now: NOW,
    });
    assert.deepEqual(result, { status: 'DENIED', reason: 'invalid_policy' });
  }
});

test('privileged token expires on the explicit step-up TTL boundary', async () => {
  const baseToken = await baseAccessToken();
  const result = await completePrivilegedMfaStepUp({
    baseAccessToken: baseToken,
    assertion: {},
    policy: { ...POLICY, tokenTtlSeconds: 60 },
    directory: activeDirectory(),
    verifier: verifiedMfa(),
    now: NOW,
  });

  assert.equal(result.status, 'GRANTED');
  await assert.rejects(() => verifyPrivilegedAccessToken(
    result.accessToken,
    new Date('2026-09-04T09:21:01.000Z'),
  ));
});

test('privileged signing secret must remain distinct from ordinary AUTH-01 secret', async () => {
  const previous = process.env.PRIVILEGED_JWT_SECRET;
  process.env.PRIVILEGED_JWT_SECRET = process.env.JWT_SECRET;
  try {
    const baseToken = await baseAccessToken();
    const result = await completePrivilegedMfaStepUp({
      baseAccessToken: baseToken,
      assertion: {},
      policy: POLICY,
      directory: activeDirectory(),
      verifier: verifiedMfa(),
      now: NOW,
    });
    assert.deepEqual(result, { status: 'DENIED', reason: 'configuration_error' });
  } finally {
    process.env.PRIVILEGED_JWT_SECRET = previous;
  }
});
