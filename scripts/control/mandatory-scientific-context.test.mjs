import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const REQUIRED_AUTHORITY = 'docs/science/EMOPET_CBARQ_UPENN_SCIENTIFIC_AUTHORITY_2026-09-23.md';

const requiredPointers = [
  'AI_READ_FIRST.md',
  'CLAUDE.md',
  'AGENTS.md',
  'README.md',
  '.github/copilot-instructions.md',
];

test('mandatory C-BARQ scientific authority exists and is explicitly gated', () => {
  assert.equal(existsSync(REQUIRED_AUTHORITY), true, 'mandatory C-BARQ scientific authority must exist');
  const authority = readFileSync(REQUIRED_AUTHORITY, 'utf8');

  assert.ok(authority.includes('MANDATORY_CONTEXT'));
  assert.ok(authority.includes('10.1016/j.applanim.2025.106816'));
  assert.ok(authority.includes('EMOPET_CBARQ_LICENCE = NOT_ESTABLISHED'));
  assert.ok(authority.includes('C_BARQ_63_ITEM_SHORT_FORM = NOT VALIDATED FOR EMOPET'));
  assert.ok(authority.includes('C_BARQ_OWNER_REPORT = EXTERNAL_CRITERION_CANDIDATE, NOT GROUND_TRUTH'));
  assert.ok(authority.includes('SENSOR_TO_DISCRETE_EMOTION_MAPPING = NOT AUTHORIZED'));
});

test('all AI and contributor entrypoints retain the mandatory authority pointer', () => {
  for (const path of requiredPointers) {
    assert.equal(existsSync(path), true, path + ' must exist');
    const source = readFileSync(path, 'utf8');
    assert.equal(source.includes(REQUIRED_AUTHORITY), true, path + ' must point to the mandatory authority');
  }
});

test('agent entrypoints carry explicit read-first language', () => {
  const claude = readFileSync('CLAUDE.md', 'utf8');
  const agents = readFileSync('AGENTS.md', 'utf8');
  const root = readFileSync('AI_READ_FIRST.md', 'utf8');

  assert.ok(claude.includes('READ FIRST — C-BARQ / ELI / behaviour / Penn'));
  assert.ok(agents.includes('READ FIRST — C-BARQ / ELI / behaviour / Penn'));
  assert.ok(root.includes('STOP AND READ IN FULL'));
});

test('mandatory context never asserts licence, validation or endorsement', () => {
  const authority = readFileSync(REQUIRED_AUTHORITY, 'utf8');

  assert.equal(authority.includes('EMOPET_CBARQ_LICENCE = ACTIVE'), false);
  assert.equal(authority.includes('EMOPET_CBARQ_LICENCE = APPROVED'), false);
  assert.equal(authority.includes('ELI_VALIDATION_AGAINST_CBARQ = VALIDATED'), false);
  assert.equal(authority.includes('PENN_RESEARCH_COLLABORATION = SIGNED'), false);
});
