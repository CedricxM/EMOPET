import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';

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

test('vet-report link and report use the same normalized positive integer period', async () => {
  const app = makeApp();

  const linkInvalid = await app.request(`/dogs/${DOG_ID}/vet-report-link?days=1.5`);
  assert.equal(linkInvalid.status, 400);
  assert.deepEqual(await linkInvalid.json(), { error: 'invalid_report_period' });

  const reportInvalid = await app.request(`/dogs/${DOG_ID}/vet-report?days=1.5`);
  assert.equal(reportInvalid.status, 400);
  assert.deepEqual(await reportInvalid.json(), { error: 'invalid_report_period' });
});
