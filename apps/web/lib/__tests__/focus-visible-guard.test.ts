/**
 * Aucune feuille de style ne supprime l'anneau de focus clavier.
 *
 * `styles/globals.css` pose un anneau global :
 *
 *     :focus-visible { outline: 2px solid var(--accent-press); outline-offset: 2px; }
 *
 * `--accent-press` vaut `#814931` (terre cuite 700), mesuré entre 5,57:1 et
 * 6,76:1 contre les surfaces sable de la charte — au-dessus des 3:1 que WCAG 2.2
 * §1.4.11 exige d'un indicateur non textuel.
 *
 * Le défaut que cette garde empêche de revenir : une règle de module qui groupe
 * le survol et le focus clavier, puis neutralise l'anneau —
 *
 *     .x:hover, .x:focus-visible { border-color: …; outline: none; }
 *
 * Deux règles de `components/world/world-builder.module.css` faisaient cela.
 * Mesuré au rendu : 21 boutons de `/world` sur 81 éléments focalisables
 * n'avaient AUCUN indicateur visible au clavier. Ce qui restait était un
 * changement de bordure à 1,50:1 contre la bordure au repos — et sur l'onglet
 * actif, dont la bordure est transparente, rien du tout.
 *
 * La règle est écrite en négatif volontairement : elle n'impose pas QUEL
 * indicateur utiliser. Un composant peut parfaitement remplacer l'anneau par un
 * `box-shadow` ou une bordure franche ; ce qui est interdit, c'est de retirer
 * l'anneau sans rien mettre à la place, parce que c'est invisible en relecture
 * de diff et que seul un test au clavier le révèle.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('../../', import.meta.url));

function cssFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      if (entry === 'node_modules' || entry === '.next') continue;
      const full = path.join(current, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.css')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

/**
 * Les blocs `{…}` dont le sélecteur mentionne `:focus-visible`.
 *
 * Les commentaires sont retirés AVANT le découpage, pour deux raisons : sans
 * cela le sélecteur capturé embarque le commentaire qui le précède, et un
 * commentaire qui cite `outline: none` — comme celui qui documente ce correctif
 * dans `world-builder.module.css` — deviendrait un faux positif.
 */
function focusVisibleBlocks(source: string): { selector: string; body: string }[] {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks: { selector: string; body: string }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(withoutComments)) !== null) {
    const selector = (match[1] ?? '').trim();
    const body = match[2] ?? '';
    if (selector.includes(':focus-visible')) blocks.push({ selector, body });
  }
  return blocks;
}

/** `outline: none` / `outline: 0` / `outline-style: none`, sous toutes leurs formes. */
function suppressesOutline(body: string): boolean {
  return /outline(-style)?\s*:\s*(none|0)\b/i.test(body);
}

const files = [
  ...cssFiles(path.join(webRoot, 'styles')),
  ...cssFiles(path.join(webRoot, 'components')),
  ...cssFiles(path.join(webRoot, 'app')),
];

test('le corpus CSS audité n’est pas vide', () => {
  // Sans cette assertion, un chemin cassé rendrait la garde verte pour rien.
  assert.ok(files.length >= 5, `seulement ${files.length} fichiers CSS trouvés`);
});

test('aucune règle :focus-visible ne supprime l’anneau de focus', () => {
  const offenders: string[] = [];
  for (const file of files) {
    for (const { selector, body } of focusVisibleBlocks(readFileSync(file, 'utf8'))) {
      if (suppressesOutline(body)) {
        offenders.push(`${path.relative(webRoot, file)} — ${selector.replace(/\s+/g, ' ')}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `l’anneau de focus est supprimé sans remplacement :\n  ${offenders.join('\n  ')}`,
  );
});

test('l’anneau global est toujours déclaré', () => {
  // Le retrait des suppressions ne vaut que si l'anneau qu'elles masquaient
  // existe encore.
  const globals = readFileSync(path.join(webRoot, 'styles', 'globals.css'), 'utf8');
  const ring = focusVisibleBlocks(globals).find((b) => b.selector === ':focus-visible');
  assert.ok(ring, 'la règle globale :focus-visible a disparu de globals.css');
  assert.match(ring.body, /outline\s*:\s*2px\s+solid/, 'l’anneau global ne déclare plus d’outline');
});
