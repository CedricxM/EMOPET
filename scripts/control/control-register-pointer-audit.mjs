/**
 * Control-register pointer audit — static, read-only.
 *
 * A PASS is NOT legal review, chain-of-title, rights clearance or release
 * authority. It proves one narrow thing: that the `VERIFIED_POINTER` rows in the
 * P0 control registers still describe the tree.
 *
 * Why this exists, in two parts.
 *
 * #114's register spent weeks stranded in an unmerged PR anchored to a
 * long-superseded `main`. Its pointers happened to survive, but nothing would
 * have said so. A pointer nobody re-checks is not verified — it is a claim with
 * a date on it.
 *
 * #116's register was worse, and is the reason this script now covers both.
 * Seven of the twelve 40-character blob identifiers in PR #117 resolved to no
 * Git object anywhere in 2,370 commits. Each shared four to eight leading hex
 * characters with the blob that really sat at that path at that commit, then
 * diverged: a correctly observed *short* hash expanded by hand into a full
 * identifier that was never read back. The observations were real; the
 * identifiers recording them were not, and the document gave no way to tell.
 * Nothing in a prose register makes that visible. A resolver does.
 *
 * This asserts nothing about rights, creators, ownership or licences. Every gate
 * in both registers stays OPEN regardless of the result. Owners: #114, #116.
 *
 * No network. No writes.
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

function blobOf(path) {
  try {
    return execFileSync('git', ['rev-parse', `HEAD:${path}`], { cwd: ROOT })
      .toString().trim();
  } catch {
    return null;
  }
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

export function auditRegister(register) {
  const source = readFileSync(ROOT + register.path, 'utf8');
  const pointers = declaredPointers(register.idPattern, source);
  const drifted = [];
  for (const p of pointers) {
    const actual = blobOf(p.path);
    if (actual !== p.blob) drifted.push({ ...p, actual });
  }
  return { ...register, pointers, drifted };
}

export function audit() {
  return REGISTERS.map(auditRegister);
}

const invokedDirectly =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly) {
  const results = audit();
  let failed = 0;
  for (const r of results) {
    console.log(
      `${r.path}: ${r.pointers.length} declared pointers, ${r.drifted.length} drifted  (owner ${r.owner})`,
    );
    for (const d of r.drifted) {
      failed += 1;
      console.error(`  ${d.id} ${d.path}\n    declared ${d.blob}\n    actual   ${d.actual ?? '(path absent)'}`);
    }
  }
  if (failed > 0) {
    console.error(
      '\nFAIL: these rows are stated as VERIFIED_POINTER. Re-verify the underlying fact, then ' +
        'update the row and its snapshot boundary. Do not overwrite a hash to make this pass — ' +
        'that is the defect recorded in §0.1 of the third-party rights register. See #114, #116.',
    );
    process.exit(1);
  }
}
