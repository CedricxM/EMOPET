import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('contact DELETE keeps demo gate first and explicit owner authority terminal before privileged session', async () => {
  const routeUrl = new URL('../../../app/api/contact/route.ts', import.meta.url);
  const source = await readFile(routeUrl, 'utf8');
  const deleteStart = source.indexOf('export async function DELETE');
  assert.notEqual(deleteStart, -1);
  const del = source.slice(deleteStart);

  for (const legacy of ['isAdmin(', 'x-admin-token', 'breiz-admin-token', 'ADMIN_TOKEN']) {
    assert.equal(del.includes(legacy), false, `legacy staff authority must be absent: ${legacy}`);
  }

  const gate = del.indexOf('legacyContactAuthorityGate()');
  const rate = del.indexOf('enforceRateLimit');
  const idRead = del.indexOf("searchParams.get('id')");
  const ownerRead = del.indexOf('const ownerToken = ownerTokenFromRequest(req)');
  const ownerBranch = del.indexOf('if (ownerToken)');
  const ownerMismatch = del.indexOf('target.ownerToken !== ownerToken');
  const ownerRemoval = del.indexOf('requests.remove(id)');
  const originConfig = del.indexOf('resolvePrivilegedWebOrigin()');
  const originGuard = del.indexOf('evaluatePrivilegedMutationOrigin');
  const bearerReject = del.indexOf("req.headers.has('authorization')");
  const cookieRead = del.indexOf('await cookies()');
  const authorize = del.indexOf('authorizePrivilegedSessionToken');
  const privilegedTarget = del.lastIndexOf("requests.list().find((item) => item.id === id)");
  const privilegedRemoval = del.lastIndexOf('requests.remove(id)');

  for (const position of [gate, rate, idRead, ownerRead, ownerBranch, ownerMismatch, ownerRemoval, originConfig, originGuard, bearerReject, cookieRead, authorize, privilegedTarget, privilegedRemoval]) {
    assert.notEqual(position, -1);
  }

  assert.ok(gate < rate);
  assert.ok(rate < idRead);
  assert.ok(idRead < ownerRead);
  assert.ok(ownerRead < ownerBranch);
  assert.ok(ownerBranch < ownerMismatch);
  assert.ok(ownerMismatch < ownerRemoval);
  assert.ok(ownerRemoval < originConfig);
  assert.ok(originConfig < originGuard);
  assert.ok(originGuard < bearerReject);
  assert.ok(bearerReject < cookieRead);
  assert.ok(cookieRead < authorize);
  assert.ok(authorize < privilegedTarget);
  assert.ok(privilegedTarget < privilegedRemoval);
  assert.equal(del.includes("'contact.request.manage'"), true);
  assert.equal(source.includes('LEGACY_DEMO_ONLY'), true);
  assert.equal(del.includes('demoJson('), true);
});
