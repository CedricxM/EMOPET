import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { readFileSync } from 'node:fs';

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


test('Vet Report maximum horizon cannot be inferred from one retention category', () => {
  const routeSource = readFileSync(new URL('../api/routes/dogs.ts', import.meta.url), 'utf8');
  const reportSource = readFileSync(new URL('../api/services/vet-report.ts', import.meta.url), 'utf8');
  const inventory = JSON.parse(
    readFileSync(new URL('../../config/privacy/data-inventory.json', import.meta.url), 'utf8'),
  );
  const schedule = JSON.parse(
    readFileSync(new URL('../../config/privacy/retention-schedule.json', import.meta.url), 'utf8'),
  );

  const helper = routeSource.match(
    /function parseVetReportDays\([\s\S]*?\n\}/,
  )?.[0] ?? '';
  assert.ok(helper.length > 0);
  assert.doesNotMatch(helper, /MAX_|Math\.min|<=\s*30\b|<=\s*365\b/);

  assert.match(reportSource, /from\(sensorSummaries\)/);
  assert.match(reportSource, /from\(healthEntries\)/);

  const category = (id) => inventory.categories.find((entry) => entry.id === id);
  assert.equal(
    category('sensor_preprocessed')?.retention,
    'SEE_RETENTION_SCHEDULE_sensor_preprocessed_detailed_AND_sensor_preprocessed_aggregates',
  );
  assert.equal(
    category('health_records')?.retention,
    'SEE_RETENTION_SCHEDULE_veterinary_user_entered_records',
  );

  const retention = (id) => schedule.categories.find((entry) => entry.id === id)?.activeRetention;
  assert.deepEqual(retention('sensor_preprocessed_detailed'), {
    mode: 'DURATION',
    value: 36,
    unit: 'MONTHS',
  });
  assert.deepEqual(retention('sensor_preprocessed_aggregates'), {
    mode: 'ACTIVE_DOG_PROFILE_LIFETIME',
  });
  assert.deepEqual(retention('veterinary_user_entered_records'), {
    mode: 'WHILE_USER_RETAINS_RECORD',
  });

  assert.match(routeSource, /#140 VET-PERIOD-G3 intentionally has no numeric maximum here/);
});
