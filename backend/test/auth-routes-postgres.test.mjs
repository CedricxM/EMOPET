import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.AUTH_DB_INTEGRATION === '1' || process.env.EMOPET_DB_INTEGRATION_TEST === '1';

let auth = null;
let sql = null;
let hashRefreshToken = null;
let hashPassword = null;
let hashEmailVerificationToken = null;
let closeDatabase = null;

if (enabled) {
  const [
    { auth: authRouter },
    { hashRefreshToken: hashToken, hashPassword: hashPasswordValue },
    { hashEmailVerificationToken: hashVerificationToken },
    { closeDatabase: closeSharedDatabase },
    { default: postgres },
  ] = await Promise.all([
    import('../dist/api/routes/auth.js'),
    import('../dist/api/services/auth-security.js'),
    import('../dist/api/services/auth-email-verification.js'),
    import('../dist/db/index.js'),
    import('postgres'),
  ]);
  auth = authRouter;
  hashRefreshToken = hashToken;
  hashPassword = hashPasswordValue;
  hashEmailVerificationToken = hashVerificationToken;
  closeDatabase = closeSharedDatabase;
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
}

after(async () => {
  if (sql) await sql.end({ timeout: 5 });
  if (closeDatabase) await closeDatabase();
});

async function jsonRequest(path, body, authorization) {
  const headers = { 'Content-Type': 'application/json' };
  if (authorization) headers.Authorization = authorization;
  return auth.request(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });
}

test('AUTH-EMAIL-VERIFY-01 registration is generic and creates no session before proof', {
  skip: !enabled,
}, async () => {
  const email = 'verify-route@emopet.invalid';
  const unknownEmail = 'verify-unknown@emopet.invalid';
  const password = 'Attacker Known Registration Password 2026!';
  const verifiedPassword = 'Email Owner Selected Password 2026!';

  await sql`DELETE FROM auth_email_verification_delivery_requests WHERE email IN (${email}, ${unknownEmail})`;
  await sql`DELETE FROM users WHERE email IN (${email}, ${unknownEmail})`;

  const registerResponse = await jsonRequest('/register', {
    email: '  VERIFY-ROUTE@emopet.invalid ',
    password,
    name: ' Verify Route ',
  });
  assert.equal(registerResponse.status, 202);
  assert.equal(registerResponse.headers.get('cache-control'), 'no-store');
  const acknowledgement = await registerResponse.json();
  assert.deepEqual(acknowledgement, {
    status: 'accepted',
    message: 'If this email is eligible, verification instructions will be sent.',
  });
  assert.equal('user' in acknowledgement, false);
  assert.equal('accessToken' in acknowledgement, false);
  assert.equal('refreshToken' in acknowledgement, false);

  const [user] = await sql`
    SELECT id, email, email_verified_at, email_verification_required_at
    FROM users
    WHERE email = ${email}
  `;
  assert.equal(user.email, email);
  assert.equal(user.email_verified_at, null);
  assert.ok(user.email_verification_required_at instanceof Date);

  const [sessionCount] = await sql`
    SELECT count(*)::int AS count
    FROM auth_refresh_sessions
    WHERE user_id = ${user.id}
  `;
  assert.equal(sessionCount.count, 0);

  const [tokenCountBeforeWorker] = await sql`
    SELECT count(*)::int AS count
    FROM auth_email_verification_tokens
    WHERE user_id = ${user.id}
  `;
  assert.equal(tokenCountBeforeWorker.count, 0);

  const [deliveryIntent] = await sql`
    SELECT email, attempt_count, completed_at
    FROM auth_email_verification_delivery_requests
    WHERE email = ${email}
      AND completed_at IS NULL
  `;
  assert.equal(deliveryIntent.email, email);
  assert.equal(deliveryIntent.attempt_count, 0);
  assert.equal(deliveryIntent.completed_at, null);

  const blockedLogin = await jsonRequest('/login', { email, password });
  assert.equal(blockedLogin.status, 403);
  assert.deepEqual(await blockedLogin.json(), { error: 'Email verification required' });

  const duplicateResponse = await jsonRequest('/register', {
    email,
    password,
    name: 'Different public name must not change response',
  });
  assert.equal(duplicateResponse.status, 202);
  assert.deepEqual(await duplicateResponse.json(), acknowledgement);

  const resendKnown = await jsonRequest('/verify-email/resend', { email });
  const resendUnknown = await jsonRequest('/verify-email/resend', { email: unknownEmail });
  assert.equal(resendKnown.status, 202);
  assert.equal(resendUnknown.status, 202);
  assert.deepEqual(await resendKnown.json(), acknowledgement);
  assert.deepEqual(await resendUnknown.json(), acknowledgement);

  const [knownIntentCount] = await sql`
    SELECT count(*)::int AS count
    FROM auth_email_verification_delivery_requests
    WHERE email = ${email}
      AND completed_at IS NULL
  `;
  const [unknownIntentCount] = await sql`
    SELECT count(*)::int AS count
    FROM auth_email_verification_delivery_requests
    WHERE email = ${unknownEmail}
      AND completed_at IS NULL
  `;
  // Register + duplicate register + resend are coalesced into one active intent.
  assert.equal(knownIntentCount.count, 1);
  assert.equal(unknownIntentCount.count, 1);

  // Route verification remains independently testable with a deterministic
  // token; the public register/resend path itself no longer creates it.
  const rawVerificationToken = `emopet_ev_${Buffer.alloc(32, 0x42).toString('base64url')}`;
  await sql`
    INSERT INTO auth_email_verification_tokens
      (user_id, email, token_hash, expires_at)
    VALUES (
      ${user.id},
      ${email},
      ${hashEmailVerificationToken(rawVerificationToken)},
      now() + interval '1 hour'
    )
  `;

  const verifyResponse = await jsonRequest('/verify-email', {
    token: rawVerificationToken,
    password: verifiedPassword,
  });
  assert.equal(verifyResponse.status, 200);
  assert.equal(verifyResponse.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await verifyResponse.json(), { verified: true, next: 'login' });

  const replayResponse = await jsonRequest('/verify-email', {
    token: rawVerificationToken,
    password: 'Replay Password Must Not Win 2026!',
  });
  assert.equal(replayResponse.status, 400);

  const [verifiedUser] = await sql`
    SELECT email_verified_at
    FROM users
    WHERE id = ${user.id}
  `;
  assert.ok(verifiedUser.email_verified_at instanceof Date);

  // Pre-hijack regression: the password chosen before email ownership was
  // proven must not become authority after verification.
  const attackerPasswordLogin = await jsonRequest('/login', { email, password });
  assert.equal(attackerPasswordLogin.status, 401);
  assert.deepEqual(await attackerPasswordLogin.json(), { error: 'Invalid credentials' });

  const loginAfterVerification = await jsonRequest('/login', {
    email,
    password: verifiedPassword,
  });
  assert.equal(loginAfterVerification.status, 200);
  const authenticated = await loginAfterVerification.json();
  assert.match(authenticated.refreshToken, /^emopet_rt_/);

  await sql`DELETE FROM auth_refresh_sessions WHERE user_id = ${user.id}`;
  await sql`DELETE FROM auth_email_verification_delivery_requests WHERE email IN (${email}, ${unknownEmail})`;
  await sql`DELETE FROM users WHERE id = ${user.id}`;
});

test('legacy accounts are not silently enrolled into email-verification rollout', {
  skip: !enabled,
}, async () => {
  const email = 'legacy-no-rollout@emopet.invalid';
  const passwordHash = await hashPassword('Legacy Password 2026!');

  await sql`DELETE FROM users WHERE email = ${email}`;
  const [legacy] = await sql`
    INSERT INTO users (email, password_hash, name)
    VALUES (${email}, ${passwordHash}, 'Legacy No Rollout')
    RETURNING id, email_verification_required_at
  `;
  assert.equal(legacy.email_verification_required_at, null);

  const resend = await jsonRequest('/verify-email/resend', { email });
  assert.equal(resend.status, 202);

  const [tokens] = await sql`
    SELECT count(*)::int AS count
    FROM auth_email_verification_tokens
    WHERE user_id = ${legacy.id}
  `;
  assert.equal(tokens.count, 0);

  const [legacyIntent] = await sql`
    SELECT count(*)::int AS count
    FROM auth_email_verification_delivery_requests
    WHERE email = ${email}
      AND completed_at IS NULL
  `;
  assert.equal(legacyIntent.count, 1);

  await sql`DELETE FROM auth_email_verification_delivery_requests WHERE email = ${email}`;
  await sql`DELETE FROM users WHERE id = ${legacy.id}`;
});

test('AUTH-01 routes persist credentials, rotate refresh sessions, and revoke server-side', {
  skip: !enabled,
}, async () => {
  const email = 'route-auth@emopet.invalid';
  const password = 'Correct Horse Battery Staple 2026!';

  const rawTokenColumns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'auth_refresh_sessions'
      AND column_name IN ('refresh_token', 'raw_token', 'token')
  `;
  assert.equal(rawTokenColumns.length, 0);

  await sql`DELETE FROM auth_refresh_sessions WHERE user_id IN (SELECT id FROM users WHERE email = ${email})`;
  await sql`DELETE FROM users WHERE email = ${email}`;

  const passwordHash = await hashPassword(password);
  const [storedUser] = await sql`
    INSERT INTO users (email, password_hash, name)
    VALUES (${email}, ${passwordHash}, 'Legacy Auth Route')
    RETURNING id, email, password_hash, gdpr_consent_at,
      email_verified_at, email_verification_required_at
  `;

  assert.equal(storedUser.email, email);
  assert.equal(storedUser.email_verified_at, null);
  assert.equal(storedUser.email_verification_required_at, null);
  assert.notEqual(storedUser.password_hash, password);
  assert.equal(storedUser.password_hash.includes(password), false);
  assert.equal(storedUser.gdpr_consent_at, null);

  const wrongPasswordResponse = await jsonRequest('/login', {
    email,
    password: 'definitely-wrong',
  });
  assert.equal(wrongPasswordResponse.status, 401);
  assert.deepEqual(await wrongPasswordResponse.json(), { error: 'Invalid credentials' });

  const loginResponse = await jsonRequest('/login', { email, password });
  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.headers.get('cache-control'), 'no-store');
  const registered = await loginResponse.json();
  assert.match(registered.refreshToken, /^emopet_rt_/);

  const initialRefreshHashRows = await sql`
    SELECT token_hash, revoked_at, revoke_reason
    FROM auth_refresh_sessions
    WHERE user_id = ${storedUser.id}
  `;
  assert.equal(initialRefreshHashRows.length, 1);
  assert.equal(initialRefreshHashRows[0].token_hash, hashRefreshToken(registered.refreshToken));
  assert.notEqual(initialRefreshHashRows[0].token_hash, registered.refreshToken);
  assert.equal(initialRefreshHashRows[0].revoked_at, null);

  const refreshResponse = await jsonRequest('/refresh', {
    refreshToken: registered.refreshToken,
  });
  assert.equal(refreshResponse.status, 200);
  assert.equal(refreshResponse.headers.get('cache-control'), 'no-store');
  const rotated = await refreshResponse.json();
  assert.match(rotated.refreshToken, /^emopet_rt_/);
  assert.notEqual(rotated.refreshToken, registered.refreshToken);

  const registeredHash = hashRefreshToken(registered.refreshToken);
  const consumedRows = await sql`
    SELECT revoke_reason
    FROM auth_refresh_sessions
    WHERE token_hash = ${registeredHash}
  `;
  assert.equal(consumedRows[0]?.revoke_reason, 'rotated');

  const reusedResponse = await jsonRequest('/refresh', {
    refreshToken: registered.refreshToken,
  });
  assert.equal(reusedResponse.status, 401);

  const familyRows = await sql`
    SELECT revoke_reason
    FROM auth_refresh_sessions
    WHERE user_id = ${storedUser.id}
      AND family_id = (
        SELECT family_id
        FROM auth_refresh_sessions
        WHERE token_hash = ${registeredHash}
        LIMIT 1
      )
  `;
  assert.ok(familyRows.some((row) => row.revoke_reason === 'reuse_detected'));

  const postReuseResponse = await jsonRequest('/refresh', {
    refreshToken: rotated.refreshToken,
  });
  assert.equal(postReuseResponse.status, 401);

  const raceLoginResponse = await jsonRequest('/login', { email, password });
  assert.equal(raceLoginResponse.status, 200);
  const raceInitial = await raceLoginResponse.json();

  const raceRotateResponse = await jsonRequest('/refresh', {
    refreshToken: raceInitial.refreshToken,
  });
  assert.equal(raceRotateResponse.status, 200);
  const raceCurrent = await raceRotateResponse.json();
  const raceInitialHash = hashRefreshToken(raceInitial.refreshToken);

  const [currentRaceResponse, replayRaceResponse] = await Promise.all([
    jsonRequest('/refresh', { refreshToken: raceCurrent.refreshToken }),
    jsonRequest('/refresh', { refreshToken: raceInitial.refreshToken }),
  ]);
  assert.ok([200, 401].includes(currentRaceResponse.status));
  assert.equal(replayRaceResponse.status, 401);

  const [raceFamilyState] = await sql`
    SELECT
      count(*) FILTER (WHERE revoked_at IS NULL)::int AS active_count,
      count(*) FILTER (WHERE revoke_reason = 'reuse_detected')::int AS reuse_count
    FROM auth_refresh_sessions
    WHERE family_id = (
      SELECT family_id
      FROM auth_refresh_sessions
      WHERE token_hash = ${raceInitialHash}
      LIMIT 1
    )
  `;
  assert.equal(raceFamilyState.active_count, 0);
  assert.ok(raceFamilyState.reuse_count >= 1);

  const secondLoginResponse = await jsonRequest('/login', { email, password });
  assert.equal(secondLoginResponse.status, 200);
  const secondLogin = await secondLoginResponse.json();

  const logoutResponse = await jsonRequest('/logout', {
    refreshToken: secondLogin.refreshToken,
  });
  assert.equal(logoutResponse.status, 204);
  assert.equal(logoutResponse.headers.get('cache-control'), 'no-store');

  const loggedOutRefresh = await jsonRequest('/refresh', {
    refreshToken: secondLogin.refreshToken,
  });
  assert.equal(loggedOutRefresh.status, 401);

  const thirdLoginResponse = await jsonRequest('/login', { email, password });
  const fourthLoginResponse = await jsonRequest('/login', { email, password });
  assert.equal(thirdLoginResponse.status, 200);
  assert.equal(fourthLoginResponse.status, 200);
  const thirdLogin = await thirdLoginResponse.json();
  const fourthLogin = await fourthLoginResponse.json();

  const logoutAllResponse = await jsonRequest(
    '/logout-all',
    {},
    `Bearer ${thirdLogin.accessToken}`,
  );
  assert.equal(logoutAllResponse.status, 204);
  assert.equal(logoutAllResponse.headers.get('cache-control'), 'no-store');

  const [activeCount] = await sql`
    SELECT count(*)::int AS count
    FROM auth_refresh_sessions
    WHERE user_id = ${storedUser.id}
      AND revoked_at IS NULL
  `;
  assert.equal(activeCount.count, 0);

  const afterLogoutAll = await jsonRequest('/refresh', {
    refreshToken: fourthLogin.refreshToken,
  });
  assert.equal(afterLogoutAll.status, 401);

  const detachLoginResponse = await jsonRequest('/login', { email, password });
  assert.equal(detachLoginResponse.status, 200);
  const detached = await detachLoginResponse.json();
  const detachedHash = hashRefreshToken(detached.refreshToken);

  await sql`
    UPDATE auth_refresh_sessions
    SET user_id = NULL
    WHERE token_hash = ${detachedHash}
  `;

  const detachedRefresh = await jsonRequest('/refresh', {
    refreshToken: detached.refreshToken,
  });
  assert.equal(detachedRefresh.status, 401);

  const [detachedRow] = await sql`
    SELECT user_id, expires_at, token_hash
    FROM auth_refresh_sessions
    WHERE token_hash = ${detachedHash}
  `;
  assert.equal(detachedRow.user_id, null);
  assert.equal(detachedRow.token_hash, detachedHash);
  assert.ok(detachedRow.expires_at instanceof Date);

  await sql`DELETE FROM auth_refresh_sessions WHERE token_hash = ${detachedHash}`;
});
