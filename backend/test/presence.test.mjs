import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildPresenceSegments,
  computePresenceComparison,
  PresenceComparisonDataUnavailableError,
  readPresenceComparisonSource,
} from '../dist/api/services/presence.js';
import { parseLookbackWindow } from '../dist/api/utils/temporal-window.js';

test('buildPresenceSegments aggregates phone events into present/absence spans', () => {
  const segments = buildPresenceSegments([
    { phoneSeen: true, timestamp: '2026-03-30T08:00:00.000Z' },
    { phoneSeen: false, timestamp: '2026-03-30T10:00:00.000Z' },
    { phoneSeen: true, timestamp: '2026-03-30T12:30:00.000Z' },
  ]);

  assert.equal(segments.length, 2);
  assert.equal(segments[0].state, 'present');
  assert.equal(segments[0].durationMinutes, 120);
  assert.equal(segments[1].state, 'absence');
  assert.equal(segments[1].durationMinutes, 150);
});

test('computePresenceComparison rejects output when coverage is still too thin', () => {
  const comparison = computePresenceComparison(
    [
      { timestamp: '2026-03-30T08:30:00.000Z', vocalEvents: 1, agitationEvents: 1, matPresenceMinutes: 22 },
      { timestamp: '2026-03-30T10:30:00.000Z', vocalEvents: 4, agitationEvents: 3, matPresenceMinutes: 10 },
    ],
    [
      { phoneSeen: true, timestamp: '2026-03-30T08:00:00.000Z' },
      { phoneSeen: false, timestamp: '2026-03-30T10:00:00.000Z' },
      { phoneSeen: true, timestamp: '2026-03-30T12:00:00.000Z' },
    ],
  );

  assert.equal(comparison.gate, 'REJECT');
  assert.equal(comparison.present_vocal_events_per_hour, 1);
  assert.equal(comparison.absent_vocal_events_per_hour, 4);
});


test('computePresenceComparison fails closed when no real evidence exists', () => {
  const comparison = computePresenceComparison([], []);

  assert.equal(comparison.gate, 'REJECT');
  assert.equal(comparison.confidence, 0);
  assert.equal(comparison.effect_size, 0);
  assert.equal(comparison.valid_presence_hours, 0);
  assert.equal(comparison.valid_absence_hours, 0);
  assert.deepEqual(comparison.segments, []);
});

test('presence lookback parser fails closed without inventing a product maximum', () => {
  const now = new Date('2026-09-18T12:00:00.000Z');

  assert.equal(parseLookbackWindow(undefined, now)?.days, 14);
  assert.equal(parseLookbackWindow('31', now)?.days, 31);
  assert.equal(parseLookbackWindow('365', now)?.days, 365);

  for (const raw of ['0', '-1', '1.5', '1e2', '', 'not-a-number', String(Number.MAX_SAFE_INTEGER + 1)]) {
    assert.equal(parseLookbackWindow(raw, now), null, raw);
  }
});

test('presence source boundary preserves successful empty evidence', async () => {
  const summaries = await readPresenceComparisonSource(async () => []);
  assert.deepEqual(summaries, []);
});

test('presence source boundary classifies thrown reader errors separately', async () => {
  const sourceFailure = new Error('test-only database detail');

  await assert.rejects(
    () => readPresenceComparisonSource(async () => {
      throw sourceFailure;
    }),
    (error) => {
      assert.ok(error instanceof PresenceComparisonDataUnavailableError);
      assert.equal(error.code, 'presence_comparison_data_unavailable');
      assert.equal(error.sourceCause, sourceFailure);
      assert.doesNotMatch(error.message, /database detail/);
      return true;
    },
  );
});

test('absence-comparison route preserves input truth and refuses volatile Presence evidence', () => {
  const routeSource = readFileSync(new URL('../api/routes/dogs.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(routeSource, /buildFallback(?:Summaries|PresenceEvents)/);
  assert.doesNotMatch(routeSource, /fallback-[123]/);
  assert.match(routeSource, /parseLookbackWindow\(c\.req\.query\('days'\)\)/);
  assert.match(routeSource, /ABSENCE_COMPARISON_PERSISTENCE_NOT_READY/);
  assert.match(routeSource, /Cache-Control',\s*'private, no-store'/);
  assert.match(routeSource, /maturity:\s*'NOT_IMPLEMENTED'/);
  assert.match(routeSource, /503/);
  assert.doesNotMatch(routeSource, /readPresenceComparisonSource/);
  assert.doesNotMatch(routeSource, /computePresenceComparison/);
  assert.doesNotMatch(routeSource, /getPresenceEventsForDog/);
});
