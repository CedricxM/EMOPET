import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPresenceSegments,
  computePresenceComparison,
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
