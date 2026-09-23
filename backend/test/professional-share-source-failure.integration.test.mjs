import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

function emptySnapshot(dogId) {
  return {
    dogId,
    dogName: 'Nala',
    days: 5,
    generatedAt: new Date('2026-09-07T12:00:00.000Z'),
    coverage: { validDays: 0, totalDays: 5, coverageRatio: 0 },
    trends: [],
    ownerNotes: [],
  };
}

test('professional recipient read distinguishes authoritative empty data from collection failure', {
  skip: !integrationEnabled,
  timeout: 20_000,
}, async (t) => {
  const [
    { db },
    {
      dogs,
      users,
      professionalShareGrants: grants,
      professionalShareAccessAudits: audits,
    },
    { createProfessionalShareRecipientReadBoundary },
  ] = await Promise.all([
    import('../dist/db/index.js'),
    import('../dist/db/schema/index.js'),
    import('../dist/api/services/professional-share-recipient-read.js'),
  ]);

  const ownerId = randomUUID();
  const dogId = randomUUID();
  const grantId = randomUUID();
  const principalId = `fixture-vet-${randomUUID()}`;

  async function clearAudits() {
    await db.delete(audits).where(eq(audits.dogId, dogId));
  }

  t.after(async () => {
    await clearAudits();
    await db.delete(grants).where(eq(grants.dogId, dogId));
    await db.delete(dogs).where(eq(dogs.id, dogId));
    await db.delete(users).where(eq(users.id, ownerId));
  });

  await db.insert(users).values({
    id: ownerId,
    email: `recipient-source-failure-${ownerId}@example.test`,
    passwordHash: 'integration-test-only',
    name: 'Recipient source failure Owner',
  });
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

  const intent = {
    grantId,
    dogId,
    purpose: 'VETERINARY_CONSULTATION',
    scopes: [
      'VETERINARY_SUMMARY',
      'QUALIFIED_LONGITUDINAL_OBSERVATIONS',
      'DATA_COVERAGE_AND_CONFIDENCE',
    ],
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

  await t.test('authoritative empty snapshot publishes as authorized empty data', async () => {
    await clearAudits();
    const read = createProfessionalShareRecipientReadBoundary(resolveRecipient, {
      collect: async () => emptySnapshot(dogId),
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
      qualifiedLongitudinalObservations: {
        trends: [],
      },
      dataCoverageAndConfidence: {
        validDays: 0,
        totalDays: 5,
        coverageRatio: 0,
      },
    });

    const storedAudits = await db.select().from(audits).where(eq(audits.grantId, grantId));
    assert.equal(storedAudits.length, 1);
    assert.equal(storedAudits[0].decisionStatus, 'AUTHORIZED');
    assert.equal(storedAudits[0].reason, 'ACTIVE_GRANT');
  });

  await t.test('collector failure fails closed and publishes no fabricated empty snapshot', async () => {
    await clearAudits();
    const privateSentinel = `partial-source-bytes-must-not-escape-${randomUUID()}`;
    const read = createProfessionalShareRecipientReadBoundary(resolveRecipient, {
      collect: async () => {
        const partiallyCollectedSnapshot = {
          ...emptySnapshot(dogId),
          ownerNotes: [privateSentinel],
        };
        assert.equal(partiallyCollectedSnapshot.ownerNotes[0], privateSentinel);
        throw new Error(`controlled collector failure: ${privateSentinel}`);
      },
    });

    const result = await read(intent);

    assert.deepEqual(result, {
      allowed: false,
      status: 'UNAVAILABLE',
      reason: 'AUTHORITY_UNAVAILABLE',
    });
    assert.equal('data' in result, false, 'source failure must not fabricate an empty recipient payload');
    assert.equal(JSON.stringify(result).includes(privateSentinel), false, 'partial source bytes and source error detail must not escape');

    const storedAudits = await db.select().from(audits).where(eq(audits.grantId, grantId));
    assert.equal(storedAudits.length, 1);
    assert.equal(storedAudits[0].decisionStatus, 'UNAVAILABLE');
    assert.equal(storedAudits[0].reason, 'AUTHORITY_UNAVAILABLE');
  });
});
