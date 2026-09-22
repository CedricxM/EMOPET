import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { REGISTERS, ROOT, audit, auditRegister, declaredPointers } from './control-register-pointer-audit.mjs';

const IP = REGISTERS.find((r) => r.owner === '#114');
const DATA = REGISTERS.find((r) => r.owner === '#116');

test('both registers are covered and every declared pointer matches the tree', () => {
  const results = audit();
  assert.equal(results.length, 2, 'both P0 control registers must be audited');
  assert.equal(auditRegister(IP).pointers.length, 13, 'expected 13 asset pointers in the IP register');
  assert.equal(auditRegister(DATA).pointers.length, 24, 'expected 24 pointers in the third-party rights register');
  for (const r of results) {
    assert.deepEqual(r.drifted, [], `${r.path}: a pointer drifted — re-verify the fact, not just the hash`);
  }
});

test('a drifted hash is detected, not silently accepted', () => {
  const source = readFileSync(ROOT + DATA.path, 'utf8')
    .replace('`902e7457b8a31ff3256d253ad13592a7ce9e54fa`', '`' + '0'.repeat(40) + '`');
  const tampered = declaredPointers(DATA.idPattern, source).find((p) => p.blob === '0'.repeat(40));
  assert.ok(tampered, 'the parser must see the tampered row');
  assert.equal(tampered.path, 'data/vbo/vbo.json');
  assert.notEqual(tampered.blob, '902e7457b8a31ff3256d253ad13592a7ce9e54fa');
});

/**
 * The #117 defect in miniature. An abbreviated hash must not parse as a pointer,
 * because a pointer that parses is a pointer this script claims to have checked.
 */
test('an abbreviated hash does not parse as a pointer at all', () => {
  const row = '| DATA-SRC-099 | `data/vbo/vbo.json` | `902e7457` | fact | `REPOSITORY_FACT` |\n';
  assert.deepEqual(declaredPointers(DATA.idPattern, row), []);
  const full = row.replace('`902e7457`', '`902e7457b8a31ff3256d253ad13592a7ce9e54fa`');
  assert.equal(declaredPointers(DATA.idPattern, full).length, 1);
});

test('each register only claims its own row ids', () => {
  const dataSource = readFileSync(ROOT + DATA.path, 'utf8');
  assert.equal(declaredPointers(IP.idPattern, dataSource).length, 0);
});

test('the third-party register records its reconstruction and keeps every gate open', () => {
  const source = readFileSync(ROOT + DATA.path, 'utf8');
  assert.match(source, /PR #117\]\(https:\/\/github\.com\/CedricxM\/EMOPET\/pull\/117\)/);
  assert.match(source, /That PR never merged/);
  // The seven unresolvable pointers are the finding; they must stay stated.
  assert.match(source, /UNRESOLVABLE_POINTER/);
  assert.match(source, /no Git object anywhere in this\n?repository's history/);
  // Landed enforcement must never read as a closed gate.
  assert.match(source, /G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN/);
  assert.match(source, /PRODUCT OR RELEASE AUTHORITY = NOT GRANTED/);
  assert.match(source, /Landed enforcement is not landed evidence/);
  for (const gate of ['G1', 'G2', 'G4', 'G5', 'G6', 'G7', 'G8']) {
    assert.match(source, new RegExp(`DATA-LIC-${gate} \\|[^|]*\\|[^|]*\`OPEN\``), `${gate} must stay OPEN`);
  }
  assert.match(source, /DATA-LIC-G3 \|[^|]*\|[^|]*`HOLD`/, 'G3 must stay HOLD');
});

/**
 * The register states counts that were re-derived from the seed. If the seed
 * changes, the pointer audit catches the blob and this catches the prose, which
 * is the pair the #117 draft lacked.
 */
test('the register does not describe the directory seed as verified or cleared', () => {
  const source = readFileSync(ROOT + DATA.path, 'utf8');
  const claims = source.replace(/`(CLEARED|COMPLIANT|LICENSED|APPROVED|RELEASED)`/g, '');
  for (const word of ['CLEARED', 'COMPLIANT', 'LICENSED', 'APPROVED', 'RELEASED']) {
    assert.ok(
      !new RegExp(`DIRECTORY[^\\n]*${word}`).test(claims),
      `the directory must never be described as ${word}`,
    );
  }
  assert.match(source, /REPRESENTATION AS A VERIFIED PUBLIC OR PRODUCTION DIRECTORY = HOLD/);
});
