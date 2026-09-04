import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('contact DELETE keeps explicit owner authority terminal before privileged session authority', async () => {
  const routeUrl = new URL('../../../app/api/contact/route.ts', import.meta.url);
  const source = await readFile(routeUrl, 'utf8');
  const deleteStart = source.indexOf('export async function DELETE');

  assert.notEqual(deleteStart, -1);
  const deleteSource = source.slice(deleteStart);

  assert.equal(deleteSource.includes('isAdmin('), false);
  assert.equal(deleteSource.includes('x-admin-token'), false);
  assert.equal(deleteSource.includes('breiz-admin-token'), false);
  assert.equal(deleteSource.includes('ADMIN_TOKEN'), false);
  assert.equal(deleteSource.includes('authorizePrivilegedRequestOrSession'), false);
  assert.equal(deleteSource.includes('authorizePrivilegedRequest('), false);

  assert.equal(deleteSource.includes('ownerTokenFromRequest(req)'), true);
  assert.equal(deleteSource.includes('target.ownerToken !== ownerToken'), true);
  assert.equal(deleteSource.includes('resolvePrivilegedWebOrigin()'), true);
  assert.equal(deleteSource.includes('evaluatePrivilegedMutationOrigin'), true);
  assert.equal(deleteSource.includes("req.headers.has('authorization')"), true);
  assert.equal(deleteSource.includes('PRIVILEGED_SESSION_COOKIE'), true);
  assert.equal(deleteSource.includes('authorizePrivilegedSessionToken'), true);
  assert.equal(deleteSource.includes("'contact.request.manage'"), true);
  assert.equal(deleteSource.includes('canonicalPrivilegedAuthorizationVerifier'), true);
  assert.equal(deleteSource.includes('PRIVATE_NO_STORE'), true);

  const rateLimit = deleteSource.indexOf('enforceRateLimit');
  const idRead = deleteSource.indexOf("searchParams.get('id')");
  const ownerRead = deleteSource.indexOf('const ownerToken = ownerTokenFromRequest(req)');
  const ownerBranch = deleteSource.indexOf('if (ownerToken)');
  const ownerMismatch = deleteSource.indexOf('target.ownerToken !== ownerToken');
  const ownerRemoval = deleteSource.indexOf('requests.remove(id)');
  const originConfig = deleteSource.indexOf('resolvePrivilegedWebOrigin()');
  const originGuard = deleteSource.indexOf('evaluatePrivilegedMutationOrigin');
  const bearerReject = deleteSource.indexOf("req.headers.has('authorization')");
  const cookieRead = deleteSource.indexOf('await cookies()');
  const authorization = deleteSource.indexOf('authorizePrivilegedSessionToken');
  const privilegedTargetLookup = deleteSource.lastIndexOf("requests.list().find((item) => item.id === id)");
  const privilegedRemoval = deleteSource.lastIndexOf('requests.remove(id)');

  for (const position of [
    rateLimit,
    idRead,
    ownerRead,
    ownerBranch,
    ownerMismatch,
    ownerRemoval,
    originConfig,
    originGuard,
    bearerReject,
    cookieRead,
    authorization,
    privilegedTargetLookup,
    privilegedRemoval,
  ]) {
    assert.notEqual(position, -1);
  }

  assert.ok(rateLimit < idRead);
  assert.ok(idRead < ownerRead);
  assert.ok(ownerRead < ownerBranch);
  assert.ok(ownerBranch < ownerMismatch);
  assert.ok(ownerMismatch < ownerRemoval);
  assert.ok(ownerRemoval < originConfig);

  assert.ok(originConfig < originGuard);
  assert.ok(originGuard < bearerReject);
  assert.ok(bearerReject < cookieRead);
  assert.ok(cookieRead < authorization);
  assert.ok(authorization < privilegedTargetLookup);
  assert.ok(privilegedTargetLookup < privilegedRemoval);
});
