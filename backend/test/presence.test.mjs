import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildPresenceSegments,
  computePresenceComparison,
  PresenceComparisonDataUnavailableError,
  readPresenceComparisonSource,
} from '../dist/api/services/presence.js';

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

test('presence source boundary preserves a successful authoritative empty read', async () => {
  const summaries = await readPresenceComparisonSource(async () => []);

  assert.deepEqual(summaries, []);
});

test('presence source boundary classifies a thrown reader without exposing it as no-data', async () => {
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

test('authenticated absence-comparison route cannot reintroduce synthetic or unavailable-as-empty fallbacks', () => {
  const routeSource = readFileSync(new URL('../api/routes/dogs.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(routeSource, /buildFallback(?:Summaries|PresenceEvents)/);
  assert.doesNotMatch(routeSource, /fallback-[123]/);
  assert.doesNotMatch(routeSource, /catch\s*\{\s*summaries\s*=\s*\[\]/);
  assert.match(routeSource, /PresenceComparisonDataUnavailableError/);
  assert.match(routeSource, /error:\\s*error\\.code/);
  assert.match(routeSource, /private, max-age=0, no-store/);
  assert.match(routeSource, /503/);
});
