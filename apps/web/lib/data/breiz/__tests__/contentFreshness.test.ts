import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  evaluateBreizDocumentFreshness,
  isBreizDocumentFresh,
} from '../contentFreshness';

const NOW = Date.parse('2026-10-03T12:00:00.000Z');
const source = { freshnessHours: 24 };

test('content checked exactly at the freshness boundary remains fresh', () => {
  const document = { last_checked_at: '2026-10-02T12:00:00.000Z' };
  assert.equal(evaluateBreizDocumentFreshness(document, source, NOW), 'fresh');
  assert.equal(isBreizDocumentFresh(document, source, NOW), true);
});

test('content older than the source freshness window fails closed', () => {
  const document = { last_checked_at: '2026-10-02T11:59:59.999Z' };
  assert.equal(evaluateBreizDocumentFreshness(document, source, NOW), 'stale');
  assert.equal(isBreizDocumentFresh(document, source, NOW), false);
});

test('future and unreadable content-check timestamps never count as fresh', () => {
  assert.equal(
    evaluateBreizDocumentFreshness(
      { last_checked_at: '2026-10-03T12:00:00.001Z' },
      source,
      NOW,
    ),
    'future_last_checked_at',
  );
  assert.equal(
    evaluateBreizDocumentFreshness(
      { last_checked_at: 'not-a-date' },
      source,
      NOW,
    ),
    'unreadable_last_checked_at',
  );
});

test('missing or invalid source recheck policy fails closed', () => {
  for (const freshnessHours of [null, 0, -1, Number.NaN]) {
    assert.equal(
      evaluateBreizDocumentFreshness(
        { last_checked_at: '2026-10-03T11:00:00.000Z' },
        { freshnessHours },
        NOW,
      ),
      'no_recheck_rule',
    );
  }
});
