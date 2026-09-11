import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('professional share policy reloads durable grant state and records sanitized decisions', { skip: !integrationEnabled }, async () => {
  const [
    { db },
    {
      dogs,
      professionalShareAccessAudits,
      professionalShareGrants,
      users,
    },
    { createProfessionalShareAccessChecker },
    { createProfessionalShareDbAuthority },
  ] = await Promise.all([
    import('../dist/db/index.js'),
    import('../dist/db/schema/index.js'),
    import('../dist/api/services/professional-share-access.js'),
    import('../dist/api/services/professional-share-db-authority.js'),
  ]);

  const ownerId = randomUUID();
  const otherOwnerId = randomUUID();
  const dogId = randomUUID();
  const grantId = randomUUID();
  const missingGrantId = randomUUID();
  const professionalPrincipalId = `vet-${randomUUID()}`;
  const suffix = randomUUID();
  const policyNow = Date.parse('2026-09-10T12:00:00Z');

  await db.insert(users).values([
    {
      id: ownerId,
      email: `share-owner-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Share Owner',
    },
    {
      id: otherOwnerId,
      email: `share-other-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Other Owner',
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

  await db.insert(professionalShareGrants).values({
    id: grantId,
    // Temporary Drizzle compatibility property; persisted column is owner_user_id.
    guardianUserId: ownerId,
    dogId,
    recipientDisplayName: 'Dr Test',
    recipientType: 'VETERINARIAN',
    recipientOrganizationName: 'Test Clinic',
    recipientEmail: 'vet@example.test',
    recipientPrincipalId: professionalPrincipalId,
    purpose: 'VETERINARY_CONSULTATION',
    scopes: ['VETERINARY_SUMMARY', 'DATA_COVERAGE_AND_CONFIDENCE'],
    dataFrom: new Date('2026-09-01T00:00:00Z'),
    dataTo: new Date('2026-09-09T23:59:59Z'),
    accessExpiresAt: new Date('2026-09-20T12:00:00Z'),
    status: 'ACTIVE',
    activatedAt: new Date('2026-09-10T11:00:00Z'),
    createdAt: new Date('2026-09-10T10:00:00Z'),
    updatedAt: new Date('2026-09-10T10:00:00Z'),
  });

  const intent = {
    grantId,
    dogId,
    purpose: 'VETERINARY_CONSULTATION',
    scopes: ['VETERINARY_SUMMARY'],
    dataFrom: '2026-09-02T00:00:00Z',
    dataTo: '2026-09-08T00:00:00Z',
  };

  const authority = createProfessionalShareDbAuthority(async () => ({
    principalId: professionalPrincipalId,
  }));
  const check = createProfessionalShareAccessChecker(authority, () => policyNow);

  try {
    const authorized = await check(intent);
    assert.equal(authorized.allowed, true);
    assert.equal(authorized.status, 'AUTHORIZED');
    assert.equal(authorized.reason, 'ACTIVE_GRANT');
    assert.deepEqual(authorized.scopes, ['VETERINARY_SUMMARY']);

    const wrongRecipientAuthority = createProfessionalShareDbAuthority(async () => ({
      principalId: `other-${randomUUID()}`,
    }));
    const wrongRecipient = await createProfessionalShareAccessChecker(
      wrongRecipientAuthority,
      () => policyNow,
    )(intent);
    assert.equal(wrongRecipient.allowed, false);
    assert.equal(wrongRecipient.reason, 'RECIPIENT_MISMATCH');

    await db.update(dogs).set({ ownerId: otherOwnerId }).where(eq(dogs.id, dogId));
    const transferred = await check(intent);
    assert.equal(transferred.allowed, false);
    assert.equal(transferred.reason, 'OWNER_AUTHORITY_MISMATCH');
    await db.update(dogs).set({ ownerId }).where(eq(dogs.id, dogId));

    await db.update(professionalShareGrants).set({
      status: 'REVOKED',
      revokedAt: new Date('2026-09-10T12:05:00Z'),
      revocationReason: 'Integration test revocation',
      updatedAt: new Date('2026-09-10T12:05:00Z'),
    }).where(eq(professionalShareGrants.id, grantId));

    const revoked = await check(intent);
    assert.equal(revoked.allowed, false);
    assert.equal(revoked.reason, 'GRANT_REVOKED');

    const missing = await check({ ...intent, grantId: missingGrantId });
    assert.equal(missing.allowed, false);
    assert.equal(missing.reason, 'GRANT_NOT_FOUND');

    const grantAudits = await db
      .select()
      .from(professionalShareAccessAudits)
      .where(eq(professionalShareAccessAudits.grantId, grantId));
    assert.equal(grantAudits.length, 4);
    assert.deepEqual(
      grantAudits.map((row) => row.reason).sort(),
      ['ACTIVE_GRANT', 'GRANT_REVOKED', 'OWNER_AUTHORITY_MISMATCH', 'RECIPIENT_MISMATCH'].sort(),
    );
    for (const row of grantAudits) {
      assert.equal(row.event, 'PROFESSIONAL_SHARE_POLICY_DECISION');
      assert.equal(JSON.stringify(row).includes(professionalPrincipalId), false);
      assert.equal(JSON.stringify(row).includes('vet@example.test'), false);
    }

    const missingAudits = await db
      .select()
      .from(professionalShareAccessAudits)
      .where(eq(professionalShareAccessAudits.grantId, missingGrantId));
    assert.equal(missingAudits.length, 1);
    assert.equal(missingAudits[0].reason, 'GRANT_NOT_FOUND');
  } finally {
    await db.delete(professionalShareAccessAudits)
      .where(eq(professionalShareAccessAudits.grantId, grantId));
    await db.delete(professionalShareAccessAudits)
      .where(eq(professionalShareAccessAudits.grantId, missingGrantId));
    await db.delete(professionalShareGrants).where(eq(professionalShareGrants.id, grantId));
    await db.delete(dogs).where(eq(dogs.id, dogId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, otherOwnerId));
  }
});
