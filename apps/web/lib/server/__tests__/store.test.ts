/**
 * Store serveur — « illisible » n'est pas « vide ».
 *
 * Le `catch { return [] }` d'origine ne mentait pas seulement en lecture. Comme
 * `insert`, `remove`, `removeWhere` et `update` repartent tous de `readAll()`,
 * une lecture en échec devenait une base vide, et l'écriture suivante réécrivait
 * le fichier depuis cette base : les données encore présentes sur le disque
 * étaient détruites par une opération ordinaire.
 *
 * Le premier test ci-dessous est la reproduction exacte de cette perte.
 */

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import path from 'node:path';
import test, { after } from 'node:test';

import { StoreUnreadableError, collection } from '../store';

interface Row { id: string; text: string }

/**
 * Le store calcule `DATA_DIR` À L'IMPORT (`join(process.cwd(), '.data')`), pas à
 * chaque appel : déplacer le répertoire de travail après coup n'aurait aucun
 * effet et les tests passeraient à vide. On travaille donc dans le répertoire
 * que le module utilise réellement, avec des collections dédiées et préfixées.
 *
 * `.data/` est gitignoré ; chaque fichier créé ici est supprimé à la fin.
 */
const DATA_DIR = path.join(process.cwd(), '.data');
const PREFIX = '__store-test-';
const created: string[] = [];

function fixture(name: string): string {
  const full = `${PREFIX}${name}`;
  const file = path.join(DATA_DIR, `${full}.json`);
  created.push(file);
  mkdirSync(DATA_DIR, { recursive: true });
  return full;
}

/** Chemin du fichier tel que le store le résout, pour vérifier l'état du disque. */
function fileOf(name: string): string {
  return path.join(DATA_DIR, `${name}.json`);
}

after(() => {
  for (const file of created) rmSync(file, { force: true });
});

const REAL_ROWS: Row[] = [
  { id: 'a', text: 'entrée réelle 1' },
  { id: 'b', text: 'entrée réelle 2' },
  { id: 'c', text: 'entrée réelle 3' },
];

/* ------------------------------------------------------------------ */
/* 1. La perte de données que le silence rendait possible              */
/* ------------------------------------------------------------------ */

test('une écriture après lecture en échec ne détruit pas le fichier', () => {
  const name = fixture('journal-insert');
  const file = fileOf(name);
  writeFileSync(file, JSON.stringify(REAL_ROWS, null, 2), 'utf8');

  // Corruption partielle : JSON tronqué, les données restent sur le disque.
  writeFileSync(file, '[{"id":"a","text":"entrée réelle 1', 'utf8');

  const entries = collection<Row>(name);
  assert.throws(() => entries.insert({ id: 'd', text: 'nouvelle entrée' }), StoreUnreadableError);

  // Le point de tout l'exercice : le fichier corrompu est intact, donc récupérable.
  // Avant le correctif il contenait ici la seule entrée « d ».
  const onDisk = readFileSync(file, 'utf8');
  assert.match(onDisk, /entrée réelle 1/);
  assert.doesNotMatch(onDisk, /nouvelle entrée/);
});

test('une suppression après lecture en échec ne vide pas le fichier', () => {
  // Même mécanique destructrice que ci-dessus, par le chemin d'effacement :
  // avant le correctif, `readAll()` renvoyait `[]`, `.filter` gardait `[]`, et
  // `writeAll([])` remplaçait les entrées réelles par un tableau vide.
  const name = fixture('journal-remove');
  const file = fileOf(name);
  writeFileSync(file, '[{"id":"a","text":"entrée réelle 1', 'utf8');

  const entries = collection<Row>(name);
  assert.throws(() => entries.removeWhere((row) => row.id === 'a'), StoreUnreadableError);

  const onDisk = readFileSync(file, 'utf8');
  assert.match(onDisk, /entrée réelle 1/);
  assert.notEqual(onDisk.trim(), '[]', 'le fichier a été écrasé par un tableau vide');
});

/* ------------------------------------------------------------------ */
/* 2. Les deux états restent distincts                                 */
/* ------------------------------------------------------------------ */

test('fichier absent = collection légitimement vide, sans erreur', () => {
  const name = fixture('jamais-ecrite');
  assert.ok(!existsSync(fileOf(name)), 'le fixture doit être absent pour que le cas ait un sens');
  // C'est le seul vide autorisé : il doit rester silencieux, sinon le correctif
  // transformerait un premier démarrage normal en panne.
  assert.deepEqual(collection<Row>(name).list(), []);
});

test('tableau vide sur disque = collection vide, sans erreur', () => {
  const name = fixture('vide');
  writeFileSync(fileOf(name), '[]', 'utf8');
  assert.deepEqual(collection<Row>(name).list(), []);
});

test('JSON invalide = état inconnu, jamais une liste vide', () => {
  const name = fixture('corrompue');
  writeFileSync(fileOf(name), '[{"id":', 'utf8');
  const rows = collection<Row>(name);
  assert.throws(() => rows.list(), (error: unknown) => {
    assert.ok(error instanceof StoreUnreadableError);
    assert.equal(error.collectionName, name);
    assert.match(error.message, /pas vide/);
    return true;
  });
});

test('contenu non tableau = état inconnu', () => {
  const name = fixture('objet');
  writeFileSync(fileOf(name), '{"id":"a"}', 'utf8');
  assert.throws(() => collection<Row>(name).list(), StoreUnreadableError);
});

test('fichier illisible (permissions) = état inconnu', (t) => {
  if (process.getuid?.() === 0) {
    t.skip('root outrepasse les permissions de fichier');
    return;
  }
  const name = fixture('interdite');
  const file = fileOf(name);
  writeFileSync(file, JSON.stringify(REAL_ROWS), 'utf8');
  chmodSync(file, 0o000);
  try {
    assert.throws(() => collection<Row>(name).list(), StoreUnreadableError);
  } finally {
    chmodSync(file, 0o600);
  }
});

/* ------------------------------------------------------------------ */
/* 3. Le chemin nominal n'a pas bougé                                  */
/* ------------------------------------------------------------------ */

test('lecture, insertion, mise à jour et suppression nominales inchangées', () => {
  const rows = collection<Row>(fixture('nominal'));
  rows.insert({ id: 'a', text: 'un' });
  rows.insert({ id: 'b', text: 'deux' });
  assert.deepEqual(rows.list().map((r) => r.id), ['b', 'a']);

  assert.equal(rows.update('a', { text: 'un bis' })?.text, 'un bis');
  assert.equal(rows.update('inexistant', { text: 'x' }), null);

  rows.remove('b');
  assert.deepEqual(rows.list().map((r) => r.id), ['a']);
});
