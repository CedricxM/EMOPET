/**
 * L'ossature applicative se replie sur téléphone.
 *
 * Ce que ce test peut faire, et ce qu'il ne peut pas : il ne mesure aucune
 * mise en page. La preuve du correctif est une mesure au navigateur —
 * `document.documentElement.scrollWidth` à 390 px sur les huit routes — et elle
 * vit dans la PR, pas ici. Le harnais de tests web ne rend rien.
 *
 * Ce qu'il verrouille est le MÉCANISME, c'est-à-dire ce qui peut disparaître
 * d'un coup de refactor sans que personne ouvre un téléphone :
 *
 *   1. l'ossature passe par le module CSS et non par un `display: flex` inline,
 *      parce qu'un style inline ne peut pas porter de media query — c'était la
 *      cause d'origine : la sidebar occupait ses 244 px à TOUTES les largeurs,
 *      laissant 146 px au contenu sur un écran de 390 px ;
 *   2. le module déclare bien une bascule sous 640 px.
 *
 * Si l'un des deux saute, le débordement revient sur les huit routes en même
 * temps, et silencieusement.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('../../', import.meta.url));
const read = (...p: string[]) => readFileSync(path.join(webRoot, ...p), 'utf8');

const shellCss = read('components', 'app-shell.module.css');
const frame = read('components', 'app-frame.tsx');
const sidebar = read('components', 'sidebar.tsx');

test('l’ossature et la sidebar passent par le module CSS', () => {
  // Un style inline ne peut pas porter de media query : revenir à `style={{
  // display: 'flex' }}` ici, c'est rendre le repli impossible.
  assert.match(frame, /className=\{styles\.shell\}/, 'l’ossature n’utilise plus styles.shell');
  assert.match(frame, /className=\{styles\.main\}/, 'la colonne de contenu n’utilise plus styles.main');
  assert.match(sidebar, /className=\{styles\.sidebar\}/, 'la sidebar n’utilise plus styles.sidebar');
  assert.match(sidebar, /className=\{styles\.nav\}/, 'la navigation n’utilise plus styles.nav');
});

test('l’ossature ne redéclare pas sa disposition en inline', () => {
  // `display: 'flex'` réintroduit sur le conteneur d'ossature écraserait le
  // repli du module, sans qu'aucun test de classe ne le voie.
  const shellBlock = frame.slice(frame.indexOf('className={styles.shell}'));
  assert.ok(
    !/style=\{\{[^}]*display:\s*'flex'/.test(shellBlock.slice(0, 400)),
    'l’ossature redéclare display: flex en style inline',
  );
});

test('le module déclare une bascule téléphone', () => {
  const mobile = /@media\s*\(max-width:\s*640px\)\s*\{([\s\S]*)\}/.exec(shellCss);
  assert.ok(mobile, 'aucun bloc @media (max-width: 640px) dans app-shell.module.css');

  const body = mobile[1] ?? '';
  assert.match(body, /\.shell\s*\{[^}]*flex-direction:\s*column/,
    'l’ossature ne repasse pas en colonne sur téléphone');
  assert.match(body, /\.sidebar\s*\{[^}]*width:\s*100%/,
    'la sidebar ne reprend pas toute la largeur sur téléphone');
  assert.match(body, /\.nav\s*\{[^}]*overflow-x:\s*auto/,
    'la navigation ne défile plus horizontalement sur téléphone');
});

test('la sidebar garde sa largeur fixe au-dessus du seuil', () => {
  // Le correctif ne doit pas se payer par la perte de la colonne desktop :
  // le rendu à 1280 px a été vérifié identique au pixel près.
  const base = shellCss.slice(0, shellCss.indexOf('@media'));
  assert.match(base, /\.sidebar\s*\{[^}]*width:\s*var\(--sidebar-w\)/,
    'la sidebar desktop ne fait plus --sidebar-w');
});
