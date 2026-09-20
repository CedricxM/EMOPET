import assert from 'node:assert/strict';
import test from 'node:test';

import { persistUserSpotFallback } from '../local-map-persistence';
import type { CommunitySpot } from '../../components/bretagne-map/spots';

function spot(id: string): CommunitySpot {
  return {
    id,
    category: 'parc',
    name: 'Spot test',
    description: 'Test',
    lon: -3.37,
    lat: 47.74,
    isAnonymous: true,
    visitCount: 0,
    averageRating: null,
    comments: [],
    createdAt: '2026-09-19T20:00:00.000Z',
  };
}

test('crée un nouveau fallback local quand aucun payload n’existe', () => {
  let stored: string | null = null;
  const storage = {
    getItem: () => null,
    setItem: (_key: string, value: string) => { stored = value; },
  };

  const result = persistUserSpotFallback(storage, 'spots', spot('user-1'));
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(JSON.parse(stored!), [spot('user-1')]);
});

test('ajoute sans écraser les spots utilisateur déjà persistés', () => {
  let stored = JSON.stringify([spot('user-old')]);
  const storage = {
    getItem: () => stored,
    setItem: (_key: string, value: string) => { stored = value; },
  };

  const result = persistUserSpotFallback(storage, 'spots', spot('user-new'));
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(
    (JSON.parse(stored) as CommunitySpot[]).map((item) => item.id),
    ['user-old', 'user-new'],
  );
});

test('un payload corrompu est préservé et jamais remplacé', () => {
  const corrupted = '[{"id":"user-old"';
  let stored = corrupted;
  let writes = 0;
  const storage = {
    getItem: () => stored,
    setItem: (_key: string, value: string) => { writes += 1; stored = value; },
  };

  const result = persistUserSpotFallback(storage, 'spots', spot('user-new'));
  assert.deepEqual(result, { ok: false, reason: 'existing_payload_unreadable' });
  assert.equal(writes, 0);
  assert.equal(stored, corrupted);
});

test('un payload JSON non tableau est refusé sans réécriture', () => {
  const original = JSON.stringify({ id: 'unexpected' });
  let stored = original;
  let writes = 0;
  const storage = {
    getItem: () => stored,
    setItem: (_key: string, value: string) => { writes += 1; stored = value; },
  };

  const result = persistUserSpotFallback(storage, 'spots', spot('user-new'));
  assert.deepEqual(result, { ok: false, reason: 'existing_payload_unreadable' });
  assert.equal(writes, 0);
  assert.equal(stored, original);
});

test('une écriture localStorage refusée reste un échec de persistance', () => {
  const storage = {
    getItem: () => null,
    setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); },
  };

  const result = persistUserSpotFallback(storage, 'spots', spot('user-new'));
  assert.deepEqual(result, { ok: false, reason: 'storage_unavailable' });
});

test('refuse de persister un identifiant qui n’appartient pas au fallback local', () => {
  let writes = 0;
  const storage = {
    getItem: () => null,
    setItem: () => { writes += 1; },
  };

  const result = persistUserSpotFallback(storage, 'spots', spot('srv-1'));
  assert.deepEqual(result, { ok: false, reason: 'existing_payload_unreadable' });
  assert.equal(writes, 0);
});
