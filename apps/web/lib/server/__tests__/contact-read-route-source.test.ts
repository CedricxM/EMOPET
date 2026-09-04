import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('contact GET uses canonical read authority while POST remains outside privileged composition', async () => {
  const routeUrl = new URL('../../../app/api/contact/route.ts', import.meta.url);
  const source = await readFile(routeUrl, 'utf8');

  const getStart = source.indexOf('export async function GET');
  const postStart = source.indexOf('export async function POST');
  const deleteStart = source.indexOf('export async function DELETE');

  assert.notEqual(getStart, -1);
  assert.notEqual(postStart, -1);
  assert.notEqual(deleteStart, -1);
  assert.ok(getStart < postStart && postStart < deleteStart);

  const getSource = source.slice(getStart, postStart);
  const postSource = source.slice(postStart, deleteStart);
  const deleteSource = source.slice(deleteStart);

  assert.equal(getSource.includes('isAdmin('), false);
  assert.equal(getSource.includes('resolveContactReadAuthority'), true);
  assert.equal(getSource.includes('canonicalPrivilegedAuthorizationVerifier'), true);
  assert.equal(getSource.includes('x-admin-token'), false);

  assert.equal(postSource.includes('resolveContactReadAuthority'), false);
  assert.equal(deleteSource.includes('resolveContactReadAuthority'), false);
  assert.equal(deleteSource.includes('isAdmin('), false);
  assert.equal(deleteSource.includes("'contact.request.manage'"), true);
});

test('contact read helper requests exactly the canonical contact.request.read action', async () => {
  const helperUrl = new URL('../contact-read-authority.ts', import.meta.url);
  const source = await readFile(helperUrl, 'utf8');

  assert.equal(source.includes("'contact.request.read'"), true);
  assert.equal(source.includes('authorizePrivilegedRequest'), true);
  assert.equal(source.includes('x-admin-token'), false);
});
