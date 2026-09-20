import test from 'node:test';
import assert from 'node:assert/strict';

const { parseExportInterval } = await import('../dist/api/utils/export-interval.js');

test('export interval distinguishes omitted bounds from invalid supplied bounds', () => {
  const unbounded = parseExportInterval(undefined, undefined);
  assert.equal(unbounded.ok, true);
  assert.equal(unbounded.from, null);
  assert.equal(unbounded.to, null);

  assert.deepEqual(parseExportInterval('not-a-date', undefined), {
    ok: false,
    error: 'invalid_from',
  });
  assert.deepEqual(parseExportInterval(undefined, 'not-a-date'), {
    ok: false,
    error: 'invalid_to',
  });
  assert.deepEqual(parseExportInterval('', undefined), {
    ok: false,
    error: 'invalid_from',
  });
});

test('export interval rejects reversed ranges and preserves valid dates', () => {
  assert.deepEqual(
    parseExportInterval('2026-09-20T12:00:00Z', '2026-09-19T12:00:00Z'),
    { ok: false, error: 'invalid_interval' },
  );

  const valid = parseExportInterval('2026-09-01T00:00:00Z', '2026-09-20T00:00:00Z');
  assert.equal(valid.ok, true);
  if (!valid.ok) return;

  assert.equal(valid.from?.toISOString(), '2026-09-01T00:00:00.000Z');
  assert.equal(valid.to?.toISOString(), '2026-09-20T00:00:00.000Z');
});
