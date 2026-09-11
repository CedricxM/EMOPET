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

test('professional recipient read rechecks authority before publication', {
  skip: !integrationEnabled,
  timeout: 20_000,
}, async (t) => {
  const [
    { db },
    { dogs, users, professionalShareGrants: grants, professionalShareAccessAudits: audits },
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

  t.after(async () => {
    await db.delete(audits).where(eq(audits.dogId, dogId));
    await db.delete(grants).where(eq(grants.dogId, dogId));
    await db.delete(dogs).where(eq(dogs.id, dogId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, nextOwnerId));
  });

  await db.insert(users).values([
    {
      id: ownerId,
      email: `recipient-read-${ownerId}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Recipient read Guardian',
    },
    {
      id: nextOwnerId,
      email: `recipient-read-${nextOwnerId}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Next Guardian',
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
    guardianUserId: ownerId,
    dogId,
    recipientDisplayName: 'Dr Fixture',
    recipientType: 'VETERINARIAN',
    recipientEmail: 'vet@example.test',
    recipientPrincipalId: principalId,
    purpose: 'VETERINARY_CONSULTATION',
    scopes: ['VETERINARY_SUMMARY'],
    dataFrom: new Date('2026-09-01T00:00:00.000Z'),
    dataTo: new Date('2026-09-09T23:59:59.000Z'),
    accessExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    activatedAt: new Date('2026-09-01T00:00:00.000Z'),
    status: 'ACTIVE',
  });

  const intent = {
    grantId,
    dogId,
    purpose: 'VETERINARY_CONSULTATION',
    scopes: ['VETERINARY_SUMMARY'],
    dataFrom: '2026-09-02T00:00:00.000Z',
    dataTo: '2026-09-07T00:00:00.000Z',
  };
  const read = createProfessionalShareRecipientReadBoundary(
    async () => ({ principalId }),
  );

  await t.test('publishes a collected projection only after a final durable check', async () => {
    const result = await read(intent, async ({ authorization }) => ({
      projectionMarker: 'approved-veterinary-summary-projection',
      scopes: authorization.scopes,
    }));

    assert.equal(result.allowed, true);
    assert.equal(result.status, 'AUTHORIZED');
    assert.equal(result.data.projectionMarker, 'approved-veterinary-summary-projection');
    assert.deepEqual(result.data.scopes, ['VETERINARY_SUMMARY']);

    const storedAudits = await db.select().from(audits).where(eq(audits.grantId, grantId));
    assert.equal(storedAudits.length, 1, 'preflight must not masquerade as a published access decision');
    assert.equal(storedAudits[0].decisionStatus, 'AUTHORIZED');
    assert.equal(storedAudits[0].reason, 'ACTIVE_GRANT');
  });

  await t.test('Guardian transfer committed during collection discards the former Guardian payload', async () => {
    const collectorStarted = deferred();
    const releaseCollector = deferred();
    const privateSentinel = `former-guardian-must-not-escape-${randomUUID()}`;

    const pendingRead = read(intent, async () => {
      collectorStarted.resolve();
      await releaseCollector.promise;
      return { privateSentinel };
    });

    await collectorStarted.promise;

    await db
      .update(dogs)
      .set({ ownerId: nextOwnerId })
      .where(eq(dogs.id, dogId));

    releaseCollector.resolve();
    const result = await pendingRead;

    // Restore the fixture only after the recipient read has observed the committed
    // transfer. The following revocation scenario should start from ownerId again.
    await db
      .update(dogs)
      .set({ ownerId })
      .where(eq(dogs.id, dogId));

    assert.equal(result.allowed, false);
    assert.equal(result.status, 'DENIED');
    assert.equal(result.reason, 'GUARDIAN_AUTHORITY_MISMATCH');
    assert.equal(JSON.stringify(result).includes(privateSentinel), false, 'former Guardian bytes must never escape');

    const storedAudits = await db.select().from(audits).where(eq(audits.grantId, grantId));
    assert.equal(storedAudits.length, 2);
    assert.equal(storedAudits.at(-1).decisionStatus, 'DENIED');
    assert.equal(storedAudits.at(-1).reason, 'GUARDIAN_AUTHORITY_MISMATCH');
  });

  await t.test('revocation committed during collection discards the collected bytes', async () => {
    const collectorStarted = deferred();
    const releaseCollector = deferred();
    const privateSentinel = `must-not-escape-${randomUUID()}`;

    const pendingRead = read(intent, async () => {
      collectorStarted.resolve();
      await releaseCollector.promise;
      return { privateSentinel };
    });

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
    assert.equal(storedAudits.length, 3);
    assert.equal(storedAudits.at(-1).decisionStatus, 'DENIED');
    assert.equal(storedAudits.at(-1).reason, 'GRANT_REVOKED');
  });
});
