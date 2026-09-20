/**
 * Une réponse Breiz publiée porte les termes de ses sources — gate DATA-LIC-G6
 * de #116, moitié « attribution ».
 *
 * #116 relève que les neuf entrées de `BREIZ_SOURCE_REGISTRY` sont marquées
 * `ATTRIBUTION_REQUIRED` et qu'il manque « attribution » parmi les preuves
 * exigées par item. Le récupérateur citait pourtant `title`, `source_name` et
 * `source_url`, et rien d'autre : la citation ne transportait aucun terme, et
 * le filtre de publication ne regardait pas non plus si une licence existait.
 *
 * Les deux moitiés se tenaient — on ne vérifiait pas la licence, et on ne la
 * publiait pas. Les tests ci-dessous couvrent les deux.
 *
 * Ce contrôle est technique : il constate qu'une licence accompagne l'extrait,
 * jamais qu'elle en autorise l'usage. #116 reste ouverte.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BreizDocument } from '../breizDocument.schema';
import { createBreizMockStore, retrieveBreizLocalKnowledge } from '../breizRetriever';
import { MOCK_BREIZ_DOCUMENTS } from '../mockDocuments';

function document(overrides: Partial<BreizDocument> = {}): BreizDocument {
  return {
    id: 'fixture-lorient',
    title: 'Boucle du port de Lorient',
    source_name: 'Fixture locale',
    source_url: 'https://example.invalid/lorient',
    license: 'Licence Ouverte 2.0',
    territory: 'Bretagne',
    region: 'Bretagne',
    department: 'Morbihan',
    commune: 'Lorient',
    theme: 'local_knowledge',
    tags: ['lorient', 'balade'],
    summary: 'Boucle plate le long du port de Lorient.',
    content: 'Boucle plate le long du port de Lorient, praticable toute l’année, sans dénivelé notable.',
    reliability_level: 'source_verified',
    last_checked_at: '2026-09-20',
    allowed_usage: 'public_answer_with_source',
    ...overrides,
  };
}

const QUERY = 'boucle port Lorient';

test('chaque source publiée porte une licence non vide', () => {
  const store = createBreizMockStore([document()]);
  const answer = retrieveBreizLocalKnowledge(QUERY, store);

  assert.equal(answer.status, 'answered_from_sources');
  assert.ok(answer.source_refs.length > 0);
  for (const ref of answer.source_refs) {
    assert.ok(ref.license.trim().length > 0, `source sans licence : ${ref.source_name}`);
  }
});

test('la licence publiée est celle du document, pas une valeur par défaut', () => {
  const store = createBreizMockStore([document({ license: 'ODbL-1.0' })]);
  const answer = retrieveBreizLocalKnowledge(QUERY, store);
  assert.deepEqual(answer.source_refs.map((ref) => ref.license), ['ODbL-1.0']);
});

test('extrait publiable mais sans licence → non publié, et abstention assumée', () => {
  // `allowed_usage` disait « publiable avec source ». Sans licence, il n'y a
  // pas de source complète à publier : on s'abstient plutôt que de citer une
  // référence dont les termes manquent.
  const store = createBreizMockStore([document({ license: '' })]);
  const answer = retrieveBreizLocalKnowledge(QUERY, store);

  assert.equal(answer.status, 'not_enough_information');
  assert.deepEqual(answer.chunks, []);
  assert.deepEqual(answer.source_refs, []);
});

test('une licence faite d’espaces ne vaut pas licence', () => {
  const store = createBreizMockStore([document({ license: '   ' })]);
  assert.equal(retrieveBreizLocalKnowledge(QUERY, store).status, 'not_enough_information');
});

test('un extrait sans licence ne fait pas tomber les autres', () => {
  const store = createBreizMockStore([
    document({ id: 'sans-licence', license: '' }),
    document({ id: 'avec-licence', license: 'CC-BY-4.0' }),
  ]);
  const answer = retrieveBreizLocalKnowledge(QUERY, store);

  assert.equal(answer.status, 'answered_from_sources');
  assert.ok(answer.source_refs.every((ref) => ref.license === 'CC-BY-4.0'));
});

test('le filtre `internal_reference` d’origine reste en place', () => {
  // Régression : ajouter la condition de licence ne doit pas relâcher la
  // condition d'usage qui existait déjà.
  const store = createBreizMockStore([
    document({ allowed_usage: 'internal_reference', license: 'CC-BY-4.0' }),
  ]);
  assert.equal(retrieveBreizLocalKnowledge(QUERY, store).status, 'not_enough_information');
});

test('le corpus de démonstration porte lui aussi ses licences', () => {
  // Les documents mock contournent `ingestBreizDocuments`, donc
  // `validateBreizDocument` ne les voit jamais. Ils sont honnêtement étiquetés
  // (« EMOPET local mock »), mais rien ne le garantissait mécaniquement.
  for (const mock of MOCK_BREIZ_DOCUMENTS) {
    assert.ok(mock.license.trim().length > 0, `document mock sans licence : ${mock.id}`);
  }
});
