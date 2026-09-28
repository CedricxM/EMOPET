import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function internalSnapshot(dogId, ownerNotes = []) {
  return {
    dogId,
    dogName: 'Nala',
    days: 5,
    generatedAt: new Date('2026-09-07T12:00:00.000Z'),
    coverage: { validDays: 4, totalDays: 5, coverageRatio: 0.8 },
    trends: [{ label: 'Activite', value: '4 km', coverage: 'stable' }],
    ownerNotes,
  };
}

test('professional recipient read rechecks authority before publication', {
  skip: !integrationEnabled,
  timeout: 20_000,
}, async (t) => {
  const [
    { db },
    {
      dogs,
      devices,
      users,
      sensorSummaries,
      professionalShareGrants: grants,
      professionalShareAccessAudits: audits,
    },
    { dogs: dogRoutes },
    { createProfessionalShareRecipientReadBoundary },
  ] = await Promise.all([
    import('../dist/db/index.js'),
    import('../dist/db/schema/index.js'),
    import('../dist/api/routes/dogs.js'),
    import('../dist/api/services/professional-share-recipient-read.js'),
  ]);

  const ownerId = randomUUID();
  const nextOwnerId = randomUUID();
  const dogId = randomUUID();
  const grantId = randomUUID();
  const deviceId = randomUUID();
  const principalId = `fixture-vet-${randomUUID()}`;

  async function clearAudits() {
    await db.delete(audits).where(eq(audits.dogId, dogId));
  }

  t.after(async () => {
    await clearAudits();
    await db.delete(grants).where(eq(grants.dogId, dogId));
    await db.delete(sensorSummaries).where(eq(sensorSummaries.dogId, dogId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(dogs).where(eq(dogs.id, dogId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, nextOwnerId));
  });

  await db.insert(users).values([
    {
      id: ownerId,
      email: `recipient-read-${ownerId}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Recipient read Owner',
    },
    {
      id: nextOwnerId,
      email: `recipient-read-${nextOwnerId}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Next Owner',
    },
  ]);
  await db.insert(dogs).values({
    id: dogId,
    ownerId,
    name: 'Nala',
    breed: 'Labrador Retriever',
    birthDate: '2022-04-12',
    sex: 'female',
    weight: 24.5,
    furClass: 'FC2',
  });
  await db.insert(grants).values({
    id: grantId,
    ownerUserId: ownerId,
    dogId,
    recipientDisplayName: 'Dr Fixture',
    recipientType: 'VETERINARIAN',
    recipientEmail: 'vet@example.test',
    recipientPrincipalId: principalId,
    purpose: 'VETERINARY_CONSULTATION',
    scopes: [
      'VETERINARY_SUMMARY',
      'QUALIFIED_LONGITUDINAL_OBSERVATIONS',
      'DATA_COVERAGE_AND_CONFIDENCE',
    ],
    dataFrom: new Date('2026-09-01T00:00:00.000Z'),
    dataTo: new Date('2026-09-09T23:59:59.000Z'),
    accessExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    activatedAt: new Date('2026-09-01T00:00:00.000Z'),
    status: 'ACTIVE',
  });

  await db.insert(devices).values({ id: deviceId, dogId, type: 'MAT', macAddress: deviceId.slice(0, 17) });
  await db.insert(sensorSummaries).values([
    {
      dogId, deviceId, ingestionId: randomUUID(),
      timestamp: new Date('2026-09-01T12:00:00.000Z'),
      source: 'MAT',
      distanceKm: 111,
    },
    {
      dogId, deviceId, ingestionId: randomUUID(),
      timestamp: new Date('2026-09-04T12:00:00.000Z'),
      source: 'MAT',
      distanceKm: 4,
    },
    {
      dogId, deviceId, ingestionId: randomUUID(),
      timestamp: new Date('2026-09-08T12:00:00.000Z'),
      source: 'MAT',
      distanceKm: 999,
    },
  ]);

  const intent = {
    grantId,
    dogId,
    purpose: 'VETERINARY_CONSULTATION',
    scopes: ['VETERINARY_SUMMARY'],
    dataFrom: '2026-09-02T00:00:00.000Z',
    dataTo: '2026-09-07T00:00:00.000Z',
  };
  const resolveRecipient = async () => ({
    principalId,
    verification: {
      status: 'VERIFIED',
      method: 'PROVIDER_ASSERTION',
      issuer: 'fixture-professional-idp',
      evidenceId: `fixture-${principalId}`,
      verifiedAt: '2026-09-01T00:00:00.000Z',
      expiresAt: '2200-01-01T00:00:00.000Z',
    },
  });

  await t.test('publishes only the scope whitelist after a final durable check', async () => {
    await clearAudits();
    const privateSentinel = `owner-note-must-not-escape-${randomUUID()}`;
    const read = createProfessionalShareRecipientReadBoundary(resolveRecipient, {
      collect: async () => internalSnapshot(dogId, [privateSentinel]),
    });
    const result = await read(intent);

    assert.equal(result.allowed, true);
    assert.equal(result.status, 'AUTHORIZED');
    assert.deepEqual(result.data, {
      veterinarySummary: {
        dogId,
        dogName: 'Nala',
        days: 5,
        generatedAt: '2026-09-07T12:00:00.000Z',
      },
    });
    assert.equal(JSON.stringify(result).includes(privateSentinel), false, 'owner note bytes must never escape summary scope');
    assert.equal('qualifiedLongitudinalObservations' in result.data, false);
    assert.equal('dataCoverageAndConfidence' in result.data, false);

    const storedAudits = await db.select().from(audits).where(eq(audits.grantId, grantId));
    assert.equal(storedAudits.length, 1, 'preflight must not masquerade as a published access decision');
    assert.equal(storedAudits[0].decisionStatus, 'AUTHORIZED');
    assert.equal(storedAudits[0].reason, 'ACTIVE_GRANT');
  });

  await t.test('default collector uses both authorized time bounds at SQL read time', async () => {
    await clearAudits();
    const read = createProfessionalShareRecipientReadBoundary(resolveRecipient);
    const result = await read({
      ...intent,
      scopes: ['QUALIFIED_LONGITUDINAL_OBSERVATIONS', 'DATA_COVERAGE_AND_CONFIDENCE'],
    });

    assert.equal(result.allowed, true);
    assert.equal(result.status, 'AUTHORIZED');
    assert.equal('veterinarySummary' in result.data, false);
    assert.equal(result.data.dataCoverageAndConfidence.validDays, 1);
    assert.equal(result.data.dataCoverageAndConfidence.totalDays, 6);

    const activity = result.data.qualifiedLongitudinalObservations.trends
      .find((trend) => trend.label === 'Activite');
    assert.equal(activity?.value, '4 km');
    assert.equal(JSON.stringify(result).includes('111 km'), false, 'pre-window sensor bytes must not affect projection');
    assert.equal(JSON.stringify(result).includes('999 km'), false, 'post-window sensor bytes must not affect projection');

    const storedAudits = await db.select().from(audits).where(eq(audits.grantId, grantId));
    assert.equal(storedAudits.length, 1);
    assert.equal(storedAudits[0].decisionStatus, 'AUTHORIZED');
  });

  await t.test('default collector distinguishes real zeros from null and omitted measurements', async () => {
    const read = createProfessionalShareRecipientReadBoundary(resolveRecipient);
    const cases = [
      { name: 'empty', rows: [], expected: ['donnees insuffisantes', 'donnees insuffisantes', 'donnees insuffisantes', 'donnees insuffisantes'] },
      { name: 'omitted', rows: [{}], expected: ['donnees insuffisantes', 'donnees insuffisantes', 'donnees insuffisantes', 'donnees insuffisantes'] },
      { name: 'all null', rows: [{ distanceKm: null, matPresenceMinutes: null, vocalEvents: null, weightKg: null }], expected: ['donnees insuffisantes', 'donnees insuffisantes', 'donnees insuffisantes', 'donnees insuffisantes'] },
      { name: 'measured zero', rows: [{ distanceKm: 0, matPresenceMinutes: 0, vocalEvents: 0, weightKg: 0 }], expected: ['0 km', '0 min', '0 evt', 'donnees insuffisantes'] },
      { name: 'missing after measured zero', rows: [
        { distanceKm: 4, matPresenceMinutes: 30, vocalEvents: 3, weightKg: 24 },
        { distanceKm: 0, matPresenceMinutes: 0, vocalEvents: 0, weightKg: null },
        { distanceKm: null, matPresenceMinutes: null, vocalEvents: null, weightKg: null },
      ], expected: ['0 km', '0 min', '0 evt', '24 kg'] },
    ];
    for (const sample of cases) {
      await db.delete(sensorSummaries).where(eq(sensorSummaries.dogId, dogId));
      if (sample.rows.length) {
        await db.insert(sensorSummaries).values(sample.rows.map((metrics, index) => ({
          dogId, deviceId, ingestionId: randomUUID(), source: 'MAT',
          timestamp: new Date(Date.parse('2026-09-04T12:00:00.000Z') + index * 1000),
          ...metrics,
        })));
      }
      const result = await read({ ...intent, scopes: ['QUALIFIED_LONGITUDINAL_OBSERVATIONS'] });
      assert.equal(result.allowed, true, sample.name);
      assert.deepEqual(result.data.qualifiedLongitudinalObservations.trends.slice(0, 4).map((row) => row.value), sample.expected, sample.name);
    }
  });

  await t.test('projection failure rolls back authorization and never publishes collected bytes', async () => {
    await clearAudits();
    const result = await createProfessionalShareRecipientReadBoundary(resolveRecipient, {
      collect: async () => internalSnapshot(randomUUID(), ['private-projection-failure']),
    })(intent);
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'AUTHORITY_UNAVAILABLE');
    assert.equal('data' in result, false);
    const storedAudits = await db.select().from(audits).where(eq(audits.grantId, grantId));
    assert.deepEqual(storedAudits.map((row) => row.decisionStatus), ['UNAVAILABLE']);
  });

  await t.test('a PostgreSQL audit failure blocks the final recipient publication', async () => {
    await clearAudits();
    const { default: postgres } = await import('postgres');
    const connection = postgres(process.env.DATABASE_URL, { max: 1 });
    const triggerName = `int05_audit_${randomUUID().replaceAll('-', '')}`;
    try {
      // Test-only trigger affects this grant alone, including parallel CI tests.
      await connection.unsafe(`CREATE FUNCTION ${triggerName}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'controlled audit failure'; END $$`);
      await connection.unsafe(`CREATE TRIGGER ${triggerName} BEFORE INSERT ON professional_share_access_audits FOR EACH ROW WHEN (NEW.grant_id = '${grantId}'::uuid) EXECUTE FUNCTION ${triggerName}()`);
      const result = await createProfessionalShareRecipientReadBoundary(resolveRecipient, {
        collect: async () => internalSnapshot(dogId, ['private-audit-failure']),
      })(intent);
      assert.equal(result.allowed, false);
      assert.equal(result.status, 'UNAVAILABLE');
      assert.equal('data' in result, false);
      assert.equal(JSON.stringify(result).includes('controlled audit failure'), false);
      assert.deepEqual(await db.select().from(audits).where(eq(audits.grantId, grantId)), []);
    } finally {
      await connection.unsafe(`DROP TRIGGER IF EXISTS ${triggerName} ON professional_share_access_audits`);
      await connection.unsafe(`DROP FUNCTION IF EXISTS ${triggerName}()`);
      await connection.end();
    }
  });

  await t.test('Owner transfer committed during collection discards the former Owner payload', async () => {
    await clearAudits();
    const collectorStarted = deferred();
    const releaseCollector = deferred();
    const privateSentinel = `former-owner-must-not-escape-${randomUUID()}`;
    const read = createProfessionalShareRecipientReadBoundary(resolveRecipient, {
      collect: async () => {
        collectorStarted.resolve();
        await releaseCollector.promise;
        return internalSnapshot(dogId, [privateSentinel]);
      },
    });

    const pendingRead = read(intent);
    await collectorStarted.promise;

    await db
      .update(dogs)
      .set({ ownerId: nextOwnerId })
      .where(eq(dogs.id, dogId));

    releaseCollector.resolve();
    const result = await pendingRead;

    await db
      .update(dogs)
      .set({ ownerId })
      .where(eq(dogs.id, dogId));

    assert.equal(result.allowed, false);
    assert.equal(result.status, 'DENIED');
    assert.equal(result.reason, 'OWNER_AUTHORITY_MISMATCH');
    assert.equal(JSON.stringify(result).includes(privateSentinel), false, 'former Owner bytes must never escape');

    const storedAudits = await db.select().from(audits).where(eq(audits.grantId, grantId));
    assert.equal(storedAudits.length, 1);
    assert.equal(storedAudits[0].decisionStatus, 'DENIED');
    assert.equal(storedAudits[0].reason, 'OWNER_AUTHORITY_MISMATCH');
  });

  await t.test('grant expiration during collection discards the collected bytes', async () => {
    await clearAudits();
    const collectorStarted = deferred();
    const releaseCollector = deferred();
    const privateSentinel = `expired-grant-must-not-escape-${randomUUID()}`;
    let now = Date.parse('2026-09-10T00:00:00.000Z');
    const expiringRead = createProfessionalShareRecipientReadBoundary(resolveRecipient, {
      clock: () => now,
      collect: async () => {
        collectorStarted.resolve();
        await releaseCollector.promise;
        return internalSnapshot(dogId, [privateSentinel]);
      },
    });

    const pendingRead = expiringRead(intent);
    await collectorStarted.promise;
    now = Date.parse('2100-01-01T00:00:00.000Z');
    releaseCollector.resolve();

    const result = await pendingRead;

    assert.equal(result.allowed, false);
    assert.equal(result.status, 'DENIED');
    assert.equal(result.reason, 'GRANT_EXPIRED');
    assert.equal(JSON.stringify(result).includes(privateSentinel), false, 'expired-grant bytes must never escape');

    const storedAudits = await db.select().from(audits).where(eq(audits.grantId, grantId));
    assert.equal(storedAudits.length, 1);
    assert.equal(storedAudits[0].decisionStatus, 'DENIED');
    assert.equal(storedAudits[0].reason, 'GRANT_EXPIRED');
  });

  await t.test('revocation committed during collection discards the collected bytes', async () => {
    await clearAudits();
    const collectorStarted = deferred();
    const releaseCollector = deferred();
    const privateSentinel = `must-not-escape-${randomUUID()}`;
    const read = createProfessionalShareRecipientReadBoundary(resolveRecipient, {
      collect: async () => {
        collectorStarted.resolve();
        await releaseCollector.promise;
        return internalSnapshot(dogId, [privateSentinel]);
      },
    });

    const pendingRead = read(intent);
    await collectorStarted.promise;

    const app = new Hono();
    app.use('*', async (c, next) => {
      c.set('userId', ownerId);
      await next();
    });
    app.route('/api/dogs', dogRoutes);

    const revoke = await app.request(
      `/api/dogs/${dogId}/professional-shares/${grantId}/revoke`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'consultation complete' }),
      },
    );
    assert.equal(revoke.status, 200, 'revocation must be able to commit while collection is in progress');

    releaseCollector.resolve();
    const result = await pendingRead;

    assert.equal(result.allowed, false);
    assert.equal(result.status, 'DENIED');
    assert.equal(result.reason, 'GRANT_REVOKED');
    assert.equal(JSON.stringify(result).includes(privateSentinel), false, 'collected bytes must never escape');

    const storedAudits = await db.select().from(audits).where(eq(audits.grantId, grantId));
    assert.equal(storedAudits.length, 1);
    assert.equal(storedAudits[0].decisionStatus, 'DENIED');
    assert.equal(storedAudits[0].reason, 'GRANT_REVOKED');
  });
});
