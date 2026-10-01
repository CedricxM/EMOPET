import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { loadDatatourismeBretagneEvents } from '../datatourismeLoader';

const keys = [
  'API_DATATOURISME_ENABLED',
  'DATATOURISME_API_KEY',
] as const;

const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('DATAtourisme loader checks source rights before credentials or network I/O', async () => {
  process.env.API_DATATOURISME_ENABLED = 'true';
  process.env.DATATOURISME_API_KEY = 'must-never-be-used';

  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    throw new Error('network must not be reached while source rights are HOLD');
  };

  const result = await loadDatatourismeBretagneEvents({
    nowMs: Date.parse('2026-10-01T12:00:00Z'),
    fetchImpl,
  });

  assert.equal(result.status, 'SOURCE_RIGHTS_HOLD');
  assert.deepEqual(result.events, []);
  assert.equal(result.rejectedCount, 0);
  assert.equal(calls, 0);
  assert.doesNotMatch(result.note, /must-never-be-used/);
});

test('DATAtourisme loader stays rights-blocked even when credentials are absent', async () => {
  delete process.env.API_DATATOURISME_ENABLED;
  delete process.env.DATATOURISME_API_KEY;

  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    throw new Error('network must not be reached');
  };

  const result = await loadDatatourismeBretagneEvents({
    nowMs: Date.parse('2026-10-01T12:00:00Z'),
    fetchImpl,
  });

  assert.equal(result.status, 'SOURCE_RIGHTS_HOLD');
  assert.equal(calls, 0);
});

test('DATAtourisme loader exposes no credential material in HOLD result', async () => {
  process.env.API_DATATOURISME_ENABLED = 'true';
  process.env.DATATOURISME_API_KEY = 'sensitive-test-key';

  const result = await loadDatatourismeBretagneEvents({
    nowMs: Date.parse('2026-10-01T12:00:00Z'),
    fetchImpl: async () => {
      throw new Error('must not run');
    },
  });

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /sensitive-test-key/);
  assert.doesNotMatch(serialized, /X-API-Key/i);
});
