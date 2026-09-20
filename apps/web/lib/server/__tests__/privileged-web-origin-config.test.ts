import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { resolvePrivilegedWebOrigin } from '../privileged-web-origin-config';

test('privileged mutation origin reuses exact configured CORS_ORIGIN semantics', () => {
  assert.deepEqual(
    resolvePrivilegedWebOrigin('http://localhost:3100'),
    { status: 'CONFIGURED', origin: 'http://localhost:3100' },
  );
  assert.deepEqual(
    resolvePrivilegedWebOrigin('https://app.emopet.example'),
    { status: 'CONFIGURED', origin: 'https://app.emopet.example' },
  );
});

test('missing privileged web origin never falls back to wildcard or localhost', () => {
  for (const value of [undefined, null, '', '   ']) {
    assert.deepEqual(
      resolvePrivilegedWebOrigin(value),
      { status: 'UNAVAILABLE', reason: 'missing_origin' },
    );
  }
});

test('non-canonical, wildcard and unsafe configured origins fail closed', () => {
  for (const value of [
    '*',
    'not-an-origin',
    'ftp://app.emopet.example',
    'https://user:pass@app.emopet.example',
    'https://app.emopet.example/',
    'https://app.emopet.example/admin',
    'https://app.emopet.example?debug=1',
    'https://app.emopet.example#fragment',
  ]) {
    assert.deepEqual(
      resolvePrivilegedWebOrigin(value),
      { status: 'UNAVAILABLE', reason: 'invalid_origin' },
      value,
    );
  }
});

test('web env example represents CORS_ORIGIN for server-side privileged origin checks', async () => {
  const envUrl = new URL('../../../.env.example', import.meta.url);
  const source = await readFile(envUrl, 'utf8');

  assert.equal(source.includes('CORS_ORIGIN="http://localhost:3100"'), true);
});
