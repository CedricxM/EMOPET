import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('contact PATCH preserves demo kill gate before session-only privileged mutation authority', async () => {
  const routeUrl = new URL('../../../app/api/admin/contact/[id]/route.ts', import.meta.url);
  const source = await readFile(routeUrl, 'utf8');
  const patchStart = source.indexOf('export async function PATCH');
  assert.notEqual(patchStart, -1);
  const patch = source.slice(patchStart);

  for (const legacy of ['isAdmin(', 'x-admin-token', 'breiz-admin-token', 'ADMIN_TOKEN']) {
    assert.equal(patch.includes(legacy), false, `legacy staff authority must be absent: ${legacy}`);
  }

  const gate = patch.indexOf('legacyContactAuthorityGate()');
  const rate = patch.indexOf('enforceRateLimit');
  const originConfig = patch.indexOf('resolvePrivilegedWebOrigin()');
  const originGuard = patch.indexOf('evaluatePrivilegedMutationOrigin');
  const bearerReject = patch.indexOf("req.headers.has('authorization')");
  const cookieRead = patch.indexOf('await cookies()');
  const authorize = patch.indexOf('authorizePrivilegedSessionToken');
  const params = patch.indexOf('await ctx.params');
  const body = patch.indexOf('await req.json()');
  const mutation = patch.indexOf("collection<ContactRequest>('contact-requests').update");

  for (const position of [gate, rate, originConfig, originGuard, bearerReject, cookieRead, authorize, params, body, mutation]) {
    assert.notEqual(position, -1);
  }

  assert.ok(gate < rate);
  assert.ok(rate < originConfig);
  assert.ok(originConfig < originGuard);
  assert.ok(originGuard < bearerReject);
  assert.ok(bearerReject < cookieRead);
  assert.ok(cookieRead < authorize);
  assert.ok(authorize < params);
  assert.ok(params < body);
  assert.ok(body < mutation);
  assert.equal(patch.includes("'contact.request.manage'"), true);
  assert.equal(source.includes('LEGACY_DEMO_ONLY'), true);
  assert.equal(patch.includes('demoJson('), true);
});
