import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import postgres from 'postgres';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

// Observe actual lock waiters before releasing the competing transaction.
// Include indirect waiters (a second revoke can queue behind the first one).
async function waitForBlockedOperations(tx, blockerPid, expected) {
  const deadline = Date.now() + 4_000;
  let observed = 0;
  while (Date.now() < deadline) {
    const [row] = await tx`
      WITH RECURSIVE blocked AS (
        SELECT pid FROM pg_stat_activity
        WHERE ${blockerPid} = ANY(pg_blocking_pids(pid))
        UNION
        SELECT activity.pid FROM pg_stat_activity activity
        JOIN blocked ON blocked.pid = ANY(pg_blocking_pids(activity.pid))
      )
      SELECT count(*)::int AS count FROM blocked
    `;
    observed = row.count;
    if (observed >= expected) return;
    await delay(10);
  }
  assert.fail(`Expected ${expected} concurrent operations waiting on PostgreSQL locks, saw ${observed}`);
}

test('Guardian sharing serializes ownership and concurrent revocation', {
  skip: !integrationEnabled,
  timeout: 25_000,
}, async (t) => {
  const [
    { db },
    { dogs, users, professionalShareGrants: grants, professionalShareAccessAudits: audits },
    { dogs: dogRoutes },
    { createProfessionalShareAccessChecker },
    { createProfessionalShareDbAuthority },
  ] = await Promise.all([
    import('../dist/db/index.js'),
    import('../dist/db/schema/index.js'),
    import('../dist/api/routes/dogs.js'),
    import('../dist/api/services/professional-share-access.js'),
    import('../dist/api/services/professional-share-db-authority.js'),
  ]);

  const ownerId = randomUUID();
  const nextOwnerId = randomUUID();
  const dogId = randomUUID();
  const grantId = randomUUID();
  const principalId = `fixture-vet-${randomUUID()}`;
  const lockConnection = postgres(process.env.DATABASE_URL, { max: 1 });
  const requests = [];

  t.after(async () => {
    await Promise.allSettled(requests);
    await lockConnection.end();
    await db.delete(audits).where(eq(audits.dogId, dogId));
    await db.delete(grants).where(eq(grants.dogId, dogId));
    await db.delete(dogs).where(eq(dogs.id, dogId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, nextOwnerId));
  });

  await db.insert(users).values([ownerId, nextOwnerId].map((id) => ({
    id, email: `share-race-${id}@example.test`,
    passwordHash: 'integration-test-only', name: 'Race fixture Guardian',
  })));
  await db.insert(dogs).values({
    id: dogId, ownerId, name: 'Nala', breed: 'Labrador Retriever',
    birthDate: '2022-04-12', sex: 'female', weight: 24.5, furClass: 'FC2',
  });

  const shareBody = {
    recipient: { displayName: 'Dr Fixture', type: 'VETERINARIAN', email: 'vet@example.test' },
    purpose: 'VETERINARY_CONSULTATION',
    scopes: ['VETERINARY_SUMMARY'],
    window: {
      dataFrom: '2026-09-01T00:00:00.000Z',
      dataTo: '2026-09-09T23:59:59.000Z',
      accessExpiresAt: '2099-01-01T00:00:00.000Z',
    },
  };
  // ACTIVE binding is a DB fixture, never an activation endpoint or identity provider.
  await db.insert(grants).values({
    id: grantId, guardianUserId: ownerId, dogId,
    recipientDisplayName: shareBody.recipient.displayName,
    recipientType: shareBody.recipient.type,
    recipientEmail: shareBody.recipient.email,
    recipientPrincipalId: principalId,
    purpose: shareBody.purpose, scopes: shareBody.scopes,
    dataFrom: new Date(shareBody.window.dataFrom),
    dataTo: new Date(shareBody.window.dataTo),
    accessExpiresAt: new Date(shareBody.window.accessExpiresAt),
    createdAt: new Date('2026-09-01T00:00:00Z'),
    activatedAt: new Date('2026-09-01T00:00:00Z'), status: 'ACTIVE',
  });

  const app = new Hono();
  app.use('*', async (c, next) => { c.set('userId', ownerId); await next(); });
  app.route('/api/dogs', dogRoutes);
  const shareUrl = `/api/dogs/${dogId}/professional-shares`;
  const revokeUrl = `${shareUrl}/${grantId}/revoke`;
  const post = (body) => ({
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });

  await t.test('an owner transfer committed after preflight denies create, list and revoke', async () => {
    let pending;
    try {
      await lockConnection.begin(async (tx) => {
        const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
        await tx`UPDATE dogs SET owner_id = ${nextOwnerId} WHERE id = ${dogId}`;
        // Unlocked preflight reads still see ownerId. The actual operations must
        // wait, then recheck the newly committed owner before consuming authority.
        pending = [
          app.request(shareUrl, post(shareBody)),
          app.request(shareUrl),
          app.request(revokeUrl, post({ reason: 'stale Guardian' })),
        ];
        requests.push(...pending);
        await waitForBlockedOperations(tx, pid, 3);
      });
      for (const response of await Promise.all(pending)) {
        assert.equal(response.status, 404);
        assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
        assert.deepEqual(await response.json(), { error: 'not_found' });
      }
      const stored = await db.select().from(grants).where(eq(grants.dogId, dogId));
      assert.equal(stored.length, 1, 'stale Guardian must not create a new grant');
      assert.equal(stored[0].status, 'ACTIVE', 'stale Guardian must not revoke the grant');
      assert.equal(stored[0].revokedAt, null);
    } finally {
      await Promise.allSettled(pending ?? []);
      await db.update(dogs).set({ ownerId }).where(eq(dogs.id, dogId));
    }
  });

  await t.test('malformed JSON cannot silently revoke a grant', async () => {
    const response = await app.request(revokeUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
    });
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    const [stored] = await db.select().from(grants).where(eq(grants.id, grantId));
    assert.equal(stored.status, 'ACTIVE');
    assert.equal(stored.revokedAt, null);
  });

  await t.test('two waiting revokes return the same durable first revocation', async () => {
    const check = createProfessionalShareAccessChecker(
      createProfessionalShareDbAuthority(async () => ({ principalId })),
    );
    const intent = {
      grantId, dogId, purpose: shareBody.purpose, scopes: shareBody.scopes,
      dataFrom: shareBody.window.dataFrom, dataTo: shareBody.window.dataTo,
    };
    assert.equal((await check(intent)).allowed, true);

    let pending;
    await lockConnection.begin(async (tx) => {
      const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
      await tx`SELECT id FROM professional_share_grants WHERE id = ${grantId} FOR UPDATE`;
      pending = ['request A', 'request B'].map((reason) => app.request(revokeUrl, post({ reason })));
      requests.push(...pending);
      await waitForBlockedOperations(tx, pid, 2);
    });
    const responses = await Promise.all(pending);
    const bodies = [];
    for (const response of responses) {
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
      bodies.push(await response.json());
    }
    assert.deepEqual(bodies[0], bodies[1], 'retry must preserve the first timestamp, reason and updatedAt');
    const grant = bodies[0].grant;
    assert.equal(grant.status, 'REVOKED');
    assert.ok(['request A', 'request B'].includes(grant.revocationReason));
    assert.ok(grant.revokedAt);
    assert.equal('principalId' in grant.recipient, false);

    const [stored] = await db.select().from(grants).where(eq(grants.id, grantId));
    assert.equal(stored.revokedAt.toISOString(), grant.revokedAt);
    assert.equal(stored.updatedAt.toISOString(), grant.updatedAt);
    assert.equal(stored.revocationReason, grant.revocationReason);
    assert.equal((await check(intent)).reason, 'GRANT_REVOKED');

    const emptyRetry = await app.request(revokeUrl, { method: 'POST' });
    assert.equal(emptyRetry.status, 200);
    assert.deepEqual(await emptyRetry.json(), bodies[0]);
  });
});
