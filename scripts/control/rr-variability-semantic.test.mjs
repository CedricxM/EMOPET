import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('RR variability decision candidate deprecates the ambiguous field', async () => {
  const cfg = JSON.parse(await readFile(
    new URL('../../config/science/rr-variability-semantic.json', import.meta.url),
    'utf8',
  ));
  assert.equal(cfg.legacyField.status, 'DEPRECATED_AMBIGUOUS');
  assert.equal(cfg.legacyField.newPersistence, 'HOLD');
  assert.equal(cfg.windowSeconds, 300);
  assert.equal(cfg.minimumValidIbiCount, 30);
  assert.equal(cfg.eliMapping, 'HOLD / NOT VALIDATED');
});

test('candidate keeps SD and CV units explicit and distinct', async () => {
  const cfg = JSON.parse(await readFile(
    new URL('../../config/science/rr-variability-semantic.json', import.meta.url),
    'utf8',
  ));
  assert.equal(cfg.metrics.resp_ibi_sd_s_300s.unit, 'seconds');
  assert.equal(cfg.metrics.resp_ibi_cv_300s.unit, 'ratio');
  assert.notEqual(
    cfg.metrics.resp_ibi_sd_s_300s.definition,
    cfg.metrics.resp_ibi_cv_300s.definition,
  );
});
