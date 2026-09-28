import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('MAT launch gate remains undecided before evidence', async () => {
  const url = new URL('../../config/validation/mat-incremental-value.json', import.meta.url);
  const cfg = JSON.parse(await readFile(url, 'utf8'));

  assert.equal(cfg.status, 'EXECUTION_PLAN_READY / EVIDENCE_NOT_RUN');
  assert.equal(cfg.evidence.technicalComparisonExecuted, false);
  assert.equal(cfg.evidence.householdBurdenExecuted, false);
  assert.equal(cfg.currentDecision, null);
  assert.equal(cfg.claims.matMoreAccurateThanTag, 'NOT_ESTABLISHED');
  assert.equal(cfg.claims.matPlusTagMoreReliable, 'NOT_ESTABLISHED');
});

test('MAT protocol preserves separate science gates and kill option', async () => {
  const url = new URL('../../docs/validation/EMOPET_MAT_INCREMENTAL_VALUE_EXECUTION_2026-09-25.md', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.ok(source.includes('MAT_KILL'));
  assert.ok(source.includes('SEPARATE SCIENTIFIC GATE'));
  assert.ok(source.includes('No global weighted score'));
  assert.ok(source.includes('Never convert unavailable MAT or TAG evidence into zero'));
});


test('MAT execution pack uses current Owner terminology and merged RR decision boundary', async () => {
  const [execution, phase0, burden] = await Promise.all([
    readFile(new URL('../../docs/validation/EMOPET_MAT_INCREMENTAL_VALUE_EXECUTION_2026-09-25.md', import.meta.url), 'utf8'),
    readFile(new URL('../../docs/validation/EMOPET_MAT_PHASE0_EXECUTION_PROTOCOL_v0.2.md', import.meta.url), 'utf8'),
    readFile(new URL('../../docs/validation/templates/MAT_INCREMENTAL_VALUE_BURDEN_TEMPLATE.csv', import.meta.url), 'utf8'),
  ]);

  assert.match(execution, /Owner understanding of why MAT exists/);
  assert.match(burden, /owner_or_operator/);

  assert.match(phase0, /Merged #600 closed the ambiguous #86 naming decision/);
  assert.match(phase0, /resp_ibi_sd_s_300s/);
  assert.match(phase0, /resp_ibi_cv_300s/);
  assert.match(phase0, /ELI mapping remains HOLD \/ NOT VALIDATED/);
  assert.doesNotMatch(phase0, /until #86's semantic\/scientific contract is resolved/);
});
