import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('security alert ACK route derives actor authority server-side and rejects caller body material', async () => {
  const routeUrl = new URL(
    '../../../app/api/admin/security-alerts/[id]/ack/route.ts',
    import.meta.url,
  );
  const source = await readFile(routeUrl, 'utf8');
  const postStart = source.indexOf('export async function POST');
  assert.ok(postStart >= 0);
  const post = source.slice(postStart);

  assert.equal(post.includes("'security.incident.coordinate'"), true);
  assert.equal(post.includes('canonicalPrivilegedAuthorizationVerifier'), true);
  assert.equal(post.includes('authorizePrivilegedRequestOrSession'), true);

  assert.equal(post.includes('actorSubject: authorization.subject'), true);
  assert.equal(post.includes('actorRole: authorization.role'), true);
  assert.equal(post.includes('acknowledgedAt: new Date().toISOString()'), true);

  assert.equal(post.includes('await req.json()'), false);
  assert.equal(post.includes('body.length !== 0'), true);
  assert.equal(post.includes("error: 'request_body_not_allowed'"), true);

  const authorize = post.indexOf('authorizePrivilegedRequestOrSession');
  const bodyRead = post.indexOf('const body = await req.text()');
  const emit = post.indexOf('emitSecurityAlertAcknowledgement({');
  assert.ok(authorize >= 0 && bodyRead > authorize && emit > bodyRead);

  assert.equal(post.includes("authorization.status !== 'AUTHORIZED'"), true);
  assert.equal(post.includes("authorization.role !== 'admin'"), true);
  assert.equal(post.includes("authorization.role !== 'operator'"), true);
});

test('session mutations keep same-origin protection while bearer authority is terminal', async () => {
  const routeUrl = new URL(
    '../../../app/api/admin/security-alerts/[id]/ack/route.ts',
    import.meta.url,
  );
  const source = await readFile(routeUrl, 'utf8');

  assert.equal(source.includes("const usesBearer = req.headers.has('authorization')"), true);
  assert.equal(source.includes('if (!usesBearer)'), true);
  assert.equal(source.includes('resolvePrivilegedWebOrigin()'), true);
  assert.equal(source.includes('evaluatePrivilegedMutationOrigin'), true);
  assert.equal(source.includes('PRIVILEGED_SESSION_COOKIE'), true);
});
