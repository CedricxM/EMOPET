import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.AUTH_DB_INTEGRATION === '1';

let auth = null;
let sql = null;
let hashRefreshToken = null;
let closeDatabase = null;

if (enabled) {
  const [
    { auth: authRouter },
    { hashRefreshToken: hashToken },
    { closeDatabase: closeSharedDatabase },
    { default: postgres },
  ] = await Promise.all([
    import('../dist/api/routes/auth.js'),
    import('../dist/api/services/auth-security.js'),
    import('../dist/db/index.js'),
    import('postgres'),
  ]);
  auth = authRouter;
  hashRefreshToken = hashToken;
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

test('AUTH-01 routes persist credentials, rotate refresh sessions, and revoke server-side', {
  skip: !enabled,
}, async () => {
  const email = 'route-auth@emopet.invalid';
  const password = 'Correct Horse Battery Staple 2026!';

  await sql`DELETE FROM auth_refresh_sessions WHERE user_id IN (SELECT id FROM users WHERE email = ${email})`;
  await sql`DELETE FROM users WHERE email = ${email}`;

  const blankNameResponse = await jsonRequest('/register', {
    email: 'blank-name@emopet.invalid',
    password,
    name: '   ',
  });
  assert.equal(blankNameResponse.status, 400);

  const registerResponse = await jsonRequest('/register', {
    email: '  ROUTE-AUTH@emopet.invalid  ',
    password,
    name: ' Route Auth ',
  });
  assert.equal(registerResponse.status, 201);
  const registered = await registerResponse.json();
  assert.equal(registered.user.email, email);
  assert.equal(registered.user.name, 'Route Auth');
  assert.match(registered.user.id, /^[0-9a-f-]{36}$/i);
  assert.equal(typeof registered.accessToken, 'string');
  assert.match(registered.refreshToken, /^emopet_rt_/);

  const [storedUser] = await sql`
    SELECT id, email, password_hash, gdpr_consent_at
    FROM users
    WHERE email = ${email}
  `;
  assert.equal(storedUser.email, email);
  assert.notEqual(storedUser.password_hash, password);
  assert.equal(storedUser.password_hash.includes(password), false);
  assert.equal(storedUser.gdpr_consent_at, null);

  const initialRefreshHashRows = await sql`
    SELECT token_hash, revoked_at, revoke_reason
    FROM auth_refresh_sessions
    WHERE user_id = ${storedUser.id}
  `;
  assert.equal(initialRefreshHashRows.length, 1);
  assert.equal(initialRefreshHashRows[0].token_hash, hashRefreshToken(registered.refreshToken));
  assert.notEqual(initialRefreshHashRows[0].token_hash, registered.refreshToken);
  assert.equal(initialRefreshHashRows[0].revoked_at, null);

  const duplicateResponse = await jsonRequest('/register', {
    email,
    password,
    name: 'Duplicate',
  });
  assert.equal(duplicateResponse.status, 409);

  const wrongPasswordResponse = await jsonRequest('/login', {
    email,
    password: 'definitely-wrong',
  });
  assert.equal(wrongPasswordResponse.status, 401);
  assert.deepEqual(await wrongPasswordResponse.json(), { error: 'Invalid credentials' });

  const loginResponse = await jsonRequest('/login', { email, password });
  assert.equal(loginResponse.status, 200);
  const loggedIn = await loginResponse.json();
  assert.match(loggedIn.refreshToken, /^emopet_rt_/);

  const refreshResponse = await jsonRequest('/refresh', {
    refreshToken: registered.refreshToken,
  });
  assert.equal(refreshResponse.status, 200);
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

  // Race proof: replay a rotated token while its successor is refreshing.
  // The family lock allows either request to win the lock first, but after both
  // complete there must be no active refresh session left in that family.
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
});
