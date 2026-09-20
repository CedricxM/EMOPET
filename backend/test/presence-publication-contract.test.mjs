import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeSource = readFileSync(
  new URL('../api/routes/dogs.ts', import.meta.url),
  'utf8',
);
const serviceSource = readFileSync(
  new URL('../api/services/presence.ts', import.meta.url),
  'utf8',
);

test('presence comparison stays non-publishable while durable Presence authority is absent', () => {
  assert.match(routeSource, /ABSENCE_COMPARISON_PERSISTENCE_NOT_READY/);
  assert.match(routeSource, /maturity:\s*'NOT_IMPLEMENTED'/);
  assert.match(routeSource, /retryable:\s*false/);
  assert.match(routeSource, /Cache-Control',\s*'private, no-store'/);
  assert.doesNotMatch(routeSource, /computePresenceComparison/);
  assert.doesNotMatch(routeSource, /getPresenceEventsForDog/);
});

test('presence quarantine does not rewrite prototype formulas or thresholds', () => {
  assert.match(serviceSource, /validPresenceHours < 2 \|\| validAbsenceHours < 2/);
  assert.match(
    serviceSource,
    /validPresenceHours < 4 \|\| validAbsenceHours < 4 \|\| confidence < 0\.6/,
  );
  assert.match(serviceSource, /const vocal = summary\.vocalEvents \?\? 0/);
  assert.match(serviceSource, /const agitation = summary\.agitationEvents \?\? 0/);
  assert.match(serviceSource, /const rest = summary\.matPresenceMinutes \?\? 0/);
});
