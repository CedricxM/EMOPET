/**
 * Control-register pointer audit — static, read-only.
 *
 * A PASS is NOT legal review, chain-of-title, rights clearance or release
 * authority. It proves two narrow things about the P0 control registers, and
 * keeps them separate because they fail for different reasons.
 *
 * 1. INTEGRITY (blocking). Every declared pointer must resolve at the snapshot
 *    boundary the register itself declares. This is the #117 defect: seven of
 *    twelve 40-character blob identifiers in that draft resolved to no Git
 *    object in 2,370 commits — each a correctly observed short hash expanded by
 *    hand into a full identifier nobody read back. A register's evidence is a
 *    claim about its snapshot; if it is false *at its snapshot*, the register
 *    is wrong, whatever the tree looks like today.
 *
 * 2. STALENESS (report only). Which pointed files changed between the snapshot
 *    and HEAD. That is not an error — the register describes a dated snapshot,
 *    and `apps/web/package.json` changes with every dependency bump. Failing CI
 *    on it would teach people to overwrite hashes to go green, which is the
 *    failure this script exists to prevent. It tells a reviewer a
 *    re-verification is due; `--strict` makes it blocking for that review.
 *
 * It asserts nothing about rights, creators, ownership or licences. Every gate
 * in both registers stays OPEN regardless of the result. Owners: #114, #116.
 *
 * Reads the working tree and Git objects; fetches a missing snapshot commit
 * from `origin` by SHA when run in a shallow checkout. No other network use.
 * No writes to the tree.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const ROOT = new URL('../../', import.meta.url).pathname;

/** Each register declares pointers with its own row-id prefixes. */
export const REGISTERS = [
  {
    path: 'docs/control/P0_IP_PROVENANCE_EVIDENCE_REGISTER.md',
    idPattern: 'IP-ASSET-\\d+',
    owner: '#114',
  },
  {
    path: 'docs/control/P0_THIRD_PARTY_DATA_RIGHTS_REGISTER.md',
    idPattern: '(?:DATA-SRC|VBO-FILE)-\\d+',
    owner: '#116',
  },
];

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
}

function blobAt(rev, path) {
  try {
    return git(['rev-parse', `${rev}:${path}`]);
  } catch {
    return null;
  }
}

/** CI checks out depth 1; the snapshot commit may need fetching by SHA. */
export function ensureCommit(sha) {
  try {
    git(['cat-file', '-e', `${sha}^{commit}`]);
    return true;
  } catch {
    try {
      git(['fetch', '--no-tags', '--depth=1', 'origin', sha]);
      git(['cat-file', '-e', `${sha}^{commit}`]);
      return true;
    } catch {
      return false;
    }
  }
}

/** `Snapshot boundary: \`main@<40 hex>\`` — the register's own declaration. */
export function declaredSnapshot(source) {
  const m = source.match(/^Snapshot boundary:\s*`main@([0-9a-f]{40})`/m);
  return m ? m[1] : null;
}

/**
 * Rows shaped `| <id> | \`path\` | \`blob\` | …`
 *
 * The blob group demands exactly 40 hex characters. An abbreviated hash in a
 * register is not a near-miss to tolerate — it is the shape of the #117 defect,
 * so it must not parse as a pointer at all.
 */
export function declaredPointers(idPattern, source) {
  const row = new RegExp(
    String.raw`^\|\s*(${idPattern})\s*\|\s*\x60([^\x60]+)\x60\s*\|\s*\x60([0-9a-f]{40})\x60\s*\|`,
    'gm',
  );
  return [...source.matchAll(row)].map(([, id, path, blob]) => ({ id, path, blob }));
}

export function auditRegister(register, source = readFileSync(ROOT + register.path, 'utf8')) {
  const snapshot = declaredSnapshot(source);
  const pointers = declaredPointers(register.idPattern, source);
  const snapshotAvailable = snapshot !== null && ensureCommit(snapshot);
  const broken = [];
  const stale = [];
  for (const p of pointers) {
    const atSnapshot = snapshotAvailable ? blobAt(snapshot, p.path) : null;
    if (atSnapshot !== p.blob) broken.push({ ...p, atSnapshot });
    else {
      const atHead = blobAt('HEAD', p.path);
      if (atHead !== p.blob) stale.push({ ...p, atHead });
    }
  }
  return { ...register, snapshot, snapshotAvailable, pointers, broken, stale };
}

export function audit() {
  return REGISTERS.map((r) => auditRegister(r));
}

const invokedDirectly =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly) {
  const strict = process.argv.includes('--strict');
  let failed = false;
  for (const r of audit()) {
    console.log(
      `${r.path}  (owner ${r.owner})\n  snapshot ${r.snapshot ?? '(none declared)'}\n` +
        `  ${r.pointers.length} declared pointers, ${r.broken.length} broken at snapshot, ` +
        `${r.stale.length} changed since snapshot`,
    );
    if (!r.snapshot || !r.snapshotAvailable) {
      failed = true;
      console.error(`  FAIL: snapshot boundary ${r.snapshot ? 'cannot be resolved' : 'is not declared'}`);
    }
    for (const b of r.broken) {
      failed = true;
      console.error(`  BROKEN ${b.id} ${b.path}\n    declared    ${b.blob}\n    at snapshot ${b.atSnapshot ?? '(path absent)'}`);
    }
    for (const s of r.stale) {
      if (strict) failed = true;
      console.log(`  stale  ${s.id} ${s.path} — changed since snapshot; re-verify before relying on this row`);
    }
  }
  if (failed) {
    console.error(
      '\nFAIL. A BROKEN row states something false about its own snapshot: correct the observation, ' +
        'never the hash alone. Stale rows fail only under --strict. See #114, #116.',
    );
    process.exit(1);
  }
}
