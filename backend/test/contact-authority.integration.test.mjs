import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('CONTACT-AUTH-01 keeps every file-backed Contact surface behind the same non-production legacy gate', async () => {
  const [
    authority,
    publicContact,
    adminContact,
    mixedModeration,
    backendContact,
    backendIndex,
  ] = await Promise.all([
    readFile(new URL('../../apps/web/lib/server/contact-authority.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../apps/web/app/api/contact/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../apps/web/app/api/admin/contact/[id]/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../apps/web/app/api/admin/moderation/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../api/routes/contact.ts', import.meta.url), 'utf8'),
    readFile(new URL('../api/index.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(authority, /LEGACY_CONTACT_DEMO_ENV/);
  assert.match(authority, /LEGACY_CONTACT_DATA_PLANE_DISABLED/);
  assert.match(authority, /NODE_ENV\s*!==\s*['"]production['"]/);
  assert.match(authority, /env\[LEGACY_CONTACT_DEMO_ENV\]\s*===\s*['"]1['"]/);
  assert.match(authority, /private, no-store/);

  for (const source of [publicContact, adminContact, mixedModeration]) {
    assert.match(source, /legacyContactAuthorityGate/);
    assert.match(source, /LEGACY_DEMO_ONLY/);
  }

  assert.match(backendContact, /getCurrentUserId/);
  assert.match(backendContact, /contactRequests/);
  assert.match(backendContact, /private, no-store/);
  assert.match(backendContact, /NODE_ENV['"]?\]\s*===\s*['"]production['"]/);
  assert.match(backendContact, /EMOPET_ENABLE_CONTACT_PRODUCT_V1_CANDIDATE/);
  assert.doesNotMatch(backendContact, /x-contact-owner-token/i);
  assert.doesNotMatch(backendContact, /\bisAdmin\b/);

  const authBoundary = backendIndex.indexOf("app.use('/api/*', authMiddleware)");
  const contactMount = backendIndex.indexOf("app.route('/api/contact', contact)");
  assert.ok(authBoundary >= 0, 'backend auth boundary must exist');
  assert.ok(contactMount > authBoundary, 'Product V1 Contact candidate must be mounted behind authMiddleware');
});

test('privacy authority tracks durable Contact subject lineage without inventing erasure policy', async () => {
  const [schema, inventoryRaw, runbook, dpia] = await Promise.all([
    readFile(new URL('../db/schema/contact.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../config/privacy/data-inventory.json', import.meta.url), 'utf8'),
    readFile(new URL('../../docs/privacy/ERASURE_EXPORT_RUNBOOK.md', import.meta.url), 'utf8'),
    readFile(new URL('../../docs/privacy/DPIA_P0.md', import.meta.url), 'utf8'),
  ]);

  const inventory = JSON.parse(inventoryRaw);
  const supportContact = inventory.categories.find((category) => category.id === 'support_contact');
  assert.ok(supportContact, 'support_contact must remain in the privacy inventory');

  for (const field of [
    'contact_request_id',
    'requester_user_id',
    'reason',
    'message',
    'status',
    'consent_at',
    'created_at',
    'updated_at',
  ]) {
    assert.ok(supportContact.data.includes(field), `support_contact inventory must include ${field}`);
  }

  assert.equal(supportContact.retention, 'SUPPORT_RETENTION_TO_CONFIRM');
  assert.match(supportContact.erasure, /TO_CONFIRM/);
  assert.doesNotMatch(supportContact.erasure, /DELETE_AFTER_RETENTION_WINDOW/);

  assert.match(schema, /uuid\('requester_user_id'\).*references\(\(\) => users\.id\)/);
  assert.match(runbook, /contact_requests\.requester_user_id -> users\.id/);
  assert.match(runbook, /foreign key does not authorize an automatic SQL cascade/i);
  assert.match(runbook, /G-PRIV-ERASURE[^\n]*remains `OPEN`/);
  assert.match(dpia, /contact_requests/);
  assert.match(dpia, /destructive erasure remains fail-closed/i);
});

test('durable Contact candidate derives requester identity from server auth and is cross-user isolated', { skip: !integrationEnabled }, async () => {
  const previousFlag = process.env.EMOPET_ENABLE_CONTACT_PRODUCT_V1_CANDIDATE;
  process.env.EMOPET_ENABLE_CONTACT_PRODUCT_V1_CANDIDATE = '1';

  const [
    { contact },
    { db },
    { contactRequests, users },
  ] = await Promise.all([
    import('../dist/api/routes/contact.js'),
    import('../dist/db/index.js'),
    import('../dist/db/schema/index.js'),
  ]);

  const ownerId = randomUUID();
  const otherUserId = randomUUID();
  const suffix = randomUUID();

  await db.insert(users).values([
    {
      id: ownerId,
      email: `contact-owner-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Contact Owner',
    },
    {
      id: otherUserId,
      email: `contact-other-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Contact Other',
    },
  ]);

  let currentUserId = ownerId;
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', currentUserId);
    await next();
  });
  app.route('/api/contact', contact);

  try {
    const forgedAuthorityResponse = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'question_usage',
        message: 'This payload must not be allowed to choose its requester identity.',
        consentGiven: true,
        ownerToken: 'caller-controlled-demo-token',
      }),
    });
    assert.equal(forgedAuthorityResponse.status, 400);

    const rowsAfterForgedAuthority = await db
      .select()
      .from(contactRequests)
      .where(eq(contactRequests.requesterUserId, ownerId));
    assert.equal(rowsAfterForgedAuthority.length, 0);

    const createResponse = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'question_usage',
        message: 'Je souhaite comprendre comment utiliser la fonction Care.',
        consentGiven: true,
      }),
    });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.headers.get('cache-control'), 'private, no-store');
    const createdBody = await createResponse.json();
    const requestId = createdBody.request.id;
    assert.equal(createdBody.request.reason, 'question_usage');
    assert.equal(createdBody.request.status, 'pending');
    assert.equal(Object.hasOwn(createdBody.request, 'requesterUserId'), false);

    const [stored] = await db
      .select()
      .from(contactRequests)
      .where(eq(contactRequests.id, requestId))
      .limit(1);
    assert.ok(stored);
    assert.equal(stored.requesterUserId, ownerId);
    assert.equal(stored.message, 'Je souhaite comprendre comment utiliser la fonction Care.');

    const ownerListResponse = await app.request('/api/contact');
    assert.equal(ownerListResponse.status, 200);
    assert.equal(ownerListResponse.headers.get('cache-control'), 'private, no-store');
    const ownerList = await ownerListResponse.json();
    assert.equal(ownerList.requests.length, 1);
    assert.equal(ownerList.requests[0].id, requestId);
    assert.equal(Object.hasOwn(ownerList.requests[0], 'requesterUserId'), false);

    currentUserId = otherUserId;
    const otherListResponse = await app.request('/api/contact');
    assert.equal(otherListResponse.status, 200);
    const otherList = await otherListResponse.json();
    assert.deepEqual(otherList.requests, []);
  } finally {
    await db.delete(contactRequests).where(eq(contactRequests.requesterUserId, ownerId));
    await db.delete(contactRequests).where(eq(contactRequests.requesterUserId, otherUserId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, otherUserId));

    if (previousFlag === undefined) delete process.env.EMOPET_ENABLE_CONTACT_PRODUCT_V1_CANDIDATE;
    else process.env.EMOPET_ENABLE_CONTACT_PRODUCT_V1_CANDIDATE = previousFlag;
  }
});
