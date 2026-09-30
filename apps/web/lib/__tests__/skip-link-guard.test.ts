/**
 * Garde : le lien d'évitement du shell applicatif doit rester fonctionnel.
 *
 * CE QUE CE TEST NE FAIT PAS. Il ne mesure aucun parcours clavier. La preuve
 * est dans la PR : sur les huit routes, une tabulation atteint le lien et
 * `Entrée` place le focus dans `<main>` — mesuré en vrais événements clavier.
 *
 * CE QUE CE TEST FAIT. Il verrouille les trois pièces qui doivent rester
 * cohérentes entre elles, parce qu'elles se cassent séparément et en silence :
 *
 *   1. le lien existe et pointe vers un fragment ;
 *   2. `<main>` porte l'identifiant visé — une ancre vers une cible absente ne
 *      déplace rien, et rien ne le signale ;
 *   3. `<main>` reste focalisable (`tabIndex={-1}`) — sans cela le navigateur
 *      déplace l'ancre visible mais PAS le focus clavier, et le lien devient
 *      un décor : il a l'air de marcher, il ne marche pas.
 *
 * Le point 3 est la raison d'être de ce fichier. C'est l'erreur classique, et
 * elle ne se voit ni dans un diff ni à l'œil.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const APP_FRAME = join(process.cwd(), 'components', 'app-frame.tsx');

function source(): string {
  // Les commentaires expliquent la règle ; ils ne doivent pas la satisfaire.
  return readFileSync(APP_FRAME, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

test("le shell applicatif porte un lien d'évitement vers une cible réelle", () => {
  const src = source();

  const link = src.match(/href=["']#([A-Za-z0-9_-]+)["']/);
  assert.ok(
    link,
    "Aucun lien d'évitement dans components/app-frame.tsx. Sans lui, atteindre le " +
      'contenu demande de tabuler toute la sidebar à chaque page — 9 tabulations, mesurées.',
  );

  const targetId = link![1];
  const mainTag = src.match(/<main[\s\S]*?>/);
  assert.ok(mainTag, 'Aucun <main> dans le shell applicatif.');

  assert.ok(
    new RegExp(`id=["']${targetId}["']`).test(mainTag![0]),
    `Le lien pointe vers #${targetId}, mais <main> ne porte pas cet identifiant. ` +
      'Une ancre vers une cible absente ne déplace rien, et rien ne le signale.',
  );
});

test('la cible du lien reste focalisable', () => {
  const src = source();
  const mainTag = src.match(/<main[\s\S]*?>/);
  assert.ok(mainTag, 'Aucun <main> dans le shell applicatif.');

  assert.match(
    mainTag![0],
    /tabIndex=\{-1\}/,
    "<main> a perdu tabIndex={-1}. Sans lui, activer le lien déplace l'ancre mais " +
      'pas le focus clavier : le lien paraît fonctionner et ne fonctionne pas.',
  );
});

test("la landing n'imbrique pas une seconde région principale", () => {
  const src = source();
  const mains = src.match(/<main[\s>]/g) ?? [];
  assert.equal(
    mains.length,
    1,
    `${mains.length} <main> dans le shell. La page d'accueil rend déjà le sien : ` +
      'deux régions principales imbriquées avaient été mesurées sur « / ».',
  );
});
