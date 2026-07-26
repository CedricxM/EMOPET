/**
 * Test de contrat — ADR-0001 : les variables affectives latentes ne sont jamais exposées.
 *
 * Non destructif : analyse statique des sources plus assertions sur charges utiles.
 * Ne démarre pas de serveur, ne touche pas la base, ne nécessite ni build ni dépendance.
 * Exécuté par `pnpm --filter @emopet/api test` (node --test test/*.test.mjs).
 *
 * Référence : docs/architecture/ADR-0001-variables-affectives-latentes.md
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = join(HERE, '..');
const REPO_ROOT = join(BACKEND_ROOT, '..');

/** Motif interdit dans toute couche d'exposition. Couvre arousal, valence, peak_arousal, peakArousal. */
const FORBIDDEN_PATTERN = /\b[A-Za-z_]*(arousal|valence)[A-Za-z_]*\b/i;

/** Marqueur d'exception documentée, à justifier en revue (voir ADR-0001). */
const EXEMPTION_MARKER = 'ADR-0001-EXEMPT';

/** Couches d'exposition analysées statiquement. */
const EXPOSURE_DIRS = [
  join(BACKEND_ROOT, 'api', 'routes'),
  join(BACKEND_ROOT, 'api', 'services'),
  join(BACKEND_ROOT, 'api', 'middleware'),
];

function listSourceFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx|mjs|js)$/.test(entry) && !/\.test\./.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Recherche récursive de clés interdites dans une charge utile JSON.
 * Réutilisable par tout test futur disposant d'une réponse réelle.
 * @returns {string[]} chemins des clés fautives
 */
export function findForbiddenKeys(payload, path = '$') {
  const found = [];
  if (payload === null || typeof payload !== 'object') return found;

  if (Array.isArray(payload)) {
    payload.forEach((item, i) => found.push(...findForbiddenKeys(item, `${path}[${i}]`)));
    return found;
  }

  for (const [key, value] of Object.entries(payload)) {
    const here = `${path}.${key}`;
    if (FORBIDDEN_PATTERN.test(key)) found.push(here);
    found.push(...findForbiddenKeys(value, here));
  }
  return found;
}

test('ADR-0001 — le détecteur de clés affectives fonctionne (auto-vérification)', () => {
  // Sans ce cas, un détecteur cassé ferait passer le contrat en silence.
  assert.deepEqual(findForbiddenKeys({ dogId: 'x', load: 0.4, band: [0.2, 0.6] }), []);
  assert.deepEqual(findForbiddenKeys({ eli: { arousal: 0.5 } }), ['$.eli.arousal']);
  assert.deepEqual(findForbiddenKeys({ eli: { valence: -0.2 } }), ['$.eli.valence']);
  assert.deepEqual(findForbiddenKeys({ peak_arousal: 1 }), ['$.peak_arousal']);
  assert.deepEqual(findForbiddenKeys({ peakArousal: 1 }), ['$.peakArousal']);
  assert.deepEqual(
    findForbiddenKeys({ summaries: [{ elevated_arousal_episodes_week: 3 }] }),
    ['$.summaries[0].elevated_arousal_episodes_week'],
  );
});

test('ADR-0001 — aucune couche d\'exposition backend ne référence de variable affective', () => {
  const offenders = [];

  for (const dir of EXPOSURE_DIRS) {
    for (const file of listSourceFiles(dir)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!FORBIDDEN_PATTERN.test(line)) return;
        if (line.includes(EXEMPTION_MARKER)) return;
        offenders.push(`${relative(REPO_ROOT, file)}:${i + 1}: ${line.trim()}`);
      });
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'ADR-0001 violé : une variable affective latente (arousal / valence / peak_arousal) apparaît ' +
      'dans une couche d\'exposition backend. Passer par une projection explicite ' +
      '(voir eliToDisplay), ou justifier une exception avec le marqueur ' +
      `${EXEMPTION_MARKER}.\n` + offenders.join('\n'),
  );
});

test('ADR-0001 — la projection d\'affichage ELI ne déclare aucun champ affectif', () => {
  const eliTypes = join(REPO_ROOT, 'packages', 'shared', 'src', 'types', 'eli.ts');
  if (!existsSync(eliTypes)) {
    // Le chemin a bougé : signaler plutôt que valider en silence.
    assert.fail(`Fichier de types ELI introuvable : ${relative(REPO_ROOT, eliTypes)}`);
  }

  const source = readFileSync(eliTypes, 'utf8');
  const block = source.match(/interface ELIDisplay\s*\{([\s\S]*?)\n\}/);
  assert.ok(block, 'Interface ELIDisplay introuvable dans packages/shared/src/types/eli.ts');

  const declaredFields = block[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('*') && !l.startsWith('/'))
    .filter((l) => FORBIDDEN_PATTERN.test(l));

  assert.deepEqual(
    declaredFields,
    [],
    'ADR-0001 violé : ELIDisplay (surface publiée) déclare un champ affectif latent.',
  );
});
