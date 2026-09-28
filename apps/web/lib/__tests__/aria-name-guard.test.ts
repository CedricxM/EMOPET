/**
 * Garde : les rôles ARIA qui ne peuvent pas tirer leur nom de leur contenu
 * doivent le recevoir explicitement.
 *
 * POURQUOI CELLE-CI EXISTE. Une sonde précédente, qui ne regardait que les
 * éléments FOCALISABLES, avait rapporté « 0 contrôle sans nom accessible » sur
 * les huit routes. C'était vrai et incomplet : `role="meter"` n'est pas
 * focalisable, il lui échappait entièrement. Deux barres de couverture
 * s'annonçaient « 86 », sans dire de quoi.
 *
 * CE QUE CE TEST NE FAIT PAS. Il ne parcourt aucune page. La preuve est dans la
 * PR : 3 rôles sans nom → 0, mesuré au navigateur, sonde vérifiée en négatif.
 *
 * CE QUE CE TEST FAIT. Il verrouille la source du problème : la primitive
 * `Meter` doit continuer d'EXIGER un nom, au niveau du type. Un `label`
 * optionnel serait retombé dans le même trou au premier nouvel appel, sans que
 * rien ne rougisse.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const METER = join(process.cwd(), 'components', 'ui', 'meter.tsx');

function source(path: string): string {
  return readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
}

test('Meter exige un nom accessible, et ne le rend pas optionnel', () => {
  const src = source(METER);

  const props = src.match(/interface MeterProps \{([\s\S]*?)\n\}/);
  assert.ok(props, 'MeterProps introuvable');

  assert.match(
    props[1]!,
    /\blabel\s*:\s*string/,
    "`label` doit être requis dans MeterProps. Optionnel (`label?`), il serait " +
      'oublié au prochain appel et la barre redeviendrait muette.',
  );

  assert.doesNotMatch(
    props[1]!,
    /\blabel\?\s*:/,
    '`label` est devenu optionnel : la garde existe précisément contre ça.',
  );
});

test('Meter pose bien ce nom sur l’élément', () => {
  const src = source(METER);
  assert.match(
    src,
    /aria-label=\{label\}/,
    "Le nom n'est plus transmis à l'élément : `role=\"meter\"` n'a pas d'autre " +
      'source de nom que cet attribut.',
  );
  assert.match(src, /role="meter"/, 'Le rôle a disparu — à vérifier avant de toucher à cette garde.');
});
