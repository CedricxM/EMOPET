import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('RR variability selected contract deprecates the ambiguous field', async () => {
  const cfg = JSON.parse(await readFile(
    new URL('../../config/science/rr-variability-semantic.json', import.meta.url),
    'utf8',
  ));
  assert.equal(cfg.legacyField.status, 'DEPRECATED_AMBIGUOUS');
  assert.equal(cfg.status, 'DECIDED / SEMANTIC CONTRACT SELECTED / ELI_MAPPING_HOLD');
  assert.equal(cfg.selectedOption, 'SPLIT_EXPLICIT_SD_AND_CV_300S / ELI_MAPPING_HOLD');
  assert.equal(cfg.legacyField.newPersistence, 'MIGRATION_REQUIRED / NOT_YET_IMPLEMENTED');
  assert.equal(cfg.windowSeconds, 300);
  assert.equal(cfg.minimumValidIbiCount, 30);
  assert.equal(cfg.eliMapping, 'HOLD / NOT VALIDATED');
});

test('selected contract keeps SD and CV units explicit and distinct', async () => {
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

test('selected RR contract does not authorize ELI publication or claim implementation', async () => {
  const cfg = JSON.parse(await readFile(
    new URL('../../config/science/rr-variability-semantic.json', import.meta.url),
    'utf8',
  ));
  assert.equal(cfg.eliMapping, 'HOLD / NOT VALIDATED');
  assert.equal(cfg.productClaim, 'NOT AUTHORIZED');
  assert.match(cfg.metrics.resp_ibi_sd_s_300s.status, /NOT_YET_MIGRATED/);
  assert.match(cfg.metrics.resp_ibi_cv_300s.status, /NOT_YET_MIGRATED/);
});
