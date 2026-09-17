import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('dog CRUD and Owner professional-share lifecycle remain owner scoped', { skip: !integrationEnabled }, async () => {
  const [
    { dogs: dogRoutes, ABSENCE_COMPARISON_PERSISTENCE_CODE, DOG_ERASURE_LIFECYCLE_CODE },
    { health: healthRoutes },
    { db },
    { dogs: dogsTable, professionalShareGrants, users },
  ] = await Promise.all([
    import('../dist/api/routes/dogs.js'),
    import('../dist/api/routes/health.js'),
    import('../dist/db/index.js'),
    import('../dist/db/schema/index.js'),
  ]);

  const ownerId = randomUUID();
  const otherUserId = randomUUID();
  const missingUserId = randomUUID();
  const missingDogId = randomUUID();
  const suffix = randomUUID();
  const invalidIdentityDogName = `Invalid ${suffix}`;
  const missingUserDogName = `Missing User ${suffix}`;

  await db.insert(users).values([
    {
      id: ownerId,
      email: `dog-owner-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Dog Owner',
    },
    {
      id: otherUserId,
      email: `other-owner-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Other Owner',
    },
  ]);

  let currentUserId = ownerId;
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', currentUserId);
    await next();
  });
  app.route('/api/dogs', dogRoutes);
  app.route('/api/health', healthRoutes);

  let dogId;
  let shareGrantId;
  try {
    const createBody = {
      name: 'Nala',
      breed: 'Labrador Retriever',
      birthDate: '2022-04-12',
      sex: 'female',
      weight: 24.5,
      furClass: 'FC2',
      photo: 'https://example.test/nala.jpg',
    };

    const createResponse = await app.request('/api/dogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    dogId = created.dog.id;
    assert.equal(created.dog.ownerId, ownerId);
    assert.equal(created.dog.name, 'Nala');
    assert.equal(created.dog.photo, 'https://example.test/nala.jpg');

    const [persistedCreate] = await db
      .select({
        ownerId: dogsTable.ownerId,
        name: dogsTable.name,
        birthDate: dogsTable.birthDate,
        photoUrl: dogsTable.photoUrl,
        updatedAt: dogsTable.updatedAt,
      })
      .from(dogsTable)
      .where(eq(dogsTable.id, dogId))
      .limit(1);
    assert.ok(persistedCreate);
    assert.equal(persistedCreate.ownerId, ownerId);
    assert.equal(persistedCreate.name, 'Nala');
    assert.equal(persistedCreate.birthDate, '2022-04-12');
    assert.equal(persistedCreate.photoUrl, 'https://example.test/nala.jpg');

    currentUserId = 'invalid-owner-id';
    const nonCanonicalCreateResponse = await app.request('/api/dogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...createBody, name: invalidIdentityDogName }),
    });
    assert.equal(nonCanonicalCreateResponse.status, 401);

    currentUserId = missingUserId;
    const missingUserCreateResponse = await app.request('/api/dogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...createBody, name: missingUserDogName }),
    });
    assert.equal(missingUserCreateResponse.status, 401);

    const [invalidIdentityDog] = await db
      .select({ id: dogsTable.id })
      .from(dogsTable)
      .where(eq(dogsTable.name, invalidIdentityDogName))
      .limit(1);
    assert.equal(invalidIdentityDog, undefined);

    const [missingUserDog] = await db
      .select({ id: dogsTable.id })
      .from(dogsTable)
      .where(eq(dogsTable.name, missingUserDogName))
      .limit(1);
    assert.equal(missingUserDog, undefined);

    currentUserId = ownerId;

    const baseShareBody = {
      recipient: {
        displayName: 'Dr Test',
        type: 'VETERINARIAN',
        organizationName: 'Test Clinic',
        email: 'vet@example.test',
      },
      purpose: 'VETERINARY_CONSULTATION',
      scopes: ['VETERINARY_SUMMARY', 'DATA_COVERAGE_AND_CONFIDENCE'],
      window: {
        dataFrom: '2026-09-01T00:00:00.000Z',
        dataTo: '2026-09-09T23:59:59.000Z',
        accessExpiresAt: '2099-01-01T00:00:00.000Z',
      },
    };

    const injectedPrincipalResponse = await app.request(`/api/dogs/${dogId}/professional-shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...baseShareBody,
        recipient: { ...baseShareBody.recipient, principalId: `fake-${randomUUID()}` },
      }),
    });
    assert.equal(injectedPrincipalResponse.status, 400);

    const researchResponse = await app.request(`/api/dogs/${dogId}/professional-shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...baseShareBody,
        recipient: { ...baseShareBody.recipient, type: 'RESEARCHER' },
        purpose: 'RESEARCH_WITH_SEPARATE_CONSENT',
      }),
    });
    assert.equal(researchResponse.status, 400);

    const selectedNotesResponse = await app.request(`/api/dogs/${dogId}/professional-shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...baseShareBody, scopes: ['OWNER_SELECTED_NOTES'] }),
    });
    assert.equal(selectedNotesResponse.status, 400);

    const createShareResponse = await app.request(`/api/dogs/${dogId}/professional-shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseShareBody),
    });
    assert.equal(createShareResponse.status, 201);
    const createdShare = await createShareResponse.json();
    shareGrantId = createdShare.grant.id;
    assert.equal(createdShare.grant.status, 'PENDING');
    assert.equal(createdShare.activation, 'REQUIRES_VERIFIED_PROFESSIONAL_IDENTITY');
    assert.equal('principalId' in createdShare.grant.recipient, false);

    const [persistedGrant] = await db
      .select()
      .from(professionalShareGrants)
      .where(eq(professionalShareGrants.id, shareGrantId))
      .limit(1);
    assert.ok(persistedGrant);
    assert.equal(persistedGrant.ownerUserId, ownerId);
    assert.equal(persistedGrant.dogId, dogId);
    assert.equal(persistedGrant.status, 'PENDING');
    assert.equal(persistedGrant.recipientPrincipalId, null);
    assert.equal(persistedGrant.activatedAt, null);

    const listSharesResponse = await app.request(`/api/dogs/${dogId}/professional-shares`);
    assert.equal(listSharesResponse.status, 200);
    const listedShares = await listSharesResponse.json();
    assert.equal(listedShares.grants.length, 1);
    assert.equal(listedShares.grants[0].id, shareGrantId);
    assert.equal('principalId' in listedShares.grants[0].recipient, false);

    currentUserId = otherUserId;
    const crossOwnerListResponse = await app.request(`/api/dogs/${dogId}/professional-shares`);
    assert.equal(crossOwnerListResponse.status, 404);
    const crossOwnerRevokeResponse = await app.request(
      `/api/dogs/${dogId}/professional-shares/${shareGrantId}/revoke`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'must not be accepted' }),
      },
    );
    assert.equal(crossOwnerRevokeResponse.status, 404);

    currentUserId = ownerId;
    const activationResponse = await app.request(
      `/api/dogs/${dogId}/professional-shares/${shareGrantId}/activate`,
      { method: 'POST' },
    );
    assert.equal(activationResponse.status, 404);

    const revokeResponse = await app.request(
      `/api/dogs/${dogId}/professional-shares/${shareGrantId}/revoke`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Owner ended sharing' }),
      },
    );
    assert.equal(revokeResponse.status, 200);
    const revoked = await revokeResponse.json();
    assert.equal(revoked.grant.status, 'REVOKED');
    assert.equal(revoked.grant.revocationReason, 'Owner ended sharing');
    assert.ok(revoked.grant.revokedAt);

    const firstRevokedAt = revoked.grant.revokedAt;
    const secondRevokeResponse = await app.request(
      `/api/dogs/${dogId}/professional-shares/${shareGrantId}/revoke`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    );
    assert.equal(secondRevokeResponse.status, 200);
    const secondRevoked = await secondRevokeResponse.json();
    assert.equal(secondRevoked.grant.revokedAt, firstRevokedAt);

    await db.delete(professionalShareGrants).where(eq(professionalShareGrants.id, shareGrantId));
    shareGrantId = undefined;

    const listResponse = await app.request('/api/dogs');
    assert.equal(listResponse.status, 200);
    const listed = await listResponse.json();
    assert.ok(listed.dogs.some((dog) => dog.id === dogId));

    const getResponse = await app.request(`/api/dogs/${dogId}`);
    assert.equal(getResponse.status, 200);
    const fetched = await getResponse.json();
    assert.equal(fetched.dog.id, dogId);

    const absenceResponse = await app.request(`/api/dogs/${dogId}/absence-comparison?days=14`);
    assert.equal(absenceResponse.status, 503);
    const absenceBody = await absenceResponse.json();
    assert.equal(absenceBody.code, ABSENCE_COMPARISON_PERSISTENCE_CODE);
    assert.equal(absenceBody.operation, 'absence_comparison');

    const healthResponse = await app.request(`/api/health/${dogId}`);
    assert.equal(healthResponse.status, 200);
    const healthBody = await healthResponse.json();
    assert.equal(healthBody.dogId, dogId);
    assert.deepEqual(healthBody.entries, []);

    const [beforePatch] = await db
      .select({ name: dogsTable.name, weight: dogsTable.weight, updatedAt: dogsTable.updatedAt })
      .from(dogsTable)
      .where(eq(dogsTable.id, dogId))
      .limit(1);
    assert.ok(beforePatch);

    currentUserId = otherUserId;
    const crossOwnerPatchResponse = await app.request(`/api/dogs/${dogId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hijacked' }),
    });
    assert.equal(crossOwnerPatchResponse.status, 404);

    const [afterCrossOwnerPatch] = await db
      .select({ name: dogsTable.name, weight: dogsTable.weight })
      .from(dogsTable)
      .where(eq(dogsTable.id, dogId))
      .limit(1);
    assert.ok(afterCrossOwnerPatch);
    assert.equal(afterCrossOwnerPatch.name, beforePatch.name);
    assert.equal(Number(afterCrossOwnerPatch.weight), Number(beforePatch.weight));

    currentUserId = ownerId;
    await new Promise((resolve) => setTimeout(resolve, 10));

    const patchResponse = await app.request(`/api/dogs/${dogId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nala Updated', weight: 25.2 }),
    });
    assert.equal(patchResponse.status, 200);
    const patched = await patchResponse.json();
    assert.equal(patched.dog.name, 'Nala Updated');
    assert.equal(patched.dog.weight, 25.2);

    const [persistedPatch] = await db
      .select({ name: dogsTable.name, weight: dogsTable.weight, updatedAt: dogsTable.updatedAt })
      .from(dogsTable)
      .where(eq(dogsTable.id, dogId))
      .limit(1);
    assert.ok(persistedPatch);
    assert.equal(persistedPatch.name, 'Nala Updated');
    assert.equal(Number(persistedPatch.weight), 25.2);
    assert.ok(new Date(persistedPatch.updatedAt).getTime() > new Date(beforePatch.updatedAt).getTime());

    const rereadPatchedResponse = await app.request(`/api/dogs/${dogId}`);
    assert.equal(rereadPatchedResponse.status, 200);
    const rereadPatched = await rereadPatchedResponse.json();
    assert.equal(rereadPatched.dog.name, 'Nala Updated');
    assert.equal(rereadPatched.dog.weight, 25.2);

    const missingPatchResponse = await app.request(`/api/dogs/${missingDogId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ghost Dog' }),
    });
    assert.equal(missingPatchResponse.status, 404);

    const emptyPatchResponse = await app.request(`/api/dogs/${dogId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(emptyPatchResponse.status, 400);
    assert.deepEqual(await emptyPatchResponse.json(), { error: 'no_updates' });

    currentUserId = otherUserId;
    const crossOwnerResponse = await app.request(`/api/dogs/${dogId}`);
    assert.equal(crossOwnerResponse.status, 404);
    const crossOwnerDeleteResponse = await app.request(`/api/dogs/${dogId}`, { method: 'DELETE' });
    assert.equal(crossOwnerDeleteResponse.status, 404);

    currentUserId = ownerId;
    const deleteResponse = await app.request(`/api/dogs/${dogId}`, { method: 'DELETE' });
    assert.equal(deleteResponse.status, 409);
    assert.match(deleteResponse.headers.get('cache-control') ?? '', /no-store/);
    const deletion = await deleteResponse.json();
    assert.equal(deletion.code, DOG_ERASURE_LIFECYCLE_CODE);
    assert.equal(deletion.deleted, false);
    assert.equal(deletion.retryable, false);
    assert.equal(deletion.maturity, 'NOT_IMPLEMENTED');
    assert.equal(deletion.gate, 'G-PRIV-ERASURE');
    const [stillPersisted] = await db
      .select({ id: dogsTable.id, ownerId: dogsTable.ownerId })
      .from(dogsTable)
      .where(eq(dogsTable.id, dogId))
      .limit(1);
    assert.ok(stillPersisted, 'fail-closed erasure request must not delete the canonical dog row');
    assert.equal(stillPersisted.ownerId, ownerId);
  } finally {
    if (shareGrantId) {
      await db.delete(professionalShareGrants).where(eq(professionalShareGrants.id, shareGrantId));
    }
    if (dogId) {
      await db.delete(dogsTable).where(eq(dogsTable.id, dogId));
    }
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, otherUserId));
  }
});