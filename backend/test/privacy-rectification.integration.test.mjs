import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { Hono } from 'hono';
import postgres from 'postgres';

const enabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (!quoted && ch === ',') {
      row.push(field); field = '';
    } else if (!quoted && ch === '\r' && text[i + 1] === '\n') {
      row.push(field); rows.push(row); row = []; field = ''; i += 1;
    } else field += ch;
  }
  assert.equal(quoted, false, 'CSV quote state must close');
  const [headers, ...values] = rows;
  return values.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]])));
}

test('owner rectification propagates to canonical read and both export formats', {
  skip: !enabled,
}, async (t) => {
  const [
    { dogs },
    { dataExport },
    { authMiddleware, signAccessToken },
    { closeDatabase },
  ] = await Promise.all([
    import('../dist/api/routes/dogs.js'),
    import('../dist/api/routes/data-export.js'),
    import('../dist/api/middleware/auth.js'),
    import('../dist/db/index.js'),
  ]);

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const ownerId = randomUUID();
  const otherOwnerId = randomUUID();
  const dogId = randomUUID();
  const originalName = 'Original profile';
  const correctedName = 'Corrected profile';
  const correctedWeight = 21.75;

  t.after(async () => {
    try {
      await sql`DELETE FROM dogs WHERE id = ${dogId}`;
      await sql`DELETE FROM users WHERE id IN (${ownerId}, ${otherOwnerId})`;
    } finally {
      await sql.end({ timeout: 5 });
      await closeDatabase();
    }
  });

  for (const [id, label] of [[ownerId, 'Owner'], [otherOwnerId, 'Other owner']]) {
    await sql`INSERT INTO users (id, email, password_hash, name)
      VALUES (${id}, ${`rectification-${id}@example.test`}, 'integration-test-only', ${label})`;
  }
  await sql`INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (${dogId}, ${ownerId}, ${originalName}, 'Mixed', '2021-01-01', 'female', 18, 'FC2')`;

  const app = new Hono();
  app.use('/api/*', authMiddleware);
  app.route('/api/dogs', dogs);
  app.route('/api/data-export', dataExport);

  const ownerToken = await signAccessToken(ownerId);
  const otherToken = await signAccessToken(otherOwnerId);
  const auth = (token) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  const denied = await app.request(`/api/dogs/${dogId}`, {
    method: 'PATCH',
    headers: auth(otherToken),
    body: JSON.stringify({ name: 'Unauthorized correction', weight: 99 }),
  });
  assert.equal(denied.status, 404, 'another owner must not rectify this dog profile');

  const patch = await app.request(`/api/dogs/${dogId}`, {
    method: 'PATCH',
    headers: auth(ownerToken),
    body: JSON.stringify({ name: correctedName, weight: correctedWeight }),
  });
  assert.equal(patch.status, 200);
  const patched = await patch.json();
  assert.equal(patched.dog.name, correctedName);
  assert.equal(patched.dog.weight, correctedWeight);

  const getResponse = await app.request(`/api/dogs/${dogId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.equal(getResponse.status, 200);
  const canonical = await getResponse.json();
  assert.equal(canonical.dog.name, correctedName);
  assert.equal(canonical.dog.weight, correctedWeight);

  const jsonResponse = await app.request(`/api/data-export?dog_id=${dogId}&format=json`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.equal(jsonResponse.status, 200);
  const json = await jsonResponse.json();
  assert.equal(json.subject.dogProfile.name, correctedName);
  assert.equal(json.subject.dogProfile.weightKg, correctedWeight);
  assert.equal(JSON.stringify(json).includes(originalName), false);

  const csvResponse = await app.request(`/api/data-export?dog_id=${dogId}&format=csv`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.equal(csvResponse.status, 200);
  const csvText = await csvResponse.text();
  const csv = parseCsv(csvText);
  const profile = csv.find((row) => row.record_type === 'dog_profile');
  assert.ok(profile, 'CSV must carry the same canonical dog profile as JSON');
  assert.equal(profile.userId, ownerId);
  assert.equal(profile.dogId, dogId);
  assert.equal(profile.name, correctedName);
  assert.equal(profile.weightKg, String(correctedWeight));
  assert.equal(csvText.includes(originalName), false);
});
