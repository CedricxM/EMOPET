/**
 * Garde : le filet global `prefers-reduced-motion` doit rester en place.
 *
 * CE QUE CE TEST NE FAIT PAS. Il ne mesure aucun mouvement. La preuve que le
 * filet fonctionne est une mesure au navigateur, consignée dans la PR : sous
 * `prefers-reduced-motion: reduce`, 50 éléments encore animés sur les huit
 * routes avant, 0 après ; et en `no-preference`, les comptes sont inchangés,
 * ce qui établit que le rendu par défaut n'a pas bougé.
 *
 * CE QUE CE TEST FAIT. Il verrouille le mécanisme, parce qu'un bloc CSS global
 * se supprime en une ligne, dans un diff qui n'a l'air de rien, et que la
 * régression est invisible pour quiconque n'a pas activé la préférence dans son
 * système — donc pour à peu près tout le monde en relecture.
 *
 * Écrit en négatif : on n'exige pas une forme exacte. Un composant reste libre
 * de traiter la préférence à sa façon, et le filet peut être réécrit. Ce qui
 * est refusé, c'est qu'il ne reste plus rien qui neutralise durée d'animation
 * ET durée de transition au niveau global.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const GLOBALS = join(process.cwd(), 'styles', 'globals.css');

/** Les commentaires documentent souvent la règle ; ils ne doivent pas la prouver. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Extrait le corps des blocs `@media (prefers-reduced-motion: reduce)`. */
function reduceBlocks(css: string): string[] {
  const blocks: string[] = [];
  const opener = /@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/g;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(css)) !== null) {
    let depth = 1;
    let i = opener.lastIndex;
    const start = i;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') depth -= 1;
      i += 1;
    }
    blocks.push(css.slice(start, i - 1));
    opener.lastIndex = i;
  }
  return blocks;
}

test('globals.css porte un filet global prefers-reduced-motion', () => {
  const css = stripComments(readFileSync(GLOBALS, 'utf8'));
  const blocks = reduceBlocks(css);

  assert.ok(
    blocks.length > 0,
    'Aucun bloc @media (prefers-reduced-motion: reduce) dans styles/globals.css. ' +
      "Sans filet global, la préférence n'est traitée que par les composants qui y " +
      'pensent — et /profil, mesuré, ne la traitait pas du tout.',
  );

  const body = blocks.join('\n');

  assert.match(
    body,
    /animation-duration\s*:/,
    "Le bloc reduce ne neutralise plus la durée d'animation.",
  );
  assert.match(
    body,
    /transition-duration\s*:/,
    'Le bloc reduce ne neutralise plus la durée de transition. ' +
      "Les défauts mesurés sur /profil et /world étaient des transitions, pas des " +
      'animations : les deux doivent être couvertes.',
  );

  // Le sélecteur doit être global. Un filet qui ne viserait que quelques classes
  // laisserait repasser exactement ce que la mesure a trouvé : du CSS tiers
  // (l'interrupteur HeroUI de /profil) que nous ne contrôlons pas.
  assert.match(
    body,
    /(^|[\s,{])\*/m,
    "Le bloc reduce ne s'applique plus universellement. Le mouvement mesuré venait " +
      'en partie de CSS tiers, hors de nos modules.',
  );
});

test('les durées neutralisées ne sont pas nulles', () => {
  const css = stripComments(readFileSync(GLOBALS, 'utf8'));
  const body = reduceBlocks(css).join('\n');

  const durations = [...body.matchAll(/(?:animation|transition)-duration\s*:\s*([^;!]+)/g)]
    .map((m) => m[1]?.trim())
    .filter((value): value is string => value !== undefined);

  assert.ok(durations.length >= 2, 'Durées introuvables dans le bloc reduce.');

  for (const value of durations) {
    assert.ok(
      !/^0(s|ms)?$/.test(value),
      `Durée « ${value} » : une durée strictement nulle peut empêcher ` +
        "l'émission de transitionend/animationend, dont dépendent des composants " +
        'pour enchaîner leur état. Utiliser une durée quasi nulle (0.01ms).',
    );
  }
});
