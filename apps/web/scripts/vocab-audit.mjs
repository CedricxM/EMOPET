/**
 * Audit de vocabulaire interdit (invariants EMOPET).
 * Scanne le code source UI (app / components / lib) pour les termes proscrits :
 * score de bonheur / état émotionnel du chien, claims médicaux, classements.
 *
 * Usage : node scripts/vocab-audit.mjs   (exit 1 si violation)
 *
 * La liste des termes vit dans ./forbidden-vocab.mjs (source unique, partagée avec
 * le test lib/__tests__/vocab-audit.test.ts). Les fichiers de tests — qui contiennent
 * volontairement des listes d'invariants — sont exclus du scan.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { scanText } from './forbidden-vocab.mjs';

const ROOT = join(import.meta.dirname, '..');
const SCAN_DIRS = ['app', 'components', 'lib'];
const EXTS = new Set(['.ts', '.tsx', '.css']);
const EXCLUDE_FILE = /(__tests__|\.test\.|vocab-audit\.mjs|forbidden-vocab\.mjs)/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (EXTS.has(extname(p)) && !EXCLUDE_FILE.test(p)) out.push(p);
  }
  return out;
}

let violations = 0;
for (const dir of SCAN_DIRS) {
  const full = join(ROOT, dir);
  try { statSync(full); } catch { continue; }
  for (const file of walk(full)) {
    const text = readFileSync(file, 'utf8');
    for (const term of scanText(text)) {
      console.error(`✗ "${term}" trouvé dans ${file.replace(ROOT, '.')}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} violation(s) de vocabulaire interdit.`);
  process.exit(1);
}
console.log('✓ Audit vocabulaire : aucun terme interdit.');
