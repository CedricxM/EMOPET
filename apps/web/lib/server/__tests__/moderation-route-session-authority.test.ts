import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('moderation read keeps both legacy data-plane gates before canonical privileged authority', async () => {
  const routeUrl = new URL('../../../app/api/admin/moderation/route.ts', import.meta.url);
  const source = await readFile(routeUrl, 'utf8');
  const getStart = source.indexOf('export async function GET');
  assert.notEqual(getStart, -1);
  const get = source.slice(getStart);

  for (const legacy of ['isAdmin(', 'ADMIN_TOKEN', 'x-admin-token', 'breiz-admin-token', 'adminConfigured']) {
    assert.equal(get.includes(legacy), false, `legacy staff authority must be absent: ${legacy}`);
  }

  const communityGate = get.indexOf('legacyCommunityAuthorityGate()');
  const contactGate = get.indexOf('legacyContactAuthorityGate()');
  const rateLimit = get.indexOf('enforceRateLimit');
  const cookie = get.indexOf('PRIVILEGED_SESSION_COOKIE');
  const authorize = get.indexOf('authorizePrivilegedRequestOrSession');
  const readStore = get.indexOf("collection<ContactRequest>('contact-requests').list()");

  for (const position of [communityGate, contactGate, rateLimit, cookie, authorize, readStore]) {
    assert.notEqual(position, -1);
  }

  assert.ok(communityGate < contactGate);
  assert.ok(contactGate < rateLimit);
  assert.ok(rateLimit < cookie);
  assert.ok(cookie < authorize);
  assert.ok(authorize < readStore);
  assert.equal(get.includes("'moderation.queue.read'"), true);
  assert.equal(source.includes('LEGACY_DEMO_ONLY'), true);
  assert.equal(get.includes('demoJson('), true);
});
