import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.AUTH_EMAIL_DELIVERY_OUTBOX_DB_INTEGRATION === '1';

let sql = null;
let outbox = null;
let verification = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, outboxModule, verificationModule, dbModule] =
    await Promise.all([
      import('postgres'),
      import('../dist/api/services/auth-email-delivery-outbox.js'),
      import('../dist/api/services/auth-email-verification.js'),
      import('../dist/db/index.js'),
    ]);
  sql = postgres(process.env.DATABASE_URL, { max: 6 });
  outbox = outboxModule;
  verification = verificationModule;
  closeDatabase = dbModule.closeDatabase;
}

const USER = 'a7470000-0000-4000-8000-000000000001';
const EMAIL = 'outbox-eligible@emopet.invalid';
const UNKNOWN_EMAIL = 'outbox-unknown@emopet.invalid';

async function cleanup() {
  if (!sql || !outbox) return;
  const hashes = [
    outbox.hashEmailVerificationDeliveryAddress(EMAIL),
    outbox.hashEmailVerificationDeliveryAddress(UNKNOWN_EMAIL),
  ];
  await sql`
    DELETE FROM auth_email_verification_delivery_requests
    WHERE email_hash = ANY(${hashes})
  `;
  await sql`DELETE FROM users WHERE id = ${USER}`;
}

async function seedEligibleUser() {
  await cleanup();
  await sql`
    INSERT INTO users (
      id,
      email,
      password_hash,
      name,
      email_verification_required_at
    )
    VALUES (
      ${USER},
      ${EMAIL},
      'outbox-provisional-test-only',
      'Outbox Test',
      '2026-09-30T10:00:00.000Z'
    )
  `;
}

function deliveryEnv() {
  return {
    NODE_ENV: 'test',
    AUTH_EMAIL_VERIFICATION_URL: 'https://example.test/verify-email',
    RESEND_API_KEY: 'test-only-key',
    RESEND_FROM: 'EMOPET <verify@example.test>',
  };
}

function extractToken(verificationUrl) {
  const url = new URL(verificationUrl);
  const fragment = new URLSearchParams(url.hash.slice(1));
  return fragment.get('token');
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('public enqueue coalesces the same email and stores no token material', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const t0 = new Date('2026-09-30T10:00:00.000Z');
  assert.deepEqual(
    await outbox.enqueueEmailVerificationDeliveryRequest(UNKNOWN_EMAIL, () => t0),
    { queued: true, coalesced: false },
  );
  assert.deepEqual(
    await outbox.enqueueEmailVerificationDeliveryRequest(
      UNKNOWN_EMAIL,
      () => new Date('2026-09-30T10:00:30.000Z'),
    ),
    { queued: false, coalesced: true },
  );

  const rows = await sql`
    SELECT *
    FROM auth_email_verification_delivery_requests
    WHERE email_hash = ${outbox.hashEmailVerificationDeliveryAddress(UNKNOWN_EMAIL)}
  `;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, UNKNOWN_EMAIL);
  assert.equal(rows[0].attempt_count, 0);

  const serialized = JSON.stringify(rows[0]);
  assert.equal(serialized.includes('emopet_ev_'), false);
  assert.equal(serialized.includes('verify-email#'), false);
});

test('unknown account is suppressed by the worker without provider I/O', {
  skip: !enabled,
}, async () => {
  await cleanup();
  const t0 = new Date('2026-09-30T11:00:00.000Z');
  await outbox.enqueueEmailVerificationDeliveryRequest(UNKNOWN_EMAIL, () => t0);

  let deliveryCalls = 0;
  const result = await outbox.processNextEmailVerificationDeliveryRequest({
    clock: () => t0,
    env: deliveryEnv(),
    deliver: async () => {
      deliveryCalls += 1;
      throw new Error('provider must not be called for unknown account');
    },
  });

  assert.deepEqual(result, { status: 'not_eligible' });
  assert.equal(deliveryCalls, 0);

  const [row] = await sql`
    SELECT email, email_hash, outcome, completed_at
    FROM auth_email_verification_delivery_requests
    WHERE email_hash = ${outbox.hashEmailVerificationDeliveryAddress(UNKNOWN_EMAIL)}
    ORDER BY requested_at DESC
    LIMIT 1
  `;
  assert.equal(row.email, null);
  assert.equal(row.outcome, 'not_eligible');
  assert.ok(row.completed_at instanceof Date);
});

test('eligible delivery is asynchronous, scrubs raw email and persists only token digest', {
  skip: !enabled,
}, async () => {
  await seedEligibleUser();
  const t0 = new Date('2026-09-30T12:00:00.000Z');
  await outbox.enqueueEmailVerificationDeliveryRequest(EMAIL, () => t0);

  let deliveredUrl = null;
  const result = await outbox.processNextEmailVerificationDeliveryRequest({
    clock: () => t0,
    env: deliveryEnv(),
    deliver: async (input) => {
      deliveredUrl = input.verificationUrl;
      return {
        ok: true,
        provider: 'resend',
        providerMessageId: 'msg_outbox_1',
      };
    },
  });

  assert.deepEqual(result, { status: 'delivered' });
  assert.ok(deliveredUrl);
  const rawToken = extractToken(deliveredUrl);
  assert.match(rawToken, /^emopet_ev_[A-Za-z0-9_-]{43}$/);

  const [row] = await sql`
    SELECT *
    FROM auth_email_verification_delivery_requests
    WHERE email_hash = ${outbox.hashEmailVerificationDeliveryAddress(EMAIL)}
    ORDER BY requested_at DESC
    LIMIT 1
  `;
  assert.equal(row.email, null);
  assert.equal(row.outcome, 'delivered');
  assert.equal(row.attempt_count, 1);
  assert.equal(row.provider_message_id, 'msg_outbox_1');
  assert.equal(JSON.stringify(row).includes(rawToken), false);

  const [tokenRow] = await sql`
    SELECT token_hash
    FROM auth_email_verification_tokens
    WHERE user_id = ${USER}
      AND consumed_at IS NULL
      AND revoked_at IS NULL
  `;
  assert.equal(tokenRow.token_hash, verification.hashEmailVerificationToken(rawToken));
  assert.notEqual(tokenRow.token_hash, rawToken);
});

test('two concurrent workers claim one intent and call provider once', {
  skip: !enabled,
}, async () => {
  await seedEligibleUser();
  const t0 = new Date('2026-09-30T13:00:00.000Z');
  await outbox.enqueueEmailVerificationDeliveryRequest(EMAIL, () => t0);

  let deliveryCalls = 0;
  const deliver = async () => {
    deliveryCalls += 1;
    return {
      ok: true,
      provider: 'resend',
      providerMessageId: 'msg_race',
    };
  };

  const results = await Promise.all([
    outbox.processNextEmailVerificationDeliveryRequest({
      clock: () => t0,
      env: deliveryEnv(),
      deliver,
    }),
    outbox.processNextEmailVerificationDeliveryRequest({
      clock: () => t0,
      env: deliveryEnv(),
      deliver,
    }),
  ]);

  assert.equal(results.filter((result) => result.status === 'delivered').length, 1);
  assert.equal(results.filter((result) => result.status === 'no_work').length, 1);
  assert.equal(deliveryCalls, 1);
});

test('provider failure schedules bounded retry and supersedes the lost raw token', {
  skip: !enabled,
}, async () => {
  await seedEligibleUser();
  const t0 = new Date('2026-09-30T14:00:00.000Z');
  await outbox.enqueueEmailVerificationDeliveryRequest(EMAIL, () => t0);

  let firstUrl = null;
  const first = await outbox.processNextEmailVerificationDeliveryRequest({
    clock: () => t0,
    env: deliveryEnv(),
    deliver: async (input) => {
      firstUrl = input.verificationUrl;
      return { ok: false, error: 'provider_unavailable' };
    },
  });
  assert.deepEqual(first, { status: 'retry_scheduled' });

  const [retryRow] = await sql`
    SELECT attempt_count, available_at, completed_at, last_error
    FROM auth_email_verification_delivery_requests
    WHERE email_hash = ${outbox.hashEmailVerificationDeliveryAddress(EMAIL)}
    ORDER BY requested_at DESC
    LIMIT 1
  `;
  assert.equal(retryRow.attempt_count, 1);
  assert.equal(retryRow.completed_at, null);
  assert.equal(retryRow.last_error, 'provider_unavailable');
  assert.equal(
    retryRow.available_at.toISOString(),
    '2026-09-30T14:01:00.000Z',
  );

  assert.deepEqual(
    await outbox.processNextEmailVerificationDeliveryRequest({
      clock: () => new Date('2026-09-30T14:00:30.000Z'),
      env: deliveryEnv(),
      deliver: async () => {
        throw new Error('not due');
      },
    }),
    { status: 'no_work' },
  );

  let secondUrl = null;
  const second = await outbox.processNextEmailVerificationDeliveryRequest({
    clock: () => new Date('2026-09-30T14:01:01.000Z'),
    env: deliveryEnv(),
    deliver: async (input) => {
      secondUrl = input.verificationUrl;
      return {
        ok: true,
        provider: 'resend',
        providerMessageId: 'msg_retry',
      };
    },
  });
  assert.deepEqual(second, { status: 'delivered' });

  const firstToken = extractToken(firstUrl);
  const secondToken = extractToken(secondUrl);
  assert.notEqual(firstToken, secondToken);

  const tokenRows = await sql`
    SELECT token_hash, revoked_at
    FROM auth_email_verification_tokens
    WHERE user_id = ${USER}
    ORDER BY created_at
  `;
  assert.equal(tokenRows.length, 2);
  assert.ok(tokenRows[0].revoked_at instanceof Date);
  assert.equal(tokenRows[1].revoked_at, null);
  assert.equal(
    tokenRows[1].token_hash,
    verification.hashEmailVerificationToken(secondToken),
  );
});
