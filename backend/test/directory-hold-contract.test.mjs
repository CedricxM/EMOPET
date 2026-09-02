import test from 'node:test';
import assert from 'node:assert/strict';

import { Hono } from 'hono';
import { directory } from '../dist/api/routes/directory.js';

const app = new Hono();
app.route('/directory', directory);

for (const path of ['/directory/search', '/directory/categories', '/directory/1']) {
  test(`directory HOLD fails closed for ${path}`, async () => {
    const response = await app.request(path);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: 'directory_verification_hold',
      status: 'HOLD',
      gate: 'DATA-LIC-G3',
      authoritative: false,
      reason: 'row_level_provenance_and_verification_not_established',
    });
  });
}
