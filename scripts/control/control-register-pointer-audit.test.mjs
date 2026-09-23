import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  REGISTERS,
  ROOT,
  audit,
  auditRegister,
  declaredPointers,
  declaredSnapshot,
} from './control-register-pointer-audit.mjs';

const IP = REGISTERS.find((r) => r.owner === '#114');
const DATA = REGISTERS.find((r) => r.owner === '#116');
const SNAPSHOT = '3fa5c5298247fc88412ce2c8294fdb4f36024f56';

test('both registers are covered, declare a resolvable snapshot, and every pointer holds at it', () => {
  const results = audit();
  assert.equal(results.length, 2, 'both P0 control registers must be audited');
  for (const r of results) {
    assert.equal(r.snapshot, SNAPSHOT, `${r.path}: snapshot boundary`);
    assert.equal(r.snapshotAvailable, true, `${r.path}: snapshot commit must resolve`);
    assert.deepEqual(r.broken, [], `${r.path}: a pointer is false at its own snapshot`);
  }
  assert.equal(results.find((r) => r.owner === '#114').pointers.length, 13);
  assert.equal(results.find((r) => r.owner === '#116').pointers.length, 24);
});

/** The #117 defect: a well-formed identifier that is not the blob at the snapshot. */
test('a fabricated hash is BROKEN at the snapshot, not merely stale', () => {
  const source = readFileSync(ROOT + DATA.path, 'utf8').replace(
    '`902e7457b8a31ff3256d253ad13592a7ce9e54fa`',
    '`902e7457b8a3' + '0'.repeat(28) + '`',
  );
  const r = auditRegister(DATA, source);
  assert.equal(r.broken.length, 1);
  assert.equal(r.broken[0].path, 'data/vbo/vbo.json');
  assert.equal(r.broken[0].atSnapshot, '902e7457b8a31ff3256d253ad13592a7ce9e54fa');
});

/**
 * A legitimate later edit must not fail integrity. The register describes a
 * dated snapshot; a file changing afterwards is a re-verification signal, and
 * making it an error would teach people to overwrite hashes to go green.
 */
test('a file changed after the snapshot is reported stale, never broken', () => {
  const r = auditRegister(DATA);
  for (const s of r.stale) {
    assert.ok(!r.broken.some((b) => b.id === s.id), `${s.id} cannot be both stale and broken`);
    assert.notEqual(s.atHead, s.blob);
  }
});

test('a register without a snapshot boundary cannot pass', () => {
  const source = readFileSync(ROOT + DATA.path, 'utf8').replace(/^Snapshot boundary:.*$/m, '');
  assert.equal(declaredSnapshot(source), null);
  const r = auditRegister(DATA, source);
  assert.equal(r.snapshotAvailable, false);
  assert.equal(r.broken.length, r.pointers.length, 'with no snapshot, no pointer can be verified');
});

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
  assert.match(source, /UNRESOLVABLE_POINTER/);
  assert.match(source, /no Git object anywhere in this\n?repository's history/);
  assert.match(source, /G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN/);
  assert.match(source, /PRODUCT OR RELEASE AUTHORITY = NOT GRANTED/);
  assert.match(source, /Landed enforcement is not landed evidence/);
  for (const gate of ['G1', 'G2', 'G4', 'G5', 'G6', 'G7', 'G8']) {
    assert.match(source, new RegExp(`DATA-LIC-${gate} \\|[^|]*\\|[^|]*\`OPEN\``), `${gate} must stay OPEN`);
  }
  assert.match(source, /DATA-LIC-G3 \|[^|]*\|[^|]*`HOLD`/, 'G3 must stay HOLD');
});

test('the register does not describe the directory seed as verified or cleared', () => {
  const source = readFileSync(ROOT + DATA.path, 'utf8');
  const claims = source.replace(/`(CLEARED|COMPLIANT|LICENSED|APPROVED|RELEASED)`/g, '');
  for (const word of ['CLEARED', 'COMPLIANT', 'LICENSED', 'APPROVED', 'RELEASED']) {
    assert.ok(!new RegExp(`DIRECTORY[^\\n]*${word}`).test(claims), `the directory must never be described as ${word}`);
  }
  assert.match(source, /REPRESENTATION AS A VERIFIED PUBLIC OR PRODUCTION DIRECTORY = HOLD/);
});
