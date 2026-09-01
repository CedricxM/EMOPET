import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.AUTH_DB_INTEGRATION === '1';

let auth = null;
let sql = null;

if (enabled) {
  const [{ auth: authRouter }, { default: postgres }] = await Promise.all([
    import('../dist/api/routes/auth.js'),
    import('postgres'),
  ]);
  auth = authRouter;
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
}

after(async () => {
  if (sql) await sql.end();
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

  const registerResponse = await jsonRequest('/register', {
    email: 'ROUTE-AUTH@emopet.invalid',
    password,
    name: 'Route Auth',
  });
  assert.equal(registerResponse.status, 201);
  const registered = await registerResponse.json();
  assert.equal(registered.user.email, email);
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

  const consumedRows = await sql`
    SELECT revoke_reason
    FROM auth_refresh_sessions
    WHERE token_hash = encode(digest(${registered.refreshToken}, 'sha256'), 'hex')
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
        WHERE token_hash = encode(digest(${registered.refreshToken}, 'sha256'), 'hex')
        LIMIT 1
      )
  `;
  assert.ok(familyRows.some((row) => row.revoke_reason === 'reuse_detected'));

  const postReuseResponse = await jsonRequest('/refresh', {
    refreshToken: rotated.refreshToken,
  });
  assert.equal(postReuseResponse.status, 401);

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

  const thirdLogin = await (await jsonRequest('/login', { email, password })).json();
  const fourthLogin = await (await jsonRequest('/login', { email, password })).json();

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
