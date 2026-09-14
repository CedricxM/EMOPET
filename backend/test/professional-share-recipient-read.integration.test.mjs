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
  const principalId = `fixture-vet-${randomUUID()}`;

  async function clearAudits() {
    await db.delete(audits).where(eq(audits.dogId, dogId));
  }

  t.after(async () => {
    await clearAudits();
    await db.delete(grants).where(eq(grants.dogId, dogId));
    await db.delete(sensorSummaries).where(eq(sensorSummaries.dogId, dogId));
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

  await db.insert(sensorSummaries).values([
    {
      dogId,
      timestamp: new Date('2026-09-01T12:00:00.000Z'),
      source: 'MAT',
      distanceKm: 111,
    },
    {
      dogId,
      timestamp: new Date('2026-09-04T12:00:00.000Z'),
      source: 'MAT',
      distanceKm: 4,
    },
    {
      dogId,
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
