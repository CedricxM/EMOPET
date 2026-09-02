import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Hono } from 'hono';

// The vet-report service intentionally fails closed outside test when no signing
// secret is configured. Configure the test boundary before dynamically importing
// the dog routes so this contract test does not trip the production secret guard.
process.env.NODE_ENV = 'test';
process.env.REPORT_SHARE_SECRET = 'test-only-vet-report-period-contract-secret';

const { dogs } = await import('../dist/api/routes/dogs.js');

const DOG_ID = '11111111-1111-4111-8111-111111111111';

function makeApp() {
  const app = new Hono();
  app.route('/dogs', dogs);
  return app;
}

for (const invalidDays of ['0', '-1', '1.5', 'not-a-number', '']) {
  test(`vet report rejects invalid days=${JSON.stringify(invalidDays)}`, async () => {
    const response = await makeApp().request(
      `/dogs/${DOG_ID}/vet-report?days=${encodeURIComponent(invalidDays)}`,
    );
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'invalid_report_period' });
  });
}

test('vet-report link and report share the same validated period helper', () => {
  const source = readFileSync(new URL('../api/routes/dogs.ts', import.meta.url), 'utf8');
  const uses = source.match(/parseVetReportDays\(c\.req\.query\('days'\)\)/g) ?? [];
  assert.equal(uses.length, 2);
  assert.match(source, /createVetReportShareToken\(userId, id, days\)/);
  assert.match(source, /verifyVetReportShareToken\(shareToken, id, days\)/);
  assert.match(source, /loadVetReportSummary\(id, days\)/);
});
