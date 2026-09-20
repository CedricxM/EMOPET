/**
 * Gamification serveur — une source indisponible n'est pas « zéro activité ».
 *
 * Le module promettait déjà un fallback localStorage via computeCounters(), mais
 * getJSON() transformait les erreurs HTTP/réseau en objets vides. Le fallback
 * n'était donc jamais déclenché et la progression pouvait baisser artificiellement.
 */

import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { computeCounters, fetchServerCounters } from '../gamification';

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

function installBrowserState(): void {
  const data = new Map<string, string>([
    ['breiz-map-user-spots', JSON.stringify([{ id: 'local-spot-1' }])],
    ['breiz-journal-user-entries', JSON.stringify([
      { id: 'local-walk', type: 'walk_recorded' },
      { id: 'local-note', type: 'observation' },
    ])],
  ]);

  const storage: Storage = {
    get length() { return data.size; },
    clear() { data.clear(); },
    getItem(key: string) { return data.get(key) ?? null; },
    key(index: number) { return Array.from(data.keys())[index] ?? null; },
    removeItem(key: string) { data.delete(key); },
    setItem(key: string, value: string) { data.set(key, String(value)); },
  };

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: globalThis,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage,
  });
}

function okResponseFor(input: RequestInfo | URL): Response {
  const url = String(input);
  if (url.includes('/api/map/spots')) {
    return new Response(JSON.stringify({ spots: [] }), { status: 200 });
  }
  if (url.includes('/api/journal')) {
    return new Response(JSON.stringify({ entries: [] }), { status: 200 });
  }
  if (url.includes('/api/community/events')) {
    return new Response(JSON.stringify({ events: [] }), { status: 200 });
  }
  return new Response(JSON.stringify({}), { status: 404 });
}

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');

  if (originalLocalStorage) Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

test('un HTTP serveur en échec déclenche le fallback local documenté', async () => {
  installBrowserState();
  const local = computeCounters();

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes('/api/map/spots')) {
      return new Response(JSON.stringify({ error: 'unavailable' }), { status: 503 });
    }
    return okResponseFor(input);
  }) as typeof fetch;

  const result = await fetchServerCounters();
  assert.deepEqual(result, local);
  assert.equal(result.mapPointsAdded, 3);
  assert.equal(result.journalEntries, 10);
  assert.equal(result.walks, 97);
});

test('une erreur réseau déclenche le même fallback local', async () => {
  installBrowserState();
  const local = computeCounters();

  globalThis.fetch = (async () => {
    throw new TypeError('network down');
  }) as typeof fetch;

  assert.deepEqual(await fetchServerCounters(), local);
});

test('trois réponses serveur réellement vides restent des succès vides', async () => {
  installBrowserState();
  const local = computeCounters();

  globalThis.fetch = (async (input: RequestInfo | URL) => okResponseFor(input)) as typeof fetch;

  const result = await fetchServerCounters();

  // Les données locales ne doivent être utilisées que comme fallback, pas
  // fusionnées quand le serveur a répondu avec succès.
  assert.equal(local.mapPointsAdded, 3);
  assert.equal(local.journalEntries, 10);
  assert.equal(local.walks, 97);
  assert.equal(result.mapPointsAdded, 2);
  assert.equal(result.journalEntries, 8);
  assert.equal(result.walks, 96);
});

test('un payload serveur non JSON déclenche le fallback au lieu de zéro', async () => {
  installBrowserState();
  const local = computeCounters();

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes('/api/journal')) {
      return new Response('not-json', { status: 200 });
    }
    return okResponseFor(input);
  }) as typeof fetch;

  assert.deepEqual(await fetchServerCounters(), local);
});
