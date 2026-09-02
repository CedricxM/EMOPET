import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

process.env.NODE_ENV = 'test';

const {
  buildVetReportPdf,
  createVetReportShareToken,
  createVetReportSummaryLoader,
  verifyVetReportShareToken,
  VetReportDataUnavailableError,
} = await import('../dist/api/services/vet-report.js');

const DOG_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_DOG_ID = '22222222-2222-4222-8222-222222222222';

test('authoritative zero-row reads remain an intentional no-data report', async () => {
  const loadSummary = createVetReportSummaryLoader({
    async findDogName() {
      return 'Capitaine';
    },
    async listSensorSummaries() {
      return [];
    },
    async listHealthEntries() {
      return [];
    },
  });

  const summary = await loadSummary(DOG_ID, 14);

  assert.equal(summary.dogName, 'Capitaine');
  assert.deepEqual(summary.coverage, {
    validDays: 0,
    totalDays: 14,
    coverageRatio: 0,
  });
  assert.ok(summary.trends.every((trend) => trend.value === 'donnees insuffisantes'));
  assert.deepEqual(summary.ownerNotes, ['Aucune note proprietaire recente.']);

  const pdf = buildVetReportPdf(summary).toString('utf8');
  assert.match(pdf, /Aucune note proprietaire recente\./);
});

test('authoritative read failure rejects instead of producing a no-data summary', async () => {
  const loadSummary = createVetReportSummaryLoader({
    async findDogName() {
      return 'Capitaine';
    },
    async listSensorSummaries() {
      throw new Error('controlled source failure');
    },
    async listHealthEntries() {
      return [];
    },
  });

  await assert.rejects(
    loadSummary(DOG_ID, 14),
    (error) => {
      assert.ok(error instanceof VetReportDataUnavailableError);
      assert.equal(error.code, 'vet_report_data_unavailable');
      assert.equal(error.cause?.message, 'controlled source failure');
      return true;
    },
  );
});

test('vet-report share token remains dog, period and scope bound', async () => {
  const token = await createVetReportShareToken('guardian-a', DOG_ID, 14);

  assert.equal(await verifyVetReportShareToken(token, DOG_ID, 14), true);
  assert.equal(await verifyVetReportShareToken(token, OTHER_DOG_ID, 14), false);
  assert.equal(await verifyVetReportShareToken(token, DOG_ID, 7), false);
  assert.equal(await verifyVetReportShareToken(`${token}tampered`, DOG_ID, 14), false);
});

test('vet-report route preserves authorization, 503 and private no-store boundaries', async () => {
  const routeSource = await readFile(
    new URL('../api/routes/dogs.ts', import.meta.url),
    'utf8',
  );

  const tokenCheck = routeSource.indexOf(
    'verifyVetReportShareToken(shareToken, id, days)',
  );
  const ownerCheck = routeSource.indexOf('requireDogOwnership(c, id)', tokenCheck);
  const reportLoad = routeSource.indexOf('loadVetReportSummary(id, days)');

  assert.ok(tokenCheck >= 0);
  assert.ok(ownerCheck > tokenCheck);
  assert.ok(reportLoad > ownerCheck);
  assert.match(routeSource, /Invalid or expired share token/);
  assert.match(routeSource, /error: 'vet_report_data_unavailable'/);
  assert.match(routeSource, /503/);
  assert.match(routeSource, /'Cache-Control': 'private, max-age=0, no-store'/);
});
