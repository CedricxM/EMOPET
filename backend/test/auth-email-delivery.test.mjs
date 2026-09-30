import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertEmailVerificationRuntimeConfiguration,
  buildEmailVerificationUrl,
  deliverEmailVerification,
} from '../dist/api/services/auth-email-delivery.js';

const configuredEnv = {
  RESEND_API_KEY: 'test-only-not-a-real-key',
  RESEND_FROM: 'EMOPET <verify@example.test>',
};

test('delivery fails closed when provider configuration is absent', async () => {
  let calls = 0;
  const result = await deliverEmailVerification(
    {
      to: 'owner@example.test',
      verificationUrl: 'https://app.example.test/verify-email?token=secret-test-token',
    },
    {
      env: {},
      fetchImpl: async () => {
        calls += 1;
        throw new Error('should not call network');
      },
    },
  );

  assert.deepEqual(result, { ok: false, error: 'provider_not_configured' });
  assert.equal(calls, 0);
});

test('delivery rejects malformed email or verification URL before provider access', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response('{}', { status: 200 });
  };

  for (const input of [
    { to: 'not-an-email', verificationUrl: 'https://app.example.test/verify-email?token=x' },
    { to: 'owner@example.test', verificationUrl: 'javascript:alert(1)' },
    { to: 'owner@example.test', verificationUrl: 'not-a-url' },
  ]) {
    assert.deepEqual(
      await deliverEmailVerification(input, { env: configuredEnv, fetchImpl }),
      { ok: false, error: 'invalid_input' },
    );
  }

  assert.equal(calls, 0);
});

test('delivery sends the raw token only inside the provider message body', async () => {
  const token = 'emopet_ev_test-only-secret-token';
  const verificationUrl = `https://app.example.test/verify-email?token=${token}`;
  let request = null;

  const result = await deliverEmailVerification(
    { to: ' owner@example.test ', verificationUrl },
    {
      env: configuredEnv,
      fetchImpl: async (url, init) => {
        request = { url: String(url), init };
        return Response.json({ id: 'resend-message-123' });
      },
    },
  );

  assert.deepEqual(result, {
    ok: true,
    provider: 'resend',
    providerMessageId: 'resend-message-123',
  });

  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.headers.authorization, 'Bearer test-only-not-a-real-key');
  const body = JSON.parse(request.init.body);
  assert.equal(body.to, 'owner@example.test');
  assert.equal(body.from, 'EMOPET <verify@example.test>');
  assert.match(body.text, new RegExp(token));
  assert.doesNotMatch(body.subject, new RegExp(token));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(token));
});

test('provider rejection is bounded to status and never reflects provider body', async () => {
  const result = await deliverEmailVerification(
    {
      to: 'owner@example.test',
      verificationUrl: 'https://app.example.test/verify-email?token=secret-test-token',
    },
    {
      env: configuredEnv,
      fetchImpl: async () => new Response('provider internal secret detail', { status: 429 }),
    },
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'provider_rejected',
    providerStatus: 429,
  });
  assert.doesNotMatch(JSON.stringify(result), /provider internal secret detail/);
});

test('network failure is fail-closed and does not throw', async () => {
  const result = await deliverEmailVerification(
    {
      to: 'owner@example.test',
      verificationUrl: 'https://app.example.test/verify-email?token=secret-test-token',
    },
    {
      env: configuredEnv,
      fetchImpl: async () => {
        throw new Error('network secret detail');
      },
    },
  );

  assert.deepEqual(result, { ok: false, error: 'provider_unavailable' });
});

test('successful provider response may omit parseable message metadata', async () => {
  const result = await deliverEmailVerification(
    {
      to: 'owner@example.test',
      verificationUrl: 'http://localhost:3100/verify-email?token=secret-test-token',
    },
    {
      env: configuredEnv,
      fetchImpl: async () => new Response('accepted', { status: 202 }),
    },
  );

  assert.deepEqual(result, {
    ok: true,
    provider: 'resend',
    providerMessageId: null,
  });
});


test('verification URL builder appends token without accepting credential-bearing bases', () => {
  const env = {
    AUTH_EMAIL_VERIFICATION_URL: 'https://app.example.test/verify-email?source=auth',
  };
  const url = buildEmailVerificationUrl('emopet_ev_test-token', env);
  assert.ok(url);
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, 'https://app.example.test/verify-email');
  assert.equal(parsed.searchParams.get('source'), 'auth');
  assert.equal(parsed.searchParams.get('token'), 'emopet_ev_test-token');

  assert.equal(
    buildEmailVerificationUrl('token', {
      AUTH_EMAIL_VERIFICATION_URL: 'https://user:pass@app.example.test/verify-email',
    }),
    null,
  );
});

test('production runtime requires Resend and an HTTPS verification URL', () => {
  assert.throws(
    () => assertEmailVerificationRuntimeConfiguration({ NODE_ENV: 'production' }),
    /RESEND_API_KEY.*RESEND_FROM.*AUTH_EMAIL_VERIFICATION_URL_HTTPS/,
  );

  assert.throws(
    () => assertEmailVerificationRuntimeConfiguration({
      NODE_ENV: 'production',
      RESEND_API_KEY: 'test-key',
      RESEND_FROM: 'EMOPET <verify@example.test>',
      AUTH_EMAIL_VERIFICATION_URL: 'http://app.example.test/verify-email',
    }),
    /AUTH_EMAIL_VERIFICATION_URL_HTTPS/,
  );

  assert.doesNotThrow(() => assertEmailVerificationRuntimeConfiguration({
    NODE_ENV: 'production',
    RESEND_API_KEY: 'test-key',
    RESEND_FROM: 'EMOPET <verify@example.test>',
    AUTH_EMAIL_VERIFICATION_URL: 'https://app.example.test/verify-email',
  }));

  assert.doesNotThrow(() => assertEmailVerificationRuntimeConfiguration({
    NODE_ENV: 'development',
  }));
});
