/**
 * `resolveLocale` décide de la langue du rendu SERVEUR. C'est la fonction qui
 * empêche le serveur et le client de diverger — la divergence étant le défaut
 * corrigé : le serveur rendait toujours du français, le client basculait après
 * montage, et le visiteur non francophone voyait l'interface changer de langue.
 *
 * Elle est pure exprès : c'est ce qui permet de la tester sans navigateur, sans
 * serveur et sans Next.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { DEFAULT_LOCALE, resolveLocale } from '../translate';

test('le cookie, choix explicite du visiteur, prime sur tout le reste', () => {
  assert.equal(resolveLocale('en', 'fr-FR,fr;q=0.9'), 'en');
  assert.equal(resolveLocale('fr', 'en-US,en;q=0.9'), 'fr');
});

test('un cookie invalide est ignoré, pas obéi', () => {
  assert.equal(resolveLocale('de', 'en-US,en;q=0.9'), 'en');
  assert.equal(resolveLocale('', 'en-US'), 'en');
  assert.equal(resolveLocale('../../etc/passwd', 'en-US'), 'en');
});

test("à défaut de cookie, l'en-tête Accept-Language décide", () => {
  assert.equal(resolveLocale(null, 'en-US,en;q=0.9'), 'en');
  assert.equal(resolveLocale(null, 'fr-FR,fr;q=0.9,en;q=0.8'), 'fr');
  assert.equal(resolveLocale(null, 'en'), 'en');
});

test('les facteurs de qualité sont respectés, pas seulement l’ordre d’écriture', () => {
  // Le piège : lire la première langue listée donnerait « fr », alors que le
  // visiteur a déclaré préférer l'anglais.
  assert.equal(resolveLocale(null, 'fr;q=0.2, en;q=0.9'), 'en');
  assert.equal(resolveLocale(null, 'en;q=0.3, fr;q=0.8'), 'fr');
});

test('une langue que nous ne parlons pas retombe sur le défaut', () => {
  assert.equal(resolveLocale(null, 'de-DE,de;q=0.9'), DEFAULT_LOCALE);
  assert.equal(resolveLocale(null, 'ja,ko;q=0.8'), DEFAULT_LOCALE);
});

test('une langue inconnue suivie d’une connue retient la connue', () => {
  assert.equal(resolveLocale(null, 'de-DE,de;q=0.9,en;q=0.7'), 'en');
});

test('« * » ne choisit pas à la place du visiteur', () => {
  // `*` signifie « n'importe laquelle » : ce n'est pas une préférence pour l'anglais.
  assert.equal(resolveLocale(null, '*'), DEFAULT_LOCALE);
  assert.equal(resolveLocale(null, '*;q=0.5, en;q=0.1'), DEFAULT_LOCALE);
});

test('absence totale d’information : le défaut du dépôt', () => {
  assert.equal(resolveLocale(null, null), DEFAULT_LOCALE);
  assert.equal(resolveLocale(undefined, undefined), DEFAULT_LOCALE);
  assert.equal(resolveLocale(null, ''), DEFAULT_LOCALE);
});

test('un en-tête malformé ne fait pas tomber la résolution', () => {
  assert.equal(resolveLocale(null, ';;;'), DEFAULT_LOCALE);
  assert.equal(resolveLocale(null, 'en;q=pasunnombre'), DEFAULT_LOCALE);
  assert.equal(resolveLocale(null, ','.repeat(50)), DEFAULT_LOCALE);
});

test('le nom du cookie est le même des deux côtés', () => {
  // Serveur et client écrivent/lisent ce cookie depuis deux fichiers différents.
  // S'ils divergent, le choix du visiteur cesse silencieusement d'être respecté
  // au rendu suivant — exactement le genre de panne qu'aucun test ne voit venir.
  const serverSrc = readFileSync(join(process.cwd(), 'lib', 'i18n', 'server.ts'), 'utf8');
  const clientSrc = readFileSync(join(process.cwd(), 'lib', 'i18n', 'context.tsx'), 'utf8');

  const serverName = serverSrc.match(/LOCALE_COOKIE\s*=\s*'([^']+)'/)?.[1];
  const clientName = clientSrc.match(/COOKIE_KEY\s*=\s*'([^']+)'/)?.[1];

  assert.ok(serverName, 'nom du cookie introuvable dans lib/i18n/server.ts');
  assert.ok(clientName, 'nom du cookie introuvable dans lib/i18n/context.tsx');
  assert.equal(
    clientName,
    serverName,
    `Le client écrit « ${clientName} », le serveur lit « ${serverName} ».`,
  );
});
