import test from 'node:test';
import assert from 'node:assert/strict';

const {
  DEFAULT_LOOKBACK_DAYS,
  parseLookbackWindow,
} = await import('../dist/api/utils/temporal-window.js');

const FIXED_NOW = new Date('2026-09-02T12:00:00.000Z');

test('omitted lookback days defaults to the controlled 14-day window', () => {
  const window = parseLookbackWindow(undefined, FIXED_NOW);
  assert.ok(window);
  assert.equal(window.days, DEFAULT_LOOKBACK_DAYS);
  assert.equal(window.days, 14);
  assert.equal(
    FIXED_NOW.getTime() - window.since.getTime(),
    14 * 24 * 60 * 60 * 1000,
  );
});

for (const invalidDays of [
  '0',
  '-1',
  '1.5',
  '1e2',
  'not-a-number',
  '',
  '   ',
  '9007199254740992',
  String(Number.MAX_SAFE_INTEGER),
]) {
  test('rejects invalid or unrepresentable lookback days=' + JSON.stringify(invalidDays), () => {
    assert.equal(parseLookbackWindow(invalidDays, FIXED_NOW), null);
  });
}

for (const [rawValue, expectedDays] of [['1', 1], ['14', 14], ['001', 1]]) {
  test('accepts positive decimal lookback days=' + JSON.stringify(rawValue), () => {
    const window = parseLookbackWindow(rawValue, FIXED_NOW);
    assert.ok(window);
    assert.equal(window.days, expectedDays);
    assert.ok(Number.isFinite(window.since.getTime()));
  });
}
