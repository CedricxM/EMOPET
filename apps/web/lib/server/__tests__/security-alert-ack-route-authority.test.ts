import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL(
  '../../../app/api/admin/security/alerts/[id]/acknowledge/route.ts',
  import.meta.url,
);

test('security alert acknowledgement route preserves canonical mutation authority order', async () => {
  const source = await readFile(routeUrl, 'utf8');

  const rate = source.indexOf('enforceRateLimit');
  const originConfig = source.indexOf('resolvePrivilegedWebOrigin()');
  const originGuard = source.indexOf('evaluatePrivilegedMutationOrigin');
  const bearerReject = source.indexOf("req.headers.has('authorization')");
  const cookieRead = source.indexOf('await cookies()');
  const authorize = source.indexOf('authorizePrivilegedSessionToken');
  const action = source.indexOf("'security.incident.coordinate'");
  const bodyRead = source.indexOf('readLimitedJson');
  const emit = source.indexOf('emitSecurityAlertAcknowledgement');

  for (const value of [
    rate,
    originConfig,
    originGuard,
    bearerReject,
    cookieRead,
    authorize,
    action,
    bodyRead,
    emit,
  ]) {
    assert.ok(value >= 0);
  }

  assert.ok(rate < originConfig);
  assert.ok(originConfig < originGuard);
  assert.ok(originGuard < bearerReject);
  assert.ok(bearerReject < cookieRead);
  assert.ok(cookieRead < authorize);
  assert.ok(authorize < bodyRead);
  assert.ok(bodyRead < emit);
});

test('browser acknowledgement body cannot supply identity, time or free-form payload', async () => {
  const source = await readFile(routeUrl, 'utf8');

  assert.equal(source.includes('isEmptyObject(body.data)'), true);
  assert.equal(source.includes('acknowledgedAt: new Date().toISOString()'), true);
  assert.equal(source.includes('authorization,'), true);

  for (const forbidden of [
    'body.data.subject',
    'body.data.role',
    'body.data.acknowledgedAt',
    'body.data.message',
    'body.data.note',
    'body.data.destination',
    'body.data.payload',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
