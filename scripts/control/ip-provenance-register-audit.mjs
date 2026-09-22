/**
 * IP provenance register pointer audit — static, read-only.
 *
 * A PASS is NOT legal review, chain-of-title, clearance or release authority.
 * It proves one narrow thing: that the `VERIFIED_POINTER` rows in
 * `docs/control/P0_IP_PROVENANCE_EVIDENCE_REGISTER.md` still describe the tree.
 *
 * Why this exists: that register spent weeks stranded in an unmerged PR anchored
 * to a long-superseded `main`. Its pointers happened to survive, but nothing
 * would have said so. A pointer nobody re-checks is not verified — it is a claim
 * with a date on it. This turns the register's own evidence into something CI
 * can contradict.
 *
 * It asserts nothing about rights, creators or ownership. Every gate in the
 * register stays OPEN regardless of this script's result. Owner: #114.
 *
 * No network. No writes.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const REGISTER = 'docs/control/P0_IP_PROVENANCE_EVIDENCE_REGISTER.md';
export const ROOT = new URL('../../', import.meta.url).pathname;

function blobOf(path) {
  try {
    return execFileSync('git', ['rev-parse', `HEAD:${path}`], { cwd: ROOT })
      .toString().trim();
  } catch {
    return null;
  }
}

/** Rows shaped `| IP-ASSET-nnn | \`path\` | \`blob\` | …` */
export function declaredPointers(source = readFileSync(ROOT + REGISTER, 'utf8')) {
  return [...source.matchAll(/^\|\s*(IP-ASSET-\d+)\s*\|\s*`([^`]+)`\s*\|\s*`([0-9a-f]{40})`\s*\|/gm)]
    .map(([, id, path, blob]) => ({ id, path, blob }));
}

export function audit() {
  const pointers = declaredPointers();
  const drifted = [];
  for (const p of pointers) {
    const actual = blobOf(p.path);
    if (actual !== p.blob) drifted.push({ ...p, actual });
  }
  return { pointers, drifted };
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly) {
  const { pointers, drifted } = audit();
  console.log(`${REGISTER}: ${pointers.length} declared pointers, ${drifted.length} drifted`);
  for (const d of drifted) {
    console.error(`  ${d.id} ${d.path}\n    declared ${d.blob}\n    actual   ${d.actual ?? '(path absent)'}`);
  }
  if (drifted.length > 0) {
    console.error(
      '\nFAIL: the register states these as VERIFIED_POINTER. Re-verify the fact, then update the row ' +
        'and its re-verification date — do not simply overwrite the hash. See #114.',
    );
    process.exit(1);
  }
}
