/**
 * Les accents CLAIRS ne portent pas de texte.
 *
 * `tokens.css` documente déjà les ratios en cause, et prescrit la solution :
 *
 *   « L'accent INTERACTIF est la Terre cuite SOMBRE, pas la claire : blanc sur
 *     #A65E3F = 4,89:1 (AA), là où blanc sur #C97B5A = 3,25:1 et granit sur
 *     #C97B5A = 4,48:1 — tous deux insuffisants pour du texte normal. »
 *
 *   « Terre cuite […] sur sable, 500 (2,84:1) et 600 (4,27:1) échouent pour du
 *     texte normal ; utiliser 700 comme texte sur ce fond. »
 *
 *   « Lichen […] même règle : 500 ne porte pas de texte normal (3,20:1). »
 *
 * Le défaut n'était donc pas une ignorance du problème : la couche de tokens
 * l'avait mesuré et écrit. Ce sont les composants qui prenaient la teinte
 * décorative au lieu de l'encre prescrite. Un audit du rendu a retrouvé 2,84,
 * 3,01, 3,20, 3,22, 3,25 — exactement les chiffres du fichier.
 *
 * Cette garde interdit les deux formes, au niveau de la source, parce que le
 * rendu ne les voit pas toutes : la majorité vivait dans des modales et des
 * dialogues qu'aucun chargement de page n'atteint.
 *
 * Ce qu'elle N'interdit PAS : ces mêmes teintes en fond décoratif, en bordure,
 * en pastille ou en remplissage graphique. Là, elles sont à leur place — c'est
 * pour cela qu'elles existent.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Teintes claires : belles en décor, insuffisantes sous du texte.
 *
 * `--orange-pro` (#D4810E) a rejoint la liste après coup. Mesuré au rendu dans
 * la section « Comprendre les indicateurs » — dépliable, donc invisible à un
 * simple chargement de page — il tombait entre 2,35 et 2,85:1 sur les quatre
 * surfaces claires de la charte. Ce qu'il coloriait rend le défaut pire que sa
 * valeur : « Partiel · confiance dégradée », « DÉMO · », « Fenêtre ». L'état
 * qui demande à l'utilisateur de faire MOINS confiance était celui qu'il ne
 * pouvait pas lire.
 *
 * `tokens.css` fournissait déjà l'encre correspondante, `--eli-degraded-ink`
 * (#7A5F1E, 4,68 à 5,69:1). Le texte y est routé ; l'ambre reste où il est
 * décoratif, sans que sa VALEUR change — renommer ou revaloriser un token en
 * lui gardant son nom est le piège que `CLAUDE.md` signale explicitement.
 */
const LIGHT_ACCENTS = ['--terracotta-500', '--lichen-500', '--orange-pro'];

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(tsx?|css)$/.test(full)) out.push(full);
    }
  };
  for (const root of ['app', 'components', 'lib', 'styles']) walk(path.join(webRoot, root));
  return out;
}

/**
 * Exception : usage NON textuel dont le fond n'est pas mesurable depuis la
 * cascade — remplissage d'épingle sur une carte, trait de sparkline.
 *
 * Elle se pose EN LIGNE, avec `// contrast-guard:non-textuel`, et jamais sur un
 * fichier entier. Une première version excluait `lib/eli/catalog.ts` au complet
 * pour épargner une seule ligne ; le fichier porte aussi les couleurs de texte
 * des états de confiance, et la garde ne les voyait donc plus. Une exception
 * doit être aussi étroite que la raison qui la justifie, et vivre à côté du
 * code qu'elle excuse.
 */
const EXEMPT = /contrast-guard:non-textuel/;

const files = sourceFiles();

test('le corpus audité n’est pas vide', () => {
  assert.ok(files.length > 50, `seulement ${files.length} fichiers sources trouvés`);
});

test('aucune teinte décorative n’est utilisée comme couleur de texte', () => {
  const offenders: string[] = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (EXEMPT.test(line)) return;
      for (const accent of LIGHT_ACCENTS) {
        // `color:` seul — ni `background-color:`, ni `border-color:`.
        const re = new RegExp(String.raw`(?<![-\w])color\s*:\s*'?var\(${accent}\)`);
        if (re.test(line)) offenders.push(`${path.relative(webRoot, file)}:${i + 1}  ${accent}`);
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `accent clair employé comme texte — utiliser le palier 600/700 :\n  ${offenders.join('\n  ')}`,
  );
});

test('aucun texte blanc ne repose sur un accent clair', () => {
  const offenders: string[] = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (EXEMPT.test(line)) return;
      const onLight = LIGHT_ACCENTS.some((a) =>
        new RegExp(String.raw`background(-color)?\s*:\s*'?var\(${a}\)`).test(line),
      );
      if (!onLight) return;
      // La couleur du texte peut être sur la même ligne ou sur les suivantes.
      const near = [line, lines[i + 1] ?? '', lines[i + 2] ?? ''].join(' ');
      if (/color\s*:\s*'?(white|#fff|#ffffff)/i.test(near)) {
        offenders.push(`${path.relative(webRoot, file)}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `blanc sur accent clair = 3,25:1 — utiliser var(--accent) :\n  ${offenders.join('\n  ')}`,
  );
});
