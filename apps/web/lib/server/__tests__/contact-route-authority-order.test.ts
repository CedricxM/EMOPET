import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Contact GET keeps legacy data-plane gate before canonical privileged read and POST stays ordinary', async () => {
  const routeUrl = new URL('../../../app/api/contact/route.ts', import.meta.url);
  const source = await readFile(routeUrl, 'utf8');

  const getStart = source.indexOf('export async function GET');
  const postStart = source.indexOf('export async function POST');
  const deleteStart = source.indexOf('export async function DELETE');
  assert.notEqual(getStart, -1);
  assert.notEqual(postStart, -1);
  assert.notEqual(deleteStart, -1);

  const get = source.slice(getStart, postStart);
  const post = source.slice(postStart, deleteStart);

  const gate = get.indexOf('legacyContactAuthorityGate()');
  const rate = get.indexOf('enforceRateLimit');
  const authority = get.indexOf('resolveContactReadAuthority');
  const store = get.indexOf('requests.list()');

  for (const position of [gate, rate, authority, store]) assert.notEqual(position, -1);
  assert.ok(gate < rate);
  assert.ok(rate < authority);
  assert.ok(authority < store);
  assert.equal(get.includes('canonicalPrivilegedAuthorizationVerifier'), true);
  assert.equal(get.includes('isAdmin('), false);
  assert.equal(source.includes('LEGACY_DEMO_ONLY'), true);
  assert.equal(get.includes('demoJson('), true);

  assert.equal(post.includes('legacyContactAuthorityGate()'), true);
  assert.equal(post.includes('resolveContactReadAuthority'), false);
  assert.equal(post.includes('authorizePrivilegedSessionToken'), false);
  assert.equal(post.includes('canonicalPrivilegedAuthorizationVerifier'), false);
  assert.equal(post.includes('readLimitedJson<unknown>(req, MAX_CONTACT_POST_BYTES)'), true);
});
