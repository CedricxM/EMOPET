/**
 * Barre verte EMOPET — exécute en séquence les vérifications exigées après chaque
 * étape (protocole standards) et s'arrête à la PREMIÈRE qui échoue.
 *
 *   node scripts/verify.mjs              # complet : typecheck → lint → test → vocab → build
 *   node scripts/verify.mjs --no-build   # boucle rapide (sans build)
 *
 * Chaque étape délègue au script npm correspondant : la définition des commandes
 * reste DANS package.json (source unique), cet orchestrateur ne fait que séquencer.
 */
import { spawnSync } from 'node:child_process';

const skipBuild = process.argv.includes('--no-build');

/** [scriptNpm, libellé] dans l'ordre du protocole. */
const STAGES = [
  ['typecheck', 'tsc --noEmit'],
  ['lint', 'eslint'],
  ['test', 'tests unitaires'],
  ['vocab', 'garde-fou vocabulaire'],
  ...(skipBuild ? [] : [['build', 'next build']]),
];

const results = [];
let failed = null;

for (const [script, label] of STAGES) {
  process.stdout.write(`\n▸ ${script} — ${label}\n`);
  const started = Date.now();
  const res = spawnSync(`pnpm run ${script}`, { stdio: 'inherit', shell: true });
  results.push({ script, ok: res.status === 0, ms: Date.now() - started });
  if (res.status !== 0) { failed = script; break; }
}

process.stdout.write('\n── Récapitulatif ────────────\n');
for (const r of results) {
  process.stdout.write(`  ${r.ok ? '✓' : '✗'} ${r.script.padEnd(10)} ${(r.ms / 1000).toFixed(1)}s\n`);
}

if (failed) {
  process.stdout.write(`\n✗ Barre rouge : « ${failed} » a échoué.\n`);
  process.exit(1);
}
process.stdout.write(`\n✓ Barre verte : ${results.length} étapes OK.\n`);
