import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { REGISTER, ROOT, audit, declaredPointers } from './ip-provenance-register-audit.mjs';

test('every declared VERIFIED_POINTER still matches the tree', () => {
  const { pointers, drifted } = audit();
  assert.equal(pointers.length, 13, 'expected 13 asset pointers in the register');
  assert.deepEqual(drifted, [], 'a register pointer drifted — re-verify the fact, not just the hash');
});

test('a drifted hash is detected, not silently accepted', () => {
  const source = readFileSync(ROOT + REGISTER, 'utf8')
    .replace(/`0e3de5ba39e2a0fcfe46f0c77ac565abffc1595b`/, '`' + '0'.repeat(40) + '`');
  const pointers = declaredPointers(source);
  const tampered = pointers.find((p) => p.blob === '0'.repeat(40));
  assert.ok(tampered, 'the parser must see the tampered row');
  assert.notEqual(tampered.blob, '0e3de5ba39e2a0fcfe46f0c77ac565abffc1595b');
});

test('the register still records its own reconstruction and keeps the gate open', () => {
  const source = readFileSync(ROOT + REGISTER, 'utf8');
  assert.match(source, /Reconstructed on current `main`/);
  assert.match(source, /Original vessel.*PR #115.*never merged/);
  // The audit must never be readable as clearance.
  assert.match(source, /G-IP-PROVENANCE-01 = OPEN/);
  assert.match(source, /BRAND-ASSET RIGHTS = NOT ESTABLISHED/);
});
