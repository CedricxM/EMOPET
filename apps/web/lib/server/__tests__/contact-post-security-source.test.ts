import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('contact POST uses bounded JSON parsing before structural and domain validation', async () => {
  const routeUrl = new URL('../../../app/api/contact/route.ts', import.meta.url);
  const source = await readFile(routeUrl, 'utf8');

  assert.equal(source.includes('const MAX_CONTACT_POST_BYTES = 8 * 1024'), true);
  assert.equal(source.includes('readLimitedJson<unknown>(req, MAX_CONTACT_POST_BYTES)'), true);
  assert.equal(source.includes('parseNewContactInput(body.data)'), true);
  assert.equal(source.includes('validateContactInput(input)'), true);

  const boundedRead = source.indexOf('readLimitedJson<unknown>(req, MAX_CONTACT_POST_BYTES)');
  const structuralParse = source.indexOf('parseNewContactInput(body.data)');
  const domainValidation = source.indexOf('validateContactInput(input)');
  const ownerResolution = source.indexOf("input.ownerToken?.trim() || ownerTokenFromRequest(req)");
  const storeMutation = source.indexOf('requests.insert(request)');

  assert.ok(boundedRead >= 0);
  assert.ok(structuralParse > boundedRead);
  assert.ok(domainValidation > structuralParse);
  assert.ok(ownerResolution > domainValidation);
  assert.ok(storeMutation > ownerResolution);

  assert.equal(source.includes('await req.json()'), false);
  assert.equal(source.includes('as NewContactInput'), false);
});
