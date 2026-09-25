import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authorityUrl = new URL('../../config/science/anticipation-index-authority.json', import.meta.url);
const templateUrl = new URL('../../packages/ai-personality/src/bleiz/bleiz-v6-templates.ts', import.meta.url);

test('anticipation semantic contract remains HOLD and parameters remain unvalidated', async () => {
  const authority = JSON.parse(await readFile(authorityUrl, 'utf8'));
  assert.equal(authority.status, 'HOLD_PENDING_SEMANTIC_DECISION');
  assert.equal(authority.currentImplementation.guardianPublicationAuthorized, false);
  for (const status of Object.values(authority.parameterProvenance)) {
    assert.equal(status, 'EMOPET_DESIGN_PARAMETER_UNVALIDATED');
  }
});

test('Bleiz anticipation publication requires explicit #89 contract authority', async () => {
  const template = await readFile(templateUrl, 'utf8');
  assert.match(template, /sensor\.anticipation_contract_authorized/);
  assert.match(template, /Anticipation contract explicitly authorized under #89/);
});
