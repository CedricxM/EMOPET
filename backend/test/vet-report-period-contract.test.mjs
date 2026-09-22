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

test('the PDF labels its coverage ratio as sensor coverage, not coverage of the report', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(
    new URL('../api/services/vet-report.ts', import.meta.url),
    'utf8',
  );

  // coverageRatio is distinctDays(sensorSummaries) / requested days. The report
  // also contains owner notes and the dog profile, which have different
  // retention modes, so an unqualified "Couverture de donnees" reads as coverage
  // of the whole document and overstates what was measured (#140).
  assert.match(source, /Couverture des donnees capteur:/);
  assert.doesNotMatch(source, /`Couverture de donnees: /);
  assert.match(source, /Sensor-derived only/);
});

test('the owner-note count is decided once, by the reader limit', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(
    new URL('../api/services/vet-report.ts', import.meta.url),
    'utf8',
  );

  // listHealthEntries fetched 5 while the PDF rendered slice(0, 4), so one
  // fetched row was always discarded and the count never varied with the
  // requested period (#140). One place decides it now.
  assert.doesNotMatch(source, /ownerNotes\.slice\(/);
  assert.match(source, /\.\.\.summary\.ownerNotes\.map\(/);
});
