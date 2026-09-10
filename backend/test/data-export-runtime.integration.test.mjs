import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Hono } from 'hono';
import postgres from 'postgres';

const enabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';
const applicationName = `export-qa-${randomUUID()}`;

// Parse the emitted CSV as records, including quoted delimiters/newlines. This
// validates the downloaded representation rather than the projection helper.
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
  assert.equal(field, '');
  assert.deepEqual(row, []);
  const [headers, ...values] = rows;
  return values.map((cells) => {
    assert.equal(cells.length, headers.length, 'no injected or missing CSV columns');
    return Object.fromEntries(headers.map((header, i) => [header, cells[i]]));
  });
}

async function waitForBlockedOperations(tx, blockerPid, expected) {
  const deadline = Date.now() + 4_000;
  let observed = 0;
  while (Date.now() < deadline) {
    await tx`SELECT pg_stat_clear_snapshot()`;
    const [row] = await tx`
      WITH RECURSIVE blocked AS (
        SELECT pid FROM pg_stat_activity WHERE ${blockerPid} = ANY(pg_blocking_pids(pid))
        UNION
        SELECT activity.pid FROM pg_stat_activity activity
        JOIN blocked ON blocked.pid = ANY(pg_blocking_pids(activity.pid))
      ) SELECT count(*)::int AS count FROM blocked
        JOIN pg_stat_activity USING (pid) WHERE application_name = ${applicationName}
    `;
    observed = row.count;
    if (observed >= expected) return;
    await delay(10);
  }
  assert.fail(`Expected ${expected} blocked export/transfer operations, saw ${observed}`);
}

test('Guardian data export preserves authorization and disclosure through JSON/CSV delivery', {
  skip: !enabled, timeout: 40_000,
}, async (t) => {
  // Isolate observed waiters from other concurrently running integration files.
  const previousAppName = process.env.PGAPPNAME;
  process.env.PGAPPNAME = applicationName;
  const [{ dataExport }, { authMiddleware, signAccessToken }, { closeDatabase }] = await Promise.all([
    import('../dist/api/routes/data-export.js'),
    import('../dist/api/middleware/auth.js'),
    import('../dist/db/index.js'),
  ]);
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const transferSql = postgres(process.env.DATABASE_URL, { max: 1 });
  if (previousAppName === undefined) delete process.env.PGAPPNAME;
  else process.env.PGAPPNAME = previousAppName;
  const ownerId = randomUUID();
  const otherOwnerId = randomUUID();
  const dogId = randomUUID();
  const otherDogId = randomUUID();
  const emptyDogId = randomUUID();
  const requests = [];
  const pendingTransfers = [];

  t.after(async () => {
    await Promise.allSettled([...requests, ...pendingTransfers]);
    try {
      for (const table of ['sensor_summaries', 'eli_states', 'baselines', 'devices']) {
        await sql`DELETE FROM ${sql(table)} WHERE dog_id IN (${dogId}, ${otherDogId}, ${emptyDogId})`;
      }
      await sql`DELETE FROM dogs WHERE id IN (${dogId}, ${otherDogId}, ${emptyDogId})`;
      await sql`DELETE FROM users WHERE id IN (${ownerId}, ${otherOwnerId})`;
    } finally {
      await transferSql.end({ timeout: 5 });
      await sql.end({ timeout: 5 });
      await closeDatabase();
    }
  });

  for (const id of [ownerId, otherOwnerId]) {
    await sql`INSERT INTO users (id, email, password_hash, name)
      VALUES (${id}, ${`export-${id}@example.test`}, 'PRIVATE-PASSWORD-FIXTURE', 'Export fixture')`;
  }
  for (const [id, owner, name] of [
    [dogId, ownerId, 'Export dog'], [otherDogId, otherOwnerId, 'OTHER-GUARDIAN-DOG'],
    [emptyDogId, ownerId, 'Empty dog'],
  ]) {
    await sql`INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
      VALUES (${id}, ${owner}, ${name}, 'Mixed', '2021-01-01', 'female', 18, 'FC2')`;
  }

  const from = '2026-09-01T00:00:00.000Z';
  const to = '2026-09-03T00:00:00.000Z';
  const summaryIds = [];
  const outsideIds = [];
  for (const timestamp of ['2026-08-31T23:59:59Z', from, '2026-09-02T00:00:00Z', to, '2026-09-03T00:00:01Z']) {
    const id = randomUUID();
    await sql`INSERT INTO sensor_summaries (id, dog_id, timestamp, source, activity_minutes, temperature_c)
      VALUES (${id}, ${dogId}, ${timestamp}, 'TAG', 12.5, -1.5)`;
    (new Date(timestamp) >= new Date(from) && new Date(timestamp) <= new Date(to) ? summaryIds : outsideIds).push(id);
  }
  const otherSummaryId = randomUUID();
  await sql`INSERT INTO sensor_summaries (id, dog_id, timestamp, source, activity_minutes)
    VALUES (${otherSummaryId}, ${otherDogId}, ${from}, 'MAT', 999)`;

  const eliIds = new Map();
  for (const [index, gate] of ['PUBLISH', 'DEGRADE', 'REJECT', 'FUTURE'].entries()) {
    const id = randomUUID();
    eliIds.set(gate, id);
    await sql`INSERT INTO eli_states (id, dog_id, timestamp, arousal, valence, load, confidence, gate_status, sensor_reliability)
      VALUES (${id}, ${dogId}, ${`2026-09-02T00:0${index}:00Z`}, 0.73, -0.41, 0.62, 0.91, ${gate},
        ${sql.json({ internalSentinel: 'PRIVATE-MODEL-STATE' })})`;
  }
  const excludedEliId = randomUUID();
  await sql`INSERT INTO eli_states (id, dog_id, timestamp, arousal, valence, load, confidence, gate_status, sensor_reliability)
    VALUES (${excludedEliId}, ${dogId}, '2026-08-01T00:00:00Z', 0.7, -0.4, 0.6, 0.9, 'PUBLISH', '{}')`;
  await sql`INSERT INTO baselines (dog_id, started_at, valid_hours, established, metrics)
    VALUES (${dogId}, '2026-08-01T00:00:00Z', 72.5, 1,
      ${sql.json({ internalCandidate: 'PRIVATE-BASELINE-METRICS', valence: -0.41 })})`;

  const dangerousFirmware = ['=1+2', '+SUM(1)', '-42', '@SUM(1)', ' \t=1+2', '\r=1+2', '\n=1+2', '＝1+2', '＋1', '－1', '＠SUM(1)', '=1+2";=1+2'];
  const ordinaryFirmware = ['v1.2.3', 'v1,"β"\nnext'];
  const deviceFixtures = [];
  for (const firmware of [...dangerousFirmware, ...ordinaryFirmware]) {
    const id = randomUUID();
    const mac = randomBytes(6).toString('hex').match(/../g).join(':');
    deviceFixtures.push({ id, firmware, mac });
    await sql`INSERT INTO devices (id, dog_id, type, mac_address, firmware_version)
      VALUES (${id}, ${dogId}, 'TAG', ${mac}, ${firmware})`;
  }

  const app = new Hono();
  app.use('/api/*', authMiddleware);
  app.route('/api/data-export', dataExport);
  const ownerToken = await signAccessToken(ownerId);
  const otherToken = await signAccessToken(otherOwnerId);
  function request(targetDog = dogId, format = 'json', token = ownerToken, bounded = true) {
    const query = new URLSearchParams({ dog_id: targetDog, format });
    if (bounded) { query.set('from', from); query.set('to', to); }
    const response = app.request(`/api/data-export?${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    requests.push(response);
    return response;
  }

  await t.test('actual JSON and CSV enforce the same window, identity and publication projection', async () => {
    const jsonResponse = await request();
    assert.equal(jsonResponse.status, 200);
    assert.equal(jsonResponse.headers.get('cache-control'), 'private, no-store');
    assert.equal(jsonResponse.headers.get('x-content-type-options'), 'nosniff');
    assert.match(jsonResponse.headers.get('content-disposition'), /\.json"$/);
    const json = await jsonResponse.json();
    assert.equal(json.subject.userId, ownerId);
    assert.equal(json.subject.dogId, dogId);
    assert.deepEqual(json.interval, { from, to });
    assert.deepEqual(json.raw, []);
    assert.equal(json.rawDataStatus, 'NOT_PERSISTED_BY_CURRENT_BACKEND_SCHEMA');
    assert.deepEqual(json.preprocessed.map((row) => row.id), summaryIds);
    assert.equal(json.preprocessed[0].temperatureC, -1.5);
    assert.equal(json.preprocessed[0].units.temperatureC, 'degC');
    assert.equal(json.preprocessed[0].provenance.level, 'preprocessed');
    assert.equal(json.baselines[0].metricsStatus, 'WITHHELD_PENDING_DISCLOSURE_AUTHORITY');
    assert.equal(Object.hasOwn(json.baselines[0], 'metrics'), false);
    for (const row of json.inferred) {
      for (const key of ['arousal', 'valence', 'sensorReliability']) assert.equal(Object.hasOwn(row, key), false);
      assert.equal(Object.hasOwn(row, 'load'), row.gateStatus === 'PUBLISH');
    }
    assert.equal(json.inferred.length, 4);

    const csvResponse = await request(dogId, 'csv');
    assert.equal(csvResponse.status, 200);
    assert.equal(csvResponse.headers.get('cache-control'), 'private, no-store');
    assert.equal(csvResponse.headers.get('x-content-type-options'), 'nosniff');
    assert.match(csvResponse.headers.get('content-type'), /^text\/csv/);
    assert.match(csvResponse.headers.get('content-disposition'), /\.csv"$/);
    const csvText = await csvResponse.text();
    const csv = parseCsv(csvText);
    assert.deepEqual(csv.filter((row) => row.record_type === 'preprocessed_sensor_summary').map((row) => row.id), summaryIds);
    assert.equal(csv.find((row) => row.record_type === 'preprocessed_sensor_summary').temperatureC, '-1.5');
    for (const [gate, id] of eliIds) {
      const row = csv.find((value) => value.id === id);
      assert.ok(row);
      assert.equal(row.load === 'null', gate !== 'PUBLISH');
      for (const key of ['arousal', 'valence', 'sensorReliability', 'metrics']) assert.equal(Object.hasOwn(row, key), false);
    }
    for (const fixture of deviceFixtures) {
      assert.equal(json.devices.find((row) => row.id === fixture.id).firmwareVersion, fixture.firmware);
      const expected = dangerousFirmware.includes(fixture.firmware) ? `'${fixture.firmware}` : fixture.firmware;
      assert.equal(csv.find((row) => row.id === fixture.id).firmwareVersion, expected);
    }
    for (const output of [JSON.stringify(json), csvText]) {
      for (const forbidden of [...outsideIds, excludedEliId, otherSummaryId, otherDogId, 'PRIVATE-MODEL-STATE', 'PRIVATE-BASELINE-METRICS', 'PRIVATE-PASSWORD-FIXTURE', ...deviceFixtures.map((row) => row.mac)]) {
        assert.equal(output.includes(forbidden), false, `must not disclose ${forbidden}`);
      }
    }
  });

  await t.test('another Guardian and an unknown dog receive identical denials in either format', async () => {
    assert.equal((await request(dogId, 'json', null)).status, 401);
    for (const format of ['json', 'csv']) {
      const denied = await request(otherDogId, format);
      const missing = await request(randomUUID(), format);
      assert.equal(denied.status, 404);
      assert.equal(missing.status, 404);
      assert.deepEqual(await denied.json(), await missing.json());
      assert.equal(denied.headers.get('cache-control'), 'private, no-store');
      assert.equal(denied.headers.get('content-disposition'), null);
      assert.equal((await request(dogId, format, otherToken)).status, 404);
    }
  });

  await t.test('a successful empty query remains distinguishable from source failure', async () => {
    const response = await request(emptyDogId);
    assert.equal(response.status, 200);
    const result = await response.json();
    for (const key of ['preprocessed', 'inferred', 'baselines', 'devices', 'raw']) assert.deepEqual(result[key], []);
    assert.equal(result.subject.dogId, emptyDogId);
  });

  await t.test('a transfer already in flight cannot release an export to the former owner', async () => {
    let pending;
    try {
      await sql.begin(async (tx) => {
        const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
        await tx`UPDATE dogs SET owner_id = ${otherOwnerId} WHERE id = ${dogId}`;
        pending = [request(), request(dogId, 'csv')];
        await waitForBlockedOperations(tx, pid, 2);
      });
      for (const response of await Promise.all(pending)) {
        assert.equal(response.status, 404);
        assert.equal(response.headers.get('cache-control'), 'private, no-store');
        assert.equal(response.headers.get('content-disposition'), null);
      }
      assert.equal((await request(dogId, 'json', otherToken)).status, 200);
    } finally {
      await Promise.allSettled(pending ?? []);
      await sql`UPDATE dogs SET owner_id = ${ownerId} WHERE id = ${dogId}`;
    }
  });

  await t.test('the dog authority lock remains held while export reads are in progress', async () => {
    let exported;
    let transfer;
    try {
      await sql.begin(async (tx) => {
        const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
        // Pause the first data read after ownership was consumed.
        await tx`LOCK TABLE devices IN ACCESS EXCLUSIVE MODE`;
        exported = request();
        await waitForBlockedOperations(tx, pid, 1);
        transfer = transferSql`UPDATE dogs SET owner_id = ${otherOwnerId} WHERE id = ${dogId}`.execute();
        pendingTransfers.push(transfer);
        await waitForBlockedOperations(tx, pid, 2);
      });
      const response = await exported;
      assert.equal(response.status, 200);
      assert.equal((await response.json()).subject.userId, ownerId);
      await transfer;
      assert.equal((await request()).status, 404);
    } finally {
      await Promise.allSettled([exported, transfer].filter(Boolean));
      await sql`UPDATE dogs SET owner_id = ${ownerId} WHERE id = ${dogId}`;
    }
  });

  await t.test('a real database read timeout yields sanitized 503 instead of a partial/empty download', async () => {
    await sql.begin(async (tx) => {
      await tx`LOCK TABLE devices IN ACCESS EXCLUSIVE MODE`;
      const response = await request(dogId, 'csv');
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal(response.headers.get('content-disposition'), null);
      assert.match(response.headers.get('content-type'), /^application\/json/);
      assert.deepEqual(await response.json(), {
        error: 'data_export_unavailable', code: 'DATA_EXPORT_UNAVAILABLE', retryable: true,
      });
    });
    assert.equal((await request()).status, 200, 'export recovers after the database lock is released');
  });
});
