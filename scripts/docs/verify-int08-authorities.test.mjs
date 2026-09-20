import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { CLAIMS, DOCUMENTS, MAT, PILOT, ROOT, SOURCE, TERMS, verifyInt08 } from './verify-int08-authorities.mjs';

function mutate(path, before, after) {
  const original = readFileSync(resolve(ROOT, path), 'utf8');
  assert.ok(original.includes(before), 'mutation must exercise existing content');
  return verifyInt08({ read: p => p === path ? original.replace(before, after) : readFileSync(resolve(ROOT, p), 'utf8') });
}

test('bounded INT-08 documentation passes', () => assert.deepEqual(verifyInt08(), []));
test('a closed gate fails even if an unchanged OPEN gate is appended', () => {
  const path = DOCUMENTS[0];
  const gate = 'G-EMOPET-PRODUCT-AUTHORITY-MAP-01 = OPEN';
  assert.ok(mutate(path, gate, `${gate.replace('OPEN', 'CLOSED')}\n${gate}`).some(e => e.includes('gate')));
});
test('pilot execution cannot be inferred from document integration', () => {
  assert.ok(mutate(PILOT, 'PROTOCOL / NOT STARTED', 'PROTOCOL / COMPLETED').some(e => e.includes('status')));
});
test('MAT candidate cannot acquire approval', () => {
  assert.ok(mutate(MAT, 'NONE UNTIL APPROVED', 'APPROVED').some(e => e.includes('authority effect')));
});
test('scientific claim promotion fails even though other forbidden rows remain', () => {
  assert.ok(mutate(CLAIMS, '| ELI is scientifically validated | `EVIDENCE_REQUIRED`', '| ELI is scientifically validated | `AUTHORIZED_DESCRIPTIVE`').some(e => e.includes('altered classification')));
});
test('missing doctrine is a broken authority dependency', () => {
  const errors = verifyInt08({ exists: p => !p.endsWith('EMOPET_EXPERIENCE_DOCTRINE_v0.1.md') });
  assert.ok(errors.some(e => e.includes('missing local authority')));
});
test('mutable source links cannot replace frozen-source lineage', () => {
  assert.ok(mutate(TERMS, `/blob/${SOURCE}/`, '/blob/main/').some(e => e.includes('unpinned')));
});
test('legacy role regression is rejected in active prose', () => {
  assert.ok(mutate(PILOT, 'Can an Owner experience', 'Can a Guardian experience').some(e => e.includes('legacy active role')));
});
test('stable historical gate identifiers survive terminology reconciliation', () => {
  const original = readFileSync(resolve(ROOT, TERMS), 'utf8');
  const errors = verifyInt08({ read: p => p === TERMS ? original.replaceAll('G-GUARDIAN-BOLA-QA-01', 'G-OWNER-BOLA-QA-01') : readFileSync(resolve(ROOT, p), 'utf8') });
  assert.ok(errors.some(e => e.includes('lost historical identifier')));
});
test('source migration history is not presented as delivered main state', () => {
  assert.ok(mutate(TERMS, 'The Phase C / Phase D completion statements below describe that source snapshot only.', 'Phase C / Phase D are delivered on main.').some(e => e.includes('source-snapshot')));
});
test('a fabricated Phase 0 result is rejected', () => {
  const phase0 = DOCUMENTS.find(path => path.includes('MAT_PHASE0'));
  assert.ok(mutate(phase0, '| NOT RUN |', '| PASS |').some(e => e.includes('unexecuted evidence table')));
});
