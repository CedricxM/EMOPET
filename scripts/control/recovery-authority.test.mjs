import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authorityUrl = new URL('../../config/science/recovery-speed-authority.json', import.meta.url);
const templateUrl = new URL('../../packages/ai-personality/src/bleiz/bleiz-v6-templates.ts', import.meta.url);

test('recovery model remains HOLD and numerical constants are not literature-promoted', async () => {
  const authority = JSON.parse(await readFile(authorityUrl, 'utf8'));
  assert.equal(authority.status, 'HOLD_PENDING_SEMANTIC_DECISION');
  assert.equal(authority.currentImplementation.guardianPublicationAuthorized, false);
  for (const status of Object.values(authority.parameterProvenance)) {
    assert.equal(status, 'EMOPET_MODEL_PARAMETER_UNVALIDATED');
  }
});

test('Bleiz recovery publication requires contract authority and seven-day persistence', async () => {
  const template = await readFile(templateUrl, 'utf8');
  assert.match(template, /sensor\.recovery_contract_authorized/);
  assert.match(template, /sensor\.recovery_trend_sustained_7d_met/);
  assert.match(template, /Recovery contract explicitly authorized under #90/);
  assert.match(template, /Recovery trend persistence >=7 days confirmed under #90/);
});
